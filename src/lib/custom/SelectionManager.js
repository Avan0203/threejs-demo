import { Frustum, Vector2 } from 'three';
class SelectionManager {
    constructor(renderer, camera) {
        this.frustum = new Frustum();
        this.renderer = renderer;
        this.camera = camera;
        this.selectableObjects = [];

        this.renderSize = new Vector2(window.innerWidth, window.innerHeight);
    }

    _getRenderSize() {
        this.renderer.getSize(this.renderSize);
    }

    /**
     * @description: 鼠标单击选择物体
     * @param {number} x 鼠标x坐标
     * @param {number} y 鼠标y坐标
     * @return {Array<Object3D>} 选中的物体
     */
    clickSelect(x, y) {
        this._getRenderSize();


    }

    /**
     * @description: 鼠标框选物体
     * @param {number} sx 框选起点x坐标
     * @param {number} sy 框选起点y坐标
     * @param {number} ex 框选终点x坐标
     * @param {number} ey 框选终点y坐标
     * @param {boolean} isClairvoyance 是否透视
     * @return {Array<Object3D>} 选中的物体
     */
    boxSelect(sx, sy, ex, ey, isClairvoyance = false) {
        this._getRenderSize();

    }
}

export { SelectionManager };