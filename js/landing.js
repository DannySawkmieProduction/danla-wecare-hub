// js/landing.js
// Decorative-only enhancements for the marketing landing page (index.html).
// Scroll reveal, subtle hero mouse-parallax, and button ripple feedback.
//
// This file is intentionally separate from js/app.js: app.js owns the PWA
// install-prompt and service-worker registration logic and is left
// completely untouched. Nothing here calls preventDefault() or
// stopPropagation(), so every existing click handler, link, and the
// install button keep working exactly as before.
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  // ---- Subtle mouse parallax on the hero visual panel ----
  if (!reduceMotion) {
    var hero = document.querySelector('.hero');
    var heroVisual = document.querySelector('.hero-visual');
    if (hero && heroVisual) {
      hero.addEventListener('mousemove', function (event) {
        var rect = hero.getBoundingClientRect();
        var relX = (event.clientX - rect.left) / rect.width - 0.5;
        var relY = (event.clientY - rect.top) / rect.height - 0.5;
        heroVisual.style.transform =
          'rotateX(' + (-relY * 4).toFixed(2) + 'deg) rotateY(' + (relX * 4).toFixed(2) + 'deg)';
      });
      hero.addEventListener('mouseleave', function () {
        heroVisual.style.transform = '';
      });
    }
  }

  // ---- Button ripple feedback ----
  if (!reduceMotion) {
    document.querySelectorAll('.button').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function () { ripple.remove(); });
      });
    });
  }
})();
