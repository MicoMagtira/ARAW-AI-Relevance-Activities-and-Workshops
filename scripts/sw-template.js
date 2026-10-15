// ARAW service worker. The two placeholders below are filled in by the build (see scripts/pwa-plugin.ts).
// App shell, every JS/CSS chunk, fonts and icons are cached on install, so the app works offline after the first visit.
const CACHE = 'araw-__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((path) => new URL(path, self.registration.scope).href)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('araw-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // network first so a new version shows up; the cached shell answers when offline
    event.respondWith(fetch(request).catch(() => caches.match(SHELL, { ignoreVary: true }).then((hit) => hit ?? Response.error())));
    return;
  }
  event.respondWith(
    // ignoreVary: static hosts may send `Vary: Origin`, which would make module-script requests miss the precached copy
    caches.match(request, { ignoreVary: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
