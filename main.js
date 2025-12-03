import * as THREE from './libs/three.module.js';
import { ARButton } from './libs/ARButton.js';
import { GLTFLoader } from './libs/GLTFLoader.js';

let camera, scene, renderer;
let hitTestSource = null;
let hitTestSourceRequested = false;
let reticle = null;
let stoneSpiral = null;
let stoneModel = null;

function debug(msg) {
  console.log(msg);
}

init();
animate();

function init() {
  debug('Init gestartet…');

  // Szene & Kamera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70, // "Zoom" -> kleiner = mehr Weitwinkel, z.B. 50 oder 40
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Licht
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(1, 2, 1);
  scene.add(dirLight);

  // Modell laden
  const loader = new GLTFLoader();
  loader.load(
    './assets/models/Planet3.glb',
    (gltf) => {
      stoneModel = gltf.scene;

      stoneModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      stoneModel.scale.set(0.05, 0.05, 0.05);
      debug('Planet3.glb geladen');
    },
    undefined,
    (error) => {
      console.error('Fehler beim Laden von Planet3.glb:', error);
    }
  );

  // AR-Button MIT Hit-Test
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test']
  });
  document.body.appendChild(arButton);

  // Reticle
  const reticleGeo = new THREE.RingGeometry(0.06, 0.07, 32).rotateX(-Math.PI / 2);
  const reticleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  reticle = new THREE.Mesh(reticleGeo, reticleMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  window.addEventListener('resize', onWindowResize);

  debug('Init fertig.');
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Spiral-Gruppe mit deinem Modell
function createStoneSpiral() {
  const group = new THREE.Group();

  const stoneCount = 60;
  const angleStepDeg = 15;
  const radiusStep = 0.03;
  const randomHeight = 0.01;

  const fallbackGeometry = new THREE.BoxGeometry(0.04, 0.025, 0.06);
  const fallbackMaterial = new THREE.MeshStandardMaterial({
    color: 0x777777,
    roughness: 0.9,
    metalness: 0.1
  });

  let angleRad = 0;
  let radius = 0;
  const angleStepRad = (angleStepDeg * Math.PI) / 180;

  for (let i = 0; i < stoneCount; i++) {
    const x = Math.cos(angleRad) * radius;
    const z = Math.sin(angleRad) * radius;
    const y = (Math.random() - 0.5) * 2 * randomHeight;

    let stone;
    if (stoneModel) {
      stone = stoneModel.clone(true);
    } else {
      stone = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
    }

    stone.position.set(x, y, z);
    stone.rotation.y = (Math.random() - 0.5) * Math.PI;
    group.add(stone);

    angleRad += angleStepRad;
    radius += radiusStep;
  }

  // group.userData.rotate = true; // brauchen wir nicht mehr
  return group;
}

// Strudel einmalig auf Reticle setzen
function placeSpiralAtReticle() {
  const m = reticle.matrix;
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  m.decompose(position, quaternion, scale);

  if (!stoneSpiral) {
    stoneSpiral = createStoneSpiral();
    stoneSpiral.scale.set(0.3, 0.3, 0.3); // Größe des Strudels
    scene.add(stoneSpiral);
    debug('Strudel erzeugt.');
  }

  stoneSpiral.position.copy(position);
  stoneSpiral.quaternion.copy(quaternion);
  debug('Strudel platziert.');
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  const session = renderer.xr.getSession();

  if (frame && session) {
    const referenceSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session
          .requestHitTestSource({ space: viewerSpace })
          .then((source) => {
            hitTestSource = source;
            debug('Hit-Test-Source eingerichtet.');
          })
          .catch((e) => debug('Fehler bei requestHitTestSource: ' + e));
      });

      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
        debug('XR-Session beendet, Hit-Test reset.');
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);

        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);

        // Sobald wir das ERSTE MAL einen Hit haben & Modell geladen ist → Strudel einmalig platzieren
        if (!stoneSpiral && stoneModel) {
          placeSpiralAtReticle();
          debug('Strudel automatisch beim ersten Hit platziert.');
        }
      } else {
        reticle.visible = false;
      }
    }
  }

  // 🔥 KEINE Rotation mehr:
  // if (stoneSpiral && stoneSpiral.userData.rotate) {
  //   stoneSpiral.rotation.y += 0.4 * (1 / 60);
  // }

  renderer.render(scene, camera);
}

  renderer.render(scene, camera);
}

