/*
 * @Author: wuyifan 1208097313@qq.com
 * @Date: 2025-06-10 23:36:34
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-11-05 15:03:48
 * @FilePath: \threejs-demo\src\occt\importStep.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    Object3D,
    LineSegments,
    Vector3,
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initCustomGrid,
    initAxesHelper,
    initOrbitControls,
    initScene,
    initGUI,
    resize
} from '../lib/tools/index.js';
import { UploadUtils } from '../lib/tools/uploadUtils.js';
import { OpenCascadeBuilder } from '../lib/tools/OpenCascadeBuilder.js';

window.onload = () => {
    init();
};

async function init() {
    const renderer = initRenderer({ logarithmicDepthBuffer: true });
    const camera = initOrthographicCamera(new Vector3(1000, 1000, 1000));
    camera.up.set(0, 0, 1);
    camera.zoom = 0.1;
    camera.updateProjectionMatrix();

    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0xffffff);
    initCustomGrid(scene);

    const controls = initOrbitControls(camera, renderer.domElement);

    const container = new Object3D();
    scene.add(container);

    const builder = new OpenCascadeBuilder();
    const objectMap = new WeakMap();

    const worker = new Worker('./importStep.worker.js', { type: 'module' });

    const messageHandler = {
        init: () => {
            worker.postMessage({ type: 'init' });
        },
        build: (payload) => {
            const { faceList, edgeList } = payload
            const solid = new Mesh(builder.buildSolid(faceList), builder.material.solid);
            const edge = new LineSegments(builder.buildEdge(edgeList), builder.material.edge);

            console.timeEnd('importSTEP');
            solid.add(edge);
            container.add(solid);
            objectMap.set(payload, { solid, edge })
        }
    };

    worker.onmessage = ({ data }) => {
        const { type, payload } = data;
        if (messageHandler[type]) {
            const response = messageHandler[type](payload);
            if (response) {
                worker.postMessage({ type, payload: response });
            }
        }
    };

    function render() {
        controls.update();

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera);

    const params = {
        loadFile: (file) => {
            console.time('importSTEP');
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = () => {
                const arrayBuffer = reader.result;
                worker.postMessage({ type: 'importSTEP', payload: { arrayBuffer } }), [arrayBuffer];
            };
        },
        defaultImport: async () => {
            const response = await fetch('../../public/models/Harmonic reducer.stp');
            const blob = await response.blob();
            const file = new File([blob], 'Harmonic reducer.stp', { type: blob.type });
            params.loadFile(file);
        },
        importSTEP: async () => {
            const files = await UploadUtils.uploadFile({ formate: 'stp', mutiple: true });
            for (const file of files) {
                params.loadFile(file);
            }
        },
        clear() {
            container.traverse((obj) => {
                if (obj instanceof Mesh) {
                    container.remove(obj);
                    obj.geometry.dispose();
                    obj.material.dispose();
                }
            })
        }
    };


    // 拖拽功能
    const canvas = renderer.domElement;
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    canvas.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.stp') || fileName.endsWith('.step')) {
                params.clear();
                params.loadFile(file);
            }
        }
    });

    const gui = initGUI();
    gui.add(params, 'defaultImport');
    gui.add(params, 'importSTEP');
    gui.add(params, 'clear');

    setTimeout(params.defaultImport, 500);
}