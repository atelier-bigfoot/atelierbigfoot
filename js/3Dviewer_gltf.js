// /js/3Dviewer_gltf.js — same as before but maps Y-axis → Z-axis
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';

document.addEventListener('DOMContentLoaded', () => {
  const getCssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const container = document.getElementById('canvas');
  const fileEl = document.getElementById('file-select');

  let scene, camera, renderer, controls, dirLight, currentRoot;

  const gltfLoader = new GLTFLoader();
  const ktx2 = new KTX2Loader()
    .setTranscoderPath('https://unpkg.com/three@0.158.0/examples/jsm/libs/basis/')
    .detectSupport(new THREE.WebGLRenderer());
  gltfLoader.setKTX2Loader(ktx2);
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  init();
  loadModel();

  if (fileEl) fileEl.addEventListener('change', loadModel);

  function init() {
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1); // use Z as up

    scene = new THREE.Scene();
    scene.background = new THREE.Color(getCssVar('--background') || '#000');

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 100, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    scene.add(dirLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', () => dirLight.position.copy(camera.position));
    dirLight.position.copy(camera.position);

    window.addEventListener('resize', onWindowResize, false);
    animate();
  }

  function loadModel() {
    const src =
      (fileEl
        ? fileEl.tagName === 'OPTION'
          ? fileEl.value
          : fileEl.value
        : null) || './assets/myModel.glb';

    if (currentRoot) {
      scene.remove(currentRoot);
      currentRoot = null;
    }

    gltfLoader.load(
      src,
      (gltf) => {
        currentRoot = gltf.scene || gltf.scenes[0];

        // 🔹 Rotate root to convert Y-up → Z-up
        currentRoot.rotation.x = Math.PI / 2;

        // 2) Extra 90° around Z
        currentRoot.rotateY(Math.PI / 2);


        scene.add(currentRoot);
        frameObject(currentRoot);
      },
      undefined,
      (err) => console.error('[GLTF] load error:', err)
    );
  }

  function frameObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    if (!isFinite(size) || size === 0) return;

    const fitDist = 1.2 * size / Math.tan((camera.fov * Math.PI) / 360);
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
});
