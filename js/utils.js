// utils.js — small helpers for performance and accessibility
export function debounce(fn, wait=100){ let t; return function(...args){ clearTimeout(t); t = setTimeout(()=> fn.apply(this,args), wait); }; }
export function throttle(fn, limit=100){ let lastCall = 0; return function(...args){ const now = Date.now(); if(now - lastCall >= limit){ lastCall = now; fn.apply(this,args); } }; }

export function isVisible(el){ if(!el) return false; const rect = el.getBoundingClientRect(); return rect.width>0 && rect.height>0; }

// simple ARIA helper: toggles aria-expanded and focus management
export function toggleAria(el, expanded){ if(!el) return; el.setAttribute('aria-expanded', expanded? 'true':'false'); }
