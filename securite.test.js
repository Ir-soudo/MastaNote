// ==========================================================
// TESTS DU MIDDLEWARE DE SÉCURITÉ — sans rien installer :
//     node securite.test.js
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { creerLimiteur, creerSecurite, extraireJeton, normaliserMode, reglesParDefaut } from './securite.js';

// --- Outils de test : fausses requêtes et réponses ---
const fausseReponse = () => ({
  code: 200,
  body: null,
  headers: {},
  status(c) {
    this.code = c;
    return this;
  },
  json(b) {
    this.body = b;
    return this;
  },
  set(k, v) {
    this.headers[k] = v;
    return this;
  }
});

const requete = (route = '/scan', jeton = null, extra = {}) => ({
  method: 'POST',
  path: route,
  headers: jeton ? { authorization: `Bearer ${jeton}` } : {},
  ip: '1.2.3.4',
  ...extra
});

const lancer = async (securite, req) => {
  const res = fausseReponse();
  let suivant = false;
  await securite.middleware(req, res, () => {
    suivant = true;
  });
  return { res, suivant };
};

// Vérificateur de test : le jeton « u1 » désigne l'utilisateur u1 ; « mauvais » est invalide ; vide = absent
const verifierTest = async (jeton) => {
  if (!jeton) return { etat: 'absent' };
  if (jeton === 'mauvais') return { etat: 'invalide', raison: 'test' };
  return { etat: 'valide', uid: jeton, emailVerifie: true };
};

const REGLES = {
  '/scan': { max: 2, fenetreMs: 1000 },
  '/assistant': { max: 10, fenetreMs: 1000 },
  '/validate-license': { max: 10, fenetreMs: 1000 }
};
const securite = (mode, extra = {}) =>
  creerSecurite({ mode, verifierJeton: verifierTest, regles: REGLES, journal: () => {}, ...extra });

// ---------- Outils ----------
test('normaliserMode : valeurs connues, tout le reste devient « observe »', () => {
  assert.equal(normaliserMode('enforce'), 'enforce');
  assert.equal(normaliserMode(' OBSERVE '), 'observe');
  assert.equal(normaliserMode('off'), 'off');
  assert.equal(normaliserMode('n importe quoi'), 'observe');
  assert.equal(normaliserMode(undefined), 'observe');
});

test('extraireJeton : lit « Bearer », ignore le reste', () => {
  assert.equal(extraireJeton({ headers: { authorization: 'Bearer abc' } }), 'abc');
  assert.equal(extraireJeton({ headers: { authorization: 'bearer   xyz ' } }), 'xyz');
  assert.equal(extraireJeton({ headers: {} }), null);
  assert.equal(extraireJeton({ headers: { authorization: 'Basic abc' } }), null);
});

test('limiteur : fenêtre glissante et clés indépendantes', () => {
  let t = 0;
  const lim = creerLimiteur({ maintenant: () => t });
  assert.equal(lim.essayer('a', 2, 1000).ok, true);
  t = 100;
  assert.equal(lim.essayer('a', 2, 1000).ok, true);
  t = 200;
  const refus = lim.essayer('a', 2, 1000);
  assert.equal(refus.ok, false);
  assert.equal(refus.reessayerDansS, 1);
  assert.equal(lim.essayer('b', 2, 1000).ok, true); // une autre clé n'est pas touchée
  t = 1001;
  assert.equal(lim.essayer('a', 2, 1000).ok, true); // le premier appel est sorti de la fenêtre
  t = 10000;
  lim.purger(1000);
  assert.equal(lim.taille(), 0);
});

test('reglesParDefaut : valeurs de départ et réglages par variables', () => {
  const r = reglesParDefaut();
  assert.equal(r['/scan'].max, 40);
  assert.equal(r['/assistant'].max, 60);
  assert.equal(r['/validate-license'].max, 20);
  assert.equal(reglesParDefaut({ RATE_SCAN_PAR_JOUR: '5' })['/scan'].max, 5);
  assert.equal(reglesParDefaut({ RATE_SCAN_PAR_JOUR: 'abc' })['/scan'].max, 40);
  assert.equal(reglesParDefaut({ RATE_SCAN_PAR_JOUR: '0' })['/scan'].max, 40);
});

// ---------- Mode « observe » : ne refuse jamais ----------
test('observe : un appel sans jeton passe, et il est compté', async () => {
  const s = securite('observe');
  const { suivant, res } = await lancer(s, requete('/scan'));
  assert.equal(suivant, true);
  assert.equal(res.code, 200);
  assert.equal(s.resume()['/scan'].absent, 1);
  const { suivant: s2 } = await lancer(s, requete('/scan', 'mauvais'));
  assert.equal(s2, true);
  assert.equal(s.resume()['/scan'].invalide, 1);
});

test('observe : un dépassement de limite est compté mais n\'est pas refusé', async () => {
  const s = securite('observe');
  for (let i = 0; i < 3; i++) {
    const { suivant } = await lancer(s, requete('/scan', 'u1'));
    assert.equal(suivant, true);
  }
  assert.equal(s.resume()['/scan'].valide, 3);
  assert.equal(s.resume()['/scan'].limite, 1);
});

test('observe : l\'identité vérifiée est transmise à la suite', async () => {
  const s = securite('observe');
  const req = requete('/assistant', 'u1');
  await lancer(s, req);
  assert.deepEqual(req.auth, { uid: 'u1', emailVerifie: true });
});

// ---------- Mode « enforce » : refuse ----------
test('enforce : sans jeton ou avec un jeton invalide, 401', async () => {
  const s = securite('enforce');
  for (const jeton of [null, 'mauvais']) {
    const { res, suivant } = await lancer(s, requete('/scan', jeton));
    assert.equal(suivant, false);
    assert.equal(res.code, 401);
    assert.equal(res.body.code, 'AUTH_REQUIRED');
  }
  const { suivant } = await lancer(s, requete('/scan', 'u1'));
  assert.equal(suivant, true);
});

test('enforce : limite par utilisateur (429), les autres ne sont pas touchés', async () => {
  const s = securite('enforce');
  await lancer(s, requete('/scan', 'u1'));
  await lancer(s, requete('/scan', 'u1'));
  const { res, suivant } = await lancer(s, requete('/scan', 'u1'));
  assert.equal(suivant, false);
  assert.equal(res.code, 429);
  assert.equal(res.body.code, 'RATE_LIMIT');
  assert.ok(res.body.retryAfterSeconds >= 1);
  assert.ok(Number(res.headers['Retry-After']) >= 1);
  const autre = await lancer(s, requete('/scan', 'u2'));
  assert.equal(autre.suivant, true);
});

test('enforce : e-mail non vérifié refusé si on l\'exige', async () => {
  const s = creerSecurite({
    mode: 'enforce',
    verifierJeton: async () => ({ etat: 'valide', uid: 'u1', emailVerifie: false }),
    exigerEmailVerifie: true,
    regles: REGLES,
    journal: () => {}
  });
  const { res, suivant } = await lancer(s, requete('/scan', 'u1'));
  assert.equal(suivant, false);
  assert.equal(res.code, 401);
  assert.equal(res.body.code, 'EMAIL_NON_VERIFIE');
});

test('enforce : plafond global sur les fonctions Gemini, pas sur la licence', async () => {
  const s = securite('enforce', { globalMax: 2 });
  assert.equal((await lancer(s, requete('/scan', 'a'))).suivant, true);
  assert.equal((await lancer(s, requete('/assistant', 'b'))).suivant, true);
  const refus = await lancer(s, requete('/scan', 'c'));
  assert.equal(refus.suivant, false);
  assert.equal(refus.res.code, 429);
  assert.equal((await lancer(s, requete('/validate-license', 'c'))).suivant, true);
});

// ---------- Cas qui ne doivent rien vérifier ----------
test('mode off, OPTIONS et routes inconnues : aucune vérification', async () => {
  let appels = 0;
  const compteur = async () => {
    appels += 1;
    return { etat: 'absent' };
  };
  const off = creerSecurite({ mode: 'off', verifierJeton: compteur, regles: REGLES, journal: () => {} });
  const enforce = creerSecurite({ mode: 'enforce', verifierJeton: compteur, regles: REGLES, journal: () => {} });
  assert.equal((await lancer(off, requete('/scan'))).suivant, true);
  assert.equal((await lancer(enforce, requete('/scan', null, { method: 'OPTIONS' }))).suivant, true);
  assert.equal((await lancer(enforce, requete('/autre'))).suivant, true);
  assert.equal(appels, 0);
});

// ---------- Panne du vérificateur ----------
test('vérificateur en panne : observe laisse passer, enforce répond 503', async () => {
  const panne = async () => {
    throw new Error('boum');
  };
  const obs = creerSecurite({ mode: 'observe', verifierJeton: panne, regles: REGLES, journal: () => {} });
  assert.equal((await lancer(obs, requete('/scan', 'u1'))).suivant, true);
  const enf = creerSecurite({ mode: 'enforce', verifierJeton: panne, regles: REGLES, journal: () => {} });
  const { res, suivant } = await lancer(enf, requete('/scan', 'u1'));
  assert.equal(suivant, false);
  assert.equal(res.code, 503);
  assert.equal(res.body.code, 'AUTH_INDISPONIBLE');
});