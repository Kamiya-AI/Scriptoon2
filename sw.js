const CACHE_NAME = 'scriptoon2-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './prompts.js',
  './manifest.json',
  './icon_512.png',
  './template_3view.png'
];

// インストール時にキャッシュ
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// フェッチ時にキャッシュを返す（ネットワーク優先、オフライン時はキャッシュ）
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});

// アクティブ時に古いキャッシュを削除（今回はシンプルにするため省略、必要なら追加）
