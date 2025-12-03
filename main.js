import * as THREE from './libs/three.module.js';
import { ARButton } from './libs/ARButton.js';
import { GLTFLoader } from './libs/GLTFLoader.js';

let camera, scene, renderer;
let stoneSpiral = null;
let stoneModel = null;

// Hilfsvektoren für Positionierung vor der Kamera
const tmpPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

let initialPlaced = false; // ob der Strudel schon einmal automatisch gesetzt wurde

function debug(msg) {
  console.log('[AR]', msg);
}

init();
animate();

function init() {
  debug('Init gestartet…');

  // Szene & Kamera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70, // kleiner = mehr Weitwinkel (z.B. 50 testen)
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
  debug('Renderer angehängt.');

  // Licht
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(1, 2, 1);
  scene.add(dirLight);
  debug('Licht gesetzt.');

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
      debug('Planet3.glb geladen.');
    },
    undefined,
    (error) => {
      console.error('Fehler beim Laden von Planet3.glb:', error);
    }
  );

  // AR-Button OHNE hit-test
  const arButton = ARButton.createButton(renderer);
  arButton.style.position = 'fixed';
  arButton.style.bottom = '20px';
  arButton.style.left = '50%';
  arButton.style.transform = 'translateX(-50%)';
  arButton.style.padding = '10px 20px';
  arButton.style.borderRadius = '999px';
  arButton.style.border = 'none';
  arButton.style.fontSize = '14px';
  arButton.style.fontWeight = '600';
  arButton.style.zIndex = '20';
  arButton.style.cursor = 'pointer';
  document.body.appendChild(arButton);
  debug('ARButton erstellt.');

  // XR-Controller für Taps (select-Event im AR-Modus)
  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);
  debug('XR-Controller registriert.');

  window.addEventListener('resize', onWindowResize);

  debug('Init fertig.');
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Spiral-Gruppe mit deinem Modell + Animations-Daten
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

  const stones = [];

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

    // Basis-Position setzen
    stone.position.set(x, y, z);
    stone.rotation.y = (Math.random() - 0.5) * Math.PI;

    // Animations-Daten speichern
    stone.userData.baseAngle = angleRad;
    stone.userData.radius = radius;
    stone.userData.baseHeight = y;

    group.add(stone);
    stones.push(stone);

    angleRad += angleStepRad;
    radius += radiusStep;
  }

  // Stones im userData speichern, damit wir sie im render() animieren können
  group.userData.stones = stones;

  return group;
}

// dafür sorgen, dass wir eine Spiral-Gruppe haben
function ensureStoneSpiral() {
  if (!stoneSpiral) {
    stoneSpiral = createStoneSpiral();
    stoneSpiral.scale.set(0.3, 0.3, 0.3); // Größe des Strudels
    scene.add(stoneSpiral);
    debug('Strudel erzeugt.');
  }
}

// Strudel in bestimmter Entfernung vor der Kamera platzieren
function placeSpiralInFrontOfCamera(distance = 1.2) {
  if (!stoneSpiral) return;

  const xrCamera = renderer.xr.getCamera(camera);

  // Weltposition der Kamera
  xrCamera.getWorldPosition(tmpPos);

  // Blickrichtung (vorne)
  tmpDir.set(0, 0, -1).applyQuaternion(xrCamera.quaternion).normalize();

  // distance Meter vor die Kamera
  tmpPos.add(tmpDir.multiplyScalar(distance));

  stoneSpiral.position.copy(tmpPos);

  debug('Strudel vor Kamera platziert (Distanz: ' + distance + 'm).');
}

// wird bei Tap im AR-Modus ausgelöst → Strudel neu vor die Kamera setzen
function onSelect() {
  if (!stoneModel) {
    debug('Tap ignoriert: Modell noch nicht geladen.');
    return;
  }

  ensureStoneSpiral();
  placeSpiralInFrontOfCamera(1.2);
  debug('Strudel per Tap neu vor Kamera gesetzt.');
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  const session = renderer.xr.getSession();

  // Wenn AR läuft und Modell geladen, aber Strudel noch nie gesetzt → einmal automatisch vor Kamera platzieren
  if (session && stoneModel && !initialPlaced) {
    ensureStoneSpiral();
    placeSpiralInFrontOfCamera(1.2);
    initialPlaced = true;
    debug('Strudel automatisch beim Start vor Kamera platziert.');
  }

  // Strudel-Animation: einzelne Steine bewegen sich
  if (stoneSpiral && stoneSpiral.userData.stones) {
    const t = timestamp / 1000; // ms → Sekunden

    stoneSpiral.userData.stones.forEach((stone, index) => {
      const baseAngle = stone.userData.baseAngle;
      const radius = stone.userData.radius;
      const baseHeight = stone.userData.baseHeight;

      // außen etwas schneller → wirkt „strudeliger“
      const speed = 0.2 + radius * 0.1;
      const angle = baseAngle + t * speed;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = baseHeight + Math.sin(t * 2 + index * 0.3) * 0.01; // leichtes Wabern

      stone.position.set(x, y, z);

      // optional: jeder Stein dreht sich leicht um sich selbst
      stone.rotation.y += 0.01;
    });
  }

  renderer.render(scene, camera);
}




