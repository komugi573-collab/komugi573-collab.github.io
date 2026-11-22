/* Chicken Archer & FLAME — visual refresh runtime.
   Features (each isolated in try/catch so one failure never breaks the site):
   1. scroll-driven colour atmosphere   2. ambient particle canvas (zone-aware)
   3. pointer glow on cards             4. scroll reveal + parallax
   5. click sparks
   Nothing here touches <video> elements or their containers. */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[refresh] ' + name + ' disabled:', e); } };
  const isLight = () => doc.body.dataset.theme === 'light';
  const state = { zone: 'home', ac: [255, 208, 120], ac2: [255, 135, 80], scrollY: 0, vh: innerHeight, lastScroll: 0, speed: 0 };

  /* ------------------------------------------------------------------ 1. palette */
  // [accent, secondary, backdrop glow A, backdrop glow B, base1, base2, base3]
  const ZONES = {
    'home':          [[255,208,120],[255,135,80],[255,129,68],[255,192,91],[16,14,20],[12,13,19],[17,16,25], 'dust'],
    'trailer':       [[255,172,96],[255,108,112],[230,70,90],[255,150,80],[18,11,16],[12,10,16],[20,12,18], 'dust'],
    'version':       [[255,214,110],[255,160,60],[255,170,50],[255,214,110],[17,14,16],[13,12,15],[18,15,18], 'spark'],
    'history':       [[240,176,120],[214,110,120],[190,90,110],[240,170,110],[17,12,16],[13,11,16],[18,12,17], 'spark'],
    'behind-scenes': [[214,170,230],[255,140,150],[150,90,190],[255,140,150],[15,12,20],[12,11,19],[17,13,22], 'bokeh'],
    'about':         [[190,226,150],[255,200,110],[100,170,120],[255,200,110],[13,15,16],[11,14,16],[14,16,19], 'firefly'],
    'play':          [[255,200,100],[255,120,70],[255,120,60],[255,200,100],[16,13,16],[12,11,15],[18,14,17], 'ember'],
    'flame':         [[255,120,79],[255,179,75],[255,77,38],[255,151,55],[16,11,13],[16,13,19],[23,13,12], 'ember'],
    'faq':           [[255,150,110],[255,205,110],[230,100,80],[255,190,100],[17,12,14],[13,11,15],[19,13,15], 'dust'],
    'feather-facts': [[255,190,110],[255,130,100],[240,120,80],[255,190,110],[17,13,15],[13,11,15],[19,14,16], 'feather'],
    'socials':       [[126,200,236],[255,196,110],[70,140,200],[255,196,110],[12,14,20],[11,13,19],[14,16,24], 'wave'],
    'support-bot':   [[255,170,170],[255,205,110],[240,110,130],[255,205,110],[17,12,17],[13,11,16],[19,13,18], 'wave'],
    'support':       [[255,170,170],[255,205,110],[240,110,130],[255,205,110],[17,12,17],[13,11,16],[19,13,18], 'wave']
  };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const toLight = z => {
    const ink = [60, 30, 12];
    return [mix(z[0], ink, .42), mix(z[1], ink, .22), z[2], z[3],
      mix([253, 248, 241], z[2], .06), mix([246, 240, 232], z[3], .07), mix([255, 249, 240], z[2], .05)];
  };
  const rgbStr = c => c.map(Math.round).join(', ');

  let zoneEls = [], zoneCenters = [];
  const measureZones = () => {
    const sy = scrollY;
    zoneEls = Object.keys(ZONES).map(id => doc.getElementById(id)).filter(Boolean);
    zoneCenters = zoneEls.map(el => { const r = el.getBoundingClientRect(); return sy + r.top + r.height / 2; });
    const order = zoneCenters.map((c, i) => i).sort((a, b) => zoneCenters[a] - zoneCenters[b]);
    zoneEls = order.map(i => zoneEls[i]); zoneCenters = order.map(i => zoneCenters[i]);
  };
  const currentPalette = () => {
    const focus = scrollY + innerHeight * .45;
    let i = 0;
    while (i < zoneCenters.length - 1 && focus >= zoneCenters[i + 1]) i++;
    const j = Math.min(i + 1, zoneCenters.length - 1);
    const span = zoneCenters[j] - zoneCenters[i] || 1;
    const t = i === j ? 0 : smoother(clamp((focus - zoneCenters[i]) / span));
    const idA = zoneEls[i].id, idB = zoneEls[j].id;
    const zA = ZONES[idA], zB = ZONES[idB];
    const light = isLight();
    const A = light ? toLight(zA) : zA, B = light ? toLight(zB) : zB;
    return { vals: A.slice(0, 7).map((c, k) => mix(c, B[k], t)), zone: t < .5 ? idA : idB, mode: t < .5 ? zA[7] : zB[7] };
  };
  const setZone = z => {
    if (state.zone === z) return;
    state.zone = z; doc.body.dataset.zone = z;
    doc.dispatchEvent(new CustomEvent('zonechange', { detail: { zone: z } }));
  };
  const applyPalette = () => {
    if (!zoneEls.length) return;
    const p = currentPalette(), s = doc.body.style, v = p.vals;
    state.ac = v[0]; state.ac2 = v[1];
    s.setProperty('--ac-rgb', rgbStr(v[0])); s.setProperty('--ac2-rgb', rgbStr(v[1]));
    s.setProperty('--bga-rgb', rgbStr(v[2])); s.setProperty('--bgb-rgb', rgbStr(v[3]));
    s.setProperty('--base1-rgb', rgbStr(v[4])); s.setProperty('--base2-rgb', rgbStr(v[5])); s.setProperty('--base3-rgb', rgbStr(v[6]));
    state.mode = p.mode; setZone(p.zone);
  };

  /* --------------------------------------------------------------- scroll loop */
  let ticking = false;
  const onFrame = () => {
    ticking = false;
    const y = scrollY, max = Math.max(1, root.scrollHeight - innerHeight);
    const now = performance.now(), dt = Math.max(1, now - state.lastScroll);
    state.speed = Math.abs(y - state.scrollY) / dt; state.lastScroll = now; state.scrollY = y;
    doc.body.style.setProperty('--progress', clamp(y / max).toFixed(4));
    if (!reduceMq.matches && innerWidth > 900 && y < innerHeight * 1.4) doc.body.style.setProperty('--par', Math.round(y));
    applyPalette();
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };

  safe('palette', () => {
    measureZones();
    addEventListener('scroll', requestFrame, { passive: true });
    addEventListener('resize', () => { state.vh = innerHeight; measureZones(); requestFrame(); }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measureZones(); requestFrame(); }).observe(doc.querySelector('main'));
    new MutationObserver(requestFrame).observe(doc.body, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('load', () => { measureZones(); requestFrame(); }, { once: true });
    onFrame();
  });

  /* ------------------------------------------------------------------ 3. glow */
  safe('glow', () => {
    const sel = '.panel:not(.trailer-shell), .flame-feature, .flame-version, .flame-unreleased, .flame-bottom-cta, .flame-archive-note';
    doc.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const el = e.target.closest && e.target.closest(sel);
      if (!el) return;
      el._ev = e;
      if (el._raf) return;
      el._raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (el._ev.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (el._ev.clientY - r.top).toFixed(0) + 'px');
        el._raf = 0;
      });
    }, { passive: true });
  });

  /* --------------------------------------------------------------- 4. reveal */
  /* sections currently near the viewport are flagged; the rest have their decorative animations paused (see refresh.css) */
  safe('visibility', () => {
    if (!('IntersectionObserver' in window)) { doc.querySelectorAll('main > section').forEach(s => s.classList.add('in-view')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting)), { rootMargin: '120px 0px' });
    doc.querySelectorAll('main > section').forEach(s => io.observe(s));
  });

  safe('reveal', () => {
    const groups = [
      ['.section-head', null], ['.history-note', null], ['.flame-history-head', null], ['.faq-project-head', null],
      ['.feature-row', 'right'], ['.game-card', null], ['.about-card', null], ['.version-card', null], ['.behind-card', null],
      ['.social-card', null], ['.faq details', null], ['.flame-feature', null], ['.flame-version', null], ['.flame-unreleased', null],
      ['.flame-bottom-cta', 'zoom'], ['.flame-archive-note', null], ['.latest', 'zoom'], ['.support', 'zoom'], ['.support-bot-card', 'zoom'],
      ['.tip-panel', 'zoom'], ['.footer-row', null], ['.ticker-inner > span', null]
    ];
    const skip = el => el.closest('.trailer-shell, .flame-trailer, video');
    const els = new Set();
    groups.forEach(([sel, variant]) => doc.querySelectorAll(sel).forEach(el => {
      if (skip(el) || el.classList.contains('rv')) return;
      if (el.getBoundingClientRect().top < innerHeight * .92 && scrollY < 40 && el.closest('#home')) return;
      el.classList.add('rv'); if (variant) el.dataset.rv = variant;
      const sibs = [...el.parentElement.children].filter(c => c.classList.contains('rv') || c.matches(sel));
      el.style.setProperty('--d', (Math.min(sibs.indexOf(el), 6) * 0.07).toFixed(2) + 's');
      els.add(el);
    }));
    if (reduceMq.matches || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; io.unobserve(el); el.classList.add('in');
      // hand the element back to its normal hover/transform rules once the entrance is over
      setTimeout(() => { el.classList.remove('rv', 'in'); el.style.removeProperty('--d'); el.removeAttribute('data-rv'); }, 1500 + parseFloat(el.style.getPropertyValue('--d') || 0) * 1000);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .06 });
    els.forEach(el => io.observe(el));
  });

  /* -------------------------------------------------------------- 2. particles */
  // small public API used by the seasonal layer (assets/newyear.js); harmless no-op when particles are off
  window.CAFx = { setSnow() {}, snowing: false };
  safe('particles', () => {
    if (reduceMq.matches) return;
    const host = doc.getElementById('ambientBg'); if (!host) return;
    const cv = doc.createElement('canvas'); cv.className = 'fx-canvas'; cv.setAttribute('aria-hidden', 'true'); host.appendChild(cv);
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const coarse = matchMedia('(pointer: coarse)').matches;
    let W = 0, H = 0, dpr = 1, max = (innerWidth < 700 || coarse) ? 26 : 58, parts = [], raf = 0, last = 0, slow = 0, frames = 0;
    let mx = -999, my = -999, wave = 0;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); addEventListener('resize', resize, { passive: true });
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    doc.documentElement.addEventListener('mouseleave', () => { mx = my = -999; });
    const R = Math.random;
    const KINDS = {
      dust:    () => ({ k: 'dust', r: .6 + R() * 1.5, vx: (R() - .5) * .12, vy: -.04 - R() * .12, a: .25 + R() * .4, tw: R() * 6.3, life: 1 }),
      spark:   () => ({ k: 'spark', r: 1.6 + R() * 2.2, vx: (R() - .5) * .1, vy: -.03 - R() * .09, a: .5 + R() * .4, tw: R() * 6.3, life: 1 }),
      ember:   () => ({ k: 'ember', r: .8 + R() * 1.7, vx: (R() - .5) * .35, vy: -.35 - R() * .7, a: .5 + R() * .45, tw: R() * 6.3, life: 1 }),
      feather: () => ({ k: 'feather', r: 3 + R() * 3, vx: (R() - .5) * .4, vy: .25 + R() * .35, a: .38 + R() * .3, tw: R() * 6.3, rot: R() * 6.3, vr: (R() - .5) * .03, life: 1 }),
      bokeh:   () => ({ k: 'bokeh', r: 10 + R() * 22, vx: (R() - .5) * .1, vy: -.03 - R() * .07, a: .04 + R() * .07, tw: R() * 6.3, life: 1 }),
      firefly: () => ({ k: 'firefly', r: 1.2 + R() * 1.6, vx: (R() - .5) * .25, vy: (R() - .5) * .25, a: .6, tw: R() * 6.3, life: 1 })
    };
    const pickKind = () => {
      const m = state.mode || 'dust';
      if (m === 'wave') return R() < .7 ? 'dust' : 'spark';
      if (m === 'dust') return R() < .12 ? 'spark' : 'dust';
      if (m === 'home' || m === 'feather') return R() < .35 ? 'feather' : 'dust';
      return m;
    };
    const spawn = (anywhere) => {
      const p = KINDS[pickKind()]();
      p.x = R() * W; p.y = anywhere ? R() * H : (p.vy > 0 ? -12 : (p.k === 'firefly' ? R() * H : H + 12));
      if (anywhere && p.k === 'firefly') p.y = R() * H;
      return p;
    };
    for (let i = 0; i < max; i++) parts.push(spawn(true));
    const bursts = [];
    /* seasonal snow: its own layer, drawn on top of the zone particles. It melts away while the visitor is
       inside the FLAME zone and returns when they leave it; thins out together with the other particles. */
    const max0 = max, snowBase = (innerWidth < 700 || coarse) ? 34 : 80;
    let snowOn = false, snowLv = 0, snow = [];
    const flake = (top) => ({ x: R() * W, y: top ? -10 - R() * 40 : R() * H, r: .9 + R() * 2.3, vy: .35 + R() * .85, vx: (R() - .5) * .25, tw: R() * 6.3, sw: .4 + R() * .9 });
    const drawSnow = (k, lt) => {
      const want = snowOn && state.zone !== 'flame' ? 1 : 0;
      snowLv = lerp(snowLv, want, .025 * k);
      if (snowLv < .012) { if (!want) snow.length = 0; return; }
      const n = Math.round(snowBase * Math.min(1, max / max0));
      while (snow.length < n) snow.push(flake(false));
      if (snow.length > n) snow.length = n;
      ctx.fillStyle = lt ? 'rgba(120,160,205,' : 'rgba(255,255,255,';
      for (let i = 0; i < snow.length; i++) {
        const f = snow[i];
        f.tw += .018 * k; f.y += f.vy * k * (.6 + f.r * .25); f.x += (f.vx + Math.sin(f.tw) * f.sw * .35) * k;
        if (f.y > H + 12 || f.x < -14 || f.x > W + 14) { snow[i] = flake(true); continue; }
        const a = (.35 + f.r * .16) * snowLv * (lt ? .85 : 1);
        ctx.fillStyle = (lt ? 'rgba(120,160,205,' : 'rgba(255,255,255,') + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
    };
    window.CAFx.setSnow = on => { snowOn = !!on; window.CAFx.snowing = snowOn; if (snowOn && !raf && !doc.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
    const burst = (x, y) => {
      const n = coarse ? 9 : 15;
      for (let i = 0; i < n; i++) {
        const a = R() * 6.283, s = 1.2 + R() * 3;
        bursts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - .6, r: 1 + R() * 1.8, life: 1 });
      }
    };
    const burstSel = '.button, .flame-button, .nav-cta, .social-card, .game-card, .theme-toggle, .inline-copy, .flame-download-button, .project-tab, .mascot-button, summary';
    doc.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest(burstSel)) { burst(e.clientX, e.clientY); if (!raf) loop(performance.now()); } }, { passive: true });
    doc.addEventListener('mascot:spark', e => { burst(e.detail.x, e.detail.y); if (!raf) loop(performance.now()); });

    const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')';
    const light = () => isLight();
    const star = (x, y, r, rot) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .32 : r, a = rot + i * Math.PI / 4; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    };
    const drawWaves = (t) => {
      if (wave < .02) return;
      const c1 = state.ac, c2 = state.ac2, a = wave * (light() ? .10 : .16);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const base = H * (.82 + k * .045), amp = 16 + k * 9;
        for (let x = 0; x <= W; x += 14) {
          const y = base + Math.sin(x * .0042 + t * .00042 * (1 + k * .4) + k * 2) * amp + Math.sin(x * .011 - t * .0006 + k) * amp * .35;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        const g = ctx.createLinearGradient(0, base - amp, 0, H);
        g.addColorStop(0, rgb(k % 2 ? c2 : c1, a * (1 - k * .25))); g.addColorStop(1, rgb(c2, 0));
        ctx.fillStyle = g; ctx.fill();
      }
    };
    const loop = (t) => {
      raf = 0;
      if (doc.hidden) return;
      const dt = Math.min(48, t - (last || t)); last = t;
      // adaptive quality: if frames stay slow, thin the swarm out
      frames++; if (dt > 26) slow++;
      if (frames === 90) { if (slow > 40 && max > 14) max = Math.max(14, Math.round(max * .6)); frames = 0; slow = 0; }
      const k = dt / 16.7;
      ctx.clearRect(0, 0, W, H);
      wave = lerp(wave, (state.mode === 'wave') ? 1 : 0, .03);
      drawWaves(t);
      ctx.globalCompositeOperation = light() ? 'source-over' : 'lighter';
      const c1 = state.ac, c2 = state.ac2, lt = light();
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (i >= max) continue;
        p.tw += .02 * k;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 16900) { const d = Math.sqrt(d2) || 1, f = (1 - d / 130) * 1.6 * k; p.x += dx / d * f; p.y += dy / d * f; }
        if (p.k === 'firefly') { p.vx += (R() - .5) * .02; p.vy += (R() - .5) * .02; p.vx = clamp(p.vx, -.3, .3); p.vy = clamp(p.vy, -.3, .3); }
        p.x += (p.vx + Math.sin(p.tw) * .12) * k; p.y += p.vy * k + state.speed * .1 * k;
        if (p.rot !== undefined) p.rot += p.vr * k;
        if (p.y < -30 || p.y > H + 30 || p.x < -30 || p.x > W + 30) { parts[i] = spawn(false); continue; }
        const tw = .6 + Math.sin(p.tw * (p.k === 'firefly' ? .6 : 1.4)) * .4;
        const col = p.k === 'ember' || p.k === 'spark' ? c2 : c1;
        const al = p.a * tw * (lt ? .8 : 1);
        if (p.k === 'bokeh') {
          ctx.fillStyle = rgb(c2, al * .55); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
          ctx.strokeStyle = rgb(c1, al); ctx.lineWidth = 1; ctx.stroke();
        } else if (p.k === 'spark') {
          ctx.fillStyle = rgb(lt ? col : [255, 240, 205], al); star(p.x, p.y, p.r * (.7 + tw * .5), p.tw * .3);
          ctx.fillStyle = rgb(col, al * .16); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.283); ctx.fill();
        } else if (p.k === 'feather') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = rgb(col, al);
          ctx.beginPath(); ctx.ellipse(0, 0, p.r * .38, p.r, 0, 0, 6.283); ctx.fill();
          ctx.strokeStyle = rgb(lt ? [90, 50, 20] : [255, 245, 215], al * .8); ctx.lineWidth = .7;
          ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(0, p.r * 1.25); ctx.stroke(); ctx.restore();
        } else {
          ctx.fillStyle = rgb(col, al * .22); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.6, 0, 6.283); ctx.fill();
          ctx.fillStyle = rgb(lt ? col : [255, 238, 200], al); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i]; b.x += b.vx * k; b.y += b.vy * k; b.vy += .06 * k; b.vx *= .985; b.life -= .022 * k;
        if (b.life <= 0) { bursts.splice(i, 1); continue; }
        ctx.fillStyle = rgb(lt ? state.ac2 : [255, 232, 170], b.life);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (.5 + b.life * .6), 0, 6.283); ctx.fill();
        ctx.fillStyle = rgb(state.ac2, b.life * .22); ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 4, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      drawSnow(k, lt);
      raf = requestAnimationFrame(loop);
    };
    doc.addEventListener('visibilitychange', () => { if (!doc.hidden && !raf) { last = 0; raf = requestAnimationFrame(loop); } });
    raf = requestAnimationFrame(loop);
  });

  /* ready flag for the loading screen */
  window.__caUi = true; doc.dispatchEvent(new Event('ca:ui'));
})();
