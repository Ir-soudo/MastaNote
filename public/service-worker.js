// public/service-worker.js
//
// Service Worker de MastaNote AI+.
// Stratégie volontairement prudente pour une app de gestion de notes scolaires :
// - Les appels vers votre backend (scan IA, validation de licence) ne sont
//   JAMAIS mis en cache : ils doivent toujours atteindre le serveur.
// - Seuls les fichiers statiques de l'application (JS, CSS, images, manifest)
//   sont mis en cache pour un démarrage rapide et une tolérance aux coupures réseau.
// - Les requêtes de navigation (chargement de page) retombent sur la page
//   d'accueil mise en cache si le réseau est indisponible.

// Incrémentez ce numéro à chaque changement de logique du Service Worker
// pour forcer la mise à jour du cache chez les utilisateurs.
const CACHE_VERSION = 'mastanote-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Fichiers connus à mettre en cache dès l'installation.
// (Les fichiers JS/CSS générés par Vite ont des noms hashés variables :
// ils seront mis en cache automatiquement au fil de leur utilisation,
// via la stratégie "cache-first" définie plus bas dans fetch.)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // On ne force plus l'activation immédiate ici : la nouvelle version reste
  // "en attente" tant que l'utilisateur n'a pas confirmé le rechargement
  // (voir le message SKIP_WAITING ci-dessous), pour éviter de changer de
  // version sous les pieds de l'enseignant en pleine saisie.
});

// Permet au frontend de déclencher l'activation de la nouvelle version
// une fois que l'enseignant a cliqué sur "Recharger maintenant".
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name.startsWith('mastanote-') && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Règle de sécurité n°1 : on ne touche JAMAIS aux requêtes qui ne sont pas GET
  // (POST vers /api/scan, /api/validate-license, etc. doivent toujours
  // atteindre le réseau directement, sans passer par le Service Worker).
  if (request.method !== 'GET') {
    return;
  }

  // Règle de sécurité n°2 : on ne met jamais en cache les appels vers votre
  // backend Render (données dynamiques : notes scannées, statut de licence...).
  const isBackendCall = url.hostname.includes('onrender.com') && url.pathname.startsWith('/api/');
  if (isBackendCall) {
    return; // laisse la requête suivre son cours normal, sans interception
  }

  // Requêtes de navigation (chargement/rechargement de page) :
  // réseau en priorité, repli sur la page d'accueil en cache si hors-ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Tout le reste (JS, CSS, images, polices, icônes) : cache d'abord,
  // puis réseau — et on met à jour le cache avec la réponse fraîche.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // On ne cache que les réponses valides et de même origine
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Pas de réseau et rien en cache pour cette ressource : on échoue proprement.
          return new Response('', { status: 408, statusText: 'Hors ligne' });
        });
    })
  );
});