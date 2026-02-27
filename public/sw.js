// Service Worker for OrthoIQ PWA
const CACHE_NAME = 'orthoiq-v3';
const STATIC_ASSETS = [
  '/',
  '/miniapp',
  '/manifest.json',
  '/icon.png',
  '/og-image.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('OrthoIQ Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('OrthoIQ Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('OrthoIQ Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('OrthoIQ Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('OrthoIQ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('OrthoIQ Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip HEAD requests as they're not supported by cache.put()
  if (event.request.method === 'HEAD') {
    return;
  }

  // Handle API requests differently - always try network first
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch((error) => {
        // Only show offline message for true network failures
        // TypeError with 'Failed to fetch' indicates network is unavailable
        if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
          console.log('OrthoIQ Service Worker: True network failure detected for API request');
          return new Response(JSON.stringify({
            error: 'You appear to be offline. Please check your connection and try again.',
            offline: true
          }), {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
            }
          });
        }
        // For other errors (timeouts, server errors), let them pass through
        // Don't mark as "offline" since network is working
        console.log('OrthoIQ Service Worker: API error (not offline):', error.message);
        return new Response(JSON.stringify({
          error: 'Service temporarily unavailable. Please try again.',
          offline: false
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          }
        });
      })
    );
    return;
  }

  // Don't intercept Next.js JS/CSS chunks — let browser HTTP cache handle them natively
  if (event.request.url.includes('/_next/')) {
    return;
  }

  // For HTML navigation requests (pages), use network-first strategy
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'document' ||
      (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))) {
    
    console.log('OrthoIQ Service Worker: Using network-first for HTML:', event.request.url);
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response (only GET requests)
          if (response && response.status === 200 && response.type === 'basic' && event.request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          console.log('OrthoIQ Service Worker: HTML served fresh from network:', event.request.url);
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          console.log('OrthoIQ Service Worker: Network failed, trying cache for:', event.request.url);
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('OrthoIQ Service Worker: Serving HTML from cache (offline):', event.request.url);
                return cachedResponse;
              }
              return new Response('Offline - OrthoIQ requires an internet connection');
            });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images), use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('OrthoIQ Service Worker: Serving static asset from cache:', event.request.url);
          return response;
        }
        
        // Otherwise fetch from network
        console.log('OrthoIQ Service Worker: Fetching static asset from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses or non-GET requests
          if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail for static assets
        console.log('OrthoIQ Service Worker: Failed to load static asset:', event.request.url);
        return new Response('Asset not available', { status: 404 });
      })
  );
});

// Handle background sync for offline question submission
self.addEventListener('sync', (event) => {
  console.log('OrthoIQ Service Worker: Background sync triggered');
  if (event.tag === 'orthoiq-question-sync') {
    event.waitUntil(syncQuestions());
  }
});

async function syncQuestions() {
  // This would handle offline question submission
  // For now, just log that sync was attempted
  console.log('OrthoIQ Service Worker: Syncing offline questions...');
}

// Handle push notifications (if needed later)
self.addEventListener('push', (event) => {
  console.log('OrthoIQ Service Worker: Push message received');
  
  const options = {
    body: 'Your OrthoIQ response is ready!',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'orthoiq-notification',
    data: {
      url: '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('OrthoIQ', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('OrthoIQ Service Worker: Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});