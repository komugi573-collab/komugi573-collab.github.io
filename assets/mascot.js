/* Chicken Archer mascot — SVG character with ten emotions and a small state machine.
   Public API (used by the inline script of index.html):
     ChickenMascot.mount(el, {uid})      clone the character into an element (also used by the loading screen)
     ChickenMascot.react(line, rare)     line = { mood, text } from the site's phrase lists
     ChickenMascot.say(text, emo, ms)    show a bubble with an emotion */
(() => {
  'use strict';
  const doc = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const R = Math.random, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pick = a => a[Math.floor(R() * a.length)];
  const EMOS = ['calm', 'happy', 'surprised', 'curious', 'embarrassed', 'displeased', 'wink', 'delight', 'sleepy', 'sly'];
  // old phrase moods -> emotions
  const MOOD = { happy: 'happy', excited: 'delight', curious: 'curious', confused: 'embarrassed', sleepy: 'sleepy', proud: 'sly', playful: 'wink', surprised: 'surprised', focused: 'displeased' };

  /* ------------------------------------------------------------- mounting */
  let uidN = 0;
  const mount = (host, opts = {}) => {
    const tpl = doc.getElementById('chickyTemplate');
    if (!tpl || !host) return null;
    const uid = 'm' + (++uidN);
    let html = tpl.innerHTML.replace(/id="(cg\w+)"/g, 'id="$1-' + uid + '"').replace(/url\(#(cg\w+)\)/g, 'url(#$1-' + uid + ')');
    host.innerHTML = html;
    const svg = host.querySelector('.chicky');
    if (svg) svg.classList.add('on');
    return svg;
  };

  /* --------------------------------------------------- character controller */
  class Chicky {
    constructor(svg, opts = {}) {
      this.svg = svg; this.emo = 'calm'; this.timers = {}; this.opts = opts;
      this.look = { x: 0, y: 0 };
      if (!reduce.matches) this.blinkLoop();
    }
    set(emo, hold = 0) {
      if (!EMOS.includes(emo)) emo = 'calm';
      this.emo = emo; this.svg.dataset.emo = emo;
      clearTimeout(this.timers.back);
      if (hold) this.timers.back = setTimeout(() => this.set(this.baseEmo ? this.baseEmo() : 'calm'), hold);
    }
    cls(name, ms) {
      const s = this.svg.classList; s.add(name);
      clearTimeout(this.timers[name]); this.timers[name] = setTimeout(() => s.remove(name), ms);
    }
    pulse(name, ms) { const s = this.svg.classList; s.remove(name); void this.svg.getBoundingClientRect(); s.add(name); clearTimeout(this.timers[name]); this.timers[name] = setTimeout(() => s.remove(name), ms); }
    wave(ms = 1700, left = false) { if (reduce.matches) return; this.cls(left ? 'waving-l' : 'waving', ms); }
    hop() { if (!reduce.matches) this.pulse('hop', 600); }
    flap(ms = 900) { if (!reduce.matches) this.cls('flap', ms); }
    shake() { if (!reduce.matches) this.pulse('shake', 480); }
    lookAt(x, y) {
      x = clamp(x, -1, 1); y = clamp(y, -1, 1);
      if (Math.abs(x - this.look.x) < .02 && Math.abs(y - this.look.y) < .02) return;   // nothing to update: avoids restyling the SVG on every scroll/pointer event
      this.look.x = x; this.look.y = y;
      const st = this.svg.style;
      st.setProperty('--lx', (this.look.x * 4.2).toFixed(2)); st.setProperty('--ly', (this.look.y * 3.6).toFixed(2));
      st.setProperty('--hx', (this.look.x * 3.2).toFixed(2)); st.setProperty('--ht', (this.look.x * 2.4).toFixed(2));
    }
    blinkLoop() {
      const go = () => {
        this.cls('blink', 130);
        if (R() < .18) setTimeout(() => this.cls('blink', 120), 230);
        this.timers.blinkNext = setTimeout(go, 2200 + R() * 3800);
      };
      this.timers.blinkNext = setTimeout(go, 1200 + R() * 1800);
    }
    destroy() { Object.values(this.timers).forEach(clearTimeout); }
  }

  /* ----------------------------------------------------------- site mascot */
  const widget = doc.querySelector('.mascot-widget');
  const button = doc.getElementById('mascotButton');
  const bubble = doc.getElementById('mascotBubble');
  let site = null;
  const state = { shown: false, lastZoneLine: 0, lastScrollY: 0, lastInput: Date.now(), asleep: false, hoverFlip: false, greeted: false, bubbleTimer: 0 };

  const say = (text, emo = 'happy', ms = 5200) => {
    if (!bubble || !text) return;
    bubble.textContent = text; bubble.classList.add('show');
    clearTimeout(state.bubbleTimer);
    state.bubbleTimer = setTimeout(() => bubble.classList.remove('show', 'rare'), ms);
    if (site) site.set(emo, Math.min(ms, 4200));
  };
  const react = (line, rare = false) => {
    if (!line || !site) return;
    const emo = rare ? pick(['delight', 'sly', 'wink', 'surprised']) : (MOOD[line.mood] || 'happy');
    bubble.classList.toggle('rare', !!rare);
    say(line.text, emo, rare ? 6500 : 5500);
    // each emotion gets its own little gesture
    if (emo === 'delight') { site.hop(); site.flap(1100); sparks(); }
    else if (emo === 'happy') site.wave(1500);
    else if (emo === 'surprised') { site.hop(); }
    else if (emo === 'embarrassed') site.shake();
    else if (emo === 'wink') { site.wave(1200, true); }
    else if (emo === 'sly') site.wave(900, true);
    else if (emo === 'curious') site.pulse('shake', 300);
    if (rare) sparks();
  };
  const sparks = () => {
    if (!button) return;
    const r = button.getBoundingClientRect();
    doc.dispatchEvent(new CustomEvent('mascot:spark', { detail: { x: r.left + r.width / 2, y: r.top + r.height * .35 } }));
  };

  const wake = () => {
    state.lastInput = Date.now();
    if (state.asleep && site) {
      state.asleep = false; site.set('surprised', 700);
      setTimeout(() => { if (site && !state.asleep) site.set('happy', 1800); }, 700);
    }
  };

  const show = () => {
    if (state.shown || !widget) return;
    state.shown = true; widget.classList.add('show');
    if (!state.greeted) {
      state.greeted = true;
      setTimeout(() => {
        if (!site) return;
        site.wave(2200); site.set('happy', 2600);
        say('Привет, лучник! Нажми на меня — расскажу что-нибудь интересное.', 'happy', 5200);
      }, 650);
    }
  };
  const hide = () => {
    if (!state.shown || !widget) return;
    state.shown = false; widget.classList.remove('show'); bubble && bubble.classList.remove('show');
  };

  const idleTick = () => {
    if (!site || !state.shown) return;
    const idle = Date.now() - state.lastInput;
    if (idle > 32000 && !state.asleep) { state.asleep = true; site.set('sleepy'); say('Хр-р… я чуть-чуть вздремну.', 'sleepy', 3200); return; }
    if (state.asleep) return;
    if (idle < 2500) return;
    const roll = R();
    if (roll < .22) { site.wave(1400, R() < .5); site.set('happy', 1700); }
    else if (roll < .40) { site.lookAt(R() < .5 ? -1 : 1, (R() - .5) * 1.2); setTimeout(() => site && site.lookAt(0, 0), 1400); site.set('curious', 1800); }
    else if (roll < .52) { site.set('wink', 1000); }
    else if (roll < .62) { site.set('sly', 1700); }
    else if (roll < .72) { site.hop(); site.set('delight', 1200); }
    else if (roll < .80) { site.flap(800); }
    else if (roll < .86) { site.set('embarrassed', 1400); }
  };

  const ZONE_LINES = {
    'trailer': { mood: 'excited', text: 'Трейлер! Включай звук — там вся атмосфера.' },
    'version': { mood: 'proud', text: 'Версия 3.0 — «Проклятие Лунного моря». Громко звучит, правда?' },
    'history': { mood: 'curious', text: 'История проекта: от 2.1 до 3.0. Много шагов!' },
    'behind-scenes': { mood: 'curious', text: 'Тут истории за кулисами. Откроешь парочку?' },
    'flame': { mood: 'confused', text: 'Ух, жарковато! Это уже FLAME — отдельный проект.' },
    'faq': { mood: 'focused', text: 'Есть вопрос? Ответ, скорее всего, где-то здесь.' },
    'socials': { mood: 'happy', text: 'Ссылки на все соцсети — подпишись, чтобы не пропустить новости!' },
    'support-bot': { mood: 'playful', text: 'Нужна помощь? Бот поддержки всегда на связи.' },
    'support': { mood: 'happy', text: 'Спасибо, что поддерживаешь проекты!' }
  };

  const init = () => {
    if (!widget || !button) return;
    const svg = mount(button);
    if (!svg) return;
    site = new Chicky(svg);
    site.baseEmo = () => (state.asleep ? 'sleepy' : 'calm');
    site.set('calm');

    // pointer tracking: the eyes and head follow the cursor
    let px = 0, py = 0, pend = false;
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY; wake();
      if (pend) return; pend = true;
      requestAnimationFrame(() => {
        pend = false; if (!state.shown) return;
        const r = button.getBoundingClientRect();
        const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * .4);
        const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
        site.lookAt(dx / d * k, dy / d * k);
      });
    }, { passive: true });

    // scroll: show/hide, glance up/down, surprise at fast scrolling
    let lastY = scrollY, lastT = performance.now(), calmTimer = 0, lastShock = 0, dir = 0;
    const onScroll = () => {
      wake();
      const y = scrollY, now = performance.now(), v = Math.abs(y - lastY) / Math.max(1, now - lastT);
      if (y > 220) show(); else if (y < 70) hide();
      if (state.shown && Math.abs(y - lastY) > 3) {
        const d = y > lastY ? 1 : -1;
        if (d !== dir) { dir = d; site.lookAt(site.look.x * .4, d * .9); }
        clearTimeout(calmTimer); calmTimer = setTimeout(() => { dir = 0; site.lookAt(0, 0); }, 900);
        if (v > 3.2 && now - lastShock > 6000) { lastShock = now; site.set('surprised', 1100); site.flap(700); }
      }
      lastY = y; lastT = now;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (scrollY > 220) show();

    // hover / focus / click
    button.addEventListener('pointerenter', e => {
      if (e.pointerType === 'touch') return;
      wake(); state.hoverFlip = !state.hoverFlip;
      site.set(state.hoverFlip ? 'curious' : 'happy', 1500);
      if (!state.hoverFlip) site.wave(900);
    });
    button.addEventListener('pointerleave', () => { site.set('calm', 600); site.lookAt(0, 0); });
    button.addEventListener('focus', () => { wake(); site.set('curious', 1400); });
    button.addEventListener('pointerdown', () => { wake(); site.set('surprised', 380); });
    addEventListener('keydown', wake); addEventListener('touchstart', wake, { passive: true });

    // zone comments (rare, with cooldown)
    doc.addEventListener('zonechange', e => {
      const line = ZONE_LINES[e.detail.zone];
      const now = Date.now();
      if (!line || !state.shown || state.asleep || now - state.lastZoneLine < 16000 || R() > .4) return;
      state.lastZoneLine = now; react(line);
    });

    // keep clear of the trailer controls: dock to the left while a trailer is on screen
    if ('IntersectionObserver' in window) {
      const vis = new Set();
      const io = new IntersectionObserver(es => {
        es.forEach(en => { if (en.intersectionRatio > .25) vis.add(en.target); else vis.delete(en.target); });
        widget.classList.toggle('dock-left', vis.size > 0);
      }, { threshold: [0, .25, .5] });
      doc.querySelectorAll('video').forEach(v => io.observe(v));
    }

    if (!reduce.matches) setInterval(idleTick, 6500);
  };

  window.ChickenMascot = { mount, react, say, Chicky, emotions: EMOS };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();