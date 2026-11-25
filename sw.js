const CACHE_NAME='grunnstaerdfraedi-unified-v6-equality-20261125';
const ASSETS=['./','./index.html','./app.js?v=4.4','./styles.css?v=4.4','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const keys=await caches.keys();
 // CacheStorage is shared by all of this user's GitHub Pages apps.
 await Promise.all(keys.filter(key=>key!==CACHE_NAME&&(key==='grunnstaerdfraedi-v3-cache'||key.startsWith('grunnstaerdfraedi-unified-'))).map(key=>caches.delete(key)));
 await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{
   const response=await fetch(event.request);
   if(response.ok&&response.type!=='opaque')await cache.put(event.request,response.clone());
   return response;
  }catch(error){
   const cached=await cache.match(event.request);
   if(cached)return cached;
   if(event.request.mode==='navigate')return await cache.match('./index.html');
   return Response.error();
  }
 })());
});
