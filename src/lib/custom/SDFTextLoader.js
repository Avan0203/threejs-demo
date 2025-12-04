import {
    Loader,
    LoadingManager,
    LoaderUtils,
    FileLoader,
    TextureLoader,
    LinearSRGBColorSpace,
    ShaderMaterial,
    Color,
    Uniform,
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
} from "three";

class SDFTextMaterial extends ShaderMaterial {
    constructor(params) {
        const defines = {};
        if (params?.billboard) {
            defines.BILLBOARD = '';
        }

        const uniforms = {
            map: new Uniform(params.map),
            threshold: new Uniform(params.threshold || 0.5),
            edge: new Uniform(params.edge || 0.04),
            color: new Uniform(new Color(params.color)),
        };

        super({
            defines: defines,
            vertexColors: params?.vertexColors || false,
            uniforms: uniforms,
            vertexShader: /*glsl*/`
            varying vec2 vUv;
            #ifdef USE_COLOR
            varying vec3 vColor;
            #endif
            
            void main() {
                vUv = uv;
                
                #ifdef USE_COLOR
                vColor = color;
                #endif
                
                #ifdef BILLBOARD
                // Billboard: 在视图空间中移除旋转，使文本始终面向相机
                // 获取对象中心在视图空间的位置
                vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                
                // 获取对象的缩放（从 modelMatrix 的列向量长度）
                float scaleX = length(vec3(modelMatrix[0].x, modelMatrix[0].y, modelMatrix[0].z));
                float scaleY = length(vec3(modelMatrix[1].x, modelMatrix[1].y, modelMatrix[1].z));
                
                // 在视图空间中，移除 modelViewMatrix 的旋转部分
                // 构建一个只包含缩放和平移的矩阵
                // 视图空间的 x 轴（右向量）和 y 轴（上向量）就是相机的右向量和上向量
                // 在视图空间中，相机的右向量是 (1, 0, 0)，上向量是 (0, 1, 0)
                vec3 right = vec3(1.0, 0.0, 0.0);
                vec3 up = vec3(0.0, 1.0, 0.0);
                
                // 计算 billboard 位置：中心位置 + 右向量 * x偏移 * x缩放 + 上向量 * y偏移 * y缩放
                vec3 billboardPos = center.xyz + right * position.x * scaleX + up * position.y * scaleY;
                
                gl_Position = projectionMatrix * vec4(billboardPos, 1.0);
                #else
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                #endif
            }
            `,
            fragmentShader: /*glsl*/`
            uniform sampler2D map;
            uniform vec3 color;
            uniform float threshold;
            uniform float edge;
            uniform float opacity;
            varying vec2 vUv;
            #ifdef USE_COLOR
            varying vec3 vColor;
            #endif
            
            void main() {
                float dist = texture2D(map, vUv).a;
                float alpha = smoothstep(threshold - edge, threshold + edge, dist);
                if (alpha < 0.01) discard;
                
                #ifdef USE_COLOR
                vec3 finalColor = vColor;
                #else
                // 确保使用 uniform color
                vec3 finalColor = color;
                #endif
                
                gl_FragColor = vec4(finalColor, alpha);
            }
            `,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });
    }
}

const defaultOptions = {
    size: 0.1,
    color: '#000000',
    align: 'left',
    maxWidth: Infinity,
    threshold: 0.5,
    edge: 0.04,
    billboard: false
}

class SDFTextFont {
    constructor(texture, data) {
        this.texture = texture;
        this.data = data;
    }

    getLineHeight() {
        return this.data.common.lineHeight;
    }

    getLineWidth(text) {
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            const char = this.data.chars[code];
            if (char) width += char.xadvance;
        }
        return width;
    }

    _parseText(text, size, maxWidth) {
        const logicalLines = text.split('\n');
        const lines = [];
        for (const logicalLine of logicalLines) {
            if (maxWidth < Infinity) {
                // 对每一逻辑行做自动折行
                let current = '';
                for (const char of logicalLine) {
                    const test = current + char;
                    if (this.getLineWidth(test) * size > maxWidth) {
                        if (current === '') {
                            // 单个字符就超宽？强行放入（避免死循环）
                            lines.push(char);
                            current = '';
                        } else {
                            lines.push(current);
                            current = char;
                        }
                    } else {
                        current += char;
                    }
                }
                if (current !== '') lines.push(current);
            } else {
                // 无 maxWidth 限制：直接保留逻辑行
                lines.push(logicalLine);
            }
        }
        return lines;
    }

    _prepareContent(contents, options) {
        const { color } = options;
        let text = '';

        let getColor = () => new Color(color);

        if (Array.isArray(contents)) {
            // 构建颜色映射函数
            const colorSegments = [];
            let charOffset = 0;

            contents.forEach(({ content, color: segmentColor }) => {
                const segmentLength = content.length;
                colorSegments.push({
                    start: charOffset,
                    end: charOffset + segmentLength,
                    color: new Color(segmentColor || color)
                });
                text += content;
                charOffset += segmentLength;
            });

            // 创建颜色映射函数
            getColor = (charIndex) => {
                for (const segment of colorSegments) {
                    if (charIndex >= segment.start && charIndex < segment.end) {
                        return segment.color;
                    }
                }
                return new Color(color); // 默认颜色
            };
        } else {
            text = contents;
        }

        return { text, getColor };
    }

    _generateTextBuffer(contents, options) {
        const { text, getColor } = this._prepareContent(contents, options);
        const { size, maxWidth, align } = options;

        const positions = [];
        const uvs = [];
        const colors = [];
        const indices = [];
        const lines = this._parseText(text, size, maxWidth);

        const lineHeight = this.data.common.lineHeight * size;
        const baseY = this.data.common.base * size;
        let charIndex = 0; // 跟踪字符索引，用于颜色映射

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            const lineWidth = this.getLineWidth(line) * size;
            let offsetX = 0;
            if (align === 'center') offsetX = -lineWidth / 2;
            else if (align === 'right') offsetX = -lineWidth;

            let cursorX = offsetX;
            const cursorY = -lineIdx * lineHeight; // Y 向下为正（屏幕坐标系）

            for (let i = 0; i < line.length; i++) {
                const code = line.charCodeAt(i);
                const char = this.data.chars[code];

                // 获取当前字符的颜色
                const charColor = getColor(charIndex);

                if (!char || char.width === 0 || char.height === 0) {
                    cursorX += (char?.xadvance || 0) * size;
                    charIndex++;
                    continue;
                }

                const w = char.width * size;
                const h = char.height * size;
                const xOff = char.xoffset * size;
                const yOff = char.yoffset * size;

                // Quad 顶点（Z=0）
                const quad = [
                    [cursorX + xOff, cursorY + baseY - yOff, 0],
                    [cursorX + xOff + w, cursorY + baseY - yOff, 0],
                    [cursorX + xOff + w, cursorY + baseY - yOff - h, 0],
                    [cursorX + xOff, cursorY + baseY - yOff - h, 0]
                ];

                // UV（归一化）
                const u1 = char.x / this.data.common.scaleW;
                const v1 = char.y / this.data.common.scaleH;
                const u2 = (char.x + char.width) / this.data.common.scaleW;
                const v2 = (char.y + char.height) / this.data.common.scaleH;
                const uvQuad = [[u1, v1], [u2, v1], [u2, v2], [u1, v2]];

                const idx = positions.length / 3;
                for (let j = 0; j < 4; j++) {
                    positions.push(...quad[j]);
                    uvs.push(...uvQuad[j]);
                    // 如果有颜色，为每个顶点添加颜色
                    colors.push(charColor.r, charColor.g, charColor.b);
                }
                // 反转索引顺序，使面朝向正确（逆时针 -> 顺时针）
                indices.push(idx, idx + 2, idx + 1, idx, idx + 3, idx + 2);

                cursorX += char.xadvance * size;
                charIndex++;
            }
        }

        return { positions, uvs, colors, indices };
    }

    createText(content, options = defaultOptions) {
        const opts = { ...defaultOptions, ...options };

        const isContentArray = Array.isArray(content);
        const { positions, uvs, colors, indices } = this._generateTextBuffer(content, options);

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        if (isContentArray) {
            geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
        }
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();


        const mesh = new Mesh(geometry, new SDFTextMaterial({
            map: this.texture,
            color: opts.color,
            threshold: opts.threshold,
            edge: opts.edge,
            billboard: opts.billboard,
            vertexColors: isContentArray
        }));
        return mesh;
    }
}

class SDFTextLoader extends Loader {
    static cache = new Map();
    static loading = new Map(); // 记录正在加载的 URL 和对应的回调队列

    constructor(manager = new LoadingManager()) {
        super(manager);
        this.fileLoader = new FileLoader(manager);
        this.textureLoader = new TextureLoader(manager);
    }


    load(url, onLoad, onProgress, onError) {
        this.fileLoader.setPath(this.path);
        this.fileLoader.setResponseType('text');


        if (SDFTextLoader.cache.has(url)) {
            const font = SDFTextLoader.cache.get(url);
            console.log('[SDFTextLoader] cache hit: ', font);
            onLoad(font);
            return;
        }

        // 检查是否正在加载
        if (SDFTextLoader.loading.has(url)) {
            // 如果正在加载，将回调添加到等待队列
            const callbacks = SDFTextLoader.loading.get(url);
            callbacks.push(onLoad);
            return;
        }

        // 开始加载，记录加载状态
        const callbacks = [onLoad];
        SDFTextLoader.loading.set(url, callbacks);

        this.fileLoader.load(url,
            (text) => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, 'text/xml');
                try {
                    if (xmlDoc.querySelector('parsererror')) {
                        throw new Error('XML parse error');
                    }

                    const common = xmlDoc.querySelector('common');
                    const page = xmlDoc.querySelector('page');
                    const distanceField = xmlDoc.querySelector('distanceField');
                    const chars = xmlDoc.querySelectorAll('char');

                    if (!common || !page) {
                        throw new Error('SDFTextLoader: Missing required XML elements (common or page)');
                    }

                    const data = {
                        common: {
                            lineHeight: parseInt(common.getAttribute('lineHeight')) || 0,
                            base: parseInt(common.getAttribute('base')) || 0,
                            scaleW: parseInt(common.getAttribute('scaleW')) || 0,
                            scaleH: parseInt(common.getAttribute('scaleH')) || 0
                        },
                        distanceField: {
                            fieldType: distanceField?.getAttribute('fieldType') || 'none',
                            distanceRange: parseInt(distanceField?.getAttribute('distanceRange') || '1')
                        },
                        chars: {}
                    }

                    chars.forEach(char => {
                        data.chars[parseInt(char.getAttribute('id'))] = {
                            x: parseInt(char.getAttribute('x')),
                            y: parseInt(char.getAttribute('y')),
                            width: parseInt(char.getAttribute('width')),
                            height: parseInt(char.getAttribute('height')),
                            xoffset: parseInt(char.getAttribute('xoffset')),
                            yoffset: parseInt(char.getAttribute('yoffset')),
                            xadvance: parseInt(char.getAttribute('xadvance')),
                        }
                    });

                    const texturePath = this.path || LoaderUtils.extractUrlBase(url);
                    const fileName = page.getAttribute('file');
                    const pngUrl = texturePath + (texturePath.endsWith('/') ? '' : '/') + fileName;

                    this.textureLoader.load(pngUrl,
                        (texture) => {
                            texture.colorSpace = LinearSRGBColorSpace;
                            texture.flipY = false;
                            const font = new SDFTextFont(texture, data);

                            // 设置缓存
                            SDFTextLoader.cache.set(url, font);

                            // 获取所有等待的回调并通知
                            const callbacks = SDFTextLoader.loading.get(url) || [];
                            SDFTextLoader.loading.delete(url);

                            // 通知所有等待的回调
                            callbacks.forEach(callback => callback(font));
                        },
                        onProgress,
                        (error) => {
                            // 加载失败，清除加载状态
                            SDFTextLoader.loading.delete(url);
                            if (onError) {
                                onError(error);
                            }
                        },
                    );
                } catch (error) {
                    // 加载失败，清除加载状态
                    SDFTextLoader.loading.delete(url);
                    if (onError) {
                        onError(error);
                    } else {
                        console.error('SDFTextLoader: loader error', error);
                    }
                }
            },
            onProgress,
            (error) => {
                // 文件加载失败，清除加载状态
                SDFTextLoader.loading.delete(url);
                if (onError) {
                    onError(error);
                }
            }
        );

    }

    loadAsync(url) {
        return new Promise((resolve, reject) => {
            this.load(url, resolve, null, reject);
        });
    }
}

export {
    SDFTextLoader,
    SDFTextFont,
    SDFTextMaterial
};
