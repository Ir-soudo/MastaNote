// ==========================================================
// VÉRIFICATION DU JETON D'IDENTITÉ FIREBASE
// À placer à la racine du dépôt, à côté de server.js. Nécessite la bibliothèque « jose » (npm install jose).
//
// Aucun secret n'est nécessaire : un jeton Firebase est signé par Google, et ses clés de vérification sont
// publiques. On contrôle la signature, la date d'expiration, l'émetteur et le projet visé (audience).
// Seule la variable FIREBASE_PROJECT_ID (l'identifiant public du projet) est requise.
// ==========================================================
import { createRemoteJWKSet, jwtVerify } from 'jose';

const URL_CLES_FIREBASE = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * @param {{ projectId: string, cles?: Function }} options  cles : trousseau de clés (pour les tests)
 * @returns {(jeton: string|null) => Promise<{ etat: 'absent'|'valide'|'invalide', uid?: string, emailVerifie?: boolean, raison?: string }>}
 *   Lève une erreur seulement si Google est injoignable : le middleware la traite comme « vérification indisponible ».
 */
export function creerVerificateurJeton({ projectId, cles } = {}) {
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID manquant : impossible de vérifier les jetons.');
  const trousseau = cles ?? createRemoteJWKSet(new URL(URL_CLES_FIREBASE));

  return async function verifierJeton(jeton) {
    if (!jeton) return { etat: 'absent' };
    try {
      const { payload } = await jwtVerify(jeton, trousseau, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
        algorithms: ['RS256']
      });
      if (typeof payload.sub !== 'string' || !payload.sub) return { etat: 'invalide', raison: 'sans-sujet' };
      return { etat: 'valide', uid: payload.sub, emailVerifie: payload.email_verified === true };
    } catch (err) {
      // Les clés de Google sont injoignables : ce n'est pas la faute de l'utilisateur
      if (err?.code === 'ERR_JWKS_TIMEOUT' || (err?.code === 'ERR_JOSE_GENERIC' && /JSON Web Key Set/i.test(err?.message ?? ''))) {
        throw err;
      }
      return { etat: 'invalide', raison: err?.code || err?.name || 'erreur' };
    }
  };
}