/*
 * @Date: 2023-05-17 19:27:06
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2026-02-08 15:49:34
 * @FilePath: \threejs-demo\src\controls\useBlenderControls.js
 */
import {
    Vector3,
    Mesh,
    MeshNormalMaterial,
    BoxGeometry,
} from 'three';
import {
    initRenderer,
    initAxesHelper,
    initCustomGrid,
    resize,
    initOrthographicCamera,
    initScene,
    initViewHelper,
    initGUI
} from '../lib/tools/index.js';
import { OrbitControlsBlender as BlenderControls } from '../lib/custom/OrbitControlsBlender.js';

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    const camera = initOrthographicCamera(new Vector3(1000, 1000, 1000));
    const scene = initScene();
    renderer.setClearColor(0xffffff);
    renderer.autoClear = false;

    resize(renderer, camera);
    initCustomGrid(scene);
    initAxesHelper(scene);

    const viewHelper = initViewHelper(camera, renderer.domElement);
    const controls = new BlenderControls(camera, renderer.domElement);

    function update() {
        renderer.clear();
        controls.update();
        renderer.render(scene, camera);
        viewHelper.render(renderer);
    }

    function render() {
        update()
        requestAnimationFrame(render);
    }
    render();


    const gui = initGUI();
    gui.add(controls, 'unlimited').name('unlimited');

    const geometry = new BoxGeometry(4, 4, 4);
    const material = new MeshNormalMaterial({});

    const mesh = new Mesh(geometry, material);

    const mesh1 = new Mesh(geometry, material);
    mesh1.position.set(2, 2, 0)

    scene.add(mesh, mesh1);
}
