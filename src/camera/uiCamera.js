/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-12-03 01:00:16
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-12-04 16:50:30
 * @FilePath: \threejs-demo\src\camera\uiCamera.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    BoxGeometry,
    MeshNormalMaterial,
    OrthographicCamera,
    Vector3,
    Color,
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initOrbitControls,
    initScene,
    resize,
    initCustomGrid,
    initAxesHelper,
    Public_Path
} from '../lib/tools/index.js';
import { gsap } from '../lib/other/gsap.js'
import { SDFTextLoader } from '../lib/custom/SDFTextLoader.js';

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    renderer.autoClear = false;
    const camera = initOrthographicCamera(new Vector3(0, 0, 1000));
    camera.zoom = 0.3;
    camera.updateProjectionMatrix();

    const uiCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    uiCamera.position.set(0, 0, 1); // 放在Z轴上朝向原点
    uiCamera.lookAt(0, 0, 0);
    const uiScene = initScene();


    const scene = initScene();

    const controls = initOrbitControls(camera, renderer.domElement);

    const mesh2 = new Mesh(new BoxGeometry(100, 100, 1), new MeshNormalMaterial());
    uiScene.add(mesh2);

    initCustomGrid(scene);
    initAxesHelper(scene);

    const path = `../../${Public_Path}/fonts/Miso_Fish.fnt`;
    const sdfTextLoader = new SDFTextLoader();

    // 第一次加载（会真正加载资源）
    sdfTextLoader.load(path, (font) => {
        const text = font.createText('Hello ! \nThis is UI text', { size: 1, billboard: false });
        text.position.set(200, 300, 0);
        uiScene.add(text);

        const text3 = font.createText(`
            H
            e
            l
            l
            o
            `, { size: 1, billboard: false, color: '#ff9900' });
        text3.position.set(1000, 500, 0);
        uiScene.add(text3);

        const text2 = font.createText('Hello World \nI am billboard text', { size: 0.1, billboard: true, color: '#b6dd5d' });
        scene.add(text2);
        text2.position.set(5, 0, 0);

        // 第一次加载完成后，再次调用测试缓存命中
        sdfTextLoader.load(path, (font) => {
            const text = font.createText('support cache hit',
                {
                    size: 0.5,
                    billboard: false,
                    color: '#00ffff'
                });
            text.position.set(0, 500, 0);
            uiScene.add(text);
        });
    });

    // 同时调用（会进入"正在加载"队列）
    sdfTextLoader.load(path, (font) => {
        const text = font.createText('concurrent load (in queue)', { size: 0.5, billboard: false });
        text.position.set(0, 600, 0);
        uiScene.add(text);

        const text4 = font.createText([
            { content: 'R', color: 'red' },
            { content: 'G', color: '#00ff00' },
            { content: 'B', color: '#00aaff' },
        ], { size: 0.2, billboard: false });
        text4.position.set(10, 15, 0);
        scene.add(text4);

        const text5 = font.createText(`
            Miso Fish font by MJType is a free brush font that captures the feel of thick, inky marker strokes on a fresh page. The letters are rounded, slightly bouncy, and pleasantly chunky, like hand-scrawled notes on a café chalkboard or a kid’s sketchbook. It has just enough wobble to feel human and warm, but stays clean and legible when you scale it up for bold headlines or titles.

Using Miso Fish, this free font shines on food packaging, kids’ books, playful logos, posters, social media graphics, and DIY craft prints. Its casual rhythm and soft curves instantly relax a layout and make messages feel friendly and approachable. For balance, pair Miso Fish with a simple, neutral sans serif in smaller text, letting the brush script handle the loud, fun moments up top.`
            , { size: 0.04, billboard: false, maxWidth: 20, color: '#3451b6' });
        text5.position.set(-15, 15, 0);
        text5.rotation.set(-Math.PI / 4, 0, 0);

        scene.add(text5);

        // 使用 GSAP 动画化 text5 的颜色：三个颜色插值变换（蓝色 -> 绿色 -> 红色）
        const colorUniform = text5.material.uniforms.color.value;
        const color1 = new Color('#3451b6'); // 蓝色
        const color2 = new Color('#f7e00e'); // 绿色
        const color3 = new Color('#ff0000'); // 红色

        // 创建颜色对象用于动画
        const colorObj = {
            r: color1.r,
            g: color1.g,
            b: color1.b
        };

        // 统一的更新函数
        const updateColor = function () {
            colorUniform.r = colorObj.r;
            colorUniform.g = colorObj.g;
            colorUniform.b = colorObj.b;
        };

        // 使用 timeline 创建三个颜色的平滑过渡
        const tl = gsap.timeline({
            repeat: -1, // 无限循环
            ease: 'power2.inOut' // jet 插值
        });

        // 蓝色 -> 绿色 (0-1.33秒)
        tl.to(colorObj, {
            r: color2.r,
            g: color2.g,
            b: color2.b,
            duration: 3 / 3, // 总时长 3 秒，每个阶段约 1 秒
            ease: 'power2.inOut',
            onUpdate: updateColor
        })
            // 绿色 -> 红色 (1.33-2.67秒)
            .to(colorObj, {
                r: color3.r,
                g: color3.g,
                b: color3.b,
                duration: 3 / 3,
                ease: 'power2.inOut',
                onUpdate: updateColor
            })
            // 红色 -> 蓝色 (2.67-4秒)
            .to(colorObj, {
                r: color1.r,
                g: color1.g,
                b: color1.b,
                duration: 3 / 3,
                ease: 'power2.inOut',
                onUpdate: updateColor
            });
    });



    function render() {
        renderer.clear();
        controls.update();

        renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(uiScene, uiCamera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera, (w, h) => {
        const aspect = w / h;
        const viewSize = h / 2;

        uiCamera.left = -aspect * viewSize;
        uiCamera.right = aspect * viewSize;
        uiCamera.top = viewSize;
        uiCamera.bottom = -viewSize;
        uiCamera.updateProjectionMatrix();
        uiScene.position.set(-w / 2, -h / 2, 0);
    });
}