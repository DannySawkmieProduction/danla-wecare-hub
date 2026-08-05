const PRECACHE = [
  '/',
  '/index.html',
  '/admin-login.html',
  '/admin-dashboard.html',
  '/admin-departments.html',
  '/admin-subjects.html',
  '/admin-classes.html',
  '/admin-students.html',
  '/admin-faculty.html',
  '/admin-attendance.html',
  '/admin-exams.html',
  '/admin-marks.html',
  '/admin-assignments.html',
  '/admin-resources.html',
  '/admin-notices.html',
  '/student-assignments.html',
  '/admin-timetable.html',
  '/admin-reports.html',
  '/admin-institution.html',
  '/teacher-login.html',
  '/teacher-dashboard.html',
  '/student-login.html',
  '/student-dashboard.html',
  '/styles.css',
  '/js/app.js',
  '/js/admin-auth.js',
  '/js/admin-departments.js',
  '/js/admin-subjects.js',
  '/js/admin-classes.js',
  '/js/admin-students.js',
  '/js/admin-faculty.js',
  '/js/admin-attendance.js',
  '/js/admin-exams.js',
  '/js/admin-marks.js',
  '/js/admin-assignments.js',
  '/js/admin-resources.js',
  '/js/admin-notices.js',
  '/js/student-assignments.js',
  '/js/admin-timetable.js',
  '/js/admin-reports.js',
  '/js/admin-institution.js',
  '/js/institution.js',
  '/js/d1-sync.js',
  '/js/perf.js',
  '/js/upload.js',
  '/js/teacher-auth.js',
  '/js/student-auth.js',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

const RUNTIME = 'runtime-cache-v1';
const IMAGE_CACHE = 'images-cache-v1';
const PRECACHE_NAME = 'precache-v1';
const MAX_IMAGE_ENTRIES = 60;

async function trimCache(cacheName, maxItems){
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if(keys.length <= maxItems) return;
  for(let i=0;i<keys.length - maxItems;i++){
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames
        .filter(name => name !== PRECACHE_NAME && name !== RUNTIME && name !== IMAGE_CACHE)
        .map(name => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET
  if(req.method !== 'GET') return;

  // API calls: network-first with cache fallback
  if(url.pathname.startsWith('/api/')){
    event.respondWith((async ()=>{
      try{ const resp = await fetch(req); const cache = await caches.open(RUNTIME); cache.put(req, resp.clone()); return resp; }
      catch(e){ const cache = await caches.open(RUNTIME); const cached = await cache.match(req); return cached || new Response('Offline', { status: 503 }); }
    })());
    return;
  }

  // images: cache-first with trimming
  if(req.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)){
    event.respondWith((async ()=>{
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(req);
      if(cached) return cached;
      try{ const resp = await fetch(req); cache.put(req, resp.clone()); event.waitUntil(trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES)); return resp; }
      catch(e){ return cached || Response.error(); }
    })());
    return;
  }

  // navigation/app shell: cache-first then network update
  if(req.mode === 'navigate'){
    event.respondWith((async ()=>{
      const cache = await caches.open(PRECACHE_NAME);
      const cached = await cache.match('/index.html');
      try{ const resp = await fetch(req); cache.put(req, resp.clone()); return resp; }
      catch(e){ return cached || new Response('Offline', { status: 503 }); }
    })());
    return;
  }

  // default: try cache then network
  event.respondWith((async ()=>{
    const cache = await caches.open(PRECACHE_NAME);
    const cached = await cache.match(req);
    if(cached) return cached;
    try{ const resp = await fetch(req); return resp; }catch(e){ return cached || new Response('Offline', { status: 503 }); }
  })());
});
