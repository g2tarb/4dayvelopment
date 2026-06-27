/* ── Three.js Universe Background ── */
import { on, raf } from './utils.js';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function initThreeUniverse() {
  if (typeof THREE === 'undefined') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (matchMedia('(max-width: 768px)').matches) return; // pas de canvas sur mobile (perf)

  const isLowEnd = (navigator.hardwareConcurrency || 4) <= 2;

  const canvas = document.createElement('canvas');
  canvas.id = 'three-bg';
  canvas.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    z-index:0;pointer-events:none;
    opacity:0;transition:opacity 2.5s ease;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);

  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth, innerHeight);
  camera.position.z = 380;

  // Star field
  const starCount = isLowEnd ? 400 : 1200;
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    sPos[i*3]   = (Math.random() - 0.5) * 3200;
    sPos[i*3+1] = (Math.random() - 0.5) * 3200;
    sPos[i*3+2] = (Math.random() - 0.5) * 3200;
  }
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const starPts = new THREE.Points(sGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 1.0, transparent: true, opacity: 0.5, sizeAttenuation: true,
  }));
  scene.add(starPts);

  // Brand nebula
  const nebCount = isLowEnd ? 120 : 400;
  const nGeo = new THREE.BufferGeometry();
  const nPos = new Float32Array(nebCount * 3);
  const nCol = new Float32Array(nebCount * 3);
  const palette = [
    new THREE.Color('#DA5426'), new THREE.Color('#f2b13b'),
    new THREE.Color('#884083'), new THREE.Color('#e07040'),
  ];
  for (let i = 0; i < nebCount; i++) {
    const r = 300 + Math.random() * 550;
    const θ = Math.random() * Math.PI * 2;
    const φ = Math.acos(2 * Math.random() - 1);
    nPos[i*3]   = r * Math.sin(φ) * Math.cos(θ);
    nPos[i*3+1] = r * Math.sin(φ) * Math.sin(θ);
    nPos[i*3+2] = (Math.random() - 0.5) * 380;
    const c = palette[Math.floor(Math.random() * palette.length)];
    nCol[i*3] = c.r; nCol[i*3+1] = c.g; nCol[i*3+2] = c.b;
  }
  nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute('color',    new THREE.BufferAttribute(nCol, 3));
  const nebMat = new THREE.PointsMaterial({
    size: 3.5, vertexColors: true, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const nebula = new THREE.Points(nGeo, nebMat);
  scene.add(nebula);

  // Neural nodes
  const nCount  = isLowEnd ? 30 : 60;
  const nodeGeo = new THREE.BufferGeometry();
  const nodePos = new Float32Array(nCount * 3);
  const nodeVel = [];
  for (let i = 0; i < nCount; i++) {
    nodePos[i*3]   = (Math.random() - 0.5) * 850;
    nodePos[i*3+1] = (Math.random() - 0.5) * 560;
    nodePos[i*3+2] = (Math.random() - 0.5) * 200;
    nodeVel.push({
      x: (Math.random() - 0.5) * 0.28,
      y: (Math.random() - 0.5) * 0.28,
      z: (Math.random() - 0.5) * 0.08,
    });
  }
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  const nodeMat = new THREE.PointsMaterial({
    color: 0xf2b13b, size: 3.5, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const nodes = new THREE.Points(nodeGeo, nodeMat);
  scene.add(nodes);

  // Connections buffer (zero-allocation)
  const MAX_LINES  = nCount * nCount;
  const linePosArr = new Float32Array(MAX_LINES * 6);
  const lineGeo    = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePosArr, 3));
  const lineMat = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    color: 0xf2b13b, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(lineMat);
  const maxDist = 155;

  function rebuildLines() {
    const pos = nodeGeo.attributes.position.array;
    let count = 0;
    for (let i = 0; i < nCount; i++) {
      for (let j = i + 1; j < nCount; j++) {
        const ax=pos[i*3],ay=pos[i*3+1],az=pos[i*3+2];
        const bx=pos[j*3],by=pos[j*3+1],bz=pos[j*3+2];
        const dx=ax-bx, dy=ay-by, dz=az-bz;
        const d2 = dx*dx + dy*dy + dz*dz;
        if (d2 < maxDist * maxDist) {
          const base = count * 6;
          linePosArr[base]   = ax; linePosArr[base+1] = ay; linePosArr[base+2] = az;
          linePosArr[base+3] = bx; linePosArr[base+4] = by; linePosArr[base+5] = bz;
          count++;
        }
      }
    }
    lineGeo.setDrawRange(0, count * 2);
    lineGeo.attributes.position.needsUpdate = true;
  }

  let mouseX = 0, mouseY = 0;
  on(document, 'mousemove', e => {
    mouseX = (e.clientX / innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / innerHeight - 0.5) * 2;
  });

  on(window, 'resize', debounce(() => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }, 150), { passive: true });

  let paused = false;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) raf(animate);
  });

  const FPS_INTERVAL = 1000 / 30;
  let lastTime = 0;
  let frame = 0, lineTimer = 0;

  function animate(now = 0) {
    if (paused) return;
    raf(animate);
    const elapsed = now - lastTime;
    if (elapsed < FPS_INTERVAL) return;
    lastTime = now - (elapsed % FPS_INTERVAL);

    frame++;
    const t = frame * 0.006;

    const pos = nodeGeo.attributes.position.array;
    for (let i = 0; i < nCount; i++) {
      pos[i*3]   += nodeVel[i].x;
      pos[i*3+1] += nodeVel[i].y;
      pos[i*3+2] += nodeVel[i].z;
      if (Math.abs(pos[i*3])   > 440) nodeVel[i].x *= -1;
      if (Math.abs(pos[i*3+1]) > 295) nodeVel[i].y *= -1;
      if (Math.abs(pos[i*3+2]) > 115) nodeVel[i].z *= -1;
    }
    nodeGeo.attributes.position.needsUpdate = true;

    if (++lineTimer % 20 === 0) rebuildLines();

    starPts.rotation.y = t * 0.035;
    starPts.rotation.x = t * 0.015;
    nebula.rotation.y  = t * 0.055;
    nebula.rotation.z  = t * 0.025;
    nodes.rotation.y   = t * 0.012;

    camera.position.x += (mouseX * 28 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 18 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);

    nebMat.opacity  = 0.22 + Math.sin(t * 0.9) * 0.08;
    nodeMat.opacity = 0.55 + Math.sin(t * 1.3) * 0.2;

    const p  = (t * 0.25) % (Math.PI * 2);
    const w1 = Math.max(0, Math.cos(p));
    const w2 = Math.max(0, Math.cos(p - Math.PI * 2/3));
    const w3 = Math.max(0, Math.cos(p - Math.PI * 4/3));
    const total = w1 + w2 + w3 || 1;
    const cr = (0xDA/255 * w1 + 0x7B/255 * w2 + 0xFF/255 * w3) / total;
    const cg = (0x54/255 * w1 + 0x2F/255 * w2 + 0xD7/255 * w3) / total;
    const cb = (0x26/255 * w1 + 0xBE/255 * w2 + 0x00/255 * w3) / total;
    nodeMat.color.setRGB(cr, cg, cb);
    lineMat.material.color.setRGB(cr, cg, cb);

    renderer.render(scene, camera);
  }

  raf(animate);
  setTimeout(() => { canvas.style.opacity = '1'; }, 400);
}
