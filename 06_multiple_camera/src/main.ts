import "./style.css";

import * as THREE from "three";
import Stats from "stats.js";

let scene: THREE.Scene | null = null,
  renderer: THREE.WebGLRenderer | null = null,
  stats: Stats | null = null;
let mouseX = 0,
  mouseY = 0;
let windowWidth: number = 0,
  windowHeight: number = 0;

type PointAry = [number, number, number];

type ViewItemProps = {
  left: number;
  bottom: number;
  width: number;
  height: number;
  background: THREE.Color;
  eye: PointAry;
  up: PointAry;
  fov: number;
  updateCamera: (
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    mouseX: number
  ) => void;
  camera?: THREE.PerspectiveCamera;
};

const views: Array<ViewItemProps> = [
  {
    left: 0,
    bottom: 0,
    width: 0.5,
    height: 1.0,

    background: new THREE.Color(1, 1, 1),
    eye: [0, 300, 1800],
    up: [0, 1, 0],
    fov: 30,
    updateCamera: function (
      camera: THREE.PerspectiveCamera,
      scene: THREE.Scene,
      mouseX: number
    ) {
      camera.position.x += mouseX * 0.05;
      camera.position.x = Math.max(Math.min(camera.position.x, 2000), -2000);
      camera.lookAt(scene.position);
    },
  },
  {
    left: 0.5,
    bottom: 0,
    width: 0.5,
    height: 0.5,

    background: new THREE.Color(1, 1, 0.8),
    eye: [0, 1800, 0],
    up: [0, 0, 1],
    fov: 45,
    updateCamera: function (
      camera: THREE.PerspectiveCamera,
      scene: THREE.Scene,
      mouseX: number
    ) {
      camera.position.x -= mouseX * 0.05;
      camera.position.x = Math.max(Math.min(camera.position.x, 2000), -2000);
      camera.lookAt(scene.position.clone().setY(0));
    },
  },
  {
    left: 0.5,
    bottom: 0.5,
    width: 0.5,
    height: 0.5,

    background: new THREE.Color(0.5, 0.7, 0.7),
    eye: [1400, 800, 1400],
    up: [1, 0, 0],
    fov: 60,
    updateCamera: function (
      camera: THREE.PerspectiveCamera,
      scene: THREE.Scene,
      mouseX: number
    ) {
      camera.position.y -= mouseX * 0.05;
      camera.position.y = Math.max(Math.min(camera.position.y, 1600), -1600);
      camera.lookAt(scene.position);
    },
  },
];

init();
animate();

function init() {
  const container = document.querySelector("#app")!;

  for (let ii = 0; ii < views.length; ++ii) {
    const view = views[ii];
    const camera = new THREE.PerspectiveCamera(
      view.fov,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.fromArray(view.eye);
    camera.up.fromArray(view.up);
    view.camera = camera;
  }

  scene = new THREE.Scene();
  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 0, 1);
  scene.add(light);

  // shadow
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2
  );

  gradient.addColorStop(0.1, "rgba(0, 0, 0, 0.15)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
  });
  const shadowGeo = new THREE.PlaneGeometry(300, 300, 1, 1);

  let shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.y = -250;
  shadowMesh.position.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.x = -400;
  shadowMesh.position.y = -250;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
  shadowMesh.position.x = 400;
  shadowMesh.position.y = -250;
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  const radius = 200;
  const geometry1 = new THREE.IcosahedronGeometry(radius, 1);
  const count = (geometry1.attributes.position as THREE.BufferAttribute).count;
  geometry1.setAttribute(
    "color",
    new THREE.BufferAttribute(new Float32Array(count * 3), 3)
  );

  const geometry2 = geometry1.clone();
  const geometry3 = geometry1.clone();

  const color = new THREE.Color();
  const positions1 = geometry1.attributes.position;
  const positions2 = geometry2.attributes.position;
  const positions3 = geometry3.attributes.position;

  const colors1 = geometry1.attributes.color;
  const colors2 = geometry2.attributes.color;
  const colors3 = geometry3.attributes.color;

  for (let i = 0; i < count; i++) {
    color.setHSL((positions1.getY(i) / radius + 1) / 2, 1.0, 0.5);
    colors1.setXYZ(i, color.r, color.g, color.b);

    color.setHSL(0, (positions2.getY(i) / radius + 1) / 2, 0.5);
    colors2.setXYZ(i, color.r, color.g, color.b);

    color.setRGB(1, 0.8 - (positions3.getY(i) / radius + 1) / 2, 0);
    colors3.setXYZ(i, color.r, color.g, color.b);
  }

  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    vertexColors: true,
    shininess: 0,
  });

  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    transparent: true,
  });

  let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> = new THREE.Mesh(
    geometry1,
    material
  );
  let wireframe: THREE.Mesh<THREE.BufferGeometry, THREE.Material> =
    new THREE.Mesh(geometry1, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = -400;
  mesh.rotation.x = -1.87;
  scene.add(mesh);

  mesh = new THREE.Mesh(geometry2, material);
  wireframe = new THREE.Mesh(geometry2, wireframeMaterial);
  mesh.add(wireframe);
  mesh.position.x = 400;
  scene.add(mesh);

  mesh = new THREE.Mesh(geometry3, material);
  wireframe = new THREE.Mesh(geometry3, wireframeMaterial);
  mesh.add(wireframe);
  scene.add(mesh);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  stats = new Stats();
  container.appendChild(stats.dom);

  document.addEventListener("mousemove", onDocumentMouseMove);
}

function animate() {
  render();
  stats?.update();
  requestAnimationFrame(animate);
}

function onDocumentMouseMove(event: MouseEvent) {
  mouseX = event.clientX - windowWidth / 2;
  mouseY = event.clientY - windowHeight / 2;
}

function updateSize() {
  if (windowWidth != window.innerWidth || windowHeight != window.innerHeight) {
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    renderer?.setSize(windowWidth, windowHeight);
  } 
}

function render() {
  updateSize();

  for (let ii = 0; ii < views.length; ++ii) {
    const view = views[ii];
    const camera = view.camera!;

    view.updateCamera(camera, scene!, mouseX);

    const left = Math.floor(windowWidth * view.left);
    const bottom = Math.floor(windowHeight * view.bottom);
    const width = Math.floor(windowWidth * view.width);
    const height = Math.floor(windowHeight * view.height);

    renderer?.setViewport(left, bottom, width, height);
    renderer?.setScissor(left, bottom, width, height);
    renderer?.setScissorTest(true);
    renderer?.setClearColor(view.background);


    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer?.render(scene!, camera);
  }
}
