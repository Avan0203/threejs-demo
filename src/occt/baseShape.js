/*
 * @Author: wuyifan0203 1208097313@qq.com
 * @Date: 2025-04-29 15:09:33
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2026-04-14 10:06:37
 * @FilePath: \threejs-demo\src\occt\baseShape.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    BufferGeometry,
    LineSegments,
    Color,
    Box3,
    Vector3
} from "three";
import {
    initRenderer,
    initCustomGrid,
    initOrbitControls,
    initScene,
    initGUI,
    resize,
    gridPositions,
    TWO_PI,
    initFog,
    initPerspectiveCamera
} from "../lib/tools/index.js";
import { OpenCascadeBuilder } from "../lib/tools/OpenCascadeBuilder.js";

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    const camera = initPerspectiveCamera(new Vector3(20, 14, 12));
    camera.up.set(0, 0, 1);
    camera.far = 500;
    camera.zoom = 2.4;
    camera.updateProjectionMatrix();

    const scene = initScene();
    scene.background = new Color(0x222222);
    initCustomGrid(scene);


    const controls = initOrbitControls(camera, renderer.domElement);
    controls.target.set(0.5, -2, -0.15);


    const list = {
        Box: {
            xSpan: 2,
            ySpan: 2,
            zSpan: 2,
        },
        Sphere: {radius: 1,},
        Cylinder: {
            radius: 1,
            height: 2,
            angle: TWO_PI,
        },
        Cone: {
            radius1: 0.7,
            radius2: 1,
            height: 2,
            angle: TWO_PI,
        },
        Tours: {
            outerRadius: 1,
            innerRadius: 0.7,
            startAngle: 0,
            endAngle: TWO_PI,
        },
        EllipseSphere: {
            radiusX: 1,
            radiusY: 2,
            radiusZ: 1,
        }
    };

    const deviation = {
        line: 0.1,
        angle: 0.3,
    };

    const meshMap = {};
    const lineMap = {};

    const worker = new Worker(new URL("./baseShape.worker.js", import.meta.url), { type: "module", });

    const box = new Box3();

    const builder = new OpenCascadeBuilder();
    let fogDistance = 0;

    const workerFunctionMap = {
        init() {
            worker.postMessage({ type: "init", payload: { list, deviation } });
        },
        generate(payload) {
            const { type, result } = payload;

            let line = lineMap[type];
            let mesh = meshMap[type];
            if (meshMap[type]) {
                mesh.geometry.dispose();
                line.geometry.dispose();
            } else {
                mesh = new Mesh(new BufferGeometry(), builder.material.solid);
                line = new LineSegments(new BufferGeometry(), builder.material.edge);
                scene.add(mesh);
                mesh.add(line);
                meshMap[type] = mesh;
                lineMap[type] = line;
            }
            mesh.geometry = builder.buildSolid(result.faceList);
            line.geometry = builder.buildEdge(result.edgeList);
       
            Object.values(meshMap).forEach((mesh, i) => {
                const pos = gridPositions(Object.keys(meshMap).length, i, 4);
                mesh.position.copy(pos);
            });

            box.union(mesh.geometry.boundingBox);
            fogDistance = Math.max(fogDistance, box.min.distanceTo(box.max) * 1.5);
            initFog(scene, fogDistance, fogDistance + 300, 0x222222);
        },
    };

    worker.onmessage = ({ data }) => {
        console.log("worker -> main: ", data);
        workerFunctionMap[data.type](data.payload);
    };

    worker.onmessageerror = ({ data }) => {
        console.error("worker error: ", data);
    };

    function render() {
        controls.update();

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera);

    const gui = initGUI();
    gui.add(deviation, "line", 0, 1, 0.01).onFinishChange(() => {
        worker.postMessage({ type: "init", payload: { list, deviation } });
    });
    gui.add(deviation, "angle", 0, 1, 0.01).onFinishChange(() => {
        worker.postMessage({ type: "init", payload: { list, deviation } });
    });

    Object.entries(list).forEach(([name, values]) => {
        const folder = gui.addFolder(name);
        Object.entries(values).forEach(([key]) => {
            const k = key.toLowerCase();
            let kf = null;
            if (k.includes("angle")) {
                kf = folder.add(values, key, 0, TWO_PI, 0.1);
            } else {
                kf = folder.add(values, key, 0, 3, 0.01);
            }
            kf.onFinishChange(() => {
                worker.postMessage({
                    type: "update",
                    payload: { type: name, parameter: values, deviation },
                });
            });
        });
    });
}
