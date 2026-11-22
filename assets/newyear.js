/* Chicken Archer & FLAME — New Year layer (client side only, no release needed).
   The season is decided from the visitor's own clock: from 1 December 00:00 local time (CA_NY.start, set in the head
   of index.html) until CA_NY.end. It is checked on load, when the tab becomes visible again, on bfcache restore and
   by a timer aimed at the boundary, so a page left open at midnight switches by itself.
   The visitor can switch the decorations off (remembered in localStorage). ?ny=preview / ?ny=off force the state for testing. */
(() => {
  'use strict';
  const cfg = window.CA_NY;
  if (!cfg) return;
  const doc = document, root = doc.documentElement;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const safe = (name, fn) => { try { return fn(); } catch (e) { console.warn('[newyear] ' + name + ':', e); } };
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: k => { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };
  const weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  if (weak) root.classList.add('ny-lite');

  const inSeason = () => cfg.force ? cfg.force === 'on' : (Date.now() >= cfg.start && Date.now() < cfg.end);
  const wantsOff = () => store.get('ca-ny-off') === '1';
  let built = false, timer = 0, uid = 0;

  /* ----------------------------------------------------------------- artwork */
  const treeSvg = () => {
    const id = 'nyt' + (++uid);
    const lights = [[50, 38, '#ffd36b'], [34, 62, '#ff5b66'], [66, 60, '#6cb8ff'], [24, 86, '#ffd36b'], [50, 82, '#ff5b66'], [76, 88, '#5ad6a0'], [38, 106, '#6cb8ff'], [64, 108, '#ffd36b']];
    return '<svg viewBox="0 0 100 136" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34b378"/><stop offset="1" stop-color="#17704a"/></linearGradient></defs>' +
      '<rect x="43" y="112" width="14" height="18" rx="3" fill="#8a5632" stroke="#4b2923" stroke-width="3.500"/>' +
      '<path d="M50 16 76 56H62l22 30H66l26 32H8l26-32H16l22-30H24z" fill="url(#' + id + 'g)" stroke="#4b2923" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M30 118q20-8 40 0M26 90q24-8 48 0M36 62q14-6 28 0" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/>' +
      '<path class="tstar" d="M50 2l4.400 9.200 10 1.200-7.400 6.900 2 9.900L50 24l-9 5.200 2-9.900-7.400-6.900 10-1.200z" fill="#ffd36b" stroke="#4b2923" stroke-width="3" stroke-linejoin="round"/>' +
      '<g>' + lights.map(l => '<circle class="tl" cx="' + l[0] + '" cy="' + l[1] + '" r="4.600" fill="' + l[2] + '" stroke="#4b2923" stroke-width="2"/>').join('') + '</g></svg>';
  };
  const baubleSvg = () => '<svg viewBox="0 0 34 76" aria-hidden="true" focusable="false">' +
    '<path d="M17 0V28" stroke="#4b2923" stroke-width="2.600" stroke-linecap="round"/>' +
    '<rect x="11" y="26" width="12" height="9" rx="2.500" fill="#ffd36b" stroke="#4b2923" stroke-width="3"/>' +
    '<circle class="bb" cx="17" cy="54" r="17" stroke="#4b2923" stroke-width="3.500"/>' +
    '<path class="bb2" d="M1.500 52q15.500 8 31 0 .6 5-2 10Q17 70 4 62q-3-5-2.500-10z"/>' +
    '<ellipse cx="11" cy="45" rx="4" ry="6" transform="rotate(30 11 45)" fill="#fff" fill-opacity=".5"/>' +
    '<circle cx="17" cy="54" r="17" fill="none" stroke="#4b2923" stroke-width="3.500"/></svg>';

  /* ------------------------------------------------------------------ building */
  let garland = null, bulbCount = 0;
  const layoutGarland = () => {
    if (!garland) return;
    const tile = innerWidth <= 760 ? 90 : 120, n = Math.ceil(innerWidth / tile) + 1;
    if (n === bulbCount) return;
    bulbCount = n; garland.textContent = '';
    for (let i = 0; i < n; i++) {
      const b = doc.createElement('span'); b.className = 'ny-bulb'; b.style.left = (i * tile + tile / 2) + 'px';
      b.style.setProperty('--d', (-(i * 0.67 % 2.8)).toFixed(2) + 's'); b.innerHTML = '<i></i>';
      garland.appendChild(b);
    }
  };
  const addCaps = () => {
    $$('.panel, .social-card, .flame-feature, .flame-version').slice(0, 70).forEach(el => {
      if (el.dataset.nycap) return; el.dataset.nycap = '1';
      const host = el.matches('details') ? el.querySelector(':scope > summary') : el;
      if (!host) return;
      if (getComputedStyle(host).position === 'static') host.classList.add('ny-rel');
      const cap = doc.createElement('i'); cap.className = 'ny-cap'; cap.setAttribute('aria-hidden', 'true'); host.appendChild(cap);
    });
  };
  const build = () => {
    if (built) return; built = true;
    safe('garland', () => {
      const bar = $('.topbar'); if (!bar) return;
      garland = doc.createElement('div'); garland.className = 'ny-garland'; garland.setAttribute('aria-hidden', 'true');
      bar.appendChild(garland); layoutGarland();
      let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layoutGarland, 150); }, { passive: true });
    });
    safe('bg', () => {
      const bg = doc.createElement('div'); bg.className = 'ny-bg'; bg.setAttribute('aria-hidden', 'true');
      const amb = $('#ambientBg'); amb ? amb.insertAdjacentElement('afterend', bg) : doc.body.prepend(bg);
    });
    safe('trees', () => {
      const hero = $('#heroArt .art-panel');
      if (hero) { const t = doc.createElement('div'); t.className = 'ny-tree ny-tree-hero'; t.setAttribute('aria-hidden', 'true'); t.innerHTML = treeSvg(); hero.appendChild(t); }
      const sup = $('.support');
      if (sup) { const t = doc.createElement('div'); t.className = 'ny-tree ny-tree-support'; t.setAttribute('aria-hidden', 'true'); t.innerHTML = treeSvg(); sup.appendChild(t); }
    });
    safe('caps', addCaps);
    safe('baubles', () => {
      $$('main .section-head').forEach(h => {
        if (getComputedStyle(h).position === 'static') h.classList.add('ny-rel');
        ['', ' b2'].forEach(c => { const b = doc.createElement('i'); b.className = 'ny-bauble' + c; b.setAttribute('aria-hidden', 'true'); b.innerHTML = baubleSvg(); h.appendChild(b); });
      });
    });
    safe('footer', () => {
      const f = $('footer'); if (!f) return;
      const g = doc.createElement('div'); g.className = 'ny-ground'; g.setAttribute('aria-hidden', 'true'); f.prepend(g);
      const note = $('.footnote', f); if (!note) return;
      const p = doc.createElement('p'); p.className = 'ny-greet';
      p.textContent = new Date().getMonth() === 0 ? 'С Новым годом! Пусть в этом году будет больше метких выстрелов, ярких обновлений и тёплых вечеров.' : 'С наступающим Новым годом! Пусть в новом году будет больше метких выстрелов, ярких обновлений и тёплых вечеров.';
      note.parentNode.insertBefore(p, note);
    });
    safe('toggle', () => {
      const b = $('#nyToggle'); if (!b) return;
      b.addEventListener('click', () => { wantsOff() ? store.del('ca-ny-off') : store.set('ca-ny-off', '1'); apply(); });
    });
  };

  const sync = () => {
    const b = $('#nyToggle'); if (!b) return;
    const on = root.classList.contains('ny');
    b.hidden = !root.classList.contains('ny-season');
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Праздничное оформление включено. Нажмите, чтобы выключить' : 'Праздничное оформление выключено. Нажмите, чтобы включить');
    b.title = on ? 'Выключить праздничное оформление' : 'Включить праздничное оформление';
  };

  const toast = (title, text) => {
    let t = $('.ny-toast');
    if (!t) { t = doc.createElement('div'); t.className = 'ny-toast'; t.setAttribute('role', 'status'); doc.body.appendChild(t); }
    t.innerHTML = '<b></b><span></span>'; t.firstChild.textContent = title; t.lastChild.textContent = text;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 7000);
    t.onclick = () => t.classList.remove('show');
  };
  const greet = () => {
    const key = 'ca-ny-seen-' + new Date(cfg.start).getFullYear();
    if (store.get(key) || cfg.force) return;
    store.set(key, '1');
    setTimeout(() => {
      toast('Праздничное оформление включено', 'Сайт сам сменил наряд по дате на вашем устройстве. Выключить его можно кнопкой со снежинкой в шапке.');
      if (window.ChickenMascot && ChickenMascot.say) ChickenMascot.say('Я уже в шапке! С наступающим Новым годом!', 'happy', 6000);
    }, 2600);
  };

  /* ------------------------------------------------------------------ switching */
  function apply() {
    const season = inSeason(), on = season && !wantsOff(), was = root.classList.contains('ny');
    if (!season && !root.classList.contains('ny-season') && !was && !built) { schedule(); return; }
    root.classList.toggle('ny-season', season);
    if (season && !doc.getElementById('nyCss')) {
      const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/newyear.css'; l.id = 'nyCss'; doc.head.appendChild(l);
    }
    if (season && !built) {
      // build while the layer is still "off" so every piece fades in instead of popping
      root.classList.remove('ny'); build(); void root.offsetWidth;
      requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.toggle('ny', on); sync(); }));
      if (on) greet();
    } else {
      root.classList.toggle('ny', on);
    }
    if (season && built) safe('caps', addCaps);
    if (window.CAFx) window.CAFx.setSnow(on);
    sync();
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (cfg.force) return;
    const now = Date.now(), edge = now < cfg.start ? cfg.start : (now < cfg.end ? cfg.end : 0);
    if (!edge) return;
    timer = setTimeout(apply, Math.min(edge - now + 300, 3600000));
  }

  const recheck = () => { if (!doc.hidden) apply(); };
  doc.addEventListener('visibilitychange', recheck);
  addEventListener('pageshow', recheck);
  addEventListener('focus', recheck);
  addEventListener('online', recheck);
  apply();
})();
