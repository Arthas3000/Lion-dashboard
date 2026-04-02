const CACHE_NAME = 'lion-painel-v1';

// Arquivos locais que devem ser armazenados em cache imediatamente
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Instalando o Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Ativando e limpando caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptando requisições (Estratégia: Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // EXCEÇÕES: Não fazer cache de APIs de rotas, buscas ou tiles do mapa
  if (
    requestUrl.hostname.includes('api.openrouteservice.org') || 
    requestUrl.hostname.includes('photon.komoot.io') || 
    requestUrl.hostname.includes('cartocdn.com')
  ) {
    return; // Deixa o navegador fazer a requisição normal pela internet
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Se a requisição for válida, salva uma cópia no cache para uso offline futuro
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' || networkResponse.type === 'cors') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Se a internet cair, retorna a versão em cache
        return cachedResponse;
      });

      // Retorna o cache imediatamente se existir, caso contrário, espera a rede
      return cachedResponse || fetchPromise;
    })
  );
});