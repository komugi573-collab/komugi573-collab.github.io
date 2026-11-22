/* Chicken Archer — mobile layer: bottom dock + menu sheet, scroll-spy, carousel dots.
   Everything here is progressive enhancement: the page works without it, and on wide screens
   the dock/dots are hidden by CSS, so the work below is cheap (one IntersectionObserver, passive listeners). */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const phone = matchMedia('(max-width: 760px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------- menu sheet */
  const toggle = $('#menuToggle'), nav = $('#navLinks'), dockMenu = $('#dockMenu'), scrim = $('#sheetScrim');
  const syncSheet = () => {
    if (!nav) return;
    const open = nav.classList.contains('open') && phone.matches;
    root.classList.toggle('sheet-open', open);
    if (scrim) scrim.hidden = !open;
    if (dockMenu) { dockMenu.setAttribute('aria-expanded', String(open)); dockMenu.classList.toggle('active', open); }
  };
  if (nav && 'MutationObserver' in window) new MutationObserver(syncSheet).observe(nav, { attributes: true, attributeFilter: ['class'] });
  if (dockMenu && toggle) dockMenu.addEventListener('click', () => toggle.click());
  if (scrim && toggle) scrim.addEventListener('click', () => { if (nav.classList.contains('open')) toggle.click(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav && nav.classList.contains('open') && toggle) toggle.click(); });
  phone.addEventListener && phone.addEventListener('change', syncSheet);

  /* -------------------------------------------------------- dock scroll-spy */
  const dock = $('#dock');
  if (dock && 'IntersectionObserver' in window) {
    const map = { home: 'home', trailer: 'trailer', version: 'version', history: 'version', 'behind-scenes': 'version', about: 'version', play: 'version', flame: 'flame' };
    const items = {}; $$('[data-dock]', dock).forEach(el => { items[el.dataset.dock] = el; });
    let current = '';
    const set = key => {
      if (key === current) return; current = key;
      Object.keys(items).forEach(k => { if (k !== 'menu') { const on = k === key; items[k].classList.toggle('active', on); if (on) items[k].setAttribute('aria-current', 'true'); else items[k].removeAttribute('aria-current'); } });
    };
    const order = $$('main > section[id]').map(s => s.id), seen = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(en => { if (en.isIntersecting) seen.add(en.target.id); else seen.delete(en.target.id); });
      // the last section (in page order) crossing the reading line wins; sections after FLAME's own block clear the highlight
      const ids = order.filter(id => seen.has(id));
      if (ids.length) set(map[ids[ids.length - 1]] || '');
    }, { rootMargin: '-42% 0px -52% 0px' });
    $$('main > section[id]').forEach(s => io.observe(s));
    set('home');
  }

  /* ------------------------------------------------------- carousel dots */
  const carousel = (track, label) => {
    if (!track) return;
    const slides = Array.from(track.children).filter(el => el.nodeType === 1);
    if (slides.length < 2) return;
    const bar = doc.createElement('div'); bar.className = 'snap-dots'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', label);
    const dots = slides.map((slide, i) => {
      const b = doc.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Карточка ' + (i + 1) + ' из ' + slides.length);
      b.addEventListener('click', () => track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2, behavior: reduce.matches ? 'auto' : 'smooth' }));
      bar.appendChild(b); return b;
    });
    track.insertAdjacentElement('afterend', bar);
    let idx = -1, pend = false;
    const update = () => {
      pend = false;
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bd = Infinity;
      slides.forEach((s, i) => { const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      if (best === idx) return; idx = best;
      dots.forEach((d, i) => { d.classList.toggle('on', i === best); d.setAttribute('aria-selected', String(i === best)); });
    };
    track.addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update, { passive: true });
    update();
  };
  carousel($('.history-grid'), 'Версии Chicken Archer');
  carousel($('.flame-version-grid'), 'Версии FLAME');
})();
