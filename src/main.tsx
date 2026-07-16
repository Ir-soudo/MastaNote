import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// --- ENREGISTREMENT DU SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((registration) => {
      // Vérifie si une nouvelle version du Service Worker vient d'être installée
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // "installed" + un controller déjà actif = ce n'est pas la toute
          // première installation, c'est une VRAIE mise à jour disponible.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('mastanote-update-available', {
              detail: {
                activateUpdate: () => newWorker.postMessage('SKIP_WAITING')
              }
            }));
          }
        });
      });
    }).catch((err) => {
      console.error("Échec de l'enregistrement du Service Worker :", err);
    });

    // Une fois la nouvelle version activée, on recharge automatiquement
    // la page pour que l'enseignant voie immédiatement les changements.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}