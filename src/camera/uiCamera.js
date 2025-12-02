/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-12-03 01:00:16
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-03 01:10:18
 * @FilePath: /threejs-demo/src/camera/uiCamera.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    BoxGeometry,
    MeshNormalMaterial,
    OrthographicCamera,
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initCustomGrid,
    initAxesHelper,
    initOrbitControls,
    initScene,
    resize,
    initLoader,
    Model_Path
} from '../lib/tools/index.js';

const loader = initLoader();

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    renderer.autoClear = false;
    const camera = initOrthographicCamera();
    camera.up.set(0, 0, 1);
    camera.updateProjectionMatrix();

    const uiCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    uiCamera.position.set(0, 0, 1); // 放在Z轴上朝向原点
    uiCamera.lookAt(0, 0, 0);
    const uiScene = initScene();


    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0xffffff);
    initCustomGrid(scene);

    const controls = initOrbitControls(camera, renderer.domElement);
    const mesh = new Mesh(new BoxGeometry(3, 3, 3), new MeshNormalMaterial());
    scene.add(mesh);

    const mesh2 = new Mesh(new BoxGeometry(100, 100, 1), new MeshNormalMaterial());
    uiScene.add(mesh2);

    loader.load(`../../${Model_Path}/burnout_lake.usdz`, (model) => {
        scene.add(model);
    });

    function render() {
        renderer.clear();
        controls.update();

        // renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(uiScene, uiCamera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera, (w, h) => {
        const aspect = w / h;
        const viewSize = h / 2; // 你希望 UI 保持单位比例

        uiCamera.left = -aspect * viewSize;
        uiCamera.right = aspect * viewSize;
        uiCamera.top = viewSize;
        uiCamera.bottom = -viewSize;
        uiCamera.updateProjectionMatrix();
        uiScene.position.set(-w / 2, -h / 2, 0);
    });
}