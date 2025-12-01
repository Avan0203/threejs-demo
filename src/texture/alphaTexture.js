/*
 * @Author: wuyifan0203 1208097313@qq.com
 * @Date: 2025-03-18 17:00:40
 * @LastEditors: wuyifan0203 1208097313@qq.com
 * @LastEditTime: 2025-03-19 16:36:48
 * @FilePath: \threejs-demo\src\texture\alphaTexture.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    PlaneGeometry,
    MeshStandardMaterial,
    InstancedMesh,
    Object3D,
    MathUtils,
    EquirectangularReflectionMapping,
    HalfFloatType,
    WebGLCubeRenderTarget,
    CubeCamera,
    Vector3
} from 'three';
import {
    initRenderer,
    initPerspectiveCamera,
    initOrbitControls,
    initScene,
    resize,
    initLoader,
    Image_Path,
    initDirectionLight,
    initAmbientLight,
    initGUI
} from '../lib/tools/index.js';

const { randFloat } = MathUtils;

window.onload = () => {
    init();
};

async function init() {
    const renderer = initRenderer();
    const camera = initPerspectiveCamera(new Vector3(10, 5, 10));

    const scene = initScene();
    initAmbientLight(scene);
    const light = initDirectionLight();
    light.position.set(0, 10, 10);
    scene.add(light);

    const cubeTarget = new WebGLCubeRenderTarget(256, { type: HalfFloatType });
    const cubeCamera = new CubeCamera(0.1, 100, cubeTarget);
    // scene.add(cubeCamera);

    const controls = initOrbitControls(camera, renderer.domElement);

    const loader = initLoader();
    const alphaMap = await loader.load(`../../${Image_Path}/door/grass1.webp`);

    loader.load(`../../${Image_Path}/hdr/OutdoorField.hdr`, (texture) => {
        texture.mapping = EquirectangularReflectionMapping;
        scene.background = scene.environment = texture;
        cubeCamera.update(renderer, scene);
    });

    const params = { count: 1000 };
    const dummy = new Object3D();
    const material = new MeshStandardMaterial({
        alphaMap,
        color: '#869943',
        side: 2,
        alphaTest: 0.5,
        transparent: true,
        opacity: 1,
        premultipliedAlpha: true
    });
    const geometry = new PlaneGeometry(2, 1);
    let mesh;

    function createGrass() {
        mesh && mesh.removeFromParent();
        mesh = new InstancedMesh(geometry, material, params.count);

        for (let i = 0; i < 800; i++) {
            dummy.position.set(Math.cos(i) * randFloat(-5, 5), 0, Math.sin(i) * randFloat(-5, 5));
            dummy.rotation.y = randFloat(0, Math.PI * 2);
            dummy.scale.setScalar(randFloat(0.5, 1));
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        scene.add(mesh);
    }

    createGrass();

    function render() {
        controls.update();
        cubeCamera.update(renderer, scene);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();
    resize(renderer, camera);

    const gui = initGUI();
    gui.add(params, 'count', 1000, 10000, 100).onChange(createGrass);
    gui.add(material, 'opacity', 0, 1, 0.01);
    gui.add(material, 'alphaTest', 0, 1, 0.01);
    gui.add(material, 'side', [0, 1, 2]);
    gui.add(material, 'transparent');
    gui.add(material, 'premultipliedAlpha');
}