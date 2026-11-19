
const CACHE_NAME = "caramell-v1";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest"
];

// Instala e guarda os arquivos principais
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ARQUIVOS);
    })
  );

  self.skipWaiting();
});

// Remove versões antigas do cache
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(chaves => {
      return Promise.all(
        chaves
          .filter(chave => chave !== CACHE_NAME)
          .map(chave => caches.delete(chave))
      );
    })
  );

  self.clients.claim();
});

// Tenta buscar na internet e usa o cache como alternativa
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(resposta => {
        if (resposta && resposta.ok) {
          const copia = resposta.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copia);
          });
        }

        return resposta;
      })
      .catch(() => {
        return caches.match(event.request).then(resposta => {
          return resposta || caches.match("./index.html");
        });
      })
  );
});
