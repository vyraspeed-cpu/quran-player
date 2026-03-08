const CACHE_NAME = 'quran-audio-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

const downloading = {};

function bgDownload(url) {
  const key = url.split('?')[0];
  if (downloading[key]) return;
  downloading[key] = true;

  caches.open(CACHE_NAME).then((cache) => {
    cache.match(key).then((existing) => {
      if (existing) {
        delete downloading[key];
        return;
      }
      fetch(url, { mode: 'cors' }).then((resp) => {
        if (resp.ok) {
          cache.put(key, resp);
          notifyClients({ type: 'CACHED', url: key });
        }
        delete downloading[key];
      }).catch(() => {
        delete downloading[key];
      });
    });
  });
}

function notifyClients(msg) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((c) => c.postMessage(msg));
  });
}

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (!url.endsWith('.mp3')) {
    return;
  }

  const cacheKey = url.split('?')[0];

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(cacheKey).then((cached) => {
        if (cached) {
          return cached;
        }

        bgDownload(url);

        return fetch(event.request);
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_AUDIO') {
    bgDownload(event.data.url);
  }

  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((keys) => {
        const cached = keys
          .map((req) => {
            const match = req.url.match(/(\d{3})\.mp3/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter(Boolean);
        event.source.postMessage({ type: 'CACHE_STATUS', cached });
      });
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.source.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});
