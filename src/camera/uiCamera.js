import {
    Mesh,
    BoxGeometry,
    MeshNormalMaterial,
    OrthographicCamera,
} from 'three';
import {
    initRenderer,
    initOrthographicCamera,
    initCustomGrid,
    initAxesHelper,
    initOrbitControls,
    initScene,
    resize
} from '../lib/tools/index.js';

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    renderer.autoClear = false;
    const camera = initOrthographicCamera();
    camera.up.set(0, 0, 1);
    camera.updateProjectionMatrix();

    const uiCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    uiCamera.position.set(0, 0, 1); // 放在Z轴上朝向原点
    uiCamera.lookAt(0, 0, 0);
    const uiScene = initScene();


    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0xffffff);
    initCustomGrid(scene);

    const controls = initOrbitControls(camera, renderer.domElement);
    const mesh = new Mesh(new BoxGeometry(3, 3, 3), new MeshNormalMaterial());
    scene.add(mesh);

  

    const mesh2 = new Mesh(new BoxGeometry(100, 100, 1), new MeshNormalMaterial());
    uiScene.add(mesh2);

    function render() {
        renderer.clear();
        controls.update();

        // renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(uiScene, uiCamera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera, (w, h) => {
        const aspect = w / h;
        const viewSize = h / 2; // 你希望 UI 保持单位比例

        uiCamera.left = -aspect * viewSize;
        uiCamera.right = aspect * viewSize;
        uiCamera.top = viewSize;
        uiCamera.bottom = -viewSize;
        uiCamera.updateProjectionMatrix();
        uiScene.position.set(-w / 2, -h / 2, 0);
    });
}