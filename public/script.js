/* ================================================================
   4DAYVELOPMENT — MASTERCLASS 2026
   Advanced Interactions · Three.js Universe · Max Conversion
   ================================================================ */

(function () {
  'use strict';

  /* ── UTILS ──────────────────────────────────────────────── */
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const raf = requestAnimationFrame;
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  /* ── 2. SCROLL PROGRESS ───────────────────────────────── */
  function initProgress() {
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.prepend(bar);
    on(window, 'scroll', () => {
      const pct = window.scrollY / (document.body.scrollHeight - innerHeight) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    }, { passive: true });
  }

  /* ── 3. NAVBAR ────────────────────────────────────────── */
  function initNav() {
    const nav = $('#navbar');
    let lastY = 0;
    on(window, 'scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 60);
      if (y > 350) {
        nav.style.transform = y > lastY + 5 ? 'translateY(-110%)' : 'translateY(0)';
      } else {
        nav.style.transform = 'translateY(0)';
      }
      nav.style.transition = 'transform .4s cubic-bezier(0.4,0,0.2,1), all .4s cubic-bezier(0.4,0,0.2,1)';
      lastY = y;
    }, { passive: true });

    // Hamburger + overlay
    const ham = $('#hamburger');
    const menu = $('#mobile-menu');

    // Créer l'overlay backdrop du menu mobile
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    document.body.appendChild(overlay);

    function openMenu() {
      ham.classList.add('open');
      menu.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      ham.classList.remove('open');
      menu.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    on(ham, 'click', () => menu.classList.contains('open') ? closeMenu() : openMenu());
    $$('.mobile-menu a').forEach(a => on(a, 'click', closeMenu));
    on(overlay, 'click', closeMenu);
    on(document, 'keydown', e => { if (e.key === 'Escape') closeMenu(); });

    // CTA bounce
    const cta = $('.nav-cta');
    if (cta) setInterval(() => {
      cta.classList.add('bounce');
      on(cta, 'animationend', () => cta.classList.remove('bounce'), { once: true });
    }, 6000);
  }

  /* ── 4. CUSTOM CURSOR ─────────────────────────────────── */
  function initCursor() {
    if (matchMedia('(max-width: 768px)').matches) return;
    const dot  = document.createElement('div'); dot.id  = 'cursor-dot';
    const ring = document.createElement('div'); ring.id = 'cursor-ring';
    document.body.append(dot, ring);

    let mx = -200, my = -200, rx = -200, ry = -200, hover = false;

    on(document, 'mousemove', e => { mx = e.clientX; my = e.clientY; });
    on(document, 'mouseover', e => {
      if (e.target.closest('a,button,[class*="card"],[class*="btn"]') && !hover) {
        ring.classList.add('hover'); hover = true;
      }
    });
    on(document, 'mouseout', e => {
      if (e.target.closest('a,button,[class*="card"],[class*="btn"]') && hover) {
        ring.classList.remove('hover'); hover = false;
      }
    });
    on(document, 'mousedown', () => ring.classList.add('click'));
    on(document, 'mouseup',   () => ring.classList.remove('click'));

    function tick() {
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      raf(tick);
    }
    raf(tick);
  }


  /* ── 6. THREE.JS UNIVERSE BACKGROUND ─────────────────── */
  function initThreeUniverse() {
    if (typeof THREE === 'undefined') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Détection appareil bas de gamme (< 4 cœurs ou mobile)
    const isMobile  = matchMedia('(max-width: 768px)').matches;
    const isLowEnd  = (navigator.hardwareConcurrency || 4) <= 2 || isMobile;

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
    renderer.setPixelRatio(1); // toujours 1 — le plus gros gain de perf
    renderer.setSize(innerWidth, innerHeight);
    camera.position.z = 380;

    // ── STAR FIELD ──────────────────────────────────────
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

    // ── BRAND NEBULA ────────────────────────────────────
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

    // ── NEURAL NODES ────────────────────────────────────
    const nCount = isLowEnd ? 30 : 60; // réduit : 110→60/30
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

    // ── CONNECTIONS (buffer réutilisé — zéro allocation) ─
    const MAX_LINES = nCount * nCount; // max théorique
    const linePosArr = new Float32Array(MAX_LINES * 6); // 2 points × xyz
    const lineGeo = new THREE.BufferGeometry();
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

    // ── MOUSE PARALLAX ───────────────────────────────────
    let mx = 0, my = 0;
    on(document, 'mousemove', e => {
      mx = (e.clientX / innerWidth  - 0.5) * 2;
      my = (e.clientY / innerHeight - 0.5) * 2;
    });

    on(window, 'resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    }, { passive: true });

    // ── PAUSE QUAND ONGLET CACHÉ ─────────────────────────
    let paused = false;
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (!paused) raf(animate);
    });

    // ── FPS CAP à 30 ─────────────────────────────────────
    const FPS_INTERVAL = 1000 / 30;
    let lastTime = 0;
    let frame = 0, lineTimer = 0;

    function animate(now = 0) {
      if (paused) return;
      raf(animate);

      const elapsed = now - lastTime;
      if (elapsed < FPS_INTERVAL) return; // saute la frame si trop tôt
      lastTime = now - (elapsed % FPS_INTERVAL);

      frame++;
      const t = frame * 0.006; // ×2 car 30fps au lieu de 60

      // Animate nodes
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

      // Rebuild lines toutes les 20 frames (au lieu de 5)
      if (++lineTimer % 20 === 0) rebuildLines();

      // Rotations
      starPts.rotation.y  = t * 0.035;
      starPts.rotation.x  = t * 0.015;
      nebula.rotation.y   = t * 0.055;
      nebula.rotation.z   = t * 0.025;
      nodes.rotation.y    = t * 0.012;

      // Mouse parallax
      camera.position.x += (mx * 28 - camera.position.x) * 0.02;
      camera.position.y += (-my * 18 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      // Pulsing
      nebMat.opacity  = 0.22 + Math.sin(t * 0.9) * 0.08;
      nodeMat.opacity = 0.55 + Math.sin(t * 1.3) * 0.2;

      // Color cycling — orange → violet → jaune → orange
      // 3 couleurs : orange #DA5426 | violet #7B2FBE | jaune #FFD700
      const p = (t * 0.25) % (Math.PI * 2);
      const w1 = Math.max(0, Math.cos(p));               // orange
      const w2 = Math.max(0, Math.cos(p - Math.PI * 2/3)); // violet
      const w3 = Math.max(0, Math.cos(p - Math.PI * 4/3)); // jaune
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

  /* ── 7. SCROLL REVEAL ─────────────────────────────────── */
  function initReveal() {
    const els = $$('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = [...el.parentElement.querySelectorAll('.reveal:not(.visible)')];
        const idx = siblings.indexOf(el);
        const delay = el.dataset.delay || idx * 80;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('visible');
        io.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ── 8. COUNTER ANIMATION ─────────────────────────────── */
  function initCounters() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el  = entry.target;
        const end = parseFloat(el.dataset.target);
        const suf = el.dataset.suffix || '';
        const dur = 1800;
        const t0  = performance.now();
        function step(now) {
          const p = Math.min((now - t0) / dur, 1);
          const e = 1 - Math.pow(1 - p, 3);
          el.textContent = (Number.isInteger(end) ? Math.round(e * end) : (e * end).toFixed(0)) + suf;
          if (p < 1) raf(step);
        }
        raf(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    $$('[data-target]').forEach(el => io.observe(el));
  }

  /* ── 9. MAGNETIC BUTTONS ──────────────────────────────── */
  function initMagnetic() {
    if (matchMedia('(max-width: 768px)').matches) return;
    $$('.magnetic').forEach(btn => {
      on(btn, 'mousemove', e => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        btn.style.transform = `translate(${(e.clientX - cx) * 0.22}px, ${(e.clientY - cy) * 0.22}px)`;
        const x = ((e.clientX - r.left) / r.width)  * 100;
        const y = ((e.clientY - r.top)  / r.height) * 100;
        btn.style.setProperty('--mx', x + '%');
        btn.style.setProperty('--my', y + '%');
      });
      on(btn, 'mouseleave', () => { btn.style.transform = ''; });
    });
  }

  /* ── 10. TEXT SCRAMBLE ────────────────────────────────── */
  function initScramble() {
    if (matchMedia('(max-width: 768px)').matches) return;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%';
    $$('.section-title').forEach(el => {
      const orig = el.textContent.trim();
      let frame, iv;
      on(el, 'mouseenter', () => {
        clearInterval(iv);
        frame = 0;
        iv = setInterval(() => {
          el.textContent = orig.split('').map((c, i) =>
            c === ' ' ? ' ' : c === '\n' ? '\n' : i < frame ? orig[i] : chars[Math.floor(Math.random() * chars.length)]
          ).join('');
          if (++frame > orig.length) { el.textContent = orig; clearInterval(iv); }
        }, 32);
      });
      on(el, 'mouseleave', () => { clearInterval(iv); el.textContent = orig; });
    });
  }

  /* ── 11. FLOATING CTA ─────────────────────────────────── */
  function initFloatingCTA() {
    const main = $('#fcta-main');
    const menu = $('#fcta-menu');
    if (!main || !menu) return;
    let open = false;
    on(main, 'click', () => {
      open = !open;
      menu.classList.toggle('open', open);
      main.style.transform = open ? 'scale(1.1) rotate(135deg)' : '';
    });
    on(document, 'click', e => {
      if (!e.target.closest('#floating-cta')) {
        open = false; menu.classList.remove('open'); main.style.transform = '';
      }
    });
  }

  /* ── 12. SOCIAL PROOF TOASTS (chargés depuis l'API) ───── */
  function initToasts() {
    if (matchMedia('(max-width: 768px)').matches) return;
    const container = $('#toast-container');
    if (!container) return;

    fetch('/api/toasts')
      .then(r => r.json())
      .then(data => {
        let idx = 0;
        function show() {
          const d = data[idx++ % data.length];
          const t = document.createElement('div');
          t.className = 'toast';
          t.innerHTML = `
            <div class="toast-av">${d.emoji}</div>
            <div class="toast-body">
              <div class="toast-name">${d.name}</div>
              <div class="toast-detail">${d.detail}</div>
            </div>
            <div class="toast-time">${d.time}</div>
          `;
          container.appendChild(t);
          raf(() => raf(() => t.classList.add('show')));
          setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 5500);
        }
        setTimeout(() => { show(); setInterval(show, 9000); }, 5000);
      })
      .catch(() => {}); // silencieux si pas de serveur
  }

  /* ── 13. FAQ ACCORDION ────────────────────────────────── */
  function initFAQ() {
    $$('.faq-item').forEach(item => {
      const btn = $('.faq-question', item);
      on(btn, 'click', () => {
        item.classList.toggle('open');
      });
    });
  }

  /* ── 14. EXIT INTENT ──────────────────────────────────── */
  function initExit() {
    if (sessionStorage.getItem('exit-shown')) return;
    const overlay = $('#exit-overlay');
    if (!overlay) return;
    let triggered = false;
    on(document, 'mouseleave', e => {
      if (!triggered && e.clientY <= 0) {
        triggered = true;
        overlay.classList.add('show');
        sessionStorage.setItem('exit-shown', '1');
      }
    });
    on($('#exit-backdrop'), 'click', () => overlay.classList.remove('show'));
    on(document, 'keydown', e => { if (e.key === 'Escape') overlay.classList.remove('show'); });
  }

  /* ── 15. SMOOTH SCROLL ────────────────────────────────── */
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(a => {
      on(a, 'click', e => {
        const t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ── 16. CURSOR GLOW FOLLOWER (subtle) ────────────────── */
  function initGlow() {
    const glow = document.createElement('div');
    glow.style.cssText = `
      position:fixed;width:350px;height:350px;
      background:radial-gradient(circle,rgba(218,84,38,0.06) 0%,transparent 70%);
      border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);
      transition:left .6s cubic-bezier(.23,1,.32,1),top .6s cubic-bezier(.23,1,.32,1);
      z-index:0;
    `;
    document.body.appendChild(glow);
    on(document, 'mousemove', e => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
    });
  }


  /* ── 18. LANGUAGE TOGGLE (FR / EN) ───────────────────── */
  const translations = {
    fr: {
      'nav-services': 'Services', 'nav-process': 'Processus', 'nav-tarifs': 'Tarifs',
      'nav-avis': 'Avis', 'nav-faq': 'FAQ', 'nav-cta': 'Démarrer →',
      'nav-cta-mobile': 'Démarrer mon projet →',
      'hero-badge': 'Agence web nouvelle génération · 2026',
      'hero-h1': 'Votre site internet,<br><em class="gradient-text">livré en 4 jours.</em>',
      'hero-desc': 'Des sites performants, modernes et sur-mesure pour entrepreneurs, freelances et PME qui veulent dominer leur marché en ligne.',
      'hero-cta1': 'Voir les offres', 'hero-cta2': 'Comment ça marche',
      'stat-sites': 'Sites livrés', 'stat-clients': 'Clients satisfaits',
      'stat-delai': 'Délai garanti', 'stat-support': 'Support inclus',
      'proof-text': 'Note moyenne 4.9/5 · 150 clients',
      'logos-label': 'Ils nous font confiance',
      'services-title': 'Tout ce dont vous avez<br>besoin pour <em class="gradient-text">dominer en ligne</em>',
      'services-sub': 'De la vitrine simple au e-commerce complet, on s\'occupe de tout — sans jargon, sans surprise.',
      'srv-vitrine-h': 'Site Vitrine', 'srv-vitrine-p': 'Un site élégant et professionnel pour présenter votre activité, rassurer vos visiteurs et générer des contacts qualifiés.',
      'srv-ecom-h': 'E-commerce', 'srv-ecom-p': 'Vendez vos produits ou services en ligne avec une boutique optimisée pour la conversion et la performance maximale.',
      'srv-responsive-h': 'Design Responsive', 'srv-responsive-p': 'Chaque site est parfait sur mobile, tablette et ordinateur. 72% du trafic vient du mobile — on ne laisse rien au hasard.',
      'srv-seo-h': 'SEO & Référencement', 'srv-seo-p': 'Vos pages sont optimisées dès le départ pour apparaître dans Google et attirer des visiteurs qualifiés prêts à acheter.',
      'srv-perf-h': 'Performance', 'srv-perf-p': 'Sites ultra-rapides, score Lighthouse >90, hébergement premium. Chaque seconde de chargement coûte des clients.',
      'srv-maint-h': 'Maintenance', 'srv-maint-p': 'Mises à jour, corrections de bugs, sauvegardes quotidiennes et support réactif. Vous vous concentrez sur votre business, on gère le reste.',
      'maint-detail': 'Engagement 12 mois · Sans surprise', 'maint-cta': 'Souscrire →',
      'res-conv': 'de conversions moyennes<br>après refonte',
      'res-ca': 'de CA généré le premier<br>mois pour Amandine C.',
      'res-delai': 'délai de livraison<br>garanti contractuellement',
      'res-clients': 'de clients qui<br>recommandent l\'agence',
      'proc-title': 'De zéro à en ligne<br>en <em class="gradient-text">4 étapes simples</em>',
      'proc-sub': 'Un processus clair et sans surprise, du premier échange à la mise en ligne.',
      'proc-1-h': 'Échange initial', 'proc-1-p': 'On discute de votre projet, vos objectifs et votre cible lors d\'un appel de 30 min <strong>100% gratuit</strong>.', 'proc-1-d': '⏱ Jour 1',
      'proc-2-h': 'Maquette & Design', 'proc-2-p': 'On vous présente une maquette complète sous 48h. Vous validez avant qu\'on développe une seule ligne.', 'proc-2-d': '⏱ Jour 2',
      'proc-3-h': 'Développement', 'proc-3-p': 'On code votre site avec les dernières technologies. Vous suivez l\'avancement en temps réel sur notre espace client.', 'proc-3-d': '⏱ Jours 3–4',
      'proc-4-h': 'Mise en ligne', 'proc-4-p': 'Votre site est publié, testé et optimisé. On vous forme à l\'administration en 1h et on reste disponibles.', 'proc-4-d': '⏱ Jour 4',
      'proc-cta': 'Démarrer mon projet gratuitement →', 'proc-cta-note': 'Appel de 30 min · Sans engagement · Réponse sous 24h',
      'prix-title': 'Des prix clairs,<br><em class="gradient-text">sans mauvaise surprise</em>',
      'prix-sub': 'Choisissez la formule qui correspond à vos besoins. Paiement en 3× possible. Pas d\'abonnement caché.',
      'plan1-badge': 'Démarrage', 'plan1-desc': 'Idéal pour démarrer avec une présence professionnelle qui rassure et convertit.',
      'plan-popular': '⭐ Le plus populaire', 'plan2-badge': 'Professionnel', 'plan2-desc': 'Pour les professionnels qui veulent se démarquer et générer des leads qualifiés.',
      'plan3-badge': 'Boutique', 'plan3-desc': 'Une boutique complète pour vendre en ligne et rentabiliser en quelques semaines.',
      'plan-cta': 'Commencer →', 'plan-cta2': 'Commencer →', 'plan-cta3': 'Commencer →',
      'guar-1': 'Paiement 100% sécurisé', 'guar-2': 'Satisfait ou remboursé 14j', 'guar-3': 'Délai garanti contractuellement', 'guar-4': 'Support prioritaire inclus',
      'avis-title': 'Ils ont sauté le pas.<br><em class="gradient-text">Voici ce qu\'ils en pensent.</em>',
      'test-1': '"Livraison en 4 jours, site magnifique, et mes clients me font régulièrement des compliments. Meilleur investissement de l\'année."',
      'test-1-role': 'Coach bien-être · Site Pro',
      'test-2': '"J\'avais peur que ce soit compliqué. Tout s\'est passé sans accroc, ils ont su exactement ce dont j\'avais besoin. Je recommande à 100%."',
      'test-2-role': 'Artisan menuisier · Site Essentiel',
      'test-3': '"Notre boutique en ligne a généré <strong>3 000€ de chiffre d\'affaires le premier mois</strong>. L\'investissement a été rentabilisé en quelques semaines."',
      'test-3-role': 'Créatrice de bijoux · E-commerce', 'test-3-result': '📈 ROI en 3 semaines',
      'faq-title': 'Les questions<br><em class="gradient-text">qu\'on nous pose souvent</em>',
      'faq-1-q': 'Comment fonctionne la livraison en 4 jours ?',
      'faq-1-a': 'Dès réception de vos contenus et du premier acompte, on démarre immédiatement. <strong>Jour 1 :</strong> brief & maquette. <strong>Jour 2 :</strong> validation & développement. <strong>Jours 3–4 :</strong> finalisation, tests et mise en ligne. Simple, rapide, garanti contractuellement.',
      'faq-2-q': 'Que comprend exactement la maintenance ?',
      'faq-2-a': 'Notre maintenance couvre tout ce dont votre site a besoin pour rester performant et sécurisé :',
      'faq-3-q': 'Et si je ne suis pas satisfait du résultat ?',
      'faq-3-a': 'On offre des allers-retours <strong>illimités</strong> pendant la phase de design jusqu\'à ce que vous soyez 100% satisfait. Et si malgré tout vous n\'êtes pas content dans les <strong>14 jours</strong> suivant la livraison, on vous rembourse intégralement. Zéro risque pour vous.',
      'faq-4-q': 'Je n\'ai pas de textes ni de photos, vous pouvez m\'aider ?',
      'faq-4-a': 'Absolument. On propose un service de <strong>rédaction (copywriting)</strong> et de sélection d\'images libres de droits. On peut partir de zéro et construire tout votre contenu de marque. Mentionnez-le lors de votre brief et on intègre tout ça dans le devis.',
      'faq-5-q': 'Vais-je pouvoir modifier mon site moi-même ?',
      'faq-5-a': 'Oui ! Chaque site est livré avec une interface d\'administration <strong>simple et intuitive</strong>. Une formation d\'1h est incluse pour que vous puissiez mettre à jour textes, images et pages en autonomie. Aucune compétence technique requise.',
      'faq-6-q': 'Mon site sera-t-il visible sur Google ?',
      'faq-6-a': 'Tous nos sites intègrent un <strong>SEO technique de base</strong> (balises meta, vitesse, structure). Les formules Pro et E-commerce incluent un SEO avancé avec audit de mots-clés, optimisation des pages et soumission au Search Console. Votre site sera indexé et positionné dès le lancement.',
      'contact-badge': '🚀 Réponse sous 24h · Sans engagement',
      'contact-h2': 'Prêt à faire décoller<br><em class="cta-gradient">votre projet ?</em>',
      'contact-p': 'Décrivez votre projet ci-contre. On vous répond <strong>sous 24h</strong> avec un plan d\'action concret et un devis personnalisé.',
      'cg-1': 'Réponse sous 24h garantie', 'cg-2': 'Données 100% confidentielles', 'cg-3': 'Devis gratuit & personnalisé', 'cg-4': 'Satisfait ou remboursé 14j',
      'prospect-btn': 'Vous avez un grand projet sur-mesure ? Dites-nous tout →',
      'form-name': 'Nom complet *', 'form-email': 'Email *', 'form-phone': 'Téléphone',
      'form-service': 'Service souhaité', 'form-budget': 'Budget approximatif',
      'form-message': 'Décrivez votre projet *', 'form-submit': 'Envoyer mon message →',
      'form-legal': 'En soumettant ce formulaire, vous acceptez que vos données soient utilisées pour vous recontacter. Aucun spam.',
      'footer-tagline': 'Agence web nouvelle génération.<br>Sites livrés en 4 jours, garantis.',
      'mo-per': '/mois',
      'avis-label': 'Avis clients',
      'plan1-features': '<li>Site vitrine 3 pages</li><li>Design personnalisé</li><li>Responsive mobile</li><li>Formulaire de contact</li><li>SEO de base</li><li>⚡ Livraison en 4 jours</li>',
      'plan2-features': '<li>Site jusqu\'à 8 pages</li><li>Design premium sur-mesure</li><li>Blog intégré</li><li>SEO avancé</li><li>Google Analytics + Tag Manager</li><li>3 mois de maintenance</li><li>⚡ Livraison en 4 jours</li>',
      'plan3-features': '<li>Boutique produits illimitée</li><li>Paiement en ligne sécurisé</li><li>Gestion des stocks</li><li>Emails automatiques</li><li>SEO e-commerce avancé</li><li>6 mois de maintenance</li><li>Formation 2h incluse</li><li>⚡ Livraison en 4 jours*</li>',
      'plan3-note': '* Délai indicatif à partir de 4 jours. Selon la complexité du projet, le délai peut être ajusté lors du brief.',
      'footer-srv-h': 'Services', 'footer-srv-1': 'Site Vitrine', 'footer-srv-2': 'E-commerce', 'footer-srv-3': 'SEO & Référencement', 'footer-srv-4': 'Maintenance',
      'footer-agen-h': 'Agence', 'footer-agen-1': 'Notre Processus', 'footer-agen-2': 'Tarifs', 'footer-agen-3': 'Avis clients', 'footer-agen-4': 'FAQ',
      'footer-cont-h': 'Contact', 'footer-cont-1': 'Prendre RDV',
      'footer-copy': '© 2026 4dayvelopment. Tous droits réservés.',
      'footer-legal-1': 'Mentions légales', 'footer-legal-2': 'Confidentialité', 'footer-legal-3': 'CGV',
      'exit-title': 'Attendez !<br>Un audit <span class="gradient-text">gratuit</span> vous attend.',
      'exit-desc': 'Avant de partir, recevez une analyse gratuite de votre présence digitale — sans engagement.',
      'exit-cta': '🎯 Obtenir mon audit gratuit',
      'exit-close': 'Non merci, je peux me débrouiller seul',
      'fcta-call': 'Réserver un appel',
      'form-sending': 'Envoi en cours...',
      'form-message-ph': 'Parlez-nous de votre activité, vos objectifs, votre cible, vos délais...',
      'nav-phone': '📞 Appel gratuit',
      'plan-from': 'à partir de €',
      'plan2-paiement': 'ou 3× 564€',
      'plan3-paiement': 'ou 3× 1 030€',
      'prospect-note': 'Projet ambitieux · Brief complet · Devis ultra-précis sous 24h',
    },
    en: {
      'nav-services': 'Services', 'nav-process': 'Process', 'nav-tarifs': 'Pricing',
      'nav-avis': 'Reviews', 'nav-faq': 'FAQ', 'nav-cta': 'Get started →',
      'nav-cta-mobile': 'Start my project →',
      'hero-badge': 'Next-generation web agency · 2026',
      'hero-h1': 'Your professional website,<br><em class="gradient-text">delivered in 4 days.</em>',
      'hero-desc': 'High-performance, modern, tailor-made websites for entrepreneurs, freelancers and SMBs who want to dominate their market online.',
      'hero-cta1': 'See our offers', 'hero-cta2': 'How it works',
      'stat-sites': 'Websites delivered', 'stat-clients': 'Satisfied clients',
      'stat-delai': 'Guaranteed deadline', 'stat-support': 'Support included',
      'proof-text': 'Average rating 4.9/5 · 150 clients',
      'logos-label': 'They trust us',
      'services-title': 'Everything you need<br>to <em class="gradient-text">dominate online</em>',
      'services-sub': 'From simple showcase to full e-commerce, we handle everything — no jargon, no surprises.',
      'srv-vitrine-h': 'Showcase Website', 'srv-vitrine-p': 'An elegant and professional website to present your business, reassure visitors and generate qualified leads.',
      'srv-ecom-h': 'E-commerce', 'srv-ecom-p': 'Sell your products or services online with a store optimized for conversion and maximum performance.',
      'srv-responsive-h': 'Responsive Design', 'srv-responsive-p': 'Every site is perfect on mobile, tablet and desktop. 72% of traffic comes from mobile — we leave nothing to chance.',
      'srv-seo-h': 'SEO & Search', 'srv-seo-p': 'Your pages are optimized from the start to appear on Google and attract qualified visitors ready to buy.',
      'srv-perf-h': 'Performance', 'srv-perf-p': 'Ultra-fast sites, Lighthouse score >90, premium hosting. Every second of load time costs you clients.',
      'srv-maint-h': 'Maintenance', 'srv-maint-p': 'Updates, bug fixes, daily backups and reactive support. You focus on your business, we handle the rest.',
      'maint-detail': '12-month commitment · No surprises', 'maint-cta': 'Subscribe →',
      'res-conv': 'average conversion increase<br>after redesign',
      'res-ca': 'revenue generated in the first<br>month for Amandine C.',
      'res-delai': 'delivery time<br>contractually guaranteed',
      'res-clients': 'of clients who<br>recommend the agency',
      'proc-title': 'From zero to online<br>in <em class="gradient-text">4 simple steps</em>',
      'proc-sub': 'A clear and surprise-free process, from first contact to launch.',
      'proc-1-h': 'Initial Call', 'proc-1-p': 'We discuss your project, goals and target audience in a <strong>100% free</strong> 30-min call.', 'proc-1-d': '⏱ Day 1',
      'proc-2-h': 'Mockup & Design', 'proc-2-p': 'We present a complete mockup within 48h. You approve before we write a single line of code.', 'proc-2-d': '⏱ Day 2',
      'proc-3-h': 'Development', 'proc-3-p': 'We build your site with the latest technologies. Track progress in real time on our client portal.', 'proc-3-d': '⏱ Days 3–4',
      'proc-4-h': 'Launch', 'proc-4-p': 'Your site is published, tested and optimized. We train you on the admin panel in 1h and stay available.', 'proc-4-d': '⏱ Day 4',
      'proc-cta': 'Start my project for free →', 'proc-cta-note': '30-min call · No commitment · Reply within 24h',
      'prix-title': 'Clear pricing,<br><em class="gradient-text">no hidden surprises</em>',
      'prix-sub': 'Choose the plan that fits your needs. Pay in 3× instalments. No hidden subscription.',
      'plan1-badge': 'Starter', 'plan1-desc': 'Ideal for getting started with a professional online presence that reassures and converts.',
      'plan-popular': '⭐ Most popular', 'plan2-badge': 'Professional', 'plan2-desc': 'For professionals who want to stand out and generate qualified leads.',
      'plan3-badge': 'Shop', 'plan3-desc': 'A complete online store to sell online and break even within weeks.',
      'plan-cta': 'Get started →', 'plan-cta2': 'Get started →', 'plan-cta3': 'Get started →',
      'guar-1': '100% secure payment', 'guar-2': 'Money-back guarantee 14 days', 'guar-3': 'Delivery guaranteed contractually', 'guar-4': 'Priority support included',
      'avis-title': 'They took the leap.<br><em class="gradient-text">Here\'s what they think.</em>',
      'test-1': '"Delivered in 4 days, beautiful site, and my clients compliment it regularly. Best investment of the year."',
      'test-1-role': 'Wellness coach · Pro Website',
      'test-2': '"I was afraid it would be complicated. Everything went smoothly, they knew exactly what I needed. 100% recommend."',
      'test-2-role': 'Carpenter craftsman · Essentiel Website',
      'test-3': '"Our online store generated <strong>€3,000 in revenue in the first month</strong>. The investment paid off within weeks."',
      'test-3-role': 'Jewelry creator · E-commerce', 'test-3-result': '📈 ROI in 3 weeks',
      'faq-title': 'Questions<br><em class="gradient-text">we get asked often</em>',
      'faq-1-q': 'How does the 4-day delivery work?',
      'faq-1-a': 'As soon as we receive your content and first payment, we start immediately. <strong>Day 1:</strong> brief & mockup. <strong>Day 2:</strong> validation & development. <strong>Days 3–4:</strong> finalization, testing and launch. Simple, fast, contractually guaranteed.',
      'faq-2-q': 'What does maintenance include?',
      'faq-2-a': 'Our maintenance covers everything your site needs to stay performant and secure:',
      'faq-3-q': 'What if I\'m not satisfied with the result?',
      'faq-3-a': 'We offer <strong>unlimited</strong> revisions during the design phase until you\'re 100% happy. And if you\'re still not satisfied within <strong>14 days</strong> of delivery, we\'ll give you a full refund. Zero risk for you.',
      'faq-4-q': 'I don\'t have texts or photos — can you help?',
      'faq-4-a': 'Absolutely. We offer a <strong>copywriting</strong> and royalty-free image selection service. We can start from scratch and build all your brand content. Just mention it in your brief and we\'ll include it in the quote.',
      'faq-5-q': 'Will I be able to update my site myself?',
      'faq-5-a': 'Yes! Every site comes with a <strong>simple and intuitive</strong> admin interface. A 1-hour training session is included so you can update texts, images and pages on your own. No technical skills required.',
      'faq-6-q': 'Will my site be visible on Google?',
      'faq-6-a': 'All our sites include basic <strong>technical SEO</strong> (meta tags, speed, structure). Pro and E-commerce plans include advanced SEO with keyword audit, page optimization and Search Console submission. Your site will be indexed from day one.',
      'contact-badge': '🚀 Reply within 24h · No commitment',
      'contact-h2': 'Ready to launch<br><em class="cta-gradient">your project?</em>',
      'contact-p': 'Describe your project. We\'ll get back to you <strong>within 24h</strong> with a concrete action plan and a personalised quote.',
      'cg-1': 'Reply guaranteed within 24h', 'cg-2': '100% confidential data', 'cg-3': 'Free & personalised quote', 'cg-4': 'Money-back guarantee 14 days',
      'prospect-btn': 'Have a large custom project? Tell us everything →',
      'form-name': 'Full name *', 'form-email': 'Email *', 'form-phone': 'Phone',
      'form-service': 'Service needed', 'form-budget': 'Approximate budget',
      'form-message': 'Describe your project *', 'form-submit': 'Send my message →',
      'form-legal': 'By submitting this form, you agree that your data will be used to contact you back. No spam.',
      'footer-tagline': 'Next-generation web agency.<br>Websites delivered in 4 days, guaranteed.',
      'mo-per': '/mo',
      'avis-label': 'Client reviews',
      'plan1-features': '<li>3-page showcase website</li><li>Custom design</li><li>Mobile responsive</li><li>Contact form</li><li>Basic SEO</li><li>⚡ Delivered in 4 days</li>',
      'plan2-features': '<li>Website up to 8 pages</li><li>Premium custom design</li><li>Integrated blog</li><li>Advanced SEO</li><li>Google Analytics + Tag Manager</li><li>3 months maintenance</li><li>⚡ Delivered in 4 days</li>',
      'plan3-features': '<li>Unlimited product store</li><li>Secure online payment</li><li>Stock management</li><li>Automated emails</li><li>Advanced e-commerce SEO</li><li>6 months maintenance</li><li>2h training included</li><li>⚡ Delivered in 4 days*</li>',
      'plan3-note': '* Indicative timeline from 4 days. Depending on project complexity, the timeline may be adjusted during briefing.',
      'footer-srv-h': 'Services', 'footer-srv-1': 'Showcase Website', 'footer-srv-2': 'E-commerce', 'footer-srv-3': 'SEO & Search', 'footer-srv-4': 'Maintenance',
      'footer-agen-h': 'Agency', 'footer-agen-1': 'Our Process', 'footer-agen-2': 'Pricing', 'footer-agen-3': 'Client reviews', 'footer-agen-4': 'FAQ',
      'footer-cont-h': 'Contact', 'footer-cont-1': 'Book a call',
      'footer-copy': '© 2026 4dayvelopment. All rights reserved.',
      'footer-legal-1': 'Legal notice', 'footer-legal-2': 'Privacy', 'footer-legal-3': 'T&Cs',
      'exit-title': 'Wait!<br>A <span class="gradient-text">free</span> audit awaits you.',
      'exit-desc': 'Before you go, receive a free analysis of your digital presence — no commitment.',
      'exit-cta': '🎯 Get my free audit',
      'exit-close': 'No thanks, I\'ll manage on my own',
      'fcta-call': 'Book a call',
      'form-sending': 'Sending...',
      'form-message-ph': 'Tell us about your business, goals, target audience, timelines...',
      'nav-phone': '📞 Free call',
      'plan-from': 'from €',
      'plan2-paiement': 'or 3× €564',
      'plan3-paiement': 'or 3× €1,030',
      'prospect-note': 'Ambitious project · Full brief · Precise quote within 24h',
    },
  };

  function applyLang(lang) {
    const t = translations[lang];
    $$('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (t[key] !== undefined) el.innerHTML = t[key];
    });
    $$('[data-i18n-ph]').forEach(el => {
      const key = el.dataset.i18nPh;
      if (t[key] !== undefined) el.placeholder = t[key];
    });
    const btn = $('#lang-toggle');
    if (btn) btn.innerHTML = lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR';
    document.documentElement.lang = lang;
  }

  function initLang() {
    const btn = $('#lang-toggle');
    if (!btn) return;
    let lang = localStorage.getItem('lang') || 'fr';
    if (lang === 'en') applyLang('en');
    on(btn, 'click', () => {
      lang = lang === 'fr' ? 'en' : 'fr';
      applyLang(lang);
      localStorage.setItem('lang', lang);
    });
  }

  /* ── 19. PERFORMANCE: REDUCED MOTION ─────────────────── */
  function checkMotion() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const s = document.createElement('style');
      s.textContent = '*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;}';
      document.head.appendChild(s);
    }
  }

  /* ── INIT ─────────────────────────────────────────────── */
  function init() {
    checkMotion();
    initLang();
    initProgress();
    initNav();
    initGlow();
    initReveal();
    initCounters();
    initFAQ();
    initSmoothScroll();
    initFloatingCTA();
    initToasts();
    initExit();

    // Deferred for perf
    setTimeout(() => {
      initCursor();
      initMagnetic();
      initScramble();
    }, 150);

    // Three.js after THREE is loaded
    setTimeout(initThreeUniverse, 300);

    // Budget chips
    initBudgetChips();

    // Formulaire Node.js
    initContactForm();

    console.log('%c4DAYVELOPMENT', 'color:#f2b13b;font-size:22px;font-weight:900;font-family:Syne,sans-serif;');
    console.log('%cMasterclass 2026 · Maximum Conversion', 'color:#DA5426;font-size:12px;');
  }

  /* ── BUDGET CHIPS → Redirections ─────────────────────── */
  function initBudgetChips() {
    $$('.budget-chip').forEach(chip => {
      on(chip, 'click', () => {
        $$('.budget-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const budgetInput = $('#f-budget');
        if (budgetInput) budgetInput.value = chip.dataset.value;
        if (chip.dataset.value === 'Moins de 1 000€') {
          window.location.href = '/essentiel.html';
        } else if (chip.dataset.value === '5 000€ et plus') {
          window.location.href = '/lead.html';
        }
      });
    });
  }

  /* ── FORMULAIRE CONTACT → API Node.js ────────────────── */
  function initContactForm() {
    const form     = $('#contact-form');
    if (!form) return;

    const btnText   = $('#btn-text');
    const btnLoader = $('#btn-loader');
    const btnSubmit = $('#btn-submit');
    const feedback  = $('#form-feedback');

    // Budget chips (redirection gérée dans initBudgetChips)

    // Validation temps réel
    function validateField(input) {
      const err = document.getElementById('err-' + input.name);
      if (!err) return true;
      if (input.required && !input.value.trim()) {
        input.classList.add('error');
        err.textContent = 'Ce champ est requis.';
        return false;
      }
      if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        input.classList.add('error');
        err.textContent = 'Email invalide.';
        return false;
      }
      input.classList.remove('error');
      err.textContent = '';
      return true;
    }

    ['f-name','f-email','f-message'].forEach(id => {
      const el = document.getElementById(id);
      if (el) on(el, 'blur', () => validateField(el));
      if (el) on(el, 'input', () => { if (el.classList.contains('error')) validateField(el); });
    });

    // Soumission
    on(form, 'submit', async (e) => {
      e.preventDefault();

      // Validate all required fields
      const fields = ['f-name','f-email','f-message'].map(id => document.getElementById(id));
      const valid = fields.every(f => validateField(f));
      if (!valid) return;

      // Loading state
      btnSubmit.disabled = true;
      btnText.hidden     = true;
      btnLoader.hidden   = false;
      feedback.className = 'form-feedback';
      feedback.textContent = '';

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:    $('#f-name').value.trim(),
            email:   $('#f-email').value.trim(),
            phone:   $('#f-phone').value.trim(),
            service: $('#f-service').value,
            budget:  $('#f-budget').value,
            message: $('#f-message').value.trim(),
          }),
        });

        const data = await res.json();

        if (data.success) {
          feedback.className   = 'form-feedback success visible';
          feedback.textContent = '✅ ' + data.message;
          form.reset();
          $$('.budget-chip').forEach(c => c.classList.remove('active'));
        } else {
          const msg = data.errors ? data.errors.join(' ') : data.message;
          feedback.className   = 'form-feedback error visible';
          feedback.textContent = '❌ ' + msg;
        }
      } catch (err) {
        feedback.className   = 'form-feedback error visible';
        feedback.textContent = '❌ Erreur réseau. Vérifiez votre connexion et réessayez.';
      } finally {
        btnSubmit.disabled = false;
        btnText.hidden     = false;
        btnLoader.hidden   = true;
      }
    });
  }

  if (document.readyState === 'loading') {
    on(document, 'DOMContentLoaded', init);
  } else {
    init();
  }

})();
