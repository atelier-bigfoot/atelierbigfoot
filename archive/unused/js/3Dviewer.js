import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas');
  const fileEl = document.getElementById('file-select');
  const panel = container ? container.closest('.togglebox') : null;

  if (!container) {
    console.error('[3Dviewer_3dm] No #canvas container found.');
    return;
  }

  let scene;
  let camera;
  let renderer;
  let controls;
  let dirLight;
  let currentRoot = null;
  let statusEl;

  const loader = new Rhino3dmLoader();
  loader.setLibraryPath('https://unpkg.com/rhino3dm@8.4.0/');

  initUi();
  initThree();
  loadModel();

  if (fileEl) {
    fileEl.addEventListener('change', () => {
      loadModel();
    });
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
      if (currentRoot) frameObject(currentRoot);
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
      const ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(container);
    }

    if (panel && typeof MutationObserver !== 'undefined') {
      const mo = new MutationObserver(() => {
        if (panel.classList.contains('active')) {
          handleResize();
          if (currentRoot) frameObject(currentRoot);
        }
      });
      mo.observe(panel, { attributes: true, attributeFilter: ['class'] });
    }

    animate();
  }

  function getModelSrc() {
    if (!fileEl) return './3D_projet.3dm';
    return fileEl.value || './3D_projet.3dm';
  }

  function loadModel() {
    const src = getModelSrc();
    showStatus('Chargement de la scène 3D...');

    if (currentRoot) {
      scene.remove(currentRoot);
      disposeRecursive(currentRoot);
      currentRoot = null;
    }

    loader.load(
      src,
      (object) => {
        currentRoot = object;

        currentRoot.traverse((child) => {
          if (!child.isMesh) return;
          child.material = rhinoToStandard(child) || child.material || new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.8,
            metalness: 0.1,
          });
        });

        scene.add(currentRoot);
        frameObject(currentRoot);
        hideStatus();
      },
      undefined,
      (error) => {
        console.error('[3Dviewer_3dm] load error:', error);
        showStatus('Échec du chargement du fichier 3D.', true);
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
    if (!isViewerVisible()) return;

    controls.update();
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

  function disposeRecursive(root) {
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      const material = obj.material;
      if (Array.isArray(material)) material.forEach(disposeMaterial);
      else disposeMaterial(material);
    });
  }

  function disposeMaterial(material) {
    if (!material) return;
    for (const key in material) {
      const value = material[key];
      if (value && value.isTexture) value.dispose();
    }
    material.dispose?.();
  }

  function rhinoToStandard(mesh) {
    const attr = mesh.userData?.attributes;
    const rmat = attr?.material || attr?.renderMaterial || null;
    const draw = attr?.drawColor;

    const color = new THREE.Color(0x888888);
    if (rmat?.diffuseColor) {
      color.setRGB(rmat.diffuseColor.r / 255, rmat.diffuseColor.g / 255, rmat.diffuseColor.b / 255);
    } else if (draw) {
      color.setRGB(draw.r / 255, draw.g / 255, draw.b / 255);
    }

    const metallic = clamp01((rmat?.pbrMetallic ?? rmat?.shine ?? 0) / 255);
    const roughness = clamp01(1 - metallic);
    const opacity = clamp01(1 - (rmat?.transparency ?? 0));

    return new THREE.MeshStandardMaterial({
      color,
      metalness: metallic,
      roughness,
      transparent: opacity < 1,
      opacity,
    });
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }
});
