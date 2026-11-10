/*
 * @FilePath: \threejs-demo\src\composer\facingSilhouette.js
 */
import {
    Vector2,
    Vector3,
    Shape,
    Path,
    Mesh,
    Group,
    Scene,
    EdgesGeometry,
    LineSegments,
    ExtrudeGeometry,
    ConeGeometry,
    PlaneGeometry,
    MeshStandardMaterial,
    MeshBasicMaterial,
    LineBasicMaterial,
    ShaderMaterial,
    WebGLRenderTarget,
    DepthTexture,
    FloatType,
    NearestFilter,
    LinearSRGBColorSpace,
    OrthographicCamera,
    FrontSide,
    BackSide,
    DirectionalLight,
} from 'three';
import {
    initRenderer,
    initPerspectiveCamera,
    initScene,
    initOrbitControls,
    initGUI,
    initAmbientLight,
    resize,
} from '../lib/tools/index.js';

window.onload = () => {
    init();
};

const MODES = {
    着色有边线: 'shaded-edges',
    着色无边线: 'shaded',
    静态线框: 'static-wireframe',
    半透明: 'translucent',
    线框无隐藏边: 'wireframe-no-hidden',
};

const outerRadius = 48;
const innerRadius = 30;
const height = 56;
const segments = 64;
const cylinderX = -90;
const coneRadius = 46;
const coneHeight = 84;
const coneX = 100;

function init() {
    const renderer = initRenderer();
    renderer.setClearColor(0xffffff, 1);

    const camera = initPerspectiveCamera(new Vector3(120, -340, 150));
    camera.fov = 40;
    camera.near = 0.1;
    camera.far = 2000;
    camera.up.set(0, 0, 1);
    camera.updateProjectionMatrix();

    const scene = initScene();
    const controls = initOrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 10);
    controls.update();

    initAmbientLight(scene, 0xffffff, 0.7);
    const keyLight = new DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(90, -140, 180);
    scene.add(keyLight);
    const fillLight = new DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-140, 90, 40);
    scene.add(fillLight);

    const profile = new Shape();
    profile.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    profile.holes.push(hole);

    const standardMaterial = new MeshStandardMaterial({
        color: 0xc5c8ce,
        roughness: 0.7,
        metalness: 0.4,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 4,
    });
    const basicMaterial = new MeshBasicMaterial({
        color: 0xc5c8ce,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 4,
    });
    const edgeMaterial = new LineBasicMaterial({ color: 0x2c3039 });

    function createMeshWithEdge(geometry) {
        const mesh = new Mesh(geometry, standardMaterial);
        mesh.edge = new LineSegments(new EdgesGeometry(geometry,45), edgeMaterial);
        mesh.edge.renderOrder = 2;
        mesh.add(mesh.edge);
        return mesh;
    }

    function createGroup(centerY) {
        const cylinderGeometry = new ExtrudeGeometry(profile, {
            depth: height,
            bevelEnabled: false,
            curveSegments: segments,
        });
        cylinderGeometry.translate(cylinderX, centerY, -height / 2);

        const coneGeometry = new ConeGeometry(coneRadius, coneHeight, segments);
        coneGeometry.rotateX(Math.PI / 2);
        coneGeometry.translate(coneX, centerY, -height / 2 + coneHeight / 2);

        return [
            createMeshWithEdge(cylinderGeometry),
            createMeshWithEdge(coneGeometry),
        ];
    }

    const meshes = [];
    [0, 500, 1000].forEach((centerY) => {
        createGroup(centerY).forEach((mesh) => {
            meshes.push(mesh);
            scene.add(mesh);
        });
    });
    const edgeLines = meshes.map((mesh) => mesh.edge);

    function applyMode(mode) {
        edgeLines.forEach((line) => {
            line.visible = mode !== 'shaded';
        });
        edgeMaterial.depthTest = mode !== 'static-wireframe';

        if (mode === 'shaded' || mode === 'shaded-edges') {
            meshes.forEach((item) => {
                item.material = standardMaterial;
            });
            standardMaterial.color.setHex(0xc5c8ce);
            standardMaterial.opacity = 1;
            standardMaterial.transparent = false;
            standardMaterial.depthWrite = true;
            standardMaterial.needsUpdate = true;
            return;
        }

        if (mode === 'static-wireframe') {
            meshes.forEach((item) => {
                item.material = standardMaterial;
            });
            standardMaterial.transparent = true;
            standardMaterial.opacity = 0;
            standardMaterial.depthWrite = false;
            standardMaterial.needsUpdate = true;
            return;
        }

        if (mode === 'translucent') {
            meshes.forEach((item) => {
                item.material = basicMaterial;
            });
            basicMaterial.color.setHex(0xc5c8ce);
            basicMaterial.transparent = true;
            basicMaterial.opacity = 0.5;
            basicMaterial.depthWrite = true;
            basicMaterial.needsUpdate = true;
            return;
        }

        meshes.forEach((item) => {
            item.material = basicMaterial;
        });
        basicMaterial.color.setHex(0xfeffff);
        basicMaterial.transparent = false;
        basicMaterial.opacity = 1;
        basicMaterial.depthWrite = true;
        basicMaterial.needsUpdate = true;
    }

    const params = {
        mode: 'static-wireframe',
        enableOutline: true,
        enableBoundary: true,
        enableValley: true,
        valleyAbsEps: 0.02,
        geoDepthEps: 0.003,
        previewFacing: false,
    };

    const facingVertexShader = /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewDir = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(-viewPosition.xyz);
            gl_Position = projectionMatrix * viewPosition;
        }
    `;
    const facingFragmentShader = /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
            // 判断片源法线和视角法线的夹角，[-1,1],0为垂直，1为同向，-1为反向
            float facing = dot(normalize(vNormal), normalize(vViewDir));
            // 写入深度值, 给depthTest
            // abs(facing):只取不论同向和反向，
            // * 0.999:始终保证小于1
            gl_FragDepth = abs(facing) * 0.999;
            // 写入信息
            // R:正常片源深度值（NDC/窗口深度，非线性，做备份）
            // G:不论同向和反向，看的是接近程度
            // A:归一化到[0,1]
            gl_FragColor = vec4(gl_FragCoord.z, abs(facing), 0.0, facing * 0.5 + 0.5);
        }
    `;

    function createFacingTarget() {
        const target = new WebGLRenderTarget(1, 1, {
            type: FloatType,
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            depthTexture: new DepthTexture(1, 1),
        });
        target.texture.colorSpace = LinearSRGBColorSpace;
        return target;
    }

    function createFacingMaterial(side) {
        return new ShaderMaterial({
            side,
            toneMapped: false,
            depthWrite: true,
            vertexShader: facingVertexShader,
            fragmentShader: facingFragmentShader,
        });
    }

    const facingFrontTarget = createFacingTarget();
    const facingBackTarget = createFacingTarget();
    const facingFrontMaterial = createFacingMaterial(FrontSide);
    const facingBackMaterial = createFacingMaterial(BackSide);

    const silhouetteMaterial = new ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        transparent: true,
        toneMapped: false,
        uniforms: {
            tFront: { value: facingFrontTarget.texture },
            tFrontDepth: { value: facingFrontTarget.depthTexture },
            tBack: { value: facingBackTarget.texture },
            tBackDepth: { value: facingBackTarget.depthTexture },
            resolution: { value: new Vector2(1, 1) },
            enableBoundary: { value: params.enableBoundary },
            enableValley: { value: params.enableValley },
            valleyAbsEps: { value: params.valleyAbsEps },
            geoDepthEps: { value: params.geoDepthEps },
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            varying vec2 vUv;
            uniform sampler2D tFront;
            uniform sampler2D tFrontDepth;
            uniform sampler2D tBack;
            uniform sampler2D tBackDepth;
            uniform vec2 resolution;
            uniform bool enableBoundary;
            uniform bool enableValley;
            uniform float valleyAbsEps;
            uniform float geoDepthEps;

            //判断是否无深度值（没有绘制）
            bool empty(float depth) {
                return depth >= 0.99999;
            }

            //判断片源法线和视角法线的夹角，[-1,1],0为垂直，1为同向，-1为反向
            float facingAt(sampler2D colorTex, vec2 uv) {
                //片源深度值，归一化到[0,1]
                // * 2.0 - 1.0:归一化到[-1,1]
                // abs:取绝对值
                return abs(texture2D(colorTex, uv).a * 2.0 - 1.0);
            }

            // 获取当前深度值（R = gl_FragCoord.z，非线性）
            float geoDepthAt(sampler2D colorTex, vec2 uv) {
                return texture2D(colorTex, uv).r;
            }

            // 判断是否覆盖
            bool covered(sampler2D depthTex, vec2 uv) {
                return !empty(texture2D(depthTex, uv).r);
            }

            // 判断是否连续
            // 判断相邻uv深度的连续性，是真谷还是假谷
            // 真谷：两侧都高于中心（P && Q），再检查深度连续
            // 假谷：两个相近的物体挨得很近，在特定视角下，会形成一个谷底，但是深度不连续
            bool depthContinuous(sampler2D colorTex, vec2 uv, vec2 stepUv) {
                float d0 = geoDepthAt(colorTex, uv);
                float dPos = geoDepthAt(colorTex, uv + stepUv);
                float dNeg = geoDepthAt(colorTex, uv - stepUv);
                return abs(dPos - d0) < geoDepthEps && abs(dNeg - d0) < geoDepthEps;
            }

            // 判断是不是山谷
            // |s| 山谷 \\/ ：两侧都高于中心（P && Q），再检查深度连续
            bool valley(sampler2D colorTex, vec2 uv, vec2 stepUv, float centerAbs) {
                float posAbs = facingAt(colorTex, uv + stepUv);
                float negAbs = facingAt(colorTex, uv - stepUv);
                // P: pos 够高；Q: neg 够高。原写法 ¬P || ¬Q 与此等价
                if (posAbs > centerAbs + valleyAbsEps && negAbs > centerAbs + valleyAbsEps) {
                    // 剔除假谷，保留真谷，测试下来直接写true，看起来也没啥毛病
                    return depthContinuous(colorTex, uv, stepUv);
                    // return true;
                }
                return false;
            }

            void main() {
                bool frontHere = covered(tFrontDepth, vUv);
                bool backHere = covered(tBackDepth, vUv);
                  // 正反面都在远平面，则discard
                if (!frontHere && !backHere) discard;

                // 计算正反面 facing 的绝对值
                float frontAbs = facingAt(tFront, vUv);
                float backAbs = facingAt(tBack, vUv);
                bool edge = false;
                vec2 texel = 1.0 / resolution;
                vec2 axes[4];
                // 初始化4个方向
                axes[0] = vec2(1.0, 0.0);
                axes[1] = vec2(0.0, 1.0);
                axes[2] = vec2(1.0, 1.0);
                axes[3] = vec2(1.0, -1.0);

                //  对应方位轴向 & 索引
                //     (0,1)[1] - (1,1)[2]
                //      |       |
                //    (0,0) - (1,0)[0]
                //     |       |
                //         - (1,-1)[3]


                //  结合for 生成9宫格方向判断
                //    (1,-1) * suv - vuv 【左上】   (0,1) * suv + vuv 【上】   (1,1) * suv + vuv 【右上】
                //    (1,0) * suv  - vuv【左】        vuv（当前中心）        (1,0) * suv + vuv 【右】
                //    (1,1) * suv - vuv 【左下】  (0,1) * suv - vuv 【下】   (1,-1) * suv + vuv 【右下】

                for (int i = 0; i < 4; i++) {
                     // 获取当前uv的
                    vec2 stepUv = axes[i] * texel;
                    // front的正方向邻轴是否不为远平面
                    bool frontPos = covered(tFrontDepth, vUv + stepUv);
                    // front的负方向邻轴是否不为远平面
                    bool frontNeg = covered(tFrontDepth, vUv - stepUv);
                    // back的正方向邻轴是否不为远平面
                    bool backPos = covered(tBackDepth, vUv + stepUv);
                    // back的负方向邻轴是否不为远平面
                    bool backNeg = covered(tBackDepth, vUv - stepUv);
                    // 获取正面 + 方向 facing 的绝对值
                    float frontPosAbs = facingAt(tFront, vUv + stepUv);
                    // 获取正面 - 方向 facing 的绝对值
                    float frontNegAbs = facingAt(tFront, vUv - stepUv);
                    // 获取背面 + 方向 facing 的绝对值
                    float backPosAbs = facingAt(tBack, vUv + stepUv);
                    // 获取背面 - 方向 facing 的绝对值
                    float backNegAbs = facingAt(tBack, vUv - stepUv);

                    if (enableValley) {
                         // 正面两边高，中间低，则认为是边缘
                        if (frontHere && frontPos && frontNeg && valley(tFront, vUv, stepUv, frontAbs)) edge = true;
                        // 反面两边高，中间低，则认为是边缘 (圆柱内径)
                        if (backHere && backPos && backNeg && valley(tBack, vUv, stepUv, backAbs)) edge = true;
                    }

                    if (enableBoundary) {
                         // 正面：当前位置有，对位领轴一个有一个没有
                        if (frontHere && frontPos != frontNeg) {
                            // 取有值的
                            float neighborAbs = frontPos ? frontPosAbs : frontNegAbs;
                            // 有值比当前大，则认为是边缘
                            if (neighborAbs > frontAbs + valleyAbsEps) edge = true;
                        }
                        // 背面：当前位置有，对位领轴一个有一个没有
                        if (backHere && backPos != backNeg) {
                            // 取有值的
                            float neighborAbs = backPos ? backPosAbs : backNegAbs;
                            // 有值比当前大，则认为是边缘
                            if (neighborAbs > backAbs + valleyAbsEps) edge = true;
                        }
                    }
                }

                if (!edge) discard;
                gl_FragColor = vec4(0.173, 0.188, 0.224, 1.0);
            }
        `,
    });

    const overlayCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const overlayScene = new Scene();
    const overlayQuad = new Mesh(new PlaneGeometry(2, 2), silhouetteMaterial);
    overlayQuad.frustumCulled = false;
    overlayScene.add(overlayQuad);

    const geoPreviewMaterials = [];

    function createPreviewMaterial(map, source) {
        const material = new ShaderMaterial({
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
            uniforms: {
                tMap: { value: map },
                source: { value: source },
                cameraNear: { value: camera.near },
                cameraFar: { value: camera.far },
                focusNear: { value: 1 },
                focusFar: { value: 400 },
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */ `
                uniform sampler2D tMap;
                uniform float source;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform float focusNear;
                uniform float focusFar;
                varying vec2 vUv;

                vec3 facingRamp(float t) {
                    float x = clamp(t, 0.0, 1.0);
                    return vec3(
                        smoothstep(0.35, 0.85, x),
                        1.0 - abs(x - 0.5) * 2.0,
                        1.0 - smoothstep(0.15, 0.65, x)
                    );
                }

                vec3 geoRamp(float t) {
                    float x = clamp(t, 0.0, 1.0);
                    return mix(vec3(0.96, 0.93, 0.84), vec3(0.32, 0.04, 0.42), x);
                }

                float linearizeDepth(float d) {
                    float z = d * 2.0 - 1.0;
                    return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
                }

                void main() {
                    vec4 texel = texture2D(tMap, vUv);
                    if (source < 0.5) {
                        gl_FragColor = vec4(vec3(texel.a), 1.0);
                        return;
                    }
                    if (source < 1.5) {
                        if (texel.r >= 0.99999) {
                            gl_FragColor = vec4(vec3(0.12), 1.0);
                            return;
                        }
                        gl_FragColor = vec4(facingRamp(texel.r), 1.0);
                        return;
                    }
                    if (texel.g == 0.0 && texel.a == 0.0) {
                        gl_FragColor = vec4(vec3(0.12), 1.0);
                        return;
                    }
                    float linear = linearizeDepth(texel.r);
                    float depthT = clamp((linear - focusNear) / max(focusFar - focusNear, 1e-3), 0.0, 1.0);
                    gl_FragColor = vec4(geoRamp(depthT), 1.0);
                }
            `,
        });
        if (source > 1.5) {
            geoPreviewMaterials.push(material);
        }
        return material;
    }

    function syncGeoPreviewUniforms() {
        const focusDist = camera.position.distanceTo(controls.target);
        const focusNear = Math.max(camera.near, focusDist * 0.8);
        const focusFar = Math.max(focusNear + 1, focusDist * 1.2);
        geoPreviewMaterials.forEach((material) => {
            material.uniforms.cameraNear.value = camera.near;
            material.uniforms.cameraFar.value = camera.far;
            material.uniforms.focusNear.value = focusNear;
            material.uniforms.focusFar.value = focusFar;
        });
    }

    const previewScene = new Scene();
    const previewGeometry = new PlaneGeometry(2, 2);
    const previewFrameMaterial = new MeshBasicMaterial({ color: 0x111111 });

    function createPreviewQuad(map, source, x, y) {
        const group = new Group();
        group.position.set(x, y, 0);

        const frame = new Mesh(previewGeometry, previewFrameMaterial);
        frame.frustumCulled = false;
        frame.scale.set(0.2, 0.2, 1);
        frame.position.z = -0.01;

        const mesh = new Mesh(previewGeometry, createPreviewMaterial(map, source));
        mesh.frustumCulled = false;
        mesh.scale.set(0.18, 0.18, 1);

        group.add(frame, mesh);
        return group;
    }

    const previewQuads = [
        {
            map: facingFrontTarget.texture, source: 0, x: -0.72, y: 0.62, label: '正面 facing',
        },
        {
            map: facingBackTarget.texture, source: 0, x: -0.32, y: 0.62, label: '背面 facing',
        },
        {
            map: facingFrontTarget.depthTexture, source: 1, x: -0.72, y: 0, label: '正面深度',
        },
        {
            map: facingBackTarget.depthTexture, source: 1, x: -0.32, y: 0, label: '背面深度',
        },
        {
            map: facingFrontTarget.texture, source: 2, x: -0.72, y: -0.62, label: '正面几何深度',
        },
        {
            map: facingBackTarget.texture, source: 2, x: -0.32, y: -0.62, label: '背面几何深度',
        },
    ];

    const app = document.getElementById('webgl-output');
    const previewLabelRoot = document.createElement('div');
    previewLabelRoot.id = 'preview-labels';
    previewQuads.forEach((item) => {
        previewScene.add(createPreviewQuad(item.map, item.source, item.x, item.y));
        const label = document.createElement('div');
        label.className = 'preview-label';
        label.textContent = item.label;
        previewLabelRoot.appendChild(label);
        item.element = label;
    });
    app.appendChild(previewLabelRoot);

    function layoutPreviewLabels() {
        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;
        previewLabelRoot.style.display = params.previewFacing ? '' : 'none';
        previewQuads.forEach((item) => {
            item.element.style.left = `${(item.x + 1) * 0.5 * width}px`;
            item.element.style.top = `${(1 - (item.y + 0.2)) * 0.5 * height}px`;
        });
    }

    function resizeTarget(target, width, height) {
        target.setSize(width, height);
        target.depthTexture.image.width = width;
        target.depthTexture.image.height = height;
    }

    function renderFacing(material, target) {
        meshes.forEach((mesh) => {
            mesh.material = material;
        });
        renderer.setRenderTarget(target);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, camera);
    }

    function renderFacingPass() {
        const lineVisibility = edgeLines.map((line) => line.visible);
        const previousMaterials = meshes.map((mesh) => mesh.material);
        edgeLines.forEach((line) => {
            line.visible = false;
        });
        const previousColorSpace = renderer.outputColorSpace;
        renderer.outputColorSpace = LinearSRGBColorSpace;
        renderFacing(facingFrontMaterial, facingFrontTarget);
        renderFacing(facingBackMaterial, facingBackTarget);
        renderer.setRenderTarget(null);
        renderer.outputColorSpace = previousColorSpace;
        renderer.setClearColor(0xffffff, 1);

        meshes.forEach((mesh, index) => {
            mesh.material = previousMaterials[index];
        });
        edgeLines.forEach((line, index) => {
            line.visible = lineVisibility[index];
        });
    }

    function renderPreview() {
        if (!params.previewFacing) {
            return;
        }
        syncGeoPreviewUniforms();
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(previewScene, overlayCamera);
        renderer.autoClear = true;
    }

    function renderSilhouette() {
        renderFacingPass();
        renderer.render(scene, camera);
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(overlayScene, overlayCamera);
        renderer.autoClear = true;
        renderPreview();
    }

    function resizeTargets(width, height) {
        resizeTarget(facingFrontTarget, width, height);
        resizeTarget(facingBackTarget, width, height);
        silhouetteMaterial.uniforms.resolution.value.set(width, height);
    }

    function renderFrame() {
        if (params.enableOutline) {
            renderSilhouette();
            return;
        }
        if (params.previewFacing) {
            renderFacingPass();
        }
        renderer.setRenderTarget(null);
        renderer.setClearColor(0xffffff, 1);
        renderer.render(scene, camera);
        renderPreview();
    }

    const outlineModes = new Set(['static-wireframe', 'translucent']);

    const gui = initGUI();
    gui.add(params, 'mode', MODES)
        .name('显示模式')
        .onChange((mode) => {
            params.mode = mode;
            applyMode(mode);
            syncOutlineControls();
        });
    const enableOutlineController = gui.add(params, 'enableOutline')
        .name('开启描边')
        .onChange(() => {
            syncOutlineControls();
        });
    const previewFacingController = gui.add(params, 'previewFacing')
        .name('预览 facing/depth')
        .onChange(() => {
            layoutPreviewLabels();
        });

    const outlineFolder = gui.addFolder('Outline Options');
    outlineFolder
        .add(params, 'enableBoundary')
        .name('朝向贴边')
        .onChange((v) => {
            silhouetteMaterial.uniforms.enableBoundary.value = v;
        });
    outlineFolder
        .add(params, 'enableValley')
        .name('朝向谷底')
        .onChange((v) => {
            silhouetteMaterial.uniforms.enableValley.value = v;
        });
    outlineFolder
        .add(params, 'valleyAbsEps', 0.001, 0.2, 0.001)
        .name('朝向|s|阈值')
        .onChange((v) => {
            silhouetteMaterial.uniforms.valleyAbsEps.value = v;
        });
    outlineFolder
        .add(params, 'geoDepthEps', 0.0001, 0.05, 0.0001)
        .name('朝向深度阈值')
        .onChange((v) => {
            silhouetteMaterial.uniforms.geoDepthEps.value = v;
        });

    function syncOutlineControls() {
        const allowOutline = outlineModes.has(params.mode);
        enableOutlineController.show(allowOutline);
        if (!allowOutline) {
            params.enableOutline = false;
            enableOutlineController.updateDisplay();
        }
        const outlineOn = allowOutline && params.enableOutline;
        outlineFolder.show(outlineOn);
        previewFacingController.show(outlineOn);
        if (!outlineOn) {
            params.previewFacing = false;
            previewFacingController.updateDisplay();
            layoutPreviewLabels();
        }
    }

    applyMode(params.mode);
    syncOutlineControls();

    resize(renderer, camera, (width, height) => {
        resizeTargets(width, height);
        layoutPreviewLabels();
    });

    (function frame() {
        controls.update();
        renderFrame();
        requestAnimationFrame(frame);
    })();
}
