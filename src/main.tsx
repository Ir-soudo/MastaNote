import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import './firebase'; // initialise Firebase (app + analytics) une seule fois, au démarrage

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Relie le vrai système de mise à jour de vite-plugin-pwa à la bannière
// affichée dans App.tsx, via un événement navigateur standard.
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('mastanote-update-available', {
      detail: { activateUpdate: () => updateSW(true) }
    }));
  },
  onOfflineReady() {
    console.log('MastaNote AI+ est prête pour une utilisation hors-ligne.');
  }
});