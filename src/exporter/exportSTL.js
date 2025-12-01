import {
    Mesh,
    BoxGeometry,
    SphereGeometry,
    BufferGeometry,
    Matrix4,
    MeshBasicMaterial,
    MeshNormalMaterial
} from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import {
    initRenderer,
    initOrthographicCamera,
    initCustomGrid,
    initAxesHelper,
    initScene,
    initOrbitControls,
    resize,
    DownloadUtils,
    initGUI,
    QUARTER_PI,
    initLoader,
    Image_Path
} from '../lib/tools/index.js';
import { CSG } from '../lib/other/CSGMesh.js';


window.onload = () => {
    init();
};

async function init() {
    const renderer = initRenderer();
    const camera = initOrthographicCamera();
    camera.up.set(0, 0, 1);
    camera.updateProjectionMatrix();

    const scene = initScene();
    initAxesHelper(scene);
    renderer.setClearColor(0xffffff);
    initCustomGrid(scene);

    const controls = initOrbitControls(camera, renderer.domElement);

    const loader = initLoader();

    const uvTexture = await loader.load(`../../${Image_Path}/others/uv_grid_opengl.jpg`)

    const material = new MeshBasicMaterial({ map: uvTexture, wireframe: true });
    const normalMaterial = new MeshNormalMaterial({ wireframe: true });

    const exporter = new STLExporter();

    const resultMesh = new Mesh(new BufferGeometry(), material);
    scene.add(resultMesh);

    const targetMesh = new Mesh(new BoxGeometry(5, 5, 5), material);

    const boxMeshes = [
        new Mesh(new BoxGeometry(6, 6, 6), material),
        new Mesh(new BoxGeometry(6, 6, 6), material),
        new Mesh(new BoxGeometry(6, 6, 6), material),
    ];

    const sphereMesh = new Mesh(new SphereGeometry(6, 32, 32), material);

    const params = {
        targetSize: 5,
        targetRadius: 6,
        targetSphereRadius: 3.5,
        isASCII: false,
        useNormalMaterial: false,
        wireframe: false,
        exportSTL() {
            const data = exporter.parse(resultMesh, { binary: !this.isASCII });
            if (this.isASCII) {
                DownloadUtils.saveString(data, 'AsciiSTL.stl');
            } else {
                DownloadUtils.saveBuffer(data, 'BinarySTL.stl');
            }
        }
    };

    const funcKey = ['rotateX', 'rotateY', 'rotateZ'];

    const mat4 = new Matrix4();
    function update() {
        targetMesh.geometry.dispose();
        targetMesh.geometry = new BoxGeometry(params.targetSize, params.targetSize, params.targetSize);
        sphereMesh.geometry.dispose();
        sphereMesh.geometry = new SphereGeometry(params.targetSphereRadius, 32, 32);
        boxMeshes.forEach((mesh, i) => {
            mesh.geometry.dispose();
            mesh.geometry = new BoxGeometry(params.targetRadius, params.targetRadius, params.targetRadius);
            mesh.geometry[funcKey[i]](QUARTER_PI);
        });

        const targetCSG = CSG.fromMesh(targetMesh);
        const sphereCSG = CSG.fromMesh(sphereMesh);
        const boxCSGs = boxMeshes.map(mesh => CSG.fromMesh(mesh));
        const resultCSG = [...boxCSGs, sphereCSG].reduce((pre, csg) => {
            return pre.intersect(csg);
        }, targetCSG);

        resultMesh.geometry.dispose();
        const result = CSG.toMesh(resultCSG, mat4);
        console.log('result: ', result);
        resultMesh.geometry = result.geometry;
        resultMesh.material = params.useNormalMaterial ? normalMaterial : material;
        resultMesh.material.wireframe = params.wireframe;
    }

    update();

    function render() {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    render();

    resize(renderer, camera);

    const gui = initGUI();
    gui.add(params, 'useNormalMaterial').onChange(update);
    gui.add(params, 'wireframe').onChange(update);
    gui.add(params, 'targetSize', 1, 10, 0.1).onChange(update);
    gui.add(params, 'targetRadius', 1, 10, 0.1).onChange(update);
    gui.add(params, 'targetSphereRadius', 1, 10, 0.1).onChange(update);
    gui.add(params, 'isASCII');
    gui.add(params, 'exportSTL');
}