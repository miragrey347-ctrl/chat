const CACHE_NAME = "chat-v7"; // bump when chrome/theme bootstrap changes

// Install: cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/chat", "/login"]);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches (this purges every v1 relic on activation)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip API and streaming requests
  if (request.url.includes("/api/") || request.method !== "GET") return;

  // Navigation: network first, cache fallback (offline)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-cache" })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: stale-while-revalidate. Chunk filenames here are NOT
  // content-hashed (same URL can carry new bytes after a deploy), so
  // cache-first pinned ancient CSS/JS forever — the "theme stuck on an
  // older color" bug. Serve cached instantly, but always refresh in the
  // background with cache:"no-cache" to punch through the HTTP cache too.
  if (request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
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
