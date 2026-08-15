const CACHE_NAME = "pyos-web-v21";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/storage.js",
  "./js/apps.js",
  "./js/desktop.js",
  "./js/touch.js",
  "./js/console.js",
  "./js/os.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];

function cacheAppShell(cache) {
  return Promise.all(
    APP_SHELL.map(function (url) {
      return fetch(new Request(url, { cache: "reload" }))
        .then(function (response) {
          if (!response || !response.ok) {
            throw new Error("Recurso no disponible: " + url);
          }
          return cache.put(url, response);
        })
        .catch(function (error) {
          // No se bloquea la instalación completa si un recurso secundario falla.
          console.warn("PyOS no pudo guardar un recurso en caché.", error);
          return null;
        });
    })
  );
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cacheAppShell(cache);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE_NAME;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function cacheNetworkResponse(request, response) {
  if (!response || response.status !== 200) return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(function (cache) {
    cache.put(request, copy);
  });
  return response;
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  // Para navegación, se privilegia la versión publicada más reciente. Sin red,
  // se recupera explícitamente la página de inicio del caché de la aplicación.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          return cacheNetworkResponse(event.request, response);
        })
        .catch(function () {
          return caches.match("./index.html").then(function (cached) {
            return cached || caches.match("./");
          });
        })
    );
    return;
  }

  // Los recursos estáticos se sirven de caché primero y se actualizan en segundo plano.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      const network = fetch(event.request)
        .then(function (response) {
          return cacheNetworkResponse(event.request, response);
        })
        .catch(function () {
          return cached;
        });
      return cached || network;
    })
  );
});
