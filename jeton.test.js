// ==========================================================
// TESTS DE LA VÉRIFICATION DU JETON — nécessite « jose » (npm install jose) :
//     node jeton.test.js
// Les jetons sont fabriqués ici avec des clés générées pour le test : aucun accès à Google, aucun secret.
//
// Certains environnements (StackBlitz, notamment) ne savent pas fabriquer de clés RSA. Dans ce cas, les tests
// qui en ont besoin sont signalés « ignorés » avec la raison, au lieu de planter ; ils s'exécutent sur un Node normal.
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { creerVerificateurJeton } from './jeton.js';

const PROJET = 'projet-test';
const maintenant = () => Math.floor(Date.now() / 1000);

let privateKey;
let verifier;
let raisonIgnore = null;
try {
  const paire = await generateKeyPair('RS256', { extractable: true });
  privateKey = paire.privateKey;
  const jwk = { ...(await exportJWK(paire.publicKey)), kid: 'cle1', alg: 'RS256', use: 'sig' };
  verifier = creerVerificateurJeton({ projectId: PROJET, cles: createLocalJWKSet({ keys: [jwk] }) });
} catch (err) {
  raisonIgnore = `Cet environnement ne sait pas fabriquer de clés de test (${err?.name || 'erreur'} : ${err?.message || ''}). À lancer sur un Node normal.`;
}
const option = raisonIgnore ? { skip: raisonIgnore } : {};

// Fabrique un jeton « comme Firebase » ; chaque option permet de le falsifier d'une façon précise
const signer = (options = {}) => {
  const {
    cle = privateKey,
    kid = 'cle1',
    issuer = `https://securetoken.google.com/${PROJET}`,
    audience = PROJET,
    sujet = 'uid-123',
    emission = maintenant(),
    expiration = maintenant() + 3600,
    claims = { email_verified: true }
  } = options;
  let jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(emission)
    .setExpirationTime(expiration);
  if (sujet) jwt = jwt.setSubject(sujet);
  return jwt.sign(cle);
};

test('jeton valide : identité et e-mail vérifié', option, async () => {
  const r = await verifier(await signer());
  assert.equal(r.etat, 'valide');
  assert.equal(r.uid, 'uid-123');
  assert.equal(r.emailVerifie, true);
});

test('jeton valide mais e-mail non vérifié', option, async () => {
  const r = await verifier(await signer({ claims: { email_verified: false } }));
  assert.equal(r.etat, 'valide');
  assert.equal(r.emailVerifie, false);
});

test('absent ou n\'importe quel texte : refusé', option, async () => {
  assert.deepEqual(await verifier(null), { etat: 'absent' });
  assert.deepEqual(await verifier(''), { etat: 'absent' });
  assert.equal((await verifier('pas.un.jeton')).etat, 'invalide');
  assert.equal((await verifier('abc')).etat, 'invalide');
});

test('autre projet (audience ou émetteur) : refusé', option, async () => {
  assert.equal((await verifier(await signer({ audience: 'autre-projet' }))).etat, 'invalide');
  assert.equal((await verifier(await signer({ issuer: 'https://securetoken.google.com/autre-projet' }))).etat, 'invalide');
});

test('jeton expiré : refusé', option, async () => {
  const r = await verifier(await signer({ emission: maintenant() - 7200, expiration: maintenant() - 3600 }));
  assert.equal(r.etat, 'invalide');
});

test('signé avec une autre clé (jeton falsifié) : refusé', option, async () => {
  const autre = await generateKeyPair('RS256', { extractable: true });
  assert.equal((await verifier(await signer({ cle: autre.privateKey }))).etat, 'invalide');
});

test('sans identifiant d\'utilisateur : refusé', option, async () => {
  const r = await verifier(await signer({ sujet: '' }));
  assert.equal(r.etat, 'invalide');
  assert.equal(r.raison, 'sans-sujet');
});

test('algorithme non autorisé (jeton signé avec un mot de passe) : refusé', option, async () => {
  const faux = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', kid: 'cle1' })
    .setIssuer(`https://securetoken.google.com/${PROJET}`)
    .setAudience(PROJET)
    .setSubject('uid-123')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('un-mot-de-passe-quelconque'));
  assert.equal((await verifier(faux)).etat, 'invalide');
});

// Celui-ci n'a pas besoin de clés : il s'exécute partout
test('identifiant de projet manquant : le serveur refuse de démarrer sans', () => {
  assert.throws(() => creerVerificateurJeton({}), /FIREBASE_PROJECT_ID/);
});