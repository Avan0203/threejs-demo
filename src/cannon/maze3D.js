/*
 * @Author: wuyifan0203 1208097313@qq.com
 * @Date: 2024-11-15 10:25:55
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-01 17:44:08
 * @FilePath: \threejs-demo\src\cannon\maze3D.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    Vector3,
    CanvasTexture,
    RepeatWrapping,
    MeshPhysicalMaterial,
    CapsuleGeometry,
    MeshNormalMaterial,
    PerspectiveCamera,
    CameraHelper,
    OrthographicCamera,
    Euler,
    WebGLRenderer,
    Vector2,
    ShaderMaterial,
    Color,
    Matrix4,
    PlaneGeometry,
} from 'three';
import {
    initRenderer,
    initScene,
    initAmbientLight,
    initDirectionLight,
    initAxesHelper,
    initLoader,
    Image_Path,
    initClock,
    resize,
    initGUI,
    clamp,
    symbolFlag,
    initSky,
    HALF_PI
} from '../lib/tools/index.js';
import { MazeGeometry } from '../lib/custom/MazeGeometry.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const layerMap = {
    ALL: 7,
    DEBUG: 4,
    PLAYER: 2
};

const loader = initLoader();
const gui = initGUI();

window.onload = () => {
    init();
};

async function init() {
    const renderer = initRenderer();
    const scene = initScene();
    initAmbientLight(scene);
    addLight(scene);

    initAxesHelper(scene);

    initSky(scene);

    const octree = new Octree();

    // eslint-disable-next-line no-use-before-define
    const player = new Player(octree);

    const eyeHelper = new CameraHelper(player.eye);

    const maze = await createMaze();
    maze.mesh.position.set(-130, 0, -130);
    scene.add(maze.mesh);

    maze.mesh.updateMatrixWorld(true);
    console.log(maze.mesh.geometry.boundingBox.clone().applyMatrix4(maze.mesh.matrixWorld));
    octree.fromGraphNode(maze.mesh);

    const playerPosition = new Vector3(-117.5, 0, -117.5);

    player.position.copy(playerPosition);
    player.shape.translate(playerPosition);
    scene.add(eyeHelper);
    scene.add(player);

    const viewPort = createSideViewPort();
    viewPort.changeVisible(false);

    const mapViewPort = createMapViewPort();

    resize(renderer, [player.eye], viewPort.resize)

    const blocker = document.getElementById('blocker');

    blocker.addEventListener('click', function () {
        player.controls.lock();
    });

    player.controls.addEventListener('lock', function () {
        blocker.style.display = 'none';
        renderer.setAnimationLoop(render);
    });

    const debuggerBtn = document.getElementById('debuggerBtn');
    let trigger = false;
    debuggerBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        trigger = !trigger;
        trigger ? gui.show() : gui.hide();
    })

    player.controls.addEventListener('unlock', function () {
        blocker.style.display = 'block';
        renderer.setAnimationLoop(null);
    });

    window.addEventListener('keyup', (evt) => {
        player.keyUp(evt);
        if (evt.key.toLowerCase() === 'm') mapViewPort.needsRender = false;
    })

    window.addEventListener('keydown', (evt) => {
        player.keyDown(evt);
        if (evt.key.toLowerCase() === 'm') mapViewPort.needsRender = true;
    })

    const octreeHelper = new OctreeHelper(octree);
    octreeHelper.visible = false;
    scene.add(octreeHelper);

    const params = {showSide: false};


    gui.hide();
    gui.add(octreeHelper, 'visible').name('Octree Helper');
    gui.add(params, 'showSide').name('show side').onChange((flag) => {
        viewPort.changeVisible(flag);
    })

    function createSideViewPort() {
        const s = 15, aspect = window.innerWidth / window.innerHeight;
        const camera = new OrthographicCamera(-s, s, s * aspect, -s * aspect, 1, 500);
        camera.layers.mask = layerMap.DEBUG;

        const renderer = new WebGLRenderer({ antialias: true });
        const dom = document.createElement('div');
        document.body.appendChild(dom);
        dom.appendChild(renderer.domElement);

        dom.style.position = 'absolute';
        dom.style.top = '0px';

        resize();
        function resize() {
            renderer.setSize(window.innerWidth / 3, window.innerHeight / 3);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.top = s * camera.aspect;
            camera.bottom = -s * camera.aspect;
            camera.updateProjectionMatrix();
        }

        const distance = 30;
        const direction = new Vector3();
        function updateCameraPos() {
            direction.copy(player.eyeDirection);
            direction.y = 0;
            direction.normalize();
            // 计算相机target的位置，在player的位置上加上视野方向的一段距离，在player之前
            camera.position.copy(player.position).add(direction.multiplyScalar(-distance));
            // 固定高度
            camera.position.y = 50;
            camera.lookAt(player.position);
            camera.updateProjectionMatrix();
        }
        let visible = false;

        return {
            changeVisible(flag) {
                visible = flag;
                dom.style.display = visible ? 'block' : 'none';
                if (flag) {
                    resize();
                    updateCameraPos();
                    renderer.render(scene, camera);
                }
            },
            resize,
            render() {
                if (visible) {
                    updateCameraPos();
                    renderer.render(scene, camera);
                }
            }
        }
    }

    function createMapViewPort() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 265;
        const ctx = canvas.getContext('2d');
        maze.mesh.geometry.maze.draw(ctx);

        const fullScreen = new FullScreenQuad(
            new ShaderMaterial({
                uniforms: {tDiffuse: { value: new CanvasTexture(canvas) }},
                vertexShader:/*glsl*/`
                varying vec2 vUv;
                    void main(){
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader:/*glsl*/`
                    uniform sampler2D tDiffuse;
                    varying vec2 vUv;
                    void main(){
                        vec2 flippedUV = vec2(vUv.x, 1.0 - vUv.y);
                        gl_FragColor = texture2D(tDiffuse, flippedUV);
                    }

                `
            })
        )

        const material = new ShaderMaterial({
            uniforms: {
                color: { value: new Color('#ff0000') },
                triangleSize: { value: new Vector2(1.0, 2.0) }
            },
            depthTest: false,
            vertexShader:/*glsl*/`
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }

            `,
            fragmentShader: /*glsl*/`
                uniform vec3 color;
                uniform vec2 triangleSize;
                varying vec2 vUv;
                bool isPointInTriangle(vec2 coord, vec2 size) {
                    // 标准三角形顶点
                    vec2 v0 = vec2(0.0, size.y / 2.0); // 顶点
                    vec2 v1 = vec2(-size.x / 2.0, -size.y / 2.0); // 左下角
                    vec2 v2 = vec2(size.x / 2.0, -size.y / 2.0); // 右下角

                    // 边的向量
                    vec2 e0 = v1 - v0;
                    vec2 e1 = v2 - v1;
                    vec2 e2 = v0 - v2;

                    // 点到各边的向量
                    vec2 p0 = coord - v0;
                    vec2 p1 = coord - v1;
                    vec2 p2 = coord - v2;

                    // 叉积，用于计算点是否在边的内部
                    float c0 = e0.x * p0.y - e0.y * p0.x;
                    float c1 = e1.x * p1.y - e1.y * p1.x;
                    float c2 = e2.x * p2.y - e2.y * p2.x;

                    // 如果点都在边的内部，叉积符号应该一致
                    return (c0 > 0.0 && c1 > 0.0 && c2 > 0.0) || (c0 < 0.0 && c1 < 0.0 && c2 < 0.0);
                }

                void main() {
                    vec2 coord = vUv * 2.0 - 1.0; // 将 gl_PointCoord 转换到 -1 到 1 的范围
                    if (isPointInTriangle(coord, triangleSize)) {
                        gl_FragColor = vec4(color, 1.0); // 在三角形内设置为红色
                    } else {
                        discard; // 在三角形外丢弃像素
                    }
                }
            `
        });
        const mark = new Mesh(new PlaneGeometry(1, 1), material);
        mark.scale.multiplyScalar(0.1);
        fullScreen._mesh.add(mark);

        const size = new Vector3();
        maze.mesh.geometry.boundingBox.getSize(size);

        const halfSize = new Vector2(size.x, size.z).multiplyScalar(0.5);
        const mat4 = new Matrix4().set(
            0, 0, 1 / halfSize.x, 0, // 第一行
            1 / halfSize.y, 0, 0, 0, // 第二行
            0, 0, 0, 0,             // 第三行
            0, 0, 0, 1              // 第四行
        );

        const direction = new Vector3();
        function updatePoint() {
            // 三角标记
            mark.position.copy(player.position).applyMatrix4(mat4);
            direction.copy(player.eyeDirection); // 获取相机的世界方向
            const angleY = Math.atan2(direction.x, direction.z);
            mark.rotation.z = angleY - HALF_PI;
        }
        return {
            needsRender: false,
            render(renderer) {
                updatePoint();
                renderer.setScissor(0, 0, 400, 400);
                renderer.setViewport(0, 0, 400, 400);
                fullScreen.render(renderer);
            }
        }
    }

    scene.traverse((obj) => {
        obj.layers && (obj.layers.mask = layerMap.ALL);
    });
    player.eye.layers.mask = layerMap.PLAYER;
    eyeHelper.layers.mask = layerMap.DEBUG;

    const clock = initClock();
    let deltaTime = 0;
    function render() {
        deltaTime = clock.getDelta();
        renderer.setScissorTest(true);
        renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.render(scene, player.eye);
        eyeHelper.update();
        player.update(deltaTime);
        viewPort.render(scene);
        mapViewPort.needsRender && mapViewPort.render(renderer);
        renderer.setScissorTest(false);
    }
    // 首次加载
    render();
}

async function createMaze() {
    const cellSize = 5;
    const height = 10;

    const geometry = new MazeGeometry(51, 51, cellSize);
    const maze = geometry.maze;
    maze.generate(1, 1);
    maze.grid.unshift(new Array(51).fill(0));
    maze.grid.push(new Array(51).fill(0));
    maze.grid.forEach((row) => {
        row.unshift(0);
        row.push(0);
    });
    geometry.generate(height);

    const { topMaterial, groundMaterial, wallMaterial } = await createMaterial();
    const mesh = new Mesh(geometry, [topMaterial, groundMaterial, wallMaterial]);

    mesh.receiveShadow = mesh.castShadow = true;

    async function createMaterial() {
        loader.setPath(`../../${Image_Path}/Stylized_Bricks/`);

        const wallColorMap = await loader.loadAsync(`baseColor.jpg`);
        const wallNormalMap = await loader.loadAsync(`normal.jpg`);
        const wallRoughnessMap = await loader.loadAsync(`roughness.jpg`);
        const wallAOMap = await loader.loadAsync(`ambientOcclusion.jpg`);

        loader.setPath(`../../${Image_Path}/Stylized_Stone/`);
        const groundColorMap = await loader.loadAsync(`baseColor.jpg`);
        const groundNormalMap = await loader.loadAsync(`normal.jpg`);
        const groundRoughnessMap = await loader.loadAsync(`roughness.jpg`);
        const groundAOMap = await loader.loadAsync(`ambientOcclusion.jpg`);

        [wallColorMap, wallNormalMap, wallRoughnessMap, wallAOMap].forEach((texture) => {
            texture.wrapT = RepeatWrapping;
            texture.repeat.set(1, 2);
        });

        [groundColorMap, groundNormalMap, groundRoughnessMap, groundAOMap].forEach((texture) => {
            texture.wrapT = texture.wrapS = RepeatWrapping;
            texture.repeat.set(2, 2);
        });

        const groundMaterial = new MeshPhysicalMaterial({
            map: groundColorMap,
            normalMap: groundNormalMap,
            roughnessMap: groundRoughnessMap,
            aoMap: groundAOMap,
        });
        const wallMaterial = new MeshPhysicalMaterial({
            map: wallColorMap,
            normalMap: wallNormalMap,
            roughnessMap: wallRoughnessMap,
            aoMap: wallAOMap,
        });
        const topMaterial = new MeshPhysicalMaterial({
            map: wallColorMap,
            normalMap: wallNormalMap,
            roughnessMap: wallRoughnessMap,
            aoMap: wallAOMap,
        });

        return {
            wallMaterial,
            groundMaterial,
            topMaterial
        }
    }

    return {mesh}
}

function addLight(scene) {
    const light = initDirectionLight();
    light.position.set(-50, 200, 25);
    light.shadow.camera.left = -200;
    light.shadow.camera.right = 200;
    light.shadow.camera.top = 180;
    light.shadow.camera.bottom = -180;
    light.shadow.camera.far = 270;
    light.shadow.mapSize.height = 4096;
    light.shadow.mapSize.width = 4096;
    scene.add(light);
}

class Player extends Mesh {
    constructor(octree) {
        super(new CapsuleGeometry(1, 4), new MeshNormalMaterial());
        this.geometry.translate(0, 3, 0);

        this.layers.mask = layerMap.DEBUG;

        this.eye = new PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
        this.eye.layers.mask = layerMap.PLAYER;
        this.eye.lookAt(new Vector3(1, 0, 0));

        this.controls = new PointerLockControls(this.eye, document.body);

        this.walkSpeed = 5;
        this.currentSpeed = 0;
        this.runSpeed = 8;
        this.acceleration = 2;
        this.shape = new Capsule(new Vector3(0, 0, 0), new Vector3(0, 6, 0), 1);

        this.deltaPos = new Vector3();
        this.octree = octree;
        this.velocity = new Vector2();
        this.velocityVertical = 0;

        this.keyMap = {
            w: 'w',
            a: 'a',
            s: 's',
            d: 'd',
            shift: 'shift',
            ' ': 'space',
        }

        this.keyState = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false,
            space: false,
        }
        this.onFloor = false;
        this.euler = new Euler();
        this.add(this.eye);
        this.eye.position.set(0, 6, 0);

        this.gravity = -12;

        this.direction = new Vector3();
        this.eyeDirection = new Vector3();
    }

    keyDown(event) {
        const key = this.keyMap[event.key.toLowerCase()];
        this.keyState[key] = true;
    }

    keyUp(event) {
        const key = this.keyMap[event.key.toLowerCase()];
        this.keyState[key] = false;
    }

    update(dt) {
        this._updateVelocity(dt);
        this._updatePosition(dt);
        // 修复位置
        this._fixedPosition();
        this.updateEyeDirection();
    }

    _updateVelocity(dt) {
        this.velocity.set(0, 0);

        if (this.keyState.w) this.velocity.y += 1;
        if (this.keyState.s) this.velocity.y -= 1;
        if (this.keyState.a) this.velocity.x -= 1;
        if (this.keyState.d) this.velocity.x += 1;
        if (!this.onFloor) this.velocityVertical += this.gravity * dt;
        if (this.keyState.space && this.onFloor) {
            this.velocityVertical = 7;
        }

        this.currentSpeed = clamp(this.currentSpeed + (symbolFlag(this.keyState.shift) * this.acceleration * dt), this.walkSpeed, this.runSpeed);
        this.velocity.normalize().multiplyScalar(this.currentSpeed);
    }

    _updatePosition(dt) {
        this.deltaPos.copy(this.position);

        this.direction.setFromMatrixColumn(this.eye.matrix, 0);
        this.position.addScaledVector(this.direction, dt * this.velocity.x);
        this.direction.crossVectors(this.up, this.direction);
        this.position.addScaledVector(this.direction, dt * this.velocity.y);
        this.position.y += dt * this.velocityVertical;

        this.deltaPos.subVectors(this.position, this.deltaPos);
        this.shape.translate(this.deltaPos);
    }

    _fixedPosition() {
        const result = this.octree.capsuleIntersect(this.shape);
        this.onFloor = false;
        if (result) {
            this.onFloor = result.normal.y > 0;
            this.deltaPos.copy(result.normal).multiplyScalar(result.depth);
            this.position.add(this.deltaPos);
            this.shape.translate(this.deltaPos);
        }

    }
    updateEyeDirection() {
        this.eye.getWorldDirection(this.eyeDirection)
    }
}