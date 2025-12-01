/*
 * @Author: wuyifan0203 1208097313@qq.com
 * @Date: 2024-09-23 16:10:38
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-01 17:19:20
 * @FilePath: \threejs-demo\src\loader\usdzLoader.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js';
import {
    initRenderer,
    initPerspectiveCamera,
    resize,
    initGUI,
    initScene,
    initOrbitControls,
    initAmbientLight
} from '../lib/tools/index.js';
import {
    Vector3,
    Mesh,
    Shape,
    SpotLight,
    SpotLightHelper,
    ShapeGeometry,
    MeshPhongMaterial,
} from 'three';
import { Model_Path, PI } from '../lib/tools/constant.js'

window.onload = () => {
    init();
};

async function init() {
    const renderer = initRenderer();
    renderer.setClearColor('#000000')
    // 1
    renderer.shadowMap.enabled = true;
    const camera = initPerspectiveCamera(new Vector3(6, -64, 41));
    camera.up.set(0, 0, 1);

    const scene = initScene();

    initAmbientLight(scene);

    const light = new SpotLight(0xffffff, 3 * Math.PI, 180, 0.58, 1, 0.1);
    light.shadow.mapSize.height = 2048;
    light.shadow.mapSize.width = 2048;
    light.position.set(3.3, 10, 100);
    light.castShadow = true;
    scene.add(light);
    const spotLightHelper = new SpotLightHelper(light);
    spotLightHelper.visible = false;
    scene.add(spotLightHelper);

    const circleRadius = 80;
    const circleShape = new Shape()
        .moveTo(0, circleRadius)
        .absarc(0, 0, circleRadius, 0, Math.PI * 2, false);
    const groundPlane = new Mesh(
        new ShapeGeometry(circleShape),
        new MeshPhongMaterial(),
    );

    scene.add(groundPlane);

    groundPlane.rotation.z = -0.5 * Math.PI;
    groundPlane.receiveShadow = true;

    const controls = initOrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.target.set(-0.7, 6, 9);
    resize(renderer, camera);

    const loader = new USDLoader();
    const object = await loader.loadAsync(`../../${Model_Path}/saeukkang.usdz`);

    object.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    })
    object.scale.set(20, 20, 20);
    object.position.set(0, 0, 20);
    object.rotation.set(PI, 0, 0);
    scene.add(object);


    const gui = initGUI();

    const updateHelper = () => spotLightHelper.update();

    gui.add(light, 'decay', 0, 15.01);
    gui.add(light, 'angle', 0, Math.PI * 2).onChange(updateHelper);
    gui.add(light, 'intensity', 0, 10).onChange(updateHelper);
    gui.add(light, 'penumbra', 0, 1).onChange(updateHelper);
    gui.add(light, 'distance', 0, 200).onChange(updateHelper);
    gui.add(light, 'castShadow');

    gui.add(spotLightHelper, 'visible').name('show helper');
    gui.add(controls, 'autoRotate').name('auto rotate');


    function render(dt) {
        controls.update();
        object.position.z = 0.5 * Math.sin(dt * 0.005) + 20;
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();


};