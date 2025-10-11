/* ==========================================================================
   animations.js  —  Portfolio motion system (intro + scroll reveal)
   Works with plain HTML + Tailwind CDN. No extra CSS required.
   Usage:
     - Add data-intro to hero elements to animate on page load (staggered)
       <h1 data-intro data-intro-order="1">...</h1>
       <p data-intro data-intro-order="2">...</p>
       <a data-intro data-intro-order="3">...</a>

     - Add data-reveal to any element to reveal on scroll
       <div data-reveal data-reveal-from="up" data-reveal-delay="120"></div>

   Optional data-* attributes:
     data-reveal-from="up|down|left|right|fade" (default: up)
     data-reveal-delay="milliseconds" (default: 0)
     data-reveal-threshold="0..1" (default: 0.15)
     data-reveal-once="true|false" (default: true)
     data-intro-delay="milliseconds" (default: staggered)
     data-intro-from="up|down|left|right|fade" (default: up)
   ========================================================================== */

(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Helpers -------------------------------------------------------------

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  function setInitialState(el, from = 'up') {
    el.style.opacity = '0';
    el.style.willChange = 'opacity, transform';
    el.style.transform = translateFrom(from, 10); // 10px offset
  }

  function translateFrom(from, px) {
    switch ((from || 'up').toLowerCase()) {
      case 'down': return `translateY(-${px}px)`;
      case 'left': return `translateX(${px}px)`;
      case 'right': return `translateX(-${px}px)`;
      case 'fade': return 'translateZ(0)';
      case 'up':
      default: return `translateY(${px}px)`;
    }
  }

  function animateIn(el, { delay = 0, duration = 800, easing = 'cubic-bezier(0.19, 1, 0.22, 1)' } = {}) {
    // Use rAF to avoid layout thrash on first frame
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ${easing} ${delay}ms, transform ${duration}ms ${easing} ${delay}ms`;
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }

  function clearTransition(el) {
    // Allow hover effects to feel snappy after animation is done
    setTimeout(() => {
      el.style.willChange = '';
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '';
    }, 1100); // slightly longer than the extended duration + delay
  }

  // ---- Reduced motion fallback --------------------------------------------

  function showImmediately(nodes) {
    nodes.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.transition = '';
      el.style.willChange = '';
    });
  }

  // ---- Intro animation (on load, staggered) --------------------------------

  function runIntro() {
    const nodes = Array.from(document.querySelectorAll('[data-intro]'));
    if (!nodes.length) return;

    if (prefersReduced) {
      showImmediately(nodes);
      return;
    }

    // Sort by optional data-intro-order, fallback to DOM order
    nodes.sort((a, b) => {
      const ao = Number(a.getAttribute('data-intro-order') || 0);
      const bo = Number(b.getAttribute('data-intro-order') || 0);
      return ao - bo;
    });

    const baseDuration = 900;
    const baseStagger = 220;

    nodes.forEach((el, i) => {
      const from = el.getAttribute('data-intro-from') || 'up';
      const delayAttr = el.getAttribute('data-intro-delay');
      const delay = delayAttr !== null ? Number(delayAttr) : i * baseStagger;

      setInitialState(el, from);

      // small timeout ensures styles are applied before transition kicks in
      setTimeout(() => {
        animateIn(el, { delay, duration: baseDuration });
        clearTransition(el);
      }, 20);
    });
  }

  // ---- Scroll reveal (IntersectionObserver) --------------------------------

  function setupReveals() {
    const targets = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!targets.length) return;

    if (prefersReduced) {
      showImmediately(targets);
      return;
    }

    // Prepare initial state
    targets.forEach(el => {
      const from = el.getAttribute('data-reveal-from') || 'up';
      setInitialState(el, from);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        if (!entry.isIntersecting) return;

        const delay = Number(el.getAttribute('data-reveal-delay') || 0);
        const onceAttr = el.getAttribute('data-reveal-once');
        const once = onceAttr === null ? true : onceAttr === 'true';

        animateIn(el, { delay, duration: 800 });
        clearTransition(el);

        if (once) observer.unobserve(el);
      });
    }, {
      root: null,
      rootMargin: '0px 0px -10% 0px', // start a bit before fully in view
      threshold: getDynamicThreshold(targets)
    });

    targets.forEach(el => observer.observe(el));
  }

  function getDynamicThreshold(nodes) {
    // If many reveal elements exist, use a smaller threshold to keep things snappy
    const n = nodes.length;
    if (n > 40) return 0.05;
    if (n > 20) return 0.1;
    return 0.15;
  }

  // ---- Init -----------------------------------------------------------------

  // Avoid running before DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Give the browser a tick to layout, then run intro
    requestAnimationFrame(() => {
      runIntro();
      setupReveals();
    });
  });

  // If user toggles reduced motion while page is open
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener?.('change', () => {
      const all = document.querySelectorAll('[data-intro],[data-reveal]');
      showImmediately(all);
    });
  } catch (_) {}
})();
