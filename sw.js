// ============================================================
// SERVICE WORKER
// A small helper the browser runs in the background. It keeps a
// copy of the app's files on the phone, so the app opens even
// with no internet.
//
// How it gets files ("network first"):
//   1. Try the internet, to always get the newest version.
//   2. No answer within 3 seconds, or offline → use the saved copy.
// So updates arrive by themselves, and offline still works.
//
// Your notes are NOT here – they live in the database (db.js).
// This file only handles the app itself.
// ============================================================

const CACHE = 'notes-app';
const WAIT_FOR_NETWORK_MS = 3000;

// The files that make up the app.
// When a new file is added to the app, add it here too.
const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'db.js',
  'quickadd.js',
  'sections.js',
  'calendar.js',
  'groups.js',
  'search.js',
  'drive.js',
  'backup.js',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

// First run: save all the app files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_FILES.map(file => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting())  // start working right away
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());  // take care of open pages too
});

// Every time the app asks for a file
self.addEventListener('fetch', event => {
  const request = event.request;
  // Only our own files (not other websites), and only "get" requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);

  // Ask the internet, but don't wait forever
  const fromNetwork = fetch(request, { cache: 'no-cache' }).then(response => {
    if (response.ok) cache.put(request, response.clone());  // keep the fresh copy
    return response;
  });
  fromNetwork.catch(() => {});  // if we stop waiting for it, a late failure is fine
  const timeout = new Promise(resolve => setTimeout(resolve, WAIT_FOR_NETWORK_MS, null));

  try {
    const response = await Promise.race([fromNetwork, timeout]);
    if (response) return response;
  } catch {
    // Offline – fall through to the saved copy
  }

  // ignoreSearch: "app.js?x=1" can use the saved "app.js"
  const saved = await cache.match(request, { ignoreSearch: true });
  if (saved) return saved;

  // Not saved and the internet is slow: keep waiting for it after all
  return fromNetwork;
}
