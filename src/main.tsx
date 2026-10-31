import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Page privée des abonnés : chargée à la demande, uniquement à l'adresse « /?admin=1 ».
// La protection est faite par le serveur (identité Firebase vérifiée + liste ADMIN_UIDS), pas par cette adresse.
const AdminPage = lazy(() => import('./AdminPage.tsx'));
const estPageAdmin = new URLSearchParams(window.location.search).get('admin') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {estPageAdmin ? (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    ) : (
      <App />
    )}
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