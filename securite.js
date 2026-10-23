// ==========================================================
// SÉCURITÉ DU SERVEUR MASTANOTE : identité des utilisateurs et limites d'usage
// À placer à la racine du dépôt, à côté de server.js. Fichier sans dépendance.
//
// Trois modes, choisis par la variable AUTH_MODE (modifiable sur Render sans toucher au code) :
//   off      : ne fait rien (retour arrière complet)
//   observe  : vérifie l'identité et compte les appels, mais ne refuse JAMAIS rien (mode de départ, sans risque)
//   enforce  : refuse les appels sans identité valide, et ceux qui dépassent les limites
// Toute valeur inconnue est traitée comme « observe ».
// ==========================================================

const HEURE = 3600 * 1000;
const JOUR = 24 * HEURE;
const ROUTES_GEMINI = ['/scan', '/assistant']; // fonctions qui consomment le quota partagé de Gemini

export const MODES = ['off', 'observe', 'enforce'];

export function normaliserMode(mode) {
  const m = String(mode ?? '').trim().toLowerCase();
  return MODES.includes(m) ? m : 'observe';
}

/** Lit le jeton dans l'en-tête « Authorization: Bearer <jeton> » ; null s'il est absent. */
export function extraireJeton(req) {
  const entete = req?.headers?.authorization;
  if (typeof entete !== 'string') return null;
  const trouve = entete.match(/^Bearer\s+(.+)$/i);
  return trouve ? trouve[1].trim() || null : null;
}

/**
 * Limiteur à fenêtre glissante, en mémoire. Limite connue : la mémoire est vidée quand le serveur redémarre
 * (ou s'endort sur l'hébergement gratuit) ; c'est une protection contre les abus, pas un compteur de facturation.
 */
export function creerLimiteur({ maintenant = () => Date.now() } = {}) {
  const appels = new Map();
  return {
    /** Compte l'appel s'il est autorisé. Renvoie { ok: true } ou { ok: false, reessayerDansS }. */
    essayer(cle, max, fenetreMs) {
      const t = maintenant();
      const recents = (appels.get(cle) ?? []).filter((x) => t - x < fenetreMs);
      if (recents.length >= max) {
        appels.set(cle, recents);
        return { ok: false, reessayerDansS: Math.max(1, Math.ceil((fenetreMs - (t - recents[0])) / 1000)) };
      }
      recents.push(t);
      appels.set(cle, recents);
      return { ok: true };
    },
    /** Libère la mémoire des clés qui n'ont plus d'appel récent. */
    purger(fenetreMs = JOUR) {
      const t = maintenant();
      for (const [cle, liste] of appels) {
        const recents = liste.filter((x) => t - x < fenetreMs);
        if (recents.length) appels.set(cle, recents);
        else appels.delete(cle);
      }
    },
    taille: () => appels.size
  };
}

/**
 * Limites par défaut (modifiables par variables d'environnement, sans toucher au code).
 * Ces chiffres sont des points de départ : la phase d'observation montrera l'usage réel.
 */
export function reglesParDefaut(env = {}) {
  const nombre = (v, defaut) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : defaut;
  };
  return {
    '/scan': { max: nombre(env.RATE_SCAN_PAR_JOUR, 40), fenetreMs: JOUR }, // une image analysée = un appel
    '/assistant': { max: nombre(env.RATE_ASSISTANT_PAR_JOUR, 60), fenetreMs: JOUR },
    '/validate-license': { max: nombre(env.RATE_LICENCE_PAR_HEURE, 20), fenetreMs: HEURE }
  };
}

/**
 * Fabrique le middleware Express. À monter sur « /api » : req.path est alors « /scan », « /assistant », etc.
 * @param {object} options
 *   mode               : 'off' | 'observe' | 'enforce'
 *   verifierJeton      : async (jeton|null) => { etat: 'absent'|'valide'|'invalide', uid?, emailVerifie?, raison? }
 *   regles             : { [route]: { max, fenetreMs } }
 *   globalMax          : plafond d'appels par jour pour tous les utilisateurs ensemble sur /scan et /assistant (0 = aucun)
 *   exigerEmailVerifie : en mode enforce, refuse les comptes dont l'e-mail n'est pas vérifié
 */
export function creerSecurite({
  mode,
  verifierJeton,
  limiteur = creerLimiteur(),
  regles = reglesParDefaut(),
  globalMax = 0,
  exigerEmailVerifie = false,
  journal = console.log
} = {}) {
  const modeActif = normaliserMode(mode);
  const compteurs = {};

  const compter = (route, cle) => {
    compteurs[route] = compteurs[route] ?? { absent: 0, valide: 0, invalide: 0, limite: 0, refuse: 0 };
    compteurs[route][cle] += 1;
  };

  const refuser = (res, route, statut, code, error, extra = {}) => {
    compter(route, 'refuse');
    return res.status(statut).json({ error, code, ...extra });
  };

  async function middleware(req, res, next) {
    if (modeActif === 'off' || req.method === 'OPTIONS') return next();
    const route = req.path;
    const regle = regles[route];
    if (!regle) return next();

    let auth;
    try {
      auth = await verifierJeton(extraireJeton(req));
    } catch (err) {
      journal(`[securite] mode=${modeActif} route=${route} verification-indisponible raison=${err?.code || err?.name || 'erreur'}`);
      if (modeActif === 'enforce') {
        return refuser(res, route, 503, 'AUTH_INDISPONIBLE', "Vérification d'identité momentanément indisponible. Réessayez dans un instant.");
      }
      return next();
    }

    compter(route, auth.etat);
    if (auth.etat !== 'valide') {
      // L'origine (adresse du site qui appelle) permet de repérer une autre application ou une ancienne version sans jeton
      journal(`[securite] mode=${modeActif} route=${route} jeton=${auth.etat}${auth.raison ? ` raison=${auth.raison}` : ''} origine=${req.headers?.origin || '-'}`);
    }

    const identifie = auth.etat === 'valide';
    if (modeActif === 'enforce') {
      if (!identifie) {
        return refuser(res, route, 401, 'AUTH_REQUIRED', 'Connexion requise. Reconnectez-vous à MastaNote AI+ puis réessayez.');
      }
      if (exigerEmailVerifie && !auth.emailVerifie) {
        return refuser(res, route, 401, 'EMAIL_NON_VERIFIE', 'Vérifiez votre adresse e-mail pour utiliser cette fonction.');
      }
    }

    // Limite par utilisateur (ou, sans identité, par adresse IP), puis plafond global sur les fonctions Gemini
    const cle = identifie ? `uid:${auth.uid}:${route}` : `anon:${req.ip}:${route}`;
    const essai = limiteur.essayer(cle, regle.max, regle.fenetreMs);
    let global = { ok: true };
    if (essai.ok && globalMax > 0 && ROUTES_GEMINI.includes(route)) {
      global = limiteur.essayer('global:gemini', globalMax, JOUR);
    }
    if (!essai.ok || !global.ok) {
      const attente = !essai.ok ? essai.reessayerDansS : global.reessayerDansS;
      compter(route, 'limite');
      journal(`[securite] mode=${modeActif} route=${route} limite-atteinte${!global.ok ? ' (globale)' : ''}`);
      if (modeActif === 'enforce') {
        res.set?.('Retry-After', String(attente));
        return refuser(res, route, 429, 'RATE_LIMIT', "Limite d'utilisation atteinte pour cette fonction. Réessayez plus tard.", {
          retryAfterSeconds: attente
        });
      }
    }

    if (identifie) req.auth = { uid: auth.uid, emailVerifie: auth.emailVerifie === true };
    return next();
  }

  return { middleware, mode: modeActif, limiteur, resume: () => JSON.parse(JSON.stringify(compteurs)) };
}