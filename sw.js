/**
 * Service Worker for Pria 1% Journey
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'pria1percent-v1.0.0';
const STATIC_CACHE = 'pria1percent-static-v1.0.0';
const DYNAMIC_CACHE = 'pria1percent-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/onboarding.html',
  '/habits.html',
  '/finance.html',
  '/learning.html',
  '/mental.html',
  '/progress.html',
  '/settings.html',
  '/css/main.css',
  '/css/animations.css',
  '/js/main.js',
  '/js/storage-manager.js',
  '/js/gamification.js',
  '/js/prayer-times.js',
  '/js/weather.js',
  '/js/ai-integration.js',
  '/js/notifications.js',
  '/js/habit-engine.js',
  '/js/finance-core.js',
  '/js/learning-path.js',
  '/js/mental-tracker.js',
  '/js/utils.js',
  '/manifest.json',
  // External resources
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  'https://api.aladhan.com/',
  'https://api.open-meteo.com/',
  'https://nominatim.openstreetmap.org/',
  'https://openrouter.ai/api/'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.origin === location.origin) {
    // Same origin requests - use cache first strategy
    event.respondWith(cacheFirst(request));
  } else if (API_CACHE_PATTERNS.some(pattern => url.href.startsWith(pattern))) {
    // API requests - use network first strategy
    event.respondWith(networkFirst(request));
  } else {
    // Other external resources - network only
    event.respondWith(fetch(request));
  }
});

/**
 * Cache first strategy for static assets
 */
async function cacheFirst(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network and cache
    const networkResponse = await fetch(request);
    
    // Clone response before caching
    const responseClone = networkResponse.clone();
    
    // Cache the response
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, responseClone);
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    
    // Return offline fallback for HTML pages
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    // Return a basic response for other requests
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network first strategy for API requests
 */
async function networkFirst(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Clone response before caching
    const responseClone = networkResponse.clone();
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Network first strategy failed:', error);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Background sync for notifications and data
 */
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  } else if (event.tag === 'data-sync') {
    event.waitUntil(syncData());
  }
});

/**
 * Sync notifications
 */
async function syncNotifications() {
  try {
    // This would handle background notification scheduling
    // Implementation depends on the notification system
    console.log('Service Worker: Syncing notifications');
  } catch (error) {
    console.error('Service Worker: Error syncing notifications', error);
  }
}

/**
 * Sync data
 */
async function syncData() {
  try {
    // This would handle background data synchronization
    // Implementation depends on the app's data sync requirements
    console.log('Service Worker: Syncing data');
  } catch (error) {
    console.error('Service Worker: Error syncing data', error);
  }
}

/**
 * Push notification handling
 */
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: 'You have a new notification from Pria 1% Journey',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'Check it out',
        icon: '/assets/icons/action-1.png'
      },
      {
        action: 'close',
        title: 'Close notification',
        icon: '/assets/icons/action-2.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'Pria 1% Journey';
  }
  
  event.waitUntil(
    self.registration.showNotification('Pria 1% Journey', options)
  );
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Message handling from main thread
 */
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

/**
 * Periodic background sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync triggered', event.tag);
  
  if (event.tag === 'prayer-times-update') {
    event.waitUntil(updatePrayerTimes());
  } else if (event.tag === 'weather-update') {
    event.waitUntil(updateWeather());
  }
});

/**
 * Update prayer times in background
 */
async function updatePrayerTimes() {
  try {
    // This would call the prayer times API to get fresh data
    console.log('Service Worker: Updating prayer times');
    
    // Implementation would depend on the prayer times manager
    // For now, just log the action
  } catch (error) {
    console.error('Service Worker: Error updating prayer times', error);
  }
}

/**
 * Update weather in background
 */
async function updateWeather() {
  try {
    // This would call the weather API to get fresh data
    console.log('Service Worker: Updating weather');
    
    // Implementation would depend on the weather manager
    // For now, just log the action
  } catch (error) {
    console.error('Service Worker: Error updating weather', error);
  }
}

console.log('Service Worker: Loaded');