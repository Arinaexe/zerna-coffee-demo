// 3D-чашка на Three.js — без готовых моделей, вся геометрия собрана из примитивов:
// LatheGeometry (профиль, повёрнутый вокруг оси) даёт тело чашки, Torus — ручку, Cylinder — блюдце

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const container = document.getElementById('cup3d');

if (container) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 1.5, 3.6);
  camera.lookAt(0, 0.75, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // свет: мягкая заливка + основной свет + тёплый контровой в акцентном цвете сайта
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(2.5, 4, 3);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xff7f50, 0.5);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);

  const group = new THREE.Group();
  scene.add(group);

  // тело чашки — 2D-профиль (радиус, высота), повёрнутый на 360° вокруг оси Y
  const profile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.46, 0.05),
    new THREE.Vector2(0.5, 0.78),
    new THREE.Vector2(0.55, 1.05),
    new THREE.Vector2(0.58, 1.16),
    new THREE.Vector2(0.5, 1.18),
    new THREE.Vector2(0.47, 1.1),
  ];
  const cup = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a2827, roughness: 0.35, metalness: 0.05 })
  );
  group.add(cup);

  // кофе внутри — тёмный диск чуть ниже края
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.47, 32),
    new THREE.MeshStandardMaterial({ color: 0x3b2418, roughness: 0.25 })
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 1.08;
  group.add(coffee);

  // ручка — незамкнутый тор сбоку
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.07, 16, 32, Math.PI * 1.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2827, roughness: 0.35 })
  );
  handle.position.set(0.44, 0.6, 0);
  handle.rotation.y = Math.PI / 2;
  handle.rotation.z = Math.PI / 2 - 0.25;
  group.add(handle);

  // блюдце
  const saucer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.06, 48),
    new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.5 })
  );
  saucer.position.y = -0.05;
  group.add(saucer);

  // пар — несколько прозрачных "капель", каждая по своему циклу всплывает и тает
  const steamParticles = [];
  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x9c948a, transparent: true, opacity: 0 })
    );
    mesh.userData.offset = Math.random() * Math.PI * 2;
    mesh.userData.speed = 0.4 + Math.random() * 0.3;
    mesh.userData.x = (Math.random() - 0.5) * 0.5;
    mesh.userData.z = (Math.random() - 0.5) * 0.3;
    group.add(mesh);
    steamParticles.push(mesh);
  }

  // вращение мышью/пальцем — во время перетаскивания авто-вращение выключается
  let isDragging = false;
  let autoRotate = true;
  let lastX = 0;

  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    autoRotate = false;
    lastX = e.clientX;
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    group.rotation.y += (e.clientX - lastX) * 0.01;
    lastX = e.clientX;
  });
  window.addEventListener('pointerup', () => {
    isDragging = false;
  });

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (autoRotate) group.rotation.y += 0.004;

    steamParticles.forEach((p) => {
      const cycle = (t * p.userData.speed + p.userData.offset) % (Math.PI * 2);
      const progress = cycle / (Math.PI * 2);
      p.position.set(p.userData.x, 1.25 + progress * 1.1, p.userData.z);
      p.material.opacity = Math.sin(progress * Math.PI) * 0.55;
    });

    renderer.render(scene, camera);
  }
  animate();
}
