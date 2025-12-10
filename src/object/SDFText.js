/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-12-10 17:14:23
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-10 17:34:15
 * @FilePath: \threejs-demo\src\object\SDFText.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    BoxGeometry,
    MeshNormalMaterial,
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initCustomGrid,
    initAxesHelper,
    initOrbitControls,
    initScene,
    initGUI,
    resize,
    Public_Path,
    rainbowColors
} from '../lib/tools/index.js';
import { SDFTextLoader } from '../lib/custom/SDFTextLoader.js';

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    const camera = initOrthographicCamera();
    camera.up.set(0, 0, 1);
    camera.updateProjectionMatrix();

    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0xffffff);
    initCustomGrid(scene);

    const controls = initOrbitControls(camera, renderer.domElement);
    const mesh = new Mesh(new BoxGeometry(3, 3, 3), new MeshNormalMaterial());
    scene.add(mesh);

    const path = `../../${Public_Path}/fonts/`;

    const fontType = ['Miso_Fish', 'Microsoft_YaHei'];

    const text = [
        'Hello World',
        `void main() {
            float a = sin(time);
            float b = cos(time);
            gl_Position = vec4(a, b, 0.0, 1.0);
        }`,
        rainbowColors.map(color => {
            return { content: color, color: color };
        })
    ];
    console.log(text);

    const params = { fontType: fontType[1], };

    const sdfTextLoader = new SDFTextLoader();
    fontType.forEach((type, layer) => {
        text.forEach(text => {
            sdfTextLoader.load(`${path}${type}.fnt`, (font) => {
                const textMesh = font.createText(text, { size: 0.1, billboard: false });
                textMesh.layers.set(layer);
                scene.add(textMesh);
            });
        });
    });


    function render() {
        controls.update();

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera);
    const gui = initGUI();
    gui.add(params, 'fontType', fontType).onChange(() => {

    })
}