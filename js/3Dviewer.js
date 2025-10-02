// 3Dviewer_3dm_preload.js
// 3DM viewer that preloads .3dm files to memory for instant display.
// Keeps your original canvas sizing + ambient/directional light behavior.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader';

document.addEventListener('DOMContentLoaded', () => {
  // ====== CONFIG: edit to your files ======
  const PRELOAD_URLS = [
    './assets/modelA.3dm',
    // './assets/modelB.3dm',
  ];
  // If you also drive the file through a <select id="file-select">, it’ll use that value too.

  // ====== DOM ======
  const container = document.getElementById('canvas');
  const selectEl = document.getElementById('file-select'); // optional

  // ====== THREE CORE ======
  let scene, camera, renderer, controls, dirLight, currentRoot;

  // ====== LOADER + IN-MEMORY CACHE ======
  const loader = new Rhino3dmLoader();
  loader.setLibraryPath('https://unpkg.com/rhino3dm@8.4.0/');

  // Cache: url -> Promise<THREE.Object3D>
  const modelCache = new Map();

  // Public: get a *cloned* scene graph from cache (preloaded or on-demand)
  async function getModel(url) {
    const base = new URL(url, window.location.href).href;
    let p = modelCache.get(base);
    if (!p) {
      p = fetch(base)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status} for ${base}`);
          return r.arrayBuffer();
        })
        .then(buf => new Promise((resolve, reject) => {
          loader.parse(buf,
            // onLoad
            (obj) => resolve(obj),
            // onError
            (err) => reject(err)
          );
        }));
      modelCache.set(base, p);
    }
    const original = await p;
    // clone deep so we can add/remove independently
    return original.clone(true);
  }

  // Kick off preloads ASAP
  for (const url of PRELOAD_URLS) {
    getModel(url).catch(err => console.warn('[3DM preload] failed:', url, err));
  }

  // If <select> exists, also preload its default selection
  if (selectEl && selectEl.value) {
    getModel(selectEl.value).catch(err => console.warn('[3DM preload] failed:', selectEl.value, err));
  }

  // ====== INIT VIEWER (same sizing/behavior as your first script) ======
  init();
  loadModel(); // show default immediately (from cache if already ready)

  if (selectEl) selectEl.addEventListener('change', loadModel);

  function init() {
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(getCssVar('--background') || '#000');

    camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 100, 0);

    const amb = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(amb);

    dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', () => dirLight.position.copy(camera.position));
    dirLight.position.copy(camera.position);

    window.addEventListener('resize', onWindowResize, false);

    animate();
  }

  async function loadModel() {
    const src =
      (selectEl
        ? (selectEl.tagName === 'OPTION' ? selectEl.value : selectEl.value)
        : null) || PRELOAD_URLS[0] || './assets/modelA.3dm';

    // Dispose old
    if (currentRoot) {
      scene.remove(currentRoot);
      disposeRecursive(currentRoot);
      currentRoot = null;
    }

    // Get from memory (or fetch+parse once)
    try {
      const root = await getModel(src);
      currentRoot = root;

      // Optional: best-effort Rhino material → Standard material
      currentRoot.traverse((child) => {
        if (!child.isMesh) return;
        child.material = rhinoToStandard(child) || child.material || new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.1 });
      });

      scene.add(root);
      frameObject(root);
    } catch (err) {
      console.error('[3DM] load failed:', err);
    }
  }

  function frameObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    if (!isFinite(size) || size === 0) return;

    const fitDist = 0.5 * size / Math.tan((camera.fov * Math.PI) / 360);
    const dir = new THREE.Vector3(1, 1, 0.6).normalize();
    camera.position.copy(center).addScaledVector(dir, fitDist);
    camera.near = Math.max(size / 1000, 0.1);
    camera.far = Math.max(size * 10, 2000);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
    dirLight.position.copy(camera.position);
  }

  function animate() {
    requestAnimationFrame(animate);
    dirLight.position.copy(camera.position);
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ====== Utils ======
  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function disposeRecursive(root) {
    root.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach(disposeMaterial);
        else disposeMaterial(m);
      }
    });
  }

  function disposeMaterial(m) {
    if (!m) return;
    for (const k in m) {
      const v = m[k];
      if (v && v.isTexture) v.dispose();
    }
    m.dispose?.();
  }

  function rhinoToStandard(mesh) {
    const attr = mesh.userData?.attributes;
    const rmat = attr?.material || attr?.renderMaterial || null;
    const draw = attr?.drawColor;

    let color = new THREE.Color(0x888888);
    if (rmat?.diffuseColor) {
      color.setRGB(rmat.diffuseColor.r/255, rmat.diffuseColor.g/255, rmat.diffuseColor.b/255);
    } else if (draw) {
      color.setRGB(draw.r/255, draw.g/255, draw.b/255);
    }

    const metalness = clamp01((rmat?.pbrMetallic ?? rmat?.shine ?? 0) / 255);
    const roughness = clamp01(1 - metalness);
    const opacity   = clamp01(1 - (rmat?.transparency ?? 0));

    return new THREE.MeshStandardMaterial({
      color, metalness, roughness,
      transparent: opacity < 1, opacity
    });
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
});
