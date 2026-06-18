// CourtTrack Service Worker — Offline Mode
// Caches admin.html and Firebase SDKs so game night works without WiFi

const CACHE = 'courttrack-v1';

const PRECACHE = [
  '/admin.html',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap'
];

// Install: cache all critical assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // Cache what we can — failures are non-fatal
      return Promise.allSettled(
        PRECACHE.map(function(url) {
          return cache.add(url).catch(function() {
            console.log('[SW] Could not cache:', url);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache when offline, network first when online
self.addEventListener('fetch', function(e) {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // For Firebase API calls (realtime database) — always try network,
  // don't intercept so Firebase's own offline handling takes over
  if (e.request.url.includes('firebaseio.com') ||
      e.request.url.includes('firebase.googleapis.com') ||
      e.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  e.respondWith(
    // Try network first
    fetch(e.request).then(function(response) {
      // Cache successful responses for future offline use
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Network failed — serve from cache
      return caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        // If admin.html isn't cached for some reason, return a minimal offline page
        if (e.request.url.includes('admin.html')) {
          return new Response(
            '<html><body style="background:#0d0d0d;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">' +
            '<div><div style="font-size:32px;font-weight:900;margin-bottom:12px;">COURT<span style="color:#FF5C00">TRACK</span></div>' +
            '<p style="color:#888;">Loading from cache failed.<br>Please reload when connected.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      });
    })
  );
});
