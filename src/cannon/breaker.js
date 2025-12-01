/*
 * @Author: wuyifan0203 1208097313@qq.com
 * @Date: 2025-02-26 17:36:05
 * @LastEditors: wuyifan0203 1208097313@qq.com
 * @LastEditTime: 2025-03-06 17:13:03
 * @FilePath: \threejs-demo\src\cannon\breaker.js
 * Copyright (c) 2024 by wuyifan email: 1208097313@qq.com, All Rights Reserved.
 */
import {
    Mesh,
    BoxGeometry,
    Vector2,
    MeshStandardMaterial,
    Vector3,
    SphereGeometry,
    MeshPhysicalMaterial,
    Raycaster,
    Color,
    Audio,
    AudioListener,
} from 'three';
import {
    initRenderer,
    initOrbitControls,
    initScene,
    resize,
    initDirectionLight,
    initClock,
    initPerspectiveCamera,
    initGUI,
    initLoader,
    Audio_Path
} from '../lib/tools/index.js';
import { ConvexObjectBreaker } from 'three/examples/jsm/misc/ConvexObjectBreaker.js';
import {
 World, Body, Box as BoxShape, Vec3, Sphere, Material, ContactMaterial 
} from '../lib/other/physijs/cannon-es.js';

import CannonDebugger from '../lib/other/physijs/cannon-es-debugger.js';
import { CannonUtils } from '../lib/other/physijs/cannon-utils.js';

const wallPhysicMaterial = new Material({
    restitution: 0.5,
    friction: 0.8
})

const sphereGeometry = new SphereGeometry(1, 64, 64);

const ballPhysicMaterial = new Material({
    restitution: 0.5,
    friction: 0.8
})

window.onload = () => {
    init();
};


function init() {
    const renderer = initRenderer();
    renderer.setClearColor(new Color('#000000'));
    const camera = initPerspectiveCamera(new Vector3(20, 18, 10));

    const controls = initOrbitControls(camera, renderer.domElement);

    const scene = initScene();
    const light = initDirectionLight();
    light.shadow.camera.left = -80;
    light.shadow.camera.right = 80;
    light.shadow.camera.top = 80;
    light.shadow.camera.bottom = -80;
    light.position.set(0, 100, 100);
    scene.add(light);

    const params = {
        muzzleVelocity: 40,
        maxCollideTimes: 3
    }

    const direction = new Vector3();
    const position = new Vector3();
    const normal = new Vector3();
    const collidePosition = new Vector3();
    const raycaster = new Raycaster();
    const pointer = new Vector2();

    const balls = [];
    const wallFragments = new Map();

    const world = new World({ gravity: new Vec3(0, -10, 0) });
    world.solver.iterations = 20;
    world.solver.tolerance = 0.001;

    const cannonDebugger = new CannonDebugger(scene, world, { color: 0xffff00 });
    cannonDebugger.visible = false;

    const cob = new ConvexObjectBreaker();

    const ground = createGround(scene, world);

    const wall = createWall(scene, world);
    wall.prepareBreak(cob);

    world.addContactMaterial(new ContactMaterial(wallPhysicMaterial, ballPhysicMaterial, { friction: 0.2, restitution: 0.1 }));
    world.addContactMaterial(new ContactMaterial(wallPhysicMaterial, wallPhysicMaterial, { friction: 0.2, restitution: 0.01 }));
    world.addContactMaterial(new ContactMaterial(ground.body.material, wallPhysicMaterial, { friction: 0.2, restitution: 0.001 }));
    world.addContactMaterial(new ContactMaterial(ground.body.material, ballPhysicMaterial, { friction: 0.2, restitution: 0.5 }));

    renderer.domElement.addEventListener('click', ({ clientX, clientY }) => {
        pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const ball = createBall(scene, world);
        position.copy(raycaster.ray.direction).add(raycaster.ray.origin);
        ball.body.position.copy(position);
        const velocity = direction.copy(raycaster.ray.direction).multiplyScalar(params.muzzleVelocity);
        ball.body.velocity.copy(velocity);
        balls.push(ball);

        ball.body.addEventListener('collide', ({ body, contact }) => {
            if (body.typeName === 'Wall') {
                collidePosition.copy(body.pointToLocalFrame(contact.bj.position).vadd(contact.rj));
                normal.set(contact.ni.x, contact.ni.y, contact.ni.z).negate();

                const fragments = cob.subdivideByImpact(wall.mesh, collidePosition, normal, 1, 1);

                ball.audioPlay();

                fragments.forEach((mesh) => {
                    const wallFragment = createWallFragment(scene, world, mesh);
                    wallFragment.collideTimes = 0;
                    wallFragments.set(wallFragment.id, wallFragment);
                })
                wall.dispose();
            } else if (body.typeName === 'WallFragment') {
                const currentWallFragment = wallFragments.get(body.mesh.uuid);
                if (currentWallFragment.collideTimes < params.maxCollideTimes) {
                    currentWallFragment.prepareBreak(cob);
                    currentWallFragment.collideTimes += 1;

                    collidePosition.copy(body.pointToLocalFrame(contact.bj.position).vadd(contact.rj));
                    normal.set(contact.ni.x, contact.ni.y, contact.ni.z).negate();

                    const fragments = cob.subdivideByImpact(currentWallFragment.mesh, collidePosition, normal, 1, 1);

                    ball.audioPlay();

                    fragments.forEach((mesh) => {
                        const wallFragment = createWallFragment(scene, world, mesh);
                        wallFragments.set(wallFragment.id, wallFragment);
                    })
                    currentWallFragment.dispose();
                    wallFragments.delete(currentWallFragment.uuid);
                }
            }
        })
    })

    const fps = 1 / 60;
    const clock = initClock();

    function updatePhysicsWorld() {
        world.step(fps, clock.getDelta());

        wall.update();

        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];
            ball.update();

            if (ball.mesh.position.y < -100) {
                console.log('ball out of world');
                ball.dispose();
                balls.splice(i, 1); // 直接按当前索引删除
            }
        }

        wallFragments.values().forEach((wallFragment) => {
            wallFragment.update();
            if (wallFragment.mesh.position.y < -100) {
                console.log('wallFragment out of world');
                wallFragment.dispose();
                wallFragments.delete(wallFragment.id);
            }
        })

        cannonDebugger.visible && cannonDebugger.update();
    }


    function render() {
        controls.update();
        updatePhysicsWorld();

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();
    resize(renderer, camera);

    const gui = initGUI();
    gui.add(params, "muzzleVelocity", 0.1, 500, 0.1);
    gui.add(params, "maxCollideTimes", [1, 2, 3, 5, 10, Infinity]);
    gui.add(cannonDebugger, 'visible').name('Cannon Debugger Visible');
}

function createGround(scene, world) {
    const size = new Vector3(150, 1, 150);
    const halfSize = size.clone().multiplyScalar(0.5);

    const mesh = new Mesh(new BoxGeometry(size.x, size.y, size.z), new MeshStandardMaterial({ color: 'gray' }));
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = new Body({
        shape: new BoxShape(halfSize),
        mass: 0,
        material: new Material()
    })

    body.typeName = 'Ground';
    body.mesh = mesh;

    world.addBody(body);
    return {
        mesh,
        body
    }
}

const glassMaterial = new MeshPhysicalMaterial({
    roughness: 0.6,
    transmission: 1,
    thickness: 1.2,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    clearcoatNormalScale: new Vector2(0.3, 0.3),
    // color: 'blue'
});
const size = new Vector3(8, 10, 2);
const halfSize = size.clone().multiplyScalar(0.5);
const wallGeometry = new BoxGeometry(size.x, size.y, size.z);

const wallShape = new BoxShape(halfSize);

function createWall(scene, world) {
    const mesh = new Mesh(wallGeometry, glassMaterial);
    mesh.castShadow = true;
    mesh.position.set(0, 10, 0);
    scene.add(mesh);

    const body = new Body({
        shape: wallShape,
        mass: 2,
        position: new Vec3().copy(mesh.position),
        material: wallPhysicMaterial,
    })

    world.addBody(body);

    body.typeName = 'Wall';
    body.mesh = mesh;

    return {
        mesh,
        body,
        update() {
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
        },
        dispose() {
            scene.remove(mesh);
            world.removeBody(body);
        },
        prepareBreak(breaker) {
            breaker.prepareBreakableObject(mesh, body.mass, new Vector3(), new Vector3(), true)
        },
 
    }
}



function createBall(scene, world) {
    const mesh = new Mesh(sphereGeometry, glassMaterial);
    mesh.castShadow = true;
    scene.add(mesh);

    const body = new Body({
        mass: 1,
        shape: new Sphere(1),
        material: ballPhysicMaterial,
    })

    world.addBody(body);

    body.typeName = 'Ball';
    body.mesh = mesh;

    const loader = initLoader();
    const listener = new AudioListener();
    const audio = new Audio(listener);
    loader.load(`../../${Audio_Path}/glassBreak.mp3`, (buffer) => { 
        audio.setBuffer(buffer);
        scene.add(listener);
    })

    return {
        mesh,
        body,
        update() {
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
        },
        dispose() {
            scene.remove(mesh);
            world.removeBody(body);
        },
        audioPlay(){
            if(audio.isPlaying){
                audio.stop();
                audio.play();
            }else{
                audio.play();
            }
        }
    }
}

function createWallFragment(scene, world, mesh) {
    scene.add(mesh);
    mesh.receiveShadow = mesh.castShadow = true;

    const { shape } = CannonUtils.geometry2Shape(mesh.geometry)[0];

    const body = new Body({
        mass: mesh.userData.mass,
        shape,
        position: new Vec3().copy(mesh.position),
        material: wallPhysicMaterial
    })

    world.addBody(body);

    body.typeName = 'WallFragment';
    body.mesh = mesh;

    body.allowSleep = true;         // 允许休眠
    body.sleepSpeedLimit = 0.1;       // 当速度低于0.1时开始计时
    body.sleepTimeLimit = 1.0;        // 连续1秒低于速度阈值后进入休眠状态

    return {
        id: mesh.uuid,
        mesh,
        body,
        update() {
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
        },
        dispose() {
            scene.remove(mesh);
            world.removeBody(body);
        },
        prepareBreak(breaker) {
            breaker.prepareBreakableObject(mesh, body.mass, new Vector3(), new Vector3(), true)
        }
    }
}