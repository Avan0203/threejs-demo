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


class SDFTextLoader extends Loader {
    constructor(manager = new LoadingManager()) {
        super(manager);
        this.fileLoader = new FileLoader(manager);
        this.textureLoader = new TextureLoader(manager);
    }


    load(url, onLoad, onProgress, onError) {
        this.fileLoader.setPath(this.path);
        this.fileLoader.setResponseType('text');

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
                    const pngUrl = texturePath + page.getAttribute('file');

                    this.textureLoader.load(pngUrl,
                        (texture) => {
                            texture.colorSpace = LinearSRGBColorSpace;
                            texture.flipY = false;
                            onLoad(texture);
                        },
                        onProgress,
                        onError,
                    );
                } catch (error) {
                    if (onError) {
                        onError(error);
                    } else {
                        console.error('SDFTextLoader: loader error', error);
                    }
                }
            },
            onProgress,
            onError
        );

    }

}

class SDFTextMaterial extends ShaderMaterial {
    constructor(params) {
        super({
            uniforms: {
                map: new Uniform(params.map),
                color: new Uniform(new Color(params.color || '#000000')),
                threshold: new Uniform(params.threshold || 0.5),
                edge: new Uniform(params.edge || 0.04)
            },
            vertexShader: /*glsl*/`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
            `,
            fragmentShader: /*glsl*/`
            uniform sampler2D map;
            uniform vec3 uColor;
            uniform float uThreshold;
            uniform float uEdge;
            varying vec2 vUv;
            void main() {
                float dist = texture2D(map, vUv).a;
                float alpha = smoothstep(uThreshold - uEdge, uThreshold + uEdge, dist);
                if (alpha < 0.01) discard;
                gl_FragColor = vec4(uColor, alpha);
            }
            `,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
    }
}

const defaultOptions = {
    size: 12,
    color: '#000000',
    align: 'left',
    maxWidth: Infinity,
    threshold: 0.5,
    edge: 0.04
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

    createText(text, options = defaultOptions) {
        const { size, maxWidth, align } = { ...defaultOptions, ...options };

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

        const positions = [];
        const uvs = [];
        const indices = [];

        const lineHeight = this.data.common.lineHeight * size;
        const baseY = this.data.common.base * size;

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
                if (!char || char.width === 0 || char.height === 0) {
                    cursorX += (char?.xadvance || 0) * size;
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
                }
                indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);

                cursorX += char.xadvance * size;
            }
        }

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();

        return new Mesh(geometry, new SDFTextMaterial({
            map: this.texture,
            color: new Color(options.color),
            threshold: options.threshold,
            edge: options.edge
        }));
    }



}