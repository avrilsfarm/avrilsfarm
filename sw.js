const CACHE = 'avril-farm-v3';
const ASSETS = [
  './', './index.html', './css/style.css', './js/db.js', './js/app.js',
  './manifest.json', './icons/logo.png', './icons/soap-icon.png',
  './icons/logo-full.png', './icons/symbol.png',
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const net = fetch(e.request).then(res=>{
        if(res && res.status===200){
          const c = res.clone();
          caches.open(CACHE).then(cache=>cache.put(e.request, c));
        }
        return res;
      }).catch(()=>{});
      return cached || net;
    })
  );
});
