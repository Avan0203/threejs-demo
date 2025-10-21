/*
 * @Date: 2023-05-17 19:27:06
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-09-16 14:29:10
 * @FilePath: \threejs-demo\src\controls\useTrackballControls.js
 */
import {
    Vector3,
    Mesh,
    MeshNormalMaterial,
    BoxGeometry,
} from 'three';
import {
    initRenderer,
    initAxesHelper,
    initCustomGrid,
    resize,
    initOrthographicCamera,
    initScene,
    initGUI,
    initViewHelper
} from '../lib/tools/index.js';
// import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls.js';
import {TrackballControls} from '../lib/custom/TrackballControls.js';

window.onload = () => {
    init();
};

function init() {
    const renderer = initRenderer();
    const camera = initOrthographicCamera(new Vector3(1000, 1000, 1000));
    const scene = initScene();
    renderer.setClearColor(0xffffff);
    renderer.autoClear = false;
    camera.up.set(0, 0, 1);
    resize(renderer, camera);
    initCustomGrid(scene);
    initAxesHelper(scene);

    const controls = new TrackballControls(camera, renderer.domElement);
    controls.addEventListener('change',(e)=>{
      console.log('change',e);
    //   tick()
    })

    controls.addEventListener('start',(e)=>{
      console.log('start',e);
    })

    controls.addEventListener('end',(e)=>{
      console.log('end',e);
    })
    const viewHelper = initViewHelper(camera, renderer.domElement);

    controls.rotateSpeed = 3.0;
    controls.zoomSpeed = 3;
    controls.panSpeed = 0.8;
    controls.staticMoving = true;

    const geometry = new BoxGeometry(4, 4, 4);
    const material = new MeshNormalMaterial({});

    const mesh = new Mesh(geometry, material);

    const mesh1 = new Mesh(geometry, material);
    mesh1.position.set(2, 2, 0)

    scene.add(mesh, mesh1);

    function render() {
        renderer.clear();
        controls.update();
        renderer.render(scene, camera);
        viewHelper.render(renderer);
        requestAnimationFrame(render);
    };
    render();

    // function tick() {
    //     renderer.clear();
    //     renderer.render(scene, camera);
    //     viewHelper.render(renderer);
    // }

    // tick();


    const gui = initGUI();
    const folderOptions = gui.addFolder('TrackballControls parameters');
    folderOptions.add(controls, 'enabled').name('Enable controls');
    folderOptions.add(controls, 'noRotate').name('Enable rotate');
    folderOptions.add(controls, 'rotateSpeed', 0, 50, 0.5).name('Rotate speed');
    folderOptions.add(controls, 'noPan').name('Enable pan');
    folderOptions.add(controls, 'minDistance', 0, 50, 0.5).name('Min distance');
    folderOptions.add(controls, 'maxDistance', 0, 50, 0.5).name('Max distance');
    folderOptions.add(controls, 'panSpeed', 0, 50, 0.5).name('Pan speed');
    folderOptions.add(controls, 'noZoom').name('Enable zoom');
    folderOptions.add(controls, 'zoomSpeed', 0, 50, 0.5).name('Zoom speed');
    folderOptions.add(controls, 'minZoom', 0, 50, 0.5).name('Min zoom');
    folderOptions.add(controls, 'maxZoom', 0, 50, 0.5).name('Max zoom');
    folderOptions.add(controls, 'staticMoving').name('staticMoving 阻尼是否被禁用');
    folderOptions.add(controls, 'dynamicDampingFactor', 0, 1, 0.05).name('dynamicDampingFactor');
    folderOptions.add(controls, 'reset').name('Reset');
}
