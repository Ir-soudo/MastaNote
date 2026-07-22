import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

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

// Firebase sera initialisé ici une fois la configuration confirmée.