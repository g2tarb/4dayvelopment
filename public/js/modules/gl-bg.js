/* ================================================================
   4DAYVELOPMENT — gl-bg.js
   Univers WebGL natif, zéro dépendance (remplace Three.js ~592 Ko).
   Étoiles + nébuleuse + réseau neuronal + parallaxe + cycle couleurs.
   Actif aussi sur mobile (densité réduite, DPR 1, 30 fps).
   ================================================================ */
import { on, raf } from './utils.js';

/* ── Mini mat4 (colonne-major, comme WebGL) ── */
function mat4Identity() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
function mat4Multiply(out, a, b) {
  for (let c = 0; c < 4; c++) {
    const b0 = b[c*4], b1 = b[c*4+1], b2 = b[c*4+2], b3 = b[c*4+3];
    out[c*4]   = a[0]*b0 + a[4]*b1 + a[8]*b2  + a[12]*b3;
    out[c*4+1] = a[1]*b0 + a[5]*b1 + a[9]*b2  + a[13]*b3;
    out[c*4+2] = a[2]*b0 + a[6]*b1 + a[10]*b2 + a[14]*b3;
    out[c*4+3] = a[3]*b0 + a[7]*b1 + a[11]*b2 + a[15]*b3;
  }
  return out;
}
function mat4Perspective(out, fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
  out.set([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  return out;
}
function mat4LookAt(out, ex, ey, ez) {
  // Caméra en (ex,ey,ez) qui regarde l'origine, up = +Y
  let zx = ex, zy = ey, zz = ez;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  let xx = -zz, xy = 0, xz = zx;                    // up × z
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl; xy /= xl; xz /= xl;
  const yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
  out.set([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx*ex + xy*ey + xz*ez), -(yx*ex + yy*ey + yz*ez), -(zx*ex + zy*ey + zz*ez), 1,
  ]);
  return out;
}
function mat4Rotation(out, rx, ry, rz) {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  // Rz * Ry * Rx
  out.set([
    cy*cz,             cy*sz,            -sy,    0,
    sx*sy*cz - cx*sz,  sx*sy*sz + cx*cz,  sx*cy, 0,
    cx*sy*cz + sx*sz,  cx*sy*sz - sx*cz,  cx*cy, 0,
    0, 0, 0, 1,
  ]);
  return out;
}

const VS = `
attribute vec3 aPos;
attribute vec3 aCol;
uniform mat4 uMVP;
uniform float uSize;
uniform float uScale;
varying vec3 vCol;
void main() {
  vec4 p = uMVP * vec4(aPos, 1.0);
  gl_Position = p;
  gl_PointSize = clamp(uSize * uScale / max(p.w, 1.0), 0.5, 24.0);
  vCol = aCol;
}`;

const FS_POINT = `
precision mediump float;
varying vec3 vCol;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uVertexColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float a = uOpacity * smoothstep(0.25, 0.02, d);
  gl_FragColor = vec4(mix(uColor, vCol, uVertexColor), a);
}`;

const FS_LINE = `
precision mediump float;
uniform vec3 uColor;
uniform float uOpacity;
void main() { gl_FragColor = vec4(uColor, uOpacity); }`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('gl-bg shader:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}
function program(gl, fsSrc) {
  const p = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VS);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  return p;
}

export function initUniverse() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const isMobile = matchMedia('(max-width: 768px)').matches;
  const isLowEnd = (navigator.hardwareConcurrency || 4) <= 2;
  const lite     = isMobile || isLowEnd;

  const canvas = document.createElement('canvas');
  canvas.id = 'three-bg';
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;' +
    'z-index:0;pointer-events:none;opacity:0;transition:opacity 2.5s ease;';

  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;
  document.body.insertBefore(canvas, document.body.firstChild);

  const progPoint = program(gl, FS_POINT);
  const progLine  = program(gl, FS_LINE);
  if (!progPoint || !progLine) return;

  const DPR = isMobile ? 1 : Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0;
  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  const loc = p => ({
    aPos: gl.getAttribLocation(p, 'aPos'),
    aCol: gl.getAttribLocation(p, 'aCol'),
    uMVP: gl.getUniformLocation(p, 'uMVP'),
    uSize: gl.getUniformLocation(p, 'uSize'),
    uScale: gl.getUniformLocation(p, 'uScale'),
    uColor: gl.getUniformLocation(p, 'uColor'),
    uOpacity: gl.getUniformLocation(p, 'uOpacity'),
    uVertexColor: gl.getUniformLocation(p, 'uVertexColor'),
  });
  const LP = loc(progPoint), LL = loc(progLine);

  function makeBuffer(data, dynamic) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    return b;
  }

  /* ── Étoiles ── */
  const starCount = lite ? 350 : 1200;
  const sPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) sPos[i] = (Math.random() - 0.5) * 3200;
  const starBuf = makeBuffer(sPos, false);

  /* ── Nébuleuse (couleurs de marque) ── */
  const nebCount = lite ? 140 : 400;
  const palette = [[0xDA/255,0x54/255,0x26/255],[0xf2/255,0xb1/255,0x3b/255],
                   [0x88/255,0x40/255,0x83/255],[0xe0/255,0x70/255,0x40/255]];
  const nPos = new Float32Array(nebCount * 3);
  const nCol = new Float32Array(nebCount * 3);
  for (let i = 0; i < nebCount; i++) {
    const r = 300 + Math.random() * 550;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    nPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    nPos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
    nPos[i*3+2] = (Math.random() - 0.5) * 380;
    const c = palette[(Math.random() * palette.length) | 0];
    nCol[i*3] = c[0]; nCol[i*3+1] = c[1]; nCol[i*3+2] = c[2];
  }
  const nebBuf    = makeBuffer(nPos, false);
  const nebColBuf = makeBuffer(nCol, false);

  /* ── Nœuds du réseau ── */
  const nCount  = lite ? 26 : 60;
  const nodePos = new Float32Array(nCount * 3);
  const nodeVel = new Float32Array(nCount * 3);
  for (let i = 0; i < nCount; i++) {
    nodePos[i*3]   = (Math.random() - 0.5) * 850;
    nodePos[i*3+1] = (Math.random() - 0.5) * 560;
    nodePos[i*3+2] = (Math.random() - 0.5) * 200;
    nodeVel[i*3]   = (Math.random() - 0.5) * 0.28;
    nodeVel[i*3+1] = (Math.random() - 0.5) * 0.28;
    nodeVel[i*3+2] = (Math.random() - 0.5) * 0.08;
  }
  const nodeBuf = makeBuffer(nodePos, true);

  /* ── Connexions (buffer pré-alloué, zéro allocation par frame) ── */
  const linePosArr = new Float32Array(nCount * nCount * 3);
  const lineBuf    = makeBuffer(linePosArr, true);
  let lineVerts    = 0;
  const maxDist2   = 155 * 155;

  function rebuildLines() {
    let n = 0;
    for (let i = 0; i < nCount; i++) {
      const ax = nodePos[i*3], ay = nodePos[i*3+1], az = nodePos[i*3+2];
      for (let j = i + 1; j < nCount; j++) {
        const dx = ax - nodePos[j*3], dy = ay - nodePos[j*3+1], dz = az - nodePos[j*3+2];
        if (dx*dx + dy*dy + dz*dz < maxDist2) {
          linePosArr[n]   = ax; linePosArr[n+1] = ay; linePosArr[n+2] = az;
          linePosArr[n+3] = nodePos[j*3]; linePosArr[n+4] = nodePos[j*3+1]; linePosArr[n+5] = nodePos[j*3+2];
          n += 6;
        }
      }
    }
    lineVerts = n / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, linePosArr.subarray(0, n));
  }

  /* ── Caméra & interactions ── */
  let mouseX = 0, mouseY = 0;
  if (!isMobile) {
    on(document, 'mousemove', e => {
      mouseX = (e.clientX / W - 0.5) * 2;
      mouseY = (e.clientY / H - 0.5) * 2;
    }, { passive: true });
  }

  let resizeTimer;
  on(window, 'resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }, { passive: true });

  let paused = false;
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused) raf(animate);
  });

  const proj  = mat4Identity();
  const view  = mat4Identity();
  const model = mat4Identity();
  const vp    = mat4Identity();
  const mvp   = mat4Identity();
  let camX = 0, camY = 0;

  function drawPoints(buf, colBuf, size, r, g, b, opacity, rx, ry, rz, count) {
    mat4Rotation(model, rx, ry, rz);
    mat4Multiply(mvp, vp, model);
    gl.useProgram(progPoint);
    gl.uniformMatrix4fv(LP.uMVP, false, mvp);
    gl.uniform1f(LP.uSize, size);
    gl.uniform1f(LP.uScale, canvas.height / 2);
    gl.uniform3f(LP.uColor, r, g, b);
    gl.uniform1f(LP.uOpacity, opacity);
    gl.uniform1f(LP.uVertexColor, colBuf ? 1 : 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(LP.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(LP.aPos);
    if (colBuf) {
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
      gl.vertexAttribPointer(LP.aCol, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(LP.aCol);
    } else {
      gl.disableVertexAttribArray(LP.aCol);
      gl.vertexAttrib3f(LP.aCol, 1, 1, 1);
    }
    gl.drawArrays(gl.POINTS, 0, count);
  }

  const FPS_INTERVAL = 1000 / 30;
  let lastTime = 0, frame = 0, lineTimer = 0;

  function animate(now = 0) {
    if (paused) return;
    raf(animate);
    const elapsed = now - lastTime;
    if (elapsed < FPS_INTERVAL) return;
    lastTime = now - (elapsed % FPS_INTERVAL);

    frame++;
    const t = frame * 0.006;

    // Déplacement des nœuds (rebonds dans le volume)
    for (let i = 0; i < nCount; i++) {
      nodePos[i*3]   += nodeVel[i*3];
      nodePos[i*3+1] += nodeVel[i*3+1];
      nodePos[i*3+2] += nodeVel[i*3+2];
      if (Math.abs(nodePos[i*3])   > 440) nodeVel[i*3]   *= -1;
      if (Math.abs(nodePos[i*3+1]) > 295) nodeVel[i*3+1] *= -1;
      if (Math.abs(nodePos[i*3+2]) > 115) nodeVel[i*3+2] *= -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, nodePos);
    if (++lineTimer % 20 === 0) rebuildLines();

    // Caméra : parallaxe souris (desktop) ou dérive lente (mobile)
    const targetX = isMobile ? Math.sin(t * 0.35) * 14 : mouseX * 28;
    const targetY = isMobile ? Math.cos(t * 0.27) * 9  : -mouseY * 18;
    camX += (targetX - camX) * 0.02;
    camY += (targetY - camY) * 0.02;

    mat4Perspective(proj, Math.PI * 75 / 180, canvas.width / canvas.height, 0.1, 4000);
    mat4LookAt(view, camX, camY, 380);
    mat4Multiply(vp, proj, view);

    // Cycle de couleurs des nœuds (orange → violet → or)
    const p  = (t * 0.25) % (Math.PI * 2);
    const w1 = Math.max(0, Math.cos(p));
    const w2 = Math.max(0, Math.cos(p - Math.PI * 2/3));
    const w3 = Math.max(0, Math.cos(p - Math.PI * 4/3));
    const tot = w1 + w2 + w3 || 1;
    const cr = (0xDA/255 * w1 + 0x7B/255 * w2 + 0xFF/255 * w3) / tot;
    const cg = (0x54/255 * w1 + 0x2F/255 * w2 + 0xD7/255 * w3) / tot;
    const cb = (0x26/255 * w1 + 0xBE/255 * w2 + 0x00/255 * w3) / tot;

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Étoiles : fondu normal
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    drawPoints(starBuf, null, 1.4, 1, 1, 1, 0.5, t * 0.015, t * 0.035, 0, starCount);

    // Nébuleuse + nœuds : fondu additif (lueur)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawPoints(nebBuf, nebColBuf, 3.5, 1, 1, 1,
      0.22 + Math.sin(t * 0.9) * 0.08, 0, t * 0.055, t * 0.025, nebCount);
    drawPoints(nodeBuf, null, 3.5, cr, cg, cb,
      0.55 + Math.sin(t * 1.3) * 0.2, 0, t * 0.012, 0, nCount);

    // Connexions
    if (lineVerts > 0) {
      mat4Rotation(model, 0, t * 0.012, 0);
      mat4Multiply(mvp, vp, model);
      gl.useProgram(progLine);
      gl.uniformMatrix4fv(LL.uMVP, false, mvp);
      gl.uniform3f(LL.uColor, cr, cg, cb);
      gl.uniform1f(LL.uOpacity, 0.12);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.vertexAttribPointer(LL.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(LL.aPos);
      gl.drawArrays(gl.LINES, 0, lineVerts);
    }
  }

  rebuildLines();
  raf(animate);
  setTimeout(() => { canvas.style.opacity = '1'; }, 400);
}
