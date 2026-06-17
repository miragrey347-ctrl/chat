const CACHE_NAME = "chat-v9"; // bump when navigation/theme bootstrap changes

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.url.includes("/api/")) return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Never serve cached Next.js runtime chunks. Stale chunks can leave
  // client-side navigation visually stuck until a full refresh on iOS Safari.
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // Cache only inert media/font assets.
  if (url.pathname.match(/\.(png|jpe?g|svg|webp|gif|woff2?)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const refresh = fetch(request, { cache: "no-cache" })
          .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
  }
});
