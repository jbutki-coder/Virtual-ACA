const CACHE='virtual-aca-v1';
const SHELL=['/','/index.html','/styles.css','/app.js','/time.js','/icon.svg','/manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('virtual-aca-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!SHELL.includes(u.pathname))return;
 // Static CDN responses are fast; prefer current code and use saved files only offline.
 e.respondWith(fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(CACHE);await c.put(e.request,r.clone());}return r;}).catch(()=>caches.match(e.request)));
});
