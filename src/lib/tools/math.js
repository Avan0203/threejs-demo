/*
 * @Date: 2023-12-05 14:31:55
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2026-02-26 11:14:49
 * @FilePath: \threejs-demo\src\lib\tools\math.js
 */

import { Matrix4, Plane } from "three";

/**
 * @description: webgl -> canvas
 * @param {Number} width canvas width
 * @param {Number} height canvas height
 * @param {Matrix4} target
 * @return {Matrix4}
 */
function createNDCMatrix(width, height, target = new Matrix4()) {
    const W = width / 2;
    const H = height / 2;
    return target.set(W, 0, 0, W, 0, -H, 0, H, 0, 0, 1, 0, 0, 0, 0, 1);
}

/**
 * @description: 创建以目标平面的镜像方程
 * @param {Vector3} planeNormal 平面法向量
 * @param {Vector3} planeOrigin 平面上的任意一点
 * @return {Matrix4}
 */
function createMirrorMatrix(planeNormal, planeOrigin) {
    planeNormal = planeNormal.normalize();
    const plane = new Plane().setFromNormalAndCoplanarPoint(planeNormal, planeOrigin);
    const neg2d = -2 * plane.constant;
    const { x, y, z } = planeNormal;
    const Nx2 = 2 * x * x;
    const Ny2 = 2 * y * y;
    const Nz2 = 2 * z * z;
    const NyNz = 2 * y * z;
    const NxNy = 2 * x * y;
    const NxNz = 2 * x * z;
    return new Matrix4().set(
        1 - Nx2, -NxNy, -NxNz, neg2d * x,
        -NxNy, 1 - Ny2, -NyNz, neg2d * y,
        -NxNz, -NyNz, 1 - Nz2, neg2d * z,
        0, 0, 0, 1,
    );
}

/**
 * @description: 生成min到max之间的随机数
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
function createRandom(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
}

export {
    createNDCMatrix,
    createMirrorMatrix,
    createRandom
}