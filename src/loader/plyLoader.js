import {
  AxesHelper,
  Color,
  GridHelper,
  Vector3,
} from 'three';
import {
  initGUI,
  initLoader,
  initOrbitControls,
  initPerspectiveCamera,
  initRenderer,
  initScene,
  resize,
} from '../lib/tools/index.js';
import { UploadUtils } from '../lib/tools/UploadUtils.js';
import { SparkRenderer } from '../lib/spark/dist/spark.module.js';

// Spark only shows splats after several rendered frames of accumulation and sorting.
const SPLAT_WARMUP_FRAMES = 12;

window.onload = init;

function getDefaultPlyUrl() {
  const baseUrl = import.meta.env?.BASE_URL;
  if (baseUrl) {
    return `${baseUrl}models/final.ply`;
  }

  return new URL('../../public/models/final.ply', import.meta.url).href;
}

function init() {
  const renderer = initRenderer({ antialias: false });
  const camera = initPerspectiveCamera(new Vector3(1, 1, 1));
  // OrbitControls captures camera.up on construction, so set Z-up first.
  camera.up.set(0, 0, 1);
  const scene = initScene();
  scene.background = new Color(0x000000);
  const controls = initOrbitControls(camera, renderer.domElement);
  const sparkRenderer = new SparkRenderer({ renderer });
  const loader = initLoader();
  const status = document.querySelector('#loader-status');

  const gridHelper = new GridHelper(100, 100);
  // GridHelper lies in the XZ plane; rotate it onto the Z-up ground plane.
  gridHelper.rotation.x = Math.PI / 2;
  const axesHelper = new AxesHelper(50);

  scene.add(sparkRenderer, gridHelper, axesHelper);
  resize(renderer, camera);

  const renderFrame = () => {
    controls.update();
    renderer.render(scene, camera);
  };

  // Timer driven: the screenshot harness freezes requestAnimationFrame, so the
  // warm-up must not rely on it to reach the frames where splats become visible.
  const warmUpSplat = (frames = SPLAT_WARMUP_FRAMES) => {
    if (frames <= 0) return;
    renderFrame();
    setTimeout(() => warmUpSplat(frames - 1), 16);
  };

  let currentSplat = null;

  const setStatus = (message) => {
    status.textContent = message || '';
    status.hidden = !message;
  };

  const focusOnSplat = (splat) => {
    // Spark returns bounds in local space, ignoring the mesh's own rotation.
    splat.updateMatrixWorld();
    const bounds = splat.getBoundingBox().applyMatrix4(splat.matrixWorld);
    if (bounds.isEmpty()) return;

    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3()).length() || 1;
    const distance = size * 1.4;

    controls.target.copy(center);
    camera.position.set(
      center.x + distance,
      center.y - distance,
      center.z + distance * 0.65,
    );
    camera.near = Math.max(size / 1000, 0.001);
    camera.far = Math.max(size * 20, 100);
    camera.updateProjectionMatrix();
    controls.update();
  };

  const replaceSplat = (splat) => {
    const previousSplat = currentSplat;
    currentSplat = splat;
    // These splats render upside down with Y-up; map -Y to +Z.
    splat.rotation.x = -Math.PI / 2;
    scene.add(splat);
    focusOnSplat(splat);
    warmUpSplat();

    if (previousSplat) {
      scene.remove(previousSplat);
      previousSplat.dispose();
    }
  };

  const loadPlyUrl = async (url, label) => {
    setStatus(`Loading ${label}…`);
    try {
      const splat = await loader.loadAsync(url);
      replaceSplat(splat);
      setStatus();
    } catch (error) {
      console.error('Failed to load PLY:', error);
      setStatus(`Failed to load ${label}. See the console for details.`);
    }
  };

  const importPly = async () => {
    try {
      const files = await UploadUtils.uploadFile({
        formate: 'ply',
        mutiple: false,
      });
      if (!files.length) return;

      const file = files[0];
      setStatus(`Loading ${file.name}…`);
      const splat = await loader.loadFile(file);
      replaceSplat(splat);
      setStatus();
    } catch (error) {
      if (error.message !== 'No file selected') {
        console.error('Failed to import PLY:', error);
        setStatus('Failed to import PLY. See the console for details.');
      }
    }
  };

  const gui = initGUI();
  gui.add({ importPly }, 'importPly').name('Import PLY');
  gui.add(gridHelper, 'visible').name('Show Grid');
  gui.add(axesHelper, 'visible').name('Show Axes');

  renderer.setAnimationLoop(renderFrame);

  loadPlyUrl(getDefaultPlyUrl(), 'final.ply');

  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null);
    controls.dispose();
    currentSplat?.dispose();
    gridHelper.dispose();
    axesHelper.dispose();
    sparkRenderer.dispose();
    renderer.dispose();
    gui.destroy();
  }, { once: true });
}
