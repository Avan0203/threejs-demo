/*
 * @Date: 2023-12-05 13:43:51
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2026-02-26 11:11:21
 * @FilePath: \threejs-demo\src\camera\focusObject.js
 */

import {
    Box3,
    Mesh,
    Color,
    BoxGeometry,
    MeshLambertMaterial,
    Vector3,
    Matrix4,
    Box2,
} from 'three';
import {
    initCoordinates,
    initCustomGrid,
    initOrbitControls,
    initOrthographicCamera,
    initRenderer,
    initScene,
    resize,
    initDirectionLight,
    initGUI
} from '../lib/tools/index.js';
import { createNDCMatrix } from '../lib/tools/math.js';
import {
 Tween, Easing, update 
} from '../lib/other/tween.esm.js'

window.onload = () => {
    init();
};

const ndcMatrix = new Matrix4();
const box = new Box3();
const tempBox3 = new Box3();
const objectsBox2 = new Box2();

function init() {
    const renderer = initRenderer();
    renderer.autoClear = false;
    const camera = initOrthographicCamera(new Vector3(0, 0, 100))
    camera.up.set(0, 0, 1);

    const light = initDirectionLight();

    const scene = initScene();
    scene.background = new Color(0xf0f0f0);

    scene.add(light);

    const orbitControls = initOrbitControls(camera, renderer.domElement);
    orbitControls.zoomToCursor = true
    resize(renderer, camera);

    initCustomGrid(scene);

    const coord = initCoordinates();

    (function render() {
        renderer.clear();
        light.position.copy(camera.position);
        renderer.render(scene, camera);
        renderer.render(coord, camera);
        requestAnimationFrame(render);
    })()

    const redMaterial = new MeshLambertMaterial({ color: 'red' });
    const greenMaterial = new MeshLambertMaterial({ color: 'green' });
    const blueMaterial = new MeshLambertMaterial({ color: 'blue' });
    const yellowMaterial = new MeshLambertMaterial({ color: 'yellow' });

    const geometry = new BoxGeometry(1, 1, 1);

    const meshRed = new Mesh(geometry, redMaterial);
    meshRed.scale.set(4, 6, 3);
    meshRed.position.set(5, 3, 0);

    const meshGreen = new Mesh(geometry, greenMaterial);
    meshGreen.scale.set(2, 3, 3);
    meshGreen.position.set(0, 3, 0);

    const meshBlue = new Mesh(geometry, blueMaterial);
    meshBlue.scale.set(3, 3, 3);
    meshBlue.position.set(-3, -2, 0);

    const meshYellow = new Mesh(geometry, yellowMaterial);
    meshYellow.scale.set(4, 8, 3);
    meshYellow.position.set(3, -5, 0);

    const meshes = [meshRed, meshGreen, meshBlue, meshYellow];

    scene.add(...meshes)

    const o = {
        target: -1,
        focus() {
            focusObject(this.target === -1 ? meshes : [meshes[this.target]]);
        },
        useTween: false
    }
    const gui = initGUI();
    gui.add(o, 'target', {
        All: -1,
        Red: 0,
        Green: 1,
        Blue: 2,
        Yellow: 3
    });

    const updateTween = () => {
        update();
    };

    gui.add(o, 'focus').name('Focus Objects');
    gui.add(o, 'useTween').name('Use Tween').onChange((e) => {
        renderer.setAnimationLoop(e ? updateTween : null)
    });

    createNDCMatrix(window.innerWidth, window.innerHeight, ndcMatrix);

    window.addEventListener('resize', () => {
        createNDCMatrix(window.innerWidth, window.innerHeight, ndcMatrix)
    });

    let tween = null;

    function focusObject(objects) {
        box.makeEmpty();
        objectsBox2.makeEmpty();

        objects.forEach(mesh => {
            tempBox3.makeEmpty();
            if (!mesh.geometry.boundingBox) {
                mesh.geometry.computeBoundingBox();
            };
            tempBox3.copy(mesh.geometry.boundingBox);
            tempBox3.applyMatrix4(mesh.matrixWorld);
            box.union(tempBox3);
        });

        const center = new Vector3();
        window.camera.updateProjectionMatrix()
        const tempZoom = window.camera.zoom;

        const { max, min } = box;

        box.getCenter(center);

        ///
        ///                         z
        ///     3 ------ 2          |   y
        ///    /        /|          | /
        ///   0 ------ 1 |          |/
        ///   | 7      | 6          o ---- X
        ///   |        |/
        ///   4 ------ 5
        ///
        ///
        const points = [
            new Vector3(min.x, min.y, max.z),
            new Vector3(max.x, min.y, max.z),
            new Vector3(max.x, max.y, max.z),
            new Vector3(min.x, max.y, max.z),
            new Vector3(min.x, min.y, min.z),
            new Vector3(max.x, min.y, min.z),
            new Vector3(max.x, max.y, min.z),
            new Vector3(min.x, max.y, min.z),
        ];

        points.forEach((v) => {
            v.applyMatrix4(window.camera.matrixWorldInverse);
            v.applyMatrix4(window.camera.projectionMatrix);
            v.applyMatrix4(ndcMatrix);

            objectsBox2.max.x = Math.max(objectsBox2.max.x, v.x);
            objectsBox2.min.x = Math.min(objectsBox2.min.x, v.x);

            objectsBox2.max.y = Math.max(objectsBox2.max.y, v.y);
            objectsBox2.min.y = Math.min(objectsBox2.min.y, v.y);
        })

        const { innerWidth: width, innerHeight: height } = window;

        const [boxWidth, boxHeight] = [
            objectsBox2.max.x - objectsBox2.min.x,
            objectsBox2.max.y - objectsBox2.min.y
        ];

        // console.log('boxWidth, boxHeight', boxWidth, boxHeight);


        const [targetWidth, targetHeight] = [
            width * 0.8,
            height * 0.8
        ];

        const isOrthographic = camera.isOrthographicCamera;
        const radius = camera.position.distanceTo(orbitControls.target);
        const direction = new Vector3().subVectors(camera.position, orbitControls.target).normalize();

        let position;
        let zoom;

        if (isOrthographic) {
            zoom = Math.min(
                (targetWidth * tempZoom) / Math.max(boxWidth, 1e-6),
                (targetHeight * tempZoom) / Math.max(boxHeight, 1e-6),
            );
            position = direction.multiplyScalar(radius).add(center);
        } else {
            const scale = Math.min(
                targetWidth / Math.max(boxWidth, 1e-6),
                targetHeight / Math.max(boxHeight, 1e-6),
            );
            const newRadius = radius / scale;
            position = direction.multiplyScalar(newRadius).add(center);
        }

        if (o.useTween) {
            const from = {
                px: camera.position.x,
                py: camera.position.y,
                pz: camera.position.z,
                cx: orbitControls.target.x,
                cy: orbitControls.target.y,
                cz: orbitControls.target.z,
            };
            const to = {
                px: position.x,
                py: position.y,
                pz: position.z,
                cx: center.x,
                cy: center.y,
                cz: center.z,
            };

            if (isOrthographic) {
                from.zoom = camera.zoom;
                to.zoom = zoom;
            }

            tween = new Tween(from);

            tween.to(to, 1000).easing(Easing.Quartic.Out);

            tween.onUpdate((e) => {
                orbitControls.object.position.set(e.px, e.py, e.pz);
                orbitControls.target.set(e.cx, e.cy, e.cz);
                if (isOrthographic) {
                    orbitControls.object.zoom = e.zoom;
                }
                orbitControls.update();
            });

            tween.start();
        } else {
            orbitControls.object.position.copy(position);
            orbitControls.target.copy(center);
            if (isOrthographic) {
                orbitControls.object.zoom = zoom;
            }
            orbitControls.update();
            camera.updateProjectionMatrix();
        }

        // console.log('POS', camera.position.x, camera.position.y, camera.position.z);
        // console.log('Tar', center.x, center.y, center.z);
        // console.log('Zoom', zoom);

        // console.log(orbitControls);
    }
}