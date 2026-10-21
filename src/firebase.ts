import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Variables indispensables à l'identification (les autres sont facultatives).
const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const ENV_NAMES: Record<string, string> = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID'
};

export const missingFirebaseConfig: string[] = REQUIRED_KEYS
  .filter((k) => !firebaseConfig[k])
  .map((k) => ENV_NAMES[k]);
export const firebaseConfigOk = missingFirebaseConfig.length === 0;

export const firebaseApp = initializeApp(firebaseConfig);

// Analytics ne doit jamais empêcher l'application de démarrer (hors navigateur, ou configuration incomplète).
export const analytics = (() => {
  if (typeof window === 'undefined' || !firebaseConfigOk) return null;
  try {
    return getAnalytics(firebaseApp);
  } catch (err) {
    console.error('Analytics indisponible :', err);
    return null;
  }
})();

// Authentification (comptes enseignants). Les e-mails envoyés par Firebase sont en français.
// Sans configuration, AuthGate affiche un message clair avant tout usage de "auth".
export const auth: Auth = firebaseConfigOk ? getAuth(firebaseApp) : (null as unknown as Auth);
if (firebaseConfigOk) auth.languageCode = 'fr';

// En-têtes pour appeler notre serveur, avec l'identité de l'utilisateur connecté.
// Si le jeton est indisponible, la requête part sans identité : le serveur actuel ne l'exige pas encore.
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (err) {
    console.error("Jeton d'identité indisponible :", err);
  }
  return headers;
}