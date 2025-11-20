/*
 * @Date: 2023-01-09 14:37:51
 * @LastEditors: wuyifan 1208097313@qq.com
 * @LastEditTime: 2025-11-20 10:14:17
 * @FilePath: /threejs-demo/src/loader/gltfLoader.js
 */
import {
  PointLight,
  PerspectiveCamera,
  MeshPhongMaterial,
} from 'three';
import {
  initAmbientLight,
  initDirectionLight,
  initRenderer,
  resize,
  initScene,
  initOrbitControls,
  Model_Path,
  initGUI,
  initCustomGrid
} from '../lib/tools/index.js';
import { UploadUtils } from '../lib/tools/UploadUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

window.onload = () => {
  init();
};

async function init() {
  const renderer = initRenderer();
  renderer.autoClear = false;
  const camera = new PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    10000,
  );
  camera.position.set(-43, 13, 0.6);
  camera.zoom = 0.2;
  camera.lookAt(0, 0, 0);

  const scene = initScene();
  renderer.setClearColor(0xffffff);

  const light = new PointLight(0xffffff, 3, 0, 0);
  light.position.set(50, 50, 75);

  const light3 = new PointLight(0xffffff, 2, 0, 0);
  light3.position.set(-50, -50, 75);

  const light2 = initDirectionLight();

  initAmbientLight(scene)
  scene.add(light, light2);

  const controls = initOrbitControls(camera, renderer.domElement);
  resize(renderer, camera);

  const grid = initCustomGrid(scene,100,100);
  grid.rotation.x = Math.PI / 2;

  function render() {
    controls.update();
    renderer.clear();
    renderer.render(scene, camera);
    light2.position.copy(camera.position);
    requestAnimationFrame(render);
  }
  render();


  let modelMesh = null;

  // 配置 DRACOLoader 以支持压缩的 gltf/glb 模型
  const dracoLoader = new DRACOLoader();
  // DRACO 解码器路径（使用绝对路径，从服务器根目录开始）
  // 根据错误信息，路径需要包含 src/，所以使用 /src/ 开头的绝对路径
  dracoLoader.setDecoderPath('/src/lib/three/examples/jsm/libs/draco/gltf/');
  dracoLoader.setDecoderConfig({ type: 'js' });

  // 获取 GLTFLoader 实例并设置 DRACOLoader
  // 由于 OmnipotentLoader 内部管理 loader 实例，我们需要直接使用 GLTFLoader
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  // 设置模型所有材质的 wireframe 属性
  const setModelWireframe = (model, wireframe) => {
    if (!model) return;
    model.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material) => {
          if (material) {
            material.wireframe = wireframe;
          }
        });
      }
    });
  };

  // 删除旧模型
  const removeOldModel = () => {
    if (modelMesh) {
      scene.remove(modelMesh);
      // 清理资源
      modelMesh.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach((material) => {
              if (material) {
                if (material.map) material.map.dispose();
                if (material.normalMap) material.normalMap.dispose();
                if (material.emissiveMap) material.emissiveMap.dispose();
                if (material.bumpMap) material.bumpMap.dispose();
                if (material.specularMap) material.specularMap.dispose();
                material.dispose();
              }
            });
          }
        }
      });
      modelMesh = null;
    }
  };

  const onError = (e) => {
    console.error('load model fail !', e.stack);
  };

  // GUI 控制参数（需要提前定义，因为 modelOnLoad 会使用）
  const params = { wireframe: false };

  const modelOnLoad = (mesh) => {
    // 删除旧模型
    removeOldModel();

    modelMesh = mesh.scene;
    modelMesh.material = new MeshPhongMaterial({
      color: '#ffe8a3',
      depthTest: true,
    });
    scene.add(modelMesh);

    // 根据 wireframe 状态设置材质
    setModelWireframe(modelMesh, params.wireframe);
  };

  // 从文件加载模型（使用 GLTFLoader 以支持 DRACO 压缩）
  const loadModelFromFile = (file) => {
    const url = URL.createObjectURL(file);
    // 使用 gltfLoader 而不是 loader，以支持 DRACO 压缩
    gltfLoader.load(url, modelOnLoad, null, (error) => {
      URL.revokeObjectURL(url);
      onError(error);
    });
  };

  // 添加 importLocal 方法到 params
  params.importLocal = async () => {
    try {
      const files = await UploadUtils.uploadFile({ formate: 'gltf,glb', mutiple: false });
      if (files.length > 0) {
        loadModelFromFile(files[0]);
      }
    } catch (error) {
      console.error('File selection cancelled or failed:', error);
    }
  };

  // 初始化 GUI
  const gui = initGUI();
  gui.add(params, 'importLocal').name('Import Local');
  gui.add(params, 'wireframe').name('Wireframe').onChange((value) => {
    setModelWireframe(modelMesh, value);
  });

  // 拖拽功能
  const container = renderer.domElement;
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  container.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // 检查文件类型
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
        loadModelFromFile(file);
      } else {
        console.warn('Unsupported file type. Please drop a .gltf or .glb file.');
      }
    }
  });

  // 加载默认模型（使用 GLTFLoader 以支持 DRACO 压缩）
  gltfLoader.loadAsync(`../../${Model_Path}/ar15_rifle/scene.gltf`).then((gltf) => {
    modelMesh = gltf.scene;
    modelMesh.scale.set(20, 20, 20);
    scene.add(modelMesh);
    // 根据 wireframe 状态设置材质
    setModelWireframe(modelMesh, params.wireframe);
  }).catch(onError);
}
