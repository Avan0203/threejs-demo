/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-07-04 00:55:23
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2026-01-30 16:29:38
 * @FilePath: \threejs-demo\src\intersection\gpuPick.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    BoxGeometry,
    MeshNormalMaterial,
    MeshBasicMaterial,
    Group,
    MeshPhongMaterial,
    Color,
    WebGLRenderTarget,
    Vector2,
    Vector3,
    CameraHelper,
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initOrbitControls,
    initScene,
    initGUI,
    resize,
    getColor,
    initAmbientLight,
    initDirectionLight,
} from '../lib/tools/index.js';
import { createRandom } from '../lib/tools/math.js';
import { printRenderTarget } from '../lib/util/catch.js';

window.onload = () => {
    init();
};

const highlightSet = new Set();

function init() {
    const renderer = initRenderer();
    renderer.autoClear = false;
    const camera = initOrthographicCamera(new Vector3(500, 500, 500));
    camera.up.set(0, 0, 1);
    camera.far = 1000;
    camera.zoom = 0.2;
    camera.updateProjectionMatrix();

    const controls = initOrbitControls(camera, renderer.domElement);
    // controls.enableZoom = false;

    const pickScene = initScene();
    pickScene.background = new Color(0x000000);
    const scene = initScene();
    scene.background = new Color(0xf0f0f0);

    const light = initDirectionLight();
    light.position.set(0, -1000, 1000);
    scene.add(light);
    initAmbientLight(scene);

    const params = {
        count: 1000,
        pickRange: 1, // 1,3,5,10
        objectType: 'mesh', //  mesh | instance
        debuggerMode: false
    };

    let enablePick = true;
    const geometry = new BoxGeometry(3, 3, 3);
    const renderSize = new Vector2();
    const mouse = new Vector2();
    const startPos = new Vector2();
    const debuggerTarget = new WebGLRenderTarget({ depthBuffer: true });

    // pick
    const pickTarget = new WebGLRenderTarget({ depthBuffer: true });
    let pickContent = new Uint8Array();
    const pickOrder = [];
    const pickGroup = new Group();


    // object
    const meshMap = new Map();
    const meshGroup = new Group();

    scene.add(meshGroup);
    pickScene.add(pickGroup);

    function clear() {
        while (meshGroup.children.length > 0) {
            const mesh = meshGroup.children[0];
            mesh.material.dispose();
            meshGroup.remove(mesh);
        }
        while (pickGroup.children.length > 0) {
            const obj = pickGroup.children[0];
            obj.material.dispose();
            pickGroup.remove(obj);
        }
        meshMap.clear();
    }

    function updateCount() {
        clear();

        for (let i = 0; i < params.count; i++) {
            const id = (i + 1) + i * 50;
            const mesh = new Mesh(geometry, new MeshPhongMaterial({ color: getColor(i) }));

            mesh.position.x = createRandom(-100, 100);
            mesh.position.y = createRandom(-100, 100);
            mesh.position.z = createRandom(-100, 100);

            mesh.rotation.x = createRandom(0, 2 * Math.PI);
            mesh.rotation.y = createRandom(0, 2 * Math.PI);
            mesh.rotation.z = createRandom(0, 2 * Math.PI);
            mesh.userData.pickID = id;

            mesh.updateMatrix();
            meshGroup.add(mesh);
            meshMap.set(id, mesh);

            const pickMesh = new Mesh(geometry, new MeshBasicMaterial({ color: new Color(...id2color(id)).multiplyScalar(1 / 255) }));
            pickMesh.matrix.copy(mesh.matrix);
            pickMesh.matrix.decompose(pickMesh.position, pickMesh.quaternion, pickMesh.scale);

            pickGroup.add(pickMesh);
        }
    }

    function preparePick() {
        pickContent = new Uint8Array(params.pickRange * params.pickRange * 4);
        pickContent.fill(0);

        createSpiralOrder(params.pickRange, params.pickRange, pickOrder);
        renderer.getSize(renderSize);
        pickTarget.setSize(params.pickRange, params.pickRange);
    }

    const tmpCamera = camera.clone();
    const helper = new CameraHelper(tmpCamera);
    helper.visible = false;
    pickScene.add(helper);

    function pickObject() {
        preparePick();

        const length = params.pickRange * 2;

        renderer.setRenderTarget(pickTarget);
        camera.setViewOffset(
            renderSize.x, renderSize.y,
            mouse.x - params.pickRange,
            mouse.y - params.pickRange,
            length, length,
        );

        tmpCamera.copy(camera);
        tmpCamera.position.copy(camera)
        tmpCamera.updateProjectionMatrix();
        helper.update();
        helper.visible = false;

        renderer.render(pickScene, camera);
        renderer.readRenderTargetPixels(pickTarget, 0, 0, params.pickRange, params.pickRange, pickContent);
        camera.clearViewOffset();
        renderer.setRenderTarget(null);
        helper.visible = true;


        // get picked object
        for (let i of pickOrder) {
            const index = i * 4;
            // r,g,b
            const id = color2id(pickContent[index], pickContent[index + 1], pickContent[index + 2]);
            if (meshMap.has(id)) {
                const res = meshMap.get(id);
                return res;
            }
        }
        return null;
    }

    function clearHighlight() {
        Array.from(highlightSet).forEach((mesh) => {
            mesh.material = mesh.userData.material;
        });
        highlightSet.clear();
    }

    updateCount();

    const highlightMaterial = new MeshNormalMaterial();


    renderer.domElement.addEventListener('click', ({ clientX, clientY }) => {
        if (!enablePick) {
            return;
        }
        mouse.set(clientX, clientY);
        const result = pickObject();
        if (result) {
            if (!highlightSet.has(result)) {
                highlightSet.add(result);
                result.userData.material = result.material;
                result.material = highlightMaterial;

            }
            if (params.debuggerMode) {
                printRenderTarget('pick', renderer, pickTarget);
            }
        }
        render();
    })

    renderer.domElement.addEventListener('mousedown', ({ clientX, clientY }) => {
        startPos.set(clientX, clientY);
    });
    renderer.domElement.addEventListener('mouseup', ({ clientX, clientY }) => {
        enablePick = startPos.distanceTo({ x: clientX, y: clientY }) < 1;
    });
    renderer.domElement.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        clearHighlight();
        render();
    })

    function render() {
        renderer.clear();

        if (!params.debuggerMode) {
            renderer.render(scene, camera);
        } else {
            renderer.render(pickScene, camera);
        }
    }
    render();

    controls.addEventListener('change', render)

    resize(renderer, camera, (w, h) => {
        debuggerTarget.setSize(w, h);
        renderSize.set(w, h);
        render();
    });
    const gui = initGUI();

    gui.add(params, 'count', 1000, 10000, 10).onChange(() => {
        updateCount();
        clearHighlight();
        render();
    });
    gui.add(params, 'pickRange', [1, 3, 5, 10, 30]);
    gui.add(params, 'debuggerMode').onChange(() => {
        helper.visible = params.debuggerMode;
        helper.update();
        render();
    });
}

function color2id(r, g, b) {
    return (r << 16) | (g << 8) | b;
}

function id2color(id) {
    const r = (id >> 16) & 0xff;
    const g = (id >> 8) & 0xff;
    const b = id & 0xff;
    return [r, g, b];
}

function createSpiralOrder(w, h, ret = []) {
    let u = 0;
    let d = h - 1;
    let l = 0;
    let r = w - 1;
    ret.length = 0;
    while (true) {
        // moving right
        for (let i = l; i <= r; ++i) {
            ret.push(u * w + i);
        }
        if (++u > d) {
            break;
        }
        // moving down
        for (let i = u; i <= d; ++i) {
            ret.push(i * w + r);
        }
        if (--r < l) {
            break;
        }
        // moving left
        for (let i = r; i >= l; --i) {
            ret.push(d * w + i);
        }
        if (--d < u) {
            break;
        }
        // moving up
        for (let i = d; i >= u; --i) {
            ret.push(i * w + l);
        }
        if (++l > r) {
            break;
        }
    }
    ret.reverse();
    return ret;
}