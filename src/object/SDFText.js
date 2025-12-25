/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-12-10 17:14:23
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-11 17:33:55
 * @FilePath: \threejs-demo\src\object\SDFText.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import { Vector3, MathUtils } from 'three';
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
    rainbowColors,
    getRainbowColor,
} from '../lib/tools/index.js';
import { SDFTextLoader } from '../lib/custom/SDFTextLoader.js';

const { randFloat } = MathUtils;

window.onload = () => {
    init();
};

async function init() {
    const renderer = initRenderer();
    const camera = initOrthographicCamera(new Vector3(23, -41, 33));
    camera.up.set(0, 0, 1);
    camera.zoom = 0.4;
    camera.updateProjectionMatrix();

    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0xffffff);
    initCustomGrid(scene);

    const controls = initOrbitControls(camera, renderer.domElement);

    const path = `../../${Public_Path}/fonts/`;
    const fontType = ['Miso_Fish', 'Microsoft_YaHei'];


    const sdfTextLoader = new SDFTextLoader();
    const fonts = await Promise.all(fontType.map((type) => {
        return sdfTextLoader.loadAsync(`${path}${type}.fnt`);
    }));

    const MisoFishFont = fonts[0];
    const MicrosoftYaHeiFont = fonts[1];

    const params = {
        fontType: fontType[0],
        size: 0.1,
        billboard: false,
        side: 2,
        content: '',
        createText: () => {
            const font = params.fontType === fontType[0] ? MisoFishFont : MicrosoftYaHeiFont;
            const mesh =  font.createText(params.content, { 
                size: params.size, 
                billboard: params.billboard, 
                color: getRainbowColor(),
                side: params.side 
            });
            scene.add(mesh);
            mesh.position.set(randFloat(-10, 10), randFloat(-10, 10), randFloat(-10, 10));
            mesh.rotation.x = randFloat(-Math.PI, Math.PI);
            mesh.rotation.y = randFloat(-Math.PI, Math.PI);
            mesh.rotation.z = randFloat(-Math.PI, Math.PI);
        }
    };

    const text1 = MisoFishFont.createText('Hello! This is a SDFText',
        { size: 0.06, billboard: false, side: 2 }
    );
    text1.position.set(-20, 0, 5);
    scene.add(text1);

    const text2 = MicrosoftYaHeiFont.createText(`void main() {
        float a = sin(time);
        float b = cos(time);
        gl_Position = vec4(a, b, 0.0, 1.0);
    }`, { size: 0.05, billboard: false, side: 2 });
    text2.rotation.x = Math.PI / 2;
    text2.position.set(0, 0, 10);
    scene.add(text2);

    const text3 = MisoFishFont.createText(rainbowColors.map(color => {
        return { content: color + '\n', color: color };
    }), { size: 0.04, billboard: false });
    text3.position.set(0, 0, 10);
    scene.add(text3);

    const text4 = MicrosoftYaHeiFont.createText('我zui爱口可乐\nbaishi可乐不好he', { color: '#3451b6', size: 0.04, billboard: true, side: 2 });
    text4.position.set(0, 0, 0);
    scene.add(text4);


    function render() {
        controls.update();

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera);
    const gui = initGUI();
    gui.add(params, 'fontType', fontType);
    gui.add(params, 'size').min(0.01).max(2).step(0.01);
    gui.add(params, 'billboard');
    gui.add(params, 'side', [0, 2]);
    gui.add(params, 'content');
    gui.add(params, 'createText');

}