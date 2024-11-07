
var scene3d = document.getElementById("viewer");


// Import libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Rhino3dmLoader } from 'three/examples/jsm/loaders/3DMLoader'
// import { url } from 'https://github.com/atelier-bigfoot/atelierbigfoot/raw/refs/heads/main/bigfoot.3dm'

const select = document.getElementById( 'file-select' )
select.onchange = load

let model = 'empty.3dm'

const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://unpkg.com/rhino3dm@8.4.0/' )

let material = new THREE.MeshStandardMaterial({
    color: 0x040cf6,
    emissive: 0x000000,
    metalness: 1,
    roughness: 0,
  });

// BOILERPLATE //
let scene, camera, renderer, rhinoObject

init()
load()

// const url = new URL( 'https://github.com/atelier-bigfoot/atelierbigfoot/raw/refs/heads/main/bigfoot.3dm', import.meta.url );


function load() {

      model = select.value
    // model = url
    

    // load model
    loader.load( model, function ( object ) {


        object.traverse( child => {

            child.material = material

        })
        scene.add( object )
    
    } )

}


function init() {

    THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0,0,1)

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0,0,0)
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 1, 1000 )
    camera.position.set(0,-100,5)

    // add a directional light
    var light = new THREE.DirectionalLight( 0xffffff, 1000);
    light.position.set( 0, -1, 1 ).normalize();
    scene.add(light)

    const ambientLight = new THREE.AmbientLight()
    scene.add(ambientLight)

    renderer = new THREE.WebGLRenderer({antialias: true})
    renderer.setPixelRatio( window.devicePixelRatio )
    renderer.setSize( window.innerWidth, window.innerHeight )
    // document.body.appendChild( renderer.domElement )
    scene3d.appendChild(renderer.domElement)

    const controls = new OrbitControls( camera, renderer.domElement )

    window.addEventListener( 'resize', onWindowResize, false )

    animate()
}

function animate () {
    requestAnimationFrame( animate )
    renderer.render( scene, camera )
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize( window.innerWidth, window.innerHeight )
    animate()
}