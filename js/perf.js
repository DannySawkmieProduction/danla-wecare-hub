// perf.js — lightweight lazy-loader and performance helpers
(function(window){
  // rIC polyfill
  window.requestIdleCallback = window.requestIdleCallback || function(cb){ return setTimeout(()=>cb({ didTimeout:false, timeRemaining: ()=> 50 }), 1); };
  window.cancelIdleCallback = window.cancelIdleCallback || function(id){ clearTimeout(id); };

  function loadScript(src, opts={ async:true, defer:true, integrity: null, crossorigin: null }){
    return new Promise((resolve,reject)=>{
      const s = document.createElement('script'); s.src = src; s.async = !!opts.async; s.defer = !!opts.defer;
      if(opts.integrity) s.integrity = opts.integrity;
      if(opts.crossorigin) s.crossOrigin = opts.crossorigin;
      s.onload = ()=> resolve(s); s.onerror = ()=> reject(new Error('Failed to load '+src)); document.head.appendChild(s);
    });
  }

  function lazyLoadDataScripts(){
    const nodes = Array.from(document.querySelectorAll('script[data-lazy]'));
    if(!nodes.length) return;
    requestIdleCallback(()=>{
      nodes.forEach(n=>{
        const src = n.getAttribute('data-src') || n.src;
        if(!src) return;
        loadScript(src, { async:true, defer:true }).catch(()=>{});
      });
    });
  }

  // reduce layout thrashing helper
  function batchDOM(reads = [], writes = []){
    reads.forEach(r=>r());
    requestAnimationFrame(()=>{ writes.forEach(w=>w()); });
  }

  // simple image lazy loader attribute observer
  function lazyImages(){
    if('IntersectionObserver' in window){
      const io = new IntersectionObserver((entries, obs)=>{
        entries.forEach(e=>{
          if(e.isIntersecting){ const img = e.target; const src = img.getAttribute('data-src'); if(src){ img.src = src; img.removeAttribute('data-src'); } obs.unobserve(img); }
        });
      }, { rootMargin: '200px' });
      document.querySelectorAll('img[data-src]').forEach(img=> io.observe(img));
    } else {
      // fallback: load all after idle
      requestIdleCallback(()=>{ document.querySelectorAll('img[data-src]').forEach(img=>{ img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); }); });
    }
  }

  // expose API
  window.__perf = { loadScript, lazyLoadDataScripts, lazyImages, batchDOM };

  // auto-run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', ()=>{ window.__perf.lazyLoadDataScripts(); window.__perf.lazyImages(); });

})(self);
