// landing.js — presentation-only enhancements for the marketing landing page.
// This file is additive: it never touches selectors owned by app.js,
// institution.js, perf.js or d1-sync.js, and every effect is guarded so it
// degrades gracefully (no JS, reduced motion, touch devices, older browsers).
(function () {
  'use strict';

  var body = document.body;
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // Mark the page as JS-ready so CSS can run the initial hero reveal.
  requestAnimationFrame(function () {
    body.classList.add('is-ready');
  });

  /* ---------------- Scroll reveal ---------------- */
  var revealNodes = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if (revealNodes.length) {
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
      revealNodes.forEach(function (node) { io.observe(node); });
    } else {
      revealNodes.forEach(function (node) { node.classList.add('is-visible'); });
    }
  }

  /* ---------------- Header scroll state + progress bar ---------------- */
  var header = document.querySelector('.lp-header');
  var progressBar = document.querySelector('.lp-progress');
  var ticking = false;

  function updateOnScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (header) {
      header.classList.toggle('is-scrolled', scrollTop > 12);
    }

    if (progressBar) {
      var doc = document.documentElement;
      var max = (doc.scrollHeight || 0) - (doc.clientHeight || 0);
      var pct = max > 0 ? Math.min(100, Math.max(0, (scrollTop / max) * 100)) : 0;
      progressBar.style.width = pct + '%';
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateOnScroll);
      ticking = true;
    }
  }, { passive: true });

  updateOnScroll();

  /* ---------------- Animated counters ---------------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-counter-to]'));
  if (counters.length) {
    var animateCounter = function (el) {
      var to = parseFloat(el.getAttribute('data-counter-to'));
      var suffix = el.getAttribute('data-counter-suffix') || '';
      if (isNaN(to)) return;

      if (prefersReducedMotion) {
        el.textContent = to + suffix;
        return;
      }

      var duration = 1200;
      var start = null;

      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(to * eased);
        el.textContent = current + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = to + suffix;
        }
      }

      requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
      var counterIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { counterIO.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---------------- Fine-pointer-only motion effects ---------------- */
  if (isFinePointer && !prefersReducedMotion) {

    // Cursor glow that follows the pointer within the hero.
    var glow = document.querySelector('.lp-cursor-glow');
    var hero = document.querySelector('.lp-hero');
    if (glow && hero) {
      hero.addEventListener('mouseenter', function () { glow.classList.add('is-active'); });
      hero.addEventListener('mouseleave', function () { glow.classList.remove('is-active'); });
      hero.addEventListener('mousemove', function (event) {
        glow.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px, 0)';
      });
    }

    // Subtle 3D tilt on the hero mockup panel.
    var mock = document.querySelector('.lp-mock');
    var visual = document.querySelector('.lp-hero-visual');
    if (mock && visual) {
      visual.addEventListener('mousemove', function (event) {
        var rect = visual.getBoundingClientRect();
        var relX = (event.clientX - rect.left) / rect.width - 0.5;
        var relY = (event.clientY - rect.top) / rect.height - 0.5;
        var rotY = relX * -14 - 10;
        var rotX = relY * 10 + 6;
        mock.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
      });
      visual.addEventListener('mouseleave', function () {
        mock.style.transform = 'rotateX(6deg) rotateY(-10deg)';
      });
    }

    // Magnetic pull + light-follow on primary buttons.
    var magneticButtons = Array.prototype.slice.call(document.querySelectorAll('.lp-btn'));
    magneticButtons.forEach(function (btn) {
      btn.addEventListener('mousemove', function (event) {
        var rect = btn.getBoundingClientRect();
        var relX = event.clientX - rect.left;
        var relY = event.clientY - rect.top;
        btn.style.setProperty('--mx', relX + 'px');
        btn.style.setProperty('--my', relY + 'px');
        var moveX = (relX / rect.width - 0.5) * 6;
        var moveY = (relY / rect.height - 0.5) * 6;
        btn.style.transform = 'translate(' + moveX + 'px,' + (moveY - 2) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });

    // Spotlight highlight on feature cards.
    var spotlightCards = Array.prototype.slice.call(document.querySelectorAll('.lp-feature-card'));
    spotlightCards.forEach(function (card) {
      card.addEventListener('mousemove', function (event) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
      });
    });
  }
})();
