import {
    Vector2,
    Vector3,
    Matrix4,
    Spherical,
    Controls
} from 'three';

const PI2 = Math.PI * 2;

let defaultUp = new Vector3(0, 1, 0);
const oppositeUp = new Vector3(0, -1, 0);

export class OrbitControlsBlender extends Controls {
    constructor(object, domElement) {
        super(object, domElement);
        this.target = new Vector3();
        this.mouseButtons = new Map([
            [0, 'rotate'], // 左键旋转
            [2, 'pan']     // 右键平移
        ]);
        this.state = 'none';
        this.dragStart = new Vector2();
        this.dragEnd = new Vector2();
        this.panOffset = new Vector3();


        this.screenSpacePanning = true;
        this.zoomScale = 0.95;
        this.spherical = new Spherical();
        this.rotateDir = 'xy';
        this.enablePan = true;
        this.minZoom = 0;
        this.maxZoom = Infinity;
        this.pvMatrix = new Matrix4();
        this.minPolar = 1e-5;
        this.maxPolar = 0.9999999 * Math.PI;

        this.unlimited = false;

        this.sign = 1;


        this.resetSpherical();
        this.updateCamera();
        this.initEvents();
    }

    /* -------------------- Events -------------------- */

    initEvents() {
        this.domElement.addEventListener('contextmenu', e => e.preventDefault());

        this.domElement.addEventListener('pointerdown', e => this.onPointerDown(e));
        this.domElement.addEventListener('pointermove', e => {
            this.onPointerMove(e);
            this.getPvMatrix();
            this.changed = true;
        });

        window.addEventListener('pointerup', () => this.onPointerUp());

        this.domElement.addEventListener('wheel', e => {
            this.onWheel(e);
            this.getPvMatrix();
            this.changed = true;
        });
    }

    onPointerDown({ clientX, clientY, button }) {
        this.dragStart.set(clientX, clientY);
        this.state = this.mouseButtons.get(button);
    }

    onPointerMove({ clientX, clientY }) {

        this.dragEnd.set(clientX, clientY);

        const delta = this.dragEnd.clone().sub(this.dragStart);

        // eslint-disable-next-line default-case
        switch (this.state) {
            case 'pan':
                if (this.enablePan) {
                    this[`pan${this.object.type}`](delta);
                }
                break;

            case 'rotate':
                this.rotate(delta);
                break;
        }

        this.dragStart.copy(this.dragEnd);
    }

    onPointerUp() {
        this.state = 'none';
        this.sign = this.object.up.y;
    }

    onWheel({ deltaY }, cameraType = this.object.type) {
        const scale = deltaY < 0 ? this.zoomScale : 1 / this.zoomScale;
        this[`dolly${cameraType}`](scale);
        this.updateFromSpherical();
    }

    /* -------------------- Zoom -------------------- */

    dollyPerspectiveCamera(scale) {
        this.spherical.radius /= scale;
    }

    dollyOrthographicCamera(scale) {
        const zoom = this.object.zoom * scale;
        this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

        this.object.updateProjectionMatrix();
    }

    /* -------------------- Pan -------------------- */

    panPerspectiveCamera({ x, y }) {
        const {
            object,
            panOffset,
            screenSpacePanning,
            target
        } = this;

        const distance =
        object.position.clone().sub(target).length() *
            Math.tan(object.fov * Math.PI / 360) *
            2 / this.domElement.clientHeight;

        const offsetX = x * distance;
        const offsetY = y * distance;

        const right = new Vector3().setFromMatrixColumn(object.matrix, 0);
        const up = new Vector3();

        if (screenSpacePanning) {
            up.setFromMatrixColumn(object.matrix, 1);
        } else {
            up.crossVectors(object.up, right);
        }

        panOffset
            .copy(right.multiplyScalar(-offsetX))
            .add(up.multiplyScalar(offsetY));

        this.applyPan();
    }

    panOrthographicCamera({ x, y }) {
        const  camera = this.object;
        const { clientWidth, clientHeight } = this.domElement;

        const dx = x / clientWidth * (camera.right - camera.left);
        const dy = y / clientHeight * (camera.top - camera.bottom);

        const right = new Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new Vector3();

        if (this.screenSpacePanning) {
            up.setFromMatrixColumn(camera.matrix, 1);
        } else {
            up.crossVectors(camera.up, right);
        }

        this.panOffset
            .copy(right.multiplyScalar(-dx))
            .add(up.multiplyScalar(dy));

        this.applyPan();
    }

    applyPan() {
        this.target.add(this.panOffset);
        this.object.position.add(this.panOffset);

        this.updateCamera();
        this.panOffset.set(0, 0, 0);
    }

    /* -------------------- Rotate -------------------- */

    rotate({ x, y }) {
        const { clientHeight } = this.domElement;

        const rotX = PI2 * x / clientHeight;
        const rotY = PI2 * y / clientHeight;

        if (this.rotateDir.includes('y')) {
            let phi = this.spherical.phi - rotY;

            if (phi < -Math.PI) phi += PI2;
            if (phi > PI2) phi -= PI2;

            this.spherical.phi = this.unlimited
                ? phi
                : Math.min(this.maxPolar, Math.max(this.minPolar, phi));
        }

        if (this.rotateDir.includes('x')) {
            this.spherical.theta -= this.sign * rotX;
        }

        this.updateFromSpherical();
    }

    /* -------------------- Update -------------------- */

    updateFromSpherical() {
        const offset = new Vector3().setFromSpherical(this.spherical);

        if (this.unlimited) {
            const { phi, theta } = this.spherical;

            if (phi === 0 || phi === Math.PI) {
                defaultUp = this.object.up.clone();
                this.object.up.set(
                    -Math.sin(theta),
                    0,
                    Math.cos(-theta)
                );
            } else if (phi > Math.PI || phi < 0) {
                this.object.up.copy(oppositeUp);
            } else {
                this.object.up.copy(defaultUp);
            }
        }

        this.object.position.copy(this.target.clone().add(offset));
        this.updateCamera();
    }

    updateCamera() {
        this.object.lookAt(this.target);
        this.object.updateMatrixWorld(true);
    }

    resetSpherical() {
        this.spherical.setFromVector3(
            this.object.position.clone().sub(this.target)
        );
    }

    getPvMatrix() {
        const { projectionMatrix, matrixWorldInverse } = this.object;
        return this.pvMatrix.multiplyMatrices(
            projectionMatrix,
            matrixWorldInverse
        );
    }
}
