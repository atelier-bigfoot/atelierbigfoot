import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader'

document.addEventListener('DOMContentLoaded', () => {

    // Helper function to read a CSS variable color
    function getCssVariableColor(varName) {
        const style = getComputedStyle(document.documentElement);
        const colorString = style.getPropertyValue(varName).trim();
        return colorString; // THREE.Color can parse hex strings like "#RRGGBB"
    }

// Get canvas element
const scene3d = document.getElementById("canvas");

// File selection handler
const select = document.getElementById('file-select');
select.onchange = loadModel;

let model = 'empty.3dm';
const loader = new Rhino3dmLoader();
loader.setLibraryPath('https://unpkg.com/rhino3dm@8.4.0/');

let scene, camera, renderer, directionalLight;
init();
loadModel();

function loadModel() {
    model = select.value;

    // Load 3DM model
    loader.load(model, function (object) {
        object.traverse(child => {
            if (child.isMesh) {
                child.material = convertRhinoMaterial(child);
            }
        });
        scene.add(object);
    });
}

function convertRhinoMaterial(object) {
    let color = new THREE.Color(0x888888); // Default gray
    let metalness = 0.3;
    let roughness = 0.7;
    let transparency = 1.0;

    if (object.userData && object.userData.attributes) {
        let rhinoColor = object.userData.attributes.drawColor;
        color.setRGB(rhinoColor.r / 255, rhinoColor.g / 255, rhinoColor.b / 255);

        if (object.userData.attributes.hasMaterial) {
            let rhinoMaterial = object.userData.attributes.material;
            if (rhinoMaterial) {
                color.setRGB(rhinoMaterial.diffuseColor.r / 255, rhinoMaterial.diffuseColor.g / 255, rhinoMaterial.diffuseColor.b / 255);
                transparency = 1 - rhinoMaterial.transparency;
                metalness = rhinoMaterial.shine / 255;
                roughness = 1 - metalness;
            }
        }
    }

    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
        transparent: transparency < 1.0,
        opacity: transparency
    });
}

function init() {
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(getCssVariableColor('--background'));

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 100, 0);

    // 🔹 Ambient Light (Soft Background Illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // 🔹 Directional Light (Now Matches Camera Position)
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene3d.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', updateLightPosition); // Update light when camera moves
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

// 🔄 Update Light Position to Match Camera
function updateLightPosition() {
    directionalLight.position.copy(camera.position);
}

function animate() {
    requestAnimationFrame(animate);
    updateLightPosition(); // Move light with camera
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    animate();
}
});