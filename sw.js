const CACHE_NAME = 'toeic-master-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore-compat.js'
];

// 설치 및 리소스 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

// 구버전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

// 네트워크 요청 가로채기 (Firebase 인증/DB API는 캐시 제외)
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;

  if (
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('identitytoolkit') ||
    event.request.url.includes('firestore')
  ) {
    return;
  }

  // HTML 페이지는 항상 최신 버전을 먼저 확인
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put('./index.html', responseClone);
          });

          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 나머지 파일은 기존 캐시 우선 방식
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
