import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas');
  const fileEl = document.getElementById('file-select');
  const panel = container ? container.closest('.togglebox') : null;

  if (!container) {
    console.error('[3Dviewer_glb] No #canvas container found.');
    return;
  }

  let scene;
  let camera;
  let renderer;
  let controls;
  let dirLight;
  let currentRoot = null;
  let resizeObserver = null;
  let panelObserver = null;
  let statusEl;
  let warmupFrames = 0;
  let hasActivated = false;
  let hasBootstrapped = false;
  let isLoading = false;

  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  observePanelActivation();

  if (!panel || panel.classList.contains('active')) {
    startViewer();
  }

  if (fileEl) {
    fileEl.addEventListener('change', () => {
      if (!hasBootstrapped) {
        startViewer();
        return;
      }
      loadModel();
    });
  }

  function startViewer() {
    if (hasBootstrapped) {
      requestAnimationFrame(() => {
        handleResize();
        if (!hasActivated && currentRoot) {
          frameObject(currentRoot);
          hasActivated = true;
        }
      });
      return;
    }

    hasBootstrapped = true;
    initUi();
    initThree();
    loadModel();
  }

  function observePanelActivation() {
    if (!panel || typeof MutationObserver === 'undefined') return;

    panelObserver = new MutationObserver(() => {
      if (!panel.classList.contains('active')) return;
      startViewer();
    });

    panelObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  function initUi() {
    const ui = document.createElement('div');
    ui.className = 'canvas-ui';
    ui.innerHTML = `
      <button type="button" class="canvas-ui__btn" data-action="fit">Ajuster la vue</button>
      <span class="canvas-ui__hint">Cliquer-glisser pour tourner, molette pour zoom</span>
    `;
    container.appendChild(ui);

    statusEl = document.createElement('div');
    statusEl.className = 'canvas-status';
    container.appendChild(statusEl);

    const fitButton = ui.querySelector('[data-action="fit"]');
    fitButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (currentRoot) {
        frameObject(currentRoot);
      }
    });

    const stopToggle = (event) => event.stopPropagation();
    ['click', 'dblclick', 'pointerdown', 'pointerup', 'touchstart', 'wheel'].forEach((type) => {
      container.addEventListener(type, stopToggle);
    });
  }

  function initThree() {
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    scene = new THREE.Scene();
    scene.background = null;

    const { width, height } = getContainerSize();

    camera = new THREE.PerspectiveCamera(24, width / height, 0.01, 10000);
    camera.position.set(-100, 0, 20);
    camera.up.set(0, 0, 1);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    renderer.domElement.style.background = 'transparent';
    container.appendChild(renderer.domElement);

    const stopToggle = (event) => event.stopPropagation();
    ['click', 'dblclick', 'pointerdown', 'pointerup', 'touchstart', 'wheel'].forEach((type) => {
      renderer.domElement.addEventListener(type, stopToggle);
    });

    const ktx2Loader = new KTX2Loader()
      .setTranscoderPath('https://unpkg.com/three@0.158.0/examples/jsm/libs/basis/')
      .detectSupport(renderer);
    gltfLoader.setKTX2Loader(ktx2Loader);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.158.0/examples/jsm/libs/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.01;
    controls.maxDistance = 1e9;
    controls.screenSpacePanning = true;
    controls.addEventListener('change', () => {
      dirLight.position.copy(camera.position);
    });
    dirLight.position.copy(camera.position);

    window.addEventListener('resize', handleResize, false);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

    animate();
  }

  function getModelSrc() {
    if (!fileEl) return './assets/myModel.glb';
    return fileEl.value || './assets/myModel.glb';
  }

  function loadModel() {
    if (isLoading) return;

    const src = getModelSrc();
    isLoading = true;
    showStatus('Chargement de la scene 3D...');

    if (currentRoot) {
      scene.remove(currentRoot);
      currentRoot = null;
    }

    gltfLoader.load(
      src,
      (gltf) => {
        currentRoot = gltf.scene || gltf.scenes[0];
        if (!currentRoot) {
          showStatus('Le fichier 3D ne contient aucun objet.', true);
          isLoading = false;
          return;
        }

        currentRoot.rotation.x = Math.PI / 2;
        currentRoot.rotateY(Math.PI / 2);

        scene.add(currentRoot);
        frameObject(currentRoot);
        renderer.compile(scene, camera);
        warmupFrames = 30;
        renderOnce();
        hideStatus();
        isLoading = false;
      },
      (event) => {
        if (!event.total) return;
        const pct = Math.round((event.loaded / event.total) * 100);
        showStatus(`Chargement de la scene 3D... ${pct}%`);
      },
      (error) => {
        console.error('[3Dviewer_glb] load error:', error);
        showStatus('Echec du chargement du fichier 3D.', true);
      }
    );
  }

  function frameObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const sizeVector = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const size = sizeVector.length();

    if (!isFinite(size) || size <= 0) return;

    const fitDist = (0.5 * size) / Math.tan((camera.fov * Math.PI) / 360);
    const dir = new THREE.Vector3(-1, 0, 0.24).normalize();

    camera.position.copy(center).addScaledVector(dir, fitDist);
    camera.near = Math.max(size / 5000, 0.01);
    camera.far = Math.max(size * 20, 1000);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.minDistance = Math.max(size * 0.005, 0.01);
    controls.maxDistance = Math.max(size * 25, 1000);
    controls.update();

    dirLight.position.copy(camera.position);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!isViewerVisible() && warmupFrames <= 0) return;

    controls.update();
    dirLight.position.copy(camera.position);
    renderer.render(scene, camera);

    if (warmupFrames > 0) {
      warmupFrames -= 1;
    }
  }

  function renderOnce() {
    dirLight.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  function isViewerVisible() {
    if (!panel) return true;
    return panel.classList.contains('active');
  }

  function handleResize() {
    const { width, height } = getContainerSize();
    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    renderer.domElement.style.background = 'transparent';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.add('visible');
    statusEl.classList.toggle('is-error', isError);
  }

  function hideStatus() {
    statusEl.classList.remove('visible', 'is-error');
    statusEl.textContent = '';
  }

  function getCssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  function getContainerSize() {
    let width = container.clientWidth;
    let height = container.clientHeight;

    if (!width || !height) {
      width = window.innerWidth;
      height = window.innerHeight;
    }

    return { width, height };
  }
});
