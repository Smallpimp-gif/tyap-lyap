/* =================================================================
   ТЯП-ЛЯП — interactions
   ================================================================= */
(function () {
  'use strict';

  // Signal to the inline fail-safe that the main script is running.
  window.__tlReady = true;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Run fn at most once per animation frame. Coalescing scroll work to one
  // pass/frame is what keeps scrolling smooth (multiple synchronous passes per
  // frame — especially ones that read layout — make the whole scroll judder).
  function rafThrottle(fn) {
    var ticking = false;
    return function () {
      if (ticking) return;
      ticking = true;
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () { ticking = false; fn(); });
      } else { ticking = false; fn(); }
    };
  }

  /* ---------------------------- Preloader ------------------------ */
  // The preloader element was removed from the markup; only run this if it
  // ever comes back. Guarding avoids leaving a stale `is-loading` class on
  // <body> (nothing else removes it once the element is gone).
  var preloader = $('#preloader');
  if (preloader) {
    var hidePreloader = function () {
      if (preloader.classList.contains('is-done')) return;
      preloader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      window.setTimeout(function () { preloader.remove(); }, 700);
    };
    document.body.classList.add('is-loading');
    window.setTimeout(hidePreloader, reduceMotion ? 0 : 700);
    window.addEventListener('load', hidePreloader);
    window.setTimeout(hidePreloader, 2200);
  }

  /* ----------------------------- Header -------------------------- */
  var header = $('#header');
  var lastY = window.scrollY;

  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('scrolled', y > 40);
      // hide on scroll down (only well past the hero), show on scroll up
      if (!document.body.classList.contains('menu-open')) {
        if (y > lastY && y > 600) header.classList.add('hide');
        else header.classList.remove('hide');
      }
    }
    lastY = y;
  }
  // rAF-throttled so the header's class toggles don't run synchronously on every
  // scroll event (that judders the scroll). The header is static/vestigial, so if
  // rAF is paused in an embedded preview and these don't fire, nothing breaks.
  window.addEventListener('scroll', rafThrottle(onScroll), { passive: true });

  /* -------------------------- Mobile menu ------------------------ */
  var burger = $('#burger');
  var menu = $('#menu');

  function setMenu(open) {
    if (!menu || !burger) return;
    document.body.classList.toggle('menu-open', open);
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) header && header.classList.remove('hide');
  }
  if (burger) {
    burger.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });
  }
  if (menu) {
    $$('.menu__link', menu).forEach(function (link, i) {
      link.style.setProperty('--i', i);
      link.addEventListener('click', function () { setMenu(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
  });

  /* ----------------------- Scroll reveal (robust) ---------------- */
  // Scroll-position based rather than IntersectionObserver: this can never
  // "strand" an element at opacity:0 after an anchor jump, fast scroll, or a
  // reload in the middle of the page. Anything at or above the fold is revealed.
  var reveals = $$('[data-reveal]');
  if (reduceMotion) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealPass = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      for (var i = 0; i < reveals.length; i++) {
        var el = reveals[i];
        if (el.classList.contains('is-in')) continue;
        if (el.getBoundingClientRect().top < vh * 0.9) el.classList.add('is-in');
      }
    };
    // rAF-throttled on scroll/resize so the layout reads happen at most once per
    // frame (keeps scrolling smooth). The setInterval poll below is the freeze
    // fallback: if rAF is paused in an embedded preview the poll still reveals
    // content, and content is visible by default regardless.
    var onReveal = rafThrottle(revealPass);
    window.addEventListener('scroll', onReveal, { passive: true });
    window.addEventListener('resize', onReveal, { passive: true });
    window.addEventListener('load', revealPass);
    revealPass(); // initial
    // Safety passes for late layout/font shifts
    setTimeout(revealPass, 200);
    setTimeout(revealPass, 700);
    setTimeout(revealPass, 1500);
    // Bulletproof fallback: poll positions in case scroll events / rAF are
    // throttled (e.g. embedded preview webviews). Self-clears when done.
    var revPoll = setInterval(function () {
      revealPass();
      if (!document.querySelector('[data-reveal]:not(.is-in)')) clearInterval(revPoll);
    }, 350);
    setTimeout(function () { clearInterval(revPoll); }, 20000);
  }

  /* --------------------- Active nav highlight -------------------- */
  var navLinks = $$('.nav__link');
  var sections = navLinks
    .map(function (l) { return document.getElementById(l.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          navLinks.forEach(function (l) {
            l.classList.toggle('active', l.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  /* ----------------------- Parallax (REMOVED) ------------------- */
  // The continuous image-drift parallax was removed. It transforms large photos
  // on EVERY scroll frame — the per-frame GPU composite of big images is the one
  // thing that couldn't be made reliably smooth on all hardware (repeated
  // "лагает"). Gallery/about photos are now STATIC during scroll (zero per-frame
  // work) → guaranteed smooth. Premium feel is kept via the cheap one-shot
  // entrances + hover zoom + count-up. Re-add a light parallax only with small,
  // right-sized images.

  /* ------------------- Gallery mask-reveal (DISABLED) ----------- */
  // The clip-path "rise" reveal was removed — clip-path animating while a photo
  // is also parallaxing caused scroll judder ("плавности нет"). Gallery photos
  // now just parallax (smooth). The .gitem__media.is-masked-in CSS is left
  // unused/harmless. Re-enable only with lighter/right-sized images.

  /* ----------------------- Stat count-up ------------------------ */
  // Numbers tick up from 0 when the stat scrolls into view (e.g. "7+"). Generic:
  // animates the numeric part and keeps any prefix/suffix; non-numeric ("МО")
  // and zero ("0%") are left untouched. The safety timeout writes the final
  // value in case rAF is paused (embedded preview) so a number can't stick at 0.
  var stats = $$('.stat__num');
  if (!reduceMotion && stats.length && 'IntersectionObserver' in window) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; statObs.unobserve(el);
        var m = el.textContent.trim().match(/^(\D*)(\d+)(\D*)$/);
        if (!m) return;
        var prefix = m[1], target = parseInt(m[2], 10), suffix = m[3];
        if (!target) return;
        var dur = 1100, t0 = null, finalText = prefix + target + suffix;
        el.textContent = prefix + '0' + suffix;
        var step = function (ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          el.textContent = prefix + Math.round((1 - Math.pow(1 - p, 3)) * target) + suffix;
          if (p < 1) window.requestAnimationFrame(step); else el.textContent = finalText;
        };
        window.requestAnimationFrame(step);
        window.setTimeout(function () { el.textContent = finalText; }, dur + 400);
      });
    }, { threshold: 0.6 });
    stats.forEach(function (s) { statObs.observe(s); });
  }

  /* --------------------------- Lead form ------------------------- */
  var form = $('#leadForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#name');
      var contact = form.querySelector('#contact-info');
      var ok = true;
      [name, contact].forEach(function (input) {
        if (!input.value.trim()) { ok = false; input.focus(); }
      });
      if (!ok) return;

      var btn = form.querySelector('button[type="submit"]');
      var success = $('#formSuccess');
      var label = btn && btn.querySelector('.btn__label');

      // Demo behaviour — no backend wired yet.
      if (label) label.textContent = 'Отправляем…';
      if (btn) btn.disabled = true;

      window.setTimeout(function () {
        if (success) { success.hidden = false; }
        form.querySelectorAll('.field').forEach(function (f) { f.style.display = 'none'; });
        if (btn) btn.style.display = 'none';
        var note = form.querySelector('.form__note');
        if (note) note.style.display = 'none';
      }, 700);
    });
  }

  /* --------------------------- Footer year ----------------------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --------------------------- Cookie bar ------------------------ */
  // Shown until accepted; the choice is stored in localStorage. Shown/hidden via
  // the [hidden] attribute (instant, no transition) so it's robust everywhere.
  var cookie = $('#cookie');
  if (cookie) {
    var COOKIE_KEY = 'tl-cookie-consent';
    var consented = null;
    try { consented = window.localStorage.getItem(COOKIE_KEY); } catch (e) {}
    if (!consented) cookie.hidden = false;
    var cookieBtn = $('#cookieAccept');
    if (cookieBtn) {
      cookieBtn.addEventListener('click', function () {
        try { window.localStorage.setItem(COOKIE_KEY, '1'); } catch (e) {}
        cookie.hidden = true;
      });
    }
  }

})();
