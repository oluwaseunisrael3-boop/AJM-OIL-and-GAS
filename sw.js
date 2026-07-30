const CACHE_NAME = 'ajm-monitor-v1';
const ASSETS = ['./index.html', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  // Network first for Supabase API calls, cache-first for static assets
  if(e.request.url.includes('supabase.co')){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached=>cached || fetch(e.request))
  );
});
