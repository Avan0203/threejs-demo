/*
 * @Date: 2023-12-18 16:50:56
 * @LastEditors: Yifan Wu 1208097313@qq.com
 * @LastEditTime: 2024-07-22 15:28:04
 * @FilePath: /threejs-demo/src/composer/useOITRenderPass.js
 */

import {
    Mesh,
    BoxGeometry,
    WebGLRenderer,
    PerspectiveCamera,
    SphereGeometry,
    MeshStandardMaterial,
    TorusKnotGeometry,
    TextureLoader,
    PlaneGeometry,
    Vector2,
    GridHelper,
} from 'three';

import {
    initOrbitControls,
    initGUI,
    initScene,
    initDirectionLight,
    createBackgroundTexture,
    initAmbientLight,
    initCoordinates
} from '../lib/tools/index.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OITRenderPass } from './OITRenderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';


window.onload = () => {
    init();
};


async function init() {

    const params = {
        layers: 3,
        showNormal: true,
        showOIT: true,
        log: false,
    }
    const dom = document.getElementById('webgl-output');
    const size = new Vector2(window.innerWidth, window.innerHeight);

    const background = initScene();
    background.background = createBackgroundTexture('#1d8dd3', '#ffffff');

    const gridScene = initScene();
    const grid = new GridHelper(50,100);
    grid.rotateX(Math.PI/2);
    gridScene.add(grid);

    const coordinateScene = initScene();
    coordinateScene.add(initCoordinates(5));

    const scene = initScene();

    const camera = new PerspectiveCamera(75, size.x / size.y, 0.1, 1000);
    camera.position.set(0, 6, 1);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, 1);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.autoClear = false;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    dom.appendChild(renderer.domElement);

    const light = initDirectionLight();
    light.position.set(0, 0, 3);
    scene.add(light);
    initAmbientLight(scene)

    const orbitControl = initOrbitControls(camera, renderer.domElement);
    // orbitControl.addEventListener('change', render);

    const sphereMesh = new Mesh(new SphereGeometry(), new MeshStandardMaterial());
    sphereMesh.position.set(1.5, 0, 3);
    sphereMesh.castShadow = true;
    scene.add(sphereMesh);

    const knotMesh = new Mesh(
        new TorusKnotGeometry(1, 0.4, 128, 32),
        new MeshStandardMaterial({ transparent: true, opacity: 0.5, side: 2 })
    );
    knotMesh.rotateX(Math.PI / 2)
    knotMesh.receiveShadow = true;
    scene.add(knotMesh);

    const boxMesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial({ color: 0xf0a000 }));
    scene.add(boxMesh);

    const loader = new TextureLoader();
    const texture1 = await loader.loadAsync('../../public/images/render/sprite.png');

    const planeGeometry = new PlaneGeometry(3, 3);
    const spriteMaterial = new MeshStandardMaterial({
        side: 2,
        map: texture1,
        transparent: true,
        alphaTest: 0.001
    });

    const planeMesh1 = new Mesh(planeGeometry, spriteMaterial);
    planeMesh1.rotateX(Math.PI / 2);
    planeMesh1.position.set(-1.6, 0, 1.5);
    scene.add(planeMesh1);

    const planeMesh2 = new Mesh(planeGeometry, spriteMaterial);
    planeMesh2.rotation.x = Math.PI / 2;
    planeMesh2.rotation.y = Math.PI * -0.2;
    planeMesh2.position.set(-1.2, 0, -1.5);
    scene.add(planeMesh2);

    // left normal render

    const bgPass = new RenderPass(background, camera);
    bgPass.clear = true;

    const gridPass = new RenderPass(gridScene, camera);
    gridPass.clear = false;

    const coordinatePass = new RenderPass(coordinateScene, camera);
    coordinatePass.clear = false;

    const effectCopy = new ShaderPass(GammaCorrectionShader);
    effectCopy.renderToScreen = true;

    const scenePass = new RenderPass(scene, camera)
    scenePass.clear = false;
    scenePass.clearDepth = true;

    const leftComposer = new EffectComposer(renderer);
    leftComposer.addPass(bgPass);
    leftComposer.addPass(scenePass);
    leftComposer.addPass(gridPass);
    leftComposer.addPass(coordinatePass);
    leftComposer.addPass(effectCopy);

    // right OIT Render 

    const oitRenderPass = new OITRenderPass(scene.clone(true), camera);
    oitRenderPass.setLayerNumber(4);
    oitRenderPass.clear = false;
    oitRenderPass.clearDepth = false;

    const rightComposer = new EffectComposer(renderer);
    rightComposer.addPass(bgPass);
    rightComposer.addPass(gridPass);
    rightComposer.addPass(oitRenderPass);
    rightComposer.addPass(coordinatePass);
    rightComposer.addPass(effectCopy);


    (function render() {
        renderer.clear();

        if (params.showNormal && params.showOIT) {
            const halfWidth = window.innerWidth / 2;
            renderer.setScissorTest(true);
            renderer.setScissor(0, 0, halfWidth - 1, window.innerHeight);
            leftComposer.render();
            renderer.setScissor(halfWidth, 0, halfWidth, window.innerHeight);
            rightComposer.render();
            renderer.setScissorTest(false);
        } else if (params.showNormal) {
            leftComposer.render();
        } else if (params.showOIT) {
            rightComposer.render();
        }
        requestAnimationFrame(render)
    })()

    resize();



    function resize() {
        size.set(window.innerWidth, window.innerHeight);
        const { x, y } = size;

        renderer.setSize(x, y);
        leftComposer.setSize(x, y);
        rightComposer.setSize(x, y);
    }

    window.addEventListener('resize', resize);

    const gui = initGUI();
    gui.add(params, 'showNormal');
    gui.add(params, 'showOIT');
    gui.add(params, 'log').onChange(() => {
        oitRenderPass.debuggerMode();
        console.log(oitRenderPass);
    }).name('debug OIT (Press F12 to Check)');
}
