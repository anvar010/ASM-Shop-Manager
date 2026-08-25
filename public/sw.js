/*
 * Bumping this name is what retires an old cache: the activate handler below
 * deletes every cache that is not the current one.
 */
const CACHE = "asm-shell-v5";

/*
 * Static assets only. Pages must not be precached: fetching them while signed
 * out follows the redirect to /login and stores that under the page's own key,
 * so the app would later serve a login screen from cache to a signed-in user.
 */
const PRECACHE = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/logo-mark.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // A single missing entry must not fail the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /*
   * Navigations are left entirely alone.
   *
   * A worker must never hand back a redirected response for a navigation —
   * browsers reject it outright. start_url is "/", which redirects to /login
   * whenever nobody is signed in, so answering that request here made the
   * installed app fail to load and retry in a loop: images re-fetched and
   * flickered, and each reload destroyed the focus before a keyboard could
   * open. A browser tab mostly navigates client-side and so escaped it.
   *
   * There is nothing to gain by intercepting anyway. These pages are behind a
   * login and must always come from the network, which is what the browser
   * does on its own.
   */
  if (request.mode === "navigate") return;

  /*
   * Only content-hashed build output may be served from cache without asking
   * the network: its URL changes whenever the file does, so a hit is always
   * the right file.
   *
   * Everything else goes straight to the network. That matters most for the
   * payloads behind in-app links: tapping a <Link> is not a "navigate"
   * request, it is an ordinary fetch of ?_rsc=..., so it would otherwise land
   * in the cache-first branch — pinning a page to whatever was returned the
   * first time, including a redirect to the login screen.
   */
  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    // Optimised images: the query string names the exact file and size, so a
    // hit is always right, and caching them stops the visible pop-in.
    url.pathname === "/_next/image" ||
    PRECACHE.includes(url.pathname);
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
