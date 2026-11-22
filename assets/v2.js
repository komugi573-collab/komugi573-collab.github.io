/* Chicken Archer — second pass behaviour: animated accordions, the hero archer, the facts stage
   and the FLAME bridge. Every block is isolated by safe(): if one fails the rest of the page keeps working,
   and nothing here is needed for the content to be readable (details/summary, links and buttons are plain HTML). */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const R = Math.random;
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[v2] ' + name + ' disabled:', e); } };
  const icon = (id, cls) => '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + id + '"/></svg>';

  /* ------------------------------------------------------------ accordions */
  /* <details> stays the source of truth (works without JS and in find-in-page). The height of .acc-body is animated
     with the Web Animations API from the current measured height, so interrupting an opening/closing card is seamless
     and the cards below simply follow the changing height instead of jumping. */
  safe('accordion', () => {
    const EASE = 'cubic-bezier(.22,.8,.24,1)';
    $$('details.acc').forEach(d => {
      const sum = d.querySelector(':scope > summary'), body = d.querySelector(':scope > .acc-body');
      if (!sum || !body) return;
      d.classList.toggle('is-open', d.open);
      let anim = null;
      sum.addEventListener('click', e => {
        e.preventDefault();
        const opening = !d.classList.contains('is-open');
        d.classList.toggle('is-open', opening);
        if (reduce.matches || !body.animate) { d.open = opening; return; }
        const startH = anim ? body.getBoundingClientRect().height : (d.open ? body.getBoundingClientRect().height : 0);
        if (anim) { anim.cancel(); anim = null; }
        if (opening) d.open = true;
        const endH = opening ? body.scrollHeight : 0;
        const dur = clamp(240 + Math.abs(endH - startH) * .55, 300, 620);
        body.style.overflow = 'hidden';
        anim = body.animate([{ height: startH + 'px' }, { height: endH + 'px' }], { duration: dur, easing: EASE, fill: 'forwards' });
        const mine = anim;
        mine.onfinish = () => {
          if (anim !== mine) return;
          if (!opening) d.open = false;
          mine.cancel(); anim = null; body.style.overflow = '';
        };
      });
    });
  });

  /* ------------------------------------------------------------- hero archer */
  safe('hero', () => {
    const shot = $('#heroShot'), chick = $('#heroChicken'), target = $('#heroTarget'), hit = $('#heroHit');
    if (!shot || !chick) return;
    let emoTimer = 0, inView = true, busy = false, hits = 0;
    const setEmo = (e, ms = 0) => {
      chick.dataset.emo = e; clearTimeout(emoTimer);
      if (ms) emoTimer = setTimeout(() => { chick.dataset.emo = 'calm'; }, ms);
    };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; }), { threshold: 0 }).observe($('#home'));

    // the eyes follow the pointer
    let px = 0, py = 0, pend = false;
    const look = (x, y) => { chick.style.setProperty('--lx', (x * 6).toFixed(1)); chick.style.setProperty('--ly', (y * 5).toFixed(1)); };
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      px = e.clientX; py = e.clientY;
      if (pend) return; pend = true;
      requestAnimationFrame(() => {
        pend = false; if (!inView) return;
        const r = chick.getBoundingClientRect();
        const dx = px - (r.left + r.width * .45), dy = py - (r.top + r.height * .33), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 340);
        look(dx / d * k, dy / d * k);
      });
    }, { passive: true });

    // blinking and little idle moments (short transient classes: nothing animates continuously)
    if (!reduce.matches) {
      const blink = () => {
        chick.classList.add('blink'); setTimeout(() => chick.classList.remove('blink'), 130);
        setTimeout(blink, 2300 + R() * 3600);
      };
      setTimeout(blink, 1800);
      const idle = () => {
        if (inView && !busy && !doc.hidden) {
          const roll = R();
          if (roll < .34) { chick.classList.add('flutter'); setTimeout(() => chick.classList.remove('flutter'), 1500); }
          else if (roll < .62) { setEmo('curious', 1500); look(R() < .5 ? -1 : 1, -.4); setTimeout(() => look(0, 0), 1500); }
          else if (roll < .8) { chick.classList.add('crest'); setTimeout(() => chick.classList.remove('crest'), 1000); }
        }
        setTimeout(idle, 5200 + R() * 4200);
      };
      setTimeout(idle, 5000);
    }

    // click / tap / Enter: shoot at the target
    const LINES = ['Точно в цель!', 'Меткий выстрел!', 'В яблочко!', 'Прямо в центр!', 'Вот это глазомер!'];
    const sparkAt = el => {
      const r = el.getBoundingClientRect();
      doc.dispatchEvent(new CustomEvent('mascot:spark', { detail: { x: r.left + r.width * .5, y: r.top + r.height * .4 } }));
    };
    shot.addEventListener('click', () => {
      if (busy) return; busy = true;
      shot.classList.remove('nock'); shot.classList.add('shoot'); setEmo('aim');
      setTimeout(() => {
        if (target) target.classList.add('hit');
        hits++;
        if (hit) { hit.textContent = LINES[(hits - 1) % LINES.length]; hit.classList.remove('show'); void hit.offsetWidth; hit.classList.add('show'); }
        setEmo('delight', 1500); if (target) sparkAt(target);
      }, reduce.matches ? 0 : 430);
      setTimeout(() => { shot.classList.remove('shoot'); shot.classList.add('nock'); }, reduce.matches ? 900 : 1500);
      setTimeout(() => { shot.classList.remove('nock'); if (target) target.classList.remove('hit'); busy = false; }, reduce.matches ? 1300 : 2250);
    });

    // the archer reacts to the main buttons next to it
    const mood = { play: 'delight', trailer: 'curious', news: 'proud' };
    $$('[data-hero-btn]').forEach(b => {
      const on = () => { if (!busy) setEmo(mood[b.dataset.heroBtn] || 'calm'); };
      const off = () => { if (!busy) setEmo('calm'); };
      b.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') on(); });
      b.addEventListener('focus', on); b.addEventListener('pointerleave', off); b.addEventListener('blur', off);
    });
  });

  /* ------------------------------------------------------------ facts stage */
  const CATS = {
    all: { name: 'Все', icon: 'sparkle' },
    ca: { name: 'Chicken Archer', icon: 'bow' },
    flame: { name: 'FLAME', icon: 'flame' },
    dev: { name: 'Разработка', icon: 'code' },
    site: { name: 'Сайт', icon: 'globe' }
  };
  const FACTS = [
    { c: 'ca', e: 'cool', t: 'Игра для браузера и телефона', x: 'Chicken Archer — HTML5-игра, рассчитанная в том числе на мобильные устройства. Поэтому интерфейс версии 3.0 перерабатывался с оглядкой на небольшие экраны.' },
    { c: 'ca', e: 'proud', t: 'Подзаголовок версии 3.0', x: 'Актуальная версия называется «Проклятие Лунного моря». Она обновляет меню и игровой интерфейс и добавляет профиль игрока.' },
    { c: 'ca', e: 'delight', t: 'Сезонный пропуск на 30 уровней', x: 'В версии 3.0 сезонный пропуск рассчитан на 30 уровней и состоит из бесплатной и премиальной веток.' },
    { c: 'ca', e: 'wink', t: 'Пять видов следов стрелы', x: 'Огонь, молния, перья, монеты и неон: эти следы появились в версии 2.5, а к ним добавились достижения и секретные находки.' },
    { c: 'ca', e: 'thinking', t: 'Замедление и автопауза', x: 'С версии 2.5 можно замедлять полёт стрелы, а при сворачивании игра сама ставится на паузу.' },
    { c: 'ca', e: 'happy', t: 'Профиль остаётся с вами', x: 'Профиль игрока в версии 3.0 использует локальное сохранение: данные хранятся на вашем устройстве.' },
    { c: 'ca', e: 'love', t: 'С чего всё началось', x: 'Самая первая версия — Chicken Archer 2.1. С неё на этом сайте начинается история обновлений.' },
    { c: 'ca', e: 'surprised', t: 'Противники и босс', x: 'В версии 2.3 появились новые игровые фазы, противники и босс, а также были доработаны стрельба, влияние ветра и магазин.' },
    { c: 'ca', e: 'happy', t: 'Два языка и звуковые наборы', x: 'В игре есть локализация на русский и английский (RU/EN), а версия 3.0 даёт настроить звуковое оформление.' },
    { c: 'ca', e: 'curious', t: 'Что запланировано на 3.5', x: 'В планах на версию 3.5 — система промокодов и серверные функции. Пока это именно планы, а не выпущенные возможности.' },
    { c: 'flame', e: 'cool', t: 'FLAME живёт отдельно', x: 'FLAME — самостоятельный проект со своим интерфейсом, оформлением и историей обновлений, а не часть Chicken Archer.' },
    { c: 'flame', e: 'curious', t: 'Архив начинается с 1.3', x: 'Версии FLAME 1.0 и 1.2 не публиковались, поэтому архив выпусков на сайте открывает версия 1.3.' },
    { c: 'flame', e: 'happy', t: 'APK для Android', x: 'Архивные версии FLAME 1.3 и 1.4 лежат прямо на сайте в виде APK-файлов для Android.' },
    { c: 'flame', e: 'delight', t: 'FLAME 1.5', x: 'Последняя указанная версия — 1.5. В ней продолжилась работа над интерфейсом и визуальной подачей проекта.' },
    { c: 'dev', e: 'happy', t: 'Один бот на два проекта', x: 'Бот @Chickenarcherbot принимает обращения сразу по двум проектам: Chicken Archer и FLAME.' },
    { c: 'dev', e: 'aim', t: 'Мелочи, от которых всё зависит', x: 'Особое внимание уделялось расположению элементов интерфейса, показу имён при попадании, описаниям предметов магазина и работе стрельбы.' },
    { c: 'dev', e: 'thinking', t: 'Обновления идут поэтапно', x: 'Эффекты стрел, достижения и замедление времени отнесены к версии 2.5, а промокоды — к будущей 3.5. Так идеи не смешиваются в одном выпуске.' },
    { c: 'dev', e: 'scared', t: 'Не закрыть поле боя', x: 'Интерфейс не должен перекрывать игровое поле на телефонах, а прицеливание должно оставаться удобным. Это регулярно проверяется на практике.' },
    { c: 'site', e: 'happy', t: 'Новости в одном месте', x: 'Telegram-канал — главная площадка новостей обоих проектов. Там же можно скачать старые версии Chicken Archer и FLAME.' },
    { c: 'site', e: 'cool', t: 'Две темы оформления', x: 'Сайт переключается между тёмной и светлой темой, а ваш выбор запоминается на этом устройстве.' },
    { c: 'site', e: 'love', t: 'Праздничное оформление', x: 'С 1 декабря сайт сам включает новогоднее оформление по времени вашего устройства. Ничего обновлять или скачивать не нужно.' },
    { c: 'site', e: 'wink', t: 'Цвета меняются при прокрутке', x: 'Фон и акценты плавно перетекают от тёплого золота Chicken Archer к огненным оттенкам FLAME.' },
    { c: 'site', e: 'dizzy', t: 'Маскот не скучает', x: 'Маскот следит за курсором и по-разному реагирует на нажатия, прокрутку и паузы. Нажми на него, чтобы увидеть реакцию.' }
  ];

  safe('facts', () => {
    const stage = $('#factsStage'), card = $('#factCard'), host = $('#factChick');
    if (!stage || !card || !host || !window.ChickenMascot) return;
    const titleEl = $('#tipTitle'), textEl = $('#tipText'), catEl = $('#factCat'), iconEl = $('#tipIcon'), countEl = $('#factCount');
    const moodEl = $('#factMood'), bitsEl = $('#factBits'), filtersEl = $('#factFilters'), moodRow = $('#moodRow');
    const CM = window.ChickenMascot;
    const chick = CM.mountStage(host);
    if (!chick) return;
    let filter = 'all', list = FACTS.slice(), pos = Math.floor(R() * list.length), bag = [], busy = false, first = true;

    // filter chips
    Object.keys(CATS).forEach(k => {
      const b = doc.createElement('button'); b.type = 'button'; b.className = 'fact-filter'; b.dataset.c = k;
      b.setAttribute('aria-pressed', String(k === 'all')); b.textContent = CATS[k].name;
      b.addEventListener('click', () => setFilter(k));
      filtersEl.appendChild(b);
    });
    // mood chips: every emotion the character has
    CM.emotions.forEach(k => {
      const b = doc.createElement('button'); b.type = 'button'; b.className = 'mood-chip'; b.dataset.e = k;
      b.setAttribute('aria-pressed', 'false'); b.textContent = CM.labels[k][0].toUpperCase() + CM.labels[k].slice(1);
      b.addEventListener('click', () => feel(k, true));
      moodRow.appendChild(b);
    });

    const bit = (kind) => {
      if (reduce.matches || !bitsEl) return;
      const s = doc.createElement('span'); s.className = 'fx-bit ' + (kind === 'heart' ? 'heart' : (kind === 'sparkle' || kind === 'star') ? 'spark' : '');
      s.style.setProperty('--bx', ((R() - .5) * 90).toFixed(0) + 'px'); s.style.setProperty('--br', ((R() - .5) * 60).toFixed(0) + 'deg');
      s.style.left = (38 + R() * 24).toFixed(0) + '%'; s.style.top = (30 + R() * 22).toFixed(0) + '%';
      s.innerHTML = icon(kind);
      bitsEl.appendChild(s); setTimeout(() => s.remove(), 1700);
      if (bitsEl.children.length > 12) bitsEl.firstChild.remove();
    };
    const feel = (emo, manual) => {
      chick.set(emo); chick.gesture(emo);
      moodEl.textContent = 'Настроение: ' + CM.labels[emo];
      $$('.mood-chip', moodRow).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.e === emo)));
      (CM.bits[emo] || []).forEach((k, i) => setTimeout(() => bit(k), i * 160));
      if (manual) chick.lookAt(0, 0);
    };

    const fill = f => {
      const idx = list.indexOf(f) + 1, total = list.length;
      stage.dataset.cat = f.c; card.dataset.cat = f.c;
      titleEl.textContent = f.t; textEl.textContent = f.x;
      catEl.querySelector('b').textContent = CATS[f.c].name;
      iconEl.innerHTML = icon(CATS[f.c].icon);
      countEl.textContent = String(idx).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
    };
    const show = (i, dir = 1) => {
      pos = (i + list.length) % list.length;
      const f = list[pos];
      if (first || reduce.matches || !card.animate) { fill(f); feel(f.e); first = false; return; }
      if (busy) return; busy = true;
      const out = card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(' + (-dir * 26) + 'px) scale(.985)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
      out.onfinish = () => {
        fill(f); feel(f.e);
        const inn = card.animate([{ opacity: 0, transform: 'translateX(' + (dir * 30) + 'px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'forwards' });
        inn.onfinish = () => { out.cancel(); inn.cancel(); busy = false; };
      };
    };
    const random = () => {
      if (!bag.length) bag = list.map((_, i) => i).filter(i => i !== pos).sort(() => R() - .5);
      show(bag.pop(), R() < .5 ? 1 : -1);
    };
    function setFilter(k) {
      filter = k; list = k === 'all' ? FACTS.slice() : FACTS.filter(f => f.c === k); bag = [];
      $$('.fact-filter', filtersEl).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === k)));
      busy = false; first = true; show(0);
    }
    $('#newTip').addEventListener('click', random);
    $('#factPrev').addEventListener('click', () => show(pos - 1, -1));
    $('#factNext').addEventListener('click', () => show(pos + 1, 1));
    card.addEventListener('keydown', () => {});
    stage.addEventListener('keydown', e => {
      if (e.target.closest('button, a')) { if (e.target.closest('.fact-filter, .mood-chip')) return; }
      if (e.key === 'ArrowRight') show(pos + 1, 1); else if (e.key === 'ArrowLeft') show(pos - 1, -1);
    });

    // the character follows the pointer while it is over the stage
    let pend = false, mx = 0, my = 0;
    stage.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY; if (pend) return; pend = true;
      requestAnimationFrame(() => {
        pend = false; const r = host.getBoundingClientRect();
        const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height * .4), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 280);
        chick.lookAt(dx / d * k, dy / d * k);
      });
    }, { passive: true });
    stage.addEventListener('pointerleave', () => chick.lookAt(0, 0));
    // poking the character itself makes it react
    host.addEventListener('click', () => { const pool = CM.emotions.filter(x => x !== chick.emo && x !== 'sleepy'); feel(pool[Math.floor(R() * pool.length)], true); });
    host.style.pointerEvents = 'auto'; host.style.cursor = 'pointer';

    setFilter('all');
    show(pos);
  });

  /* ------------------------------------------------ bridge to the FLAME section */
  /* Publishes how far the visitor has travelled through the transition band as --fp (0..1);
     the layered flame silhouettes in refresh/v2.css rise with it. Only runs while the band is near the viewport. */
  safe('flame-bridge', () => {
    const band = $('.palette-transition');
    if (!band) return;
    let on = false, tick = false, last = -1;
    const calc = () => {
      tick = false;
      const r = band.getBoundingClientRect(), vh = innerHeight;
      const p = clamp((vh * .92 - r.top) / (vh * .92 + r.height * .35));
      if (Math.abs(p - last) > .008) { last = p; band.style.setProperty('--fp', p.toFixed(3)); }
    };
    const req = () => { if (!tick) { tick = true; requestAnimationFrame(calc); } };
    const start = () => { if (on) return; on = true; addEventListener('scroll', req, { passive: true }); addEventListener('resize', req, { passive: true }); req(); };
    const stop = () => { if (!on) return; on = false; removeEventListener('scroll', req); removeEventListener('resize', req); };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop())), { rootMargin: '30% 0px' }).observe(band); else start();
  });
})();
