// ==========================================================
// TESTS DU COMPTAGE DES LICENCES — sans rien installer :
//     node statistiques.test.js
// Aucun appel réel à Chariow : de fausses réponses, construites comme la documentation les décrit.
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUITS_PAR_DEFAUT, compterLicences, creerCache } from './statistiques.js';

const reponse = (corps, statut = 200) => ({ ok: statut >= 200 && statut < 300, status: statut, json: async () => corps });

// Une licence comme la renvoie Chariow : avec des données personnelles qui ne doivent JAMAIS ressortir
const licence = (statut) => ({
  id: `license_${Math.random().toString(36).slice(2, 8)}`,
  status: statut,
  customer: { id: 'cus_1', name: 'Nom Secret', email: 'secret@example.com', phone: { number: '+229 00 00 00 00' } },
  license: { key: 'ABC-123-XYZ-789', masked_key: 'ABC-***-***-789' }
});

const page = (licences, curseurSuivant = null) => ({
  data: licences,
  pagination: { count: licences.length, per_page: 100, next_cursor: curseurSuivant, has_more_pages: Boolean(curseurSuivant) }
});

const UN_PRODUIT = [{ id: 'prd_test', libelle: 'Test' }];

test('compte les licences par statut, sur plusieurs pages', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return url.includes('cursor=') ? reponse(page([licence('expired')])) : reponse(page([licence('active'), licence('pending_activation')], 'c1'));
  };
  const r = await compterLicences({ cle: 'cle-test', produits: UN_PRODUIT, fetchImpl });
  assert.equal(r.produits[0].total, 3);
  assert.deepEqual(r.produits[0].parStatut, { active: 1, pending_activation: 1, expired: 1, revoked: 0, autre: 0 });
  assert.equal(r.produits[0].incomplet, false);
  assert.equal(urls.length, 2);
  assert.ok(urls[0].includes('product_id=prd_test') && urls[0].includes('per_page=100'));
  assert.ok(urls[1].includes('cursor=c1')); // la page suivante est demandée avec le curseur reçu
});

test('plusieurs formules, avec les totaux', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('prd_z2kjla30')) return reponse(page([licence('active'), licence('active')]));
    if (url.includes('prd_6duiuhl1')) return reponse(page([licence('revoked')]));
    return reponse(page([]));
  };
  const r = await compterLicences({ cle: 'cle-test', fetchImpl });
  assert.deepEqual(r.produits.map((p) => p.id), PRODUITS_PAR_DEFAUT.map((p) => p.id));
  assert.deepEqual(r.produits.map((p) => p.total), [2, 1, 0]);
  assert.equal(r.total.total, 3);
  assert.equal(r.total.parStatut.active, 2);
  assert.equal(r.total.parStatut.revoked, 1);
});

test('un statut inconnu est compté à part', async () => {
  const fetchImpl = async () => reponse(page([licence('nouveau_statut_chariow'), licence('active')]));
  const r = await compterLicences({ cle: 'cle-test', produits: UN_PRODUIT, fetchImpl });
  assert.equal(r.produits[0].parStatut.autre, 1);
  assert.equal(r.produits[0].parStatut.active, 1);
});

test('CONFIDENTIALITÉ : le résultat ne contient ni e-mail, ni nom, ni téléphone, ni clé', async () => {
  const fetchImpl = async () => reponse(page([licence('active'), licence('pending_activation')]));
  const r = await compterLicences({ cle: 'cle-test', produits: UN_PRODUIT, fetchImpl });
  const texte = JSON.stringify(r);
  for (const secret of ['secret@example.com', 'Nom Secret', '+229', 'ABC-123-XYZ-789', 'ABC-***']) {
    assert.ok(!texte.includes(secret), `donnée personnelle présente : ${secret}`);
  }
});

test('la clé est envoyée en « Bearer » et jamais ailleurs', async () => {
  let entetes;
  const fetchImpl = async (url, options) => {
    entetes = options.headers;
    return reponse(page([]));
  };
  await compterLicences({ cle: 'cle-test', produits: UN_PRODUIT, fetchImpl });
  assert.equal(entetes.Authorization, 'Bearer cle-test');
});

test('erreurs de Chariow : messages sûrs, sans contenu de la réponse', async () => {
  for (const [statut, extrait] of [[401, /401/], [403, /licenses\.read/], [429, /429/], [500, /500/]]) {
    const fetchImpl = async () => reponse({ message: 'secret@example.com', errors: ['ABC-123-XYZ-789'] }, statut);
    await assert.rejects(
      () => compterLicences({ cle: 'cle-test', produits: UN_PRODUIT, fetchImpl }),
      (err) => extrait.test(err.message) && !err.message.includes('secret@example.com') && !err.message.includes('ABC-123')
    );
  }
});

test('clé absente : refus immédiat, sans appel', async () => {
  let appels = 0;
  const fetchImpl = async () => {
    appels += 1;
    return reponse(page([]));
  };
  await assert.rejects(() => compterLicences({ produits: UN_PRODUIT, fetchImpl }), /manquante/);
  assert.equal(appels, 0);
});

test('limite de pages : le résultat est marqué incomplet', async () => {
  const fetchImpl = async () => reponse(page([licence('active')], 'toujours-une-suite'));
  const r = await compterLicences({ cle: 'cle-test', produits: UN_PRODUIT, fetchImpl, maxPages: 3 });
  assert.equal(r.produits[0].total, 3);
  assert.equal(r.produits[0].incomplet, true);
});

test('cache : un seul calcul dans la durée, un nouveau après', async () => {
  let t = 0;
  let calculs = 0;
  const cache = creerCache(1000, () => t);
  const fabrique = async () => {
    calculs += 1;
    return { n: calculs };
  };
  assert.equal((await cache.obtenir('k', fabrique)).n, 1);
  t = 500;
  assert.equal((await cache.obtenir('k', fabrique)).n, 1);
  t = 1500;
  assert.equal((await cache.obtenir('k', fabrique)).n, 2);
  assert.equal(calculs, 2);
});

test('cache : deux demandes simultanées partagent un seul calcul', async () => {
  const cache = creerCache(1000);
  let calculs = 0;
  const fabrique = async () => {
    calculs += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { ok: true };
  };
  const [a, b] = await Promise.all([cache.obtenir('k', fabrique), cache.obtenir('k', fabrique)]);
  assert.deepEqual(a, b);
  assert.equal(calculs, 1);
});

test('cache : une erreur n\'est jamais gardée', async () => {
  const cache = creerCache(1000);
  let calculs = 0;
  const fabrique = async () => {
    calculs += 1;
    if (calculs === 1) throw new Error('panne');
    return { ok: true };
  };
  await assert.rejects(() => cache.obtenir('k', fabrique), /panne/);
  assert.deepEqual(await cache.obtenir('k', fabrique), { ok: true });
  assert.equal(calculs, 2);
});