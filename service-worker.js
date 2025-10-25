const CACHE='fw-beach-v1';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png',
'./bird_stage1_3D.png','./bird_stage2_3D.png','./bird_stage3_3D.png','./bird_stage4_3D.png','./bird_stage5_3D.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k.startsWith('fw-beach-')&&k!==CACHE?caches.delete(k):null))))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))})