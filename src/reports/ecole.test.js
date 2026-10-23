// ==========================================================
// TESTS DES SYNTHÈSES ET DE LA CONSOLIDATION — sans rien installer :
//     node --test src/reports/ecole.test.js
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculerClasse } from './metrics.js';
import { creerSynthese, depuisCode, nomFichierSynthese, versCode, versResultat } from './synthese.js';
import { consoliderEcole } from './ecole.js';
import { resultatExemple } from './exemple.js';

const ELEVES = [
  { id: 'a', sexe: 'M', epreuves: { maths: { note: 12 }, dictee: { note: 9 } } },
  { id: 'b', sexe: 'F', epreuves: { maths: { note: 8 }, dictee: { note: 15 } } },
  { id: 'c', sexe: 'F', absent: true }
];
const resultat = calculerClasse(ELEVES);
const synthese = creerSynthese({
  resultat,
  classe: { nom: 'CE1 A', niveau: 'CE1' },
  etape: 2,
  annee: '2025-2026'
});
const code = versCode(synthese);

// ---------- Code ----------
test('synthèse : le code se relit à l\'identique', () => {
  assert.ok(code.startsWith('MNS1.'));
  assert.deepEqual(depuisCode(code), synthese);
  const r = versResultat(depuisCode(code));
  assert.deepEqual(r.inscrits, resultat.inscrits);
  assert.deepEqual(r.composes, resultat.composes);
  assert.deepEqual(r.recus, resultat.recus);
  assert.deepEqual(r.parEpreuve.maths.composes, resultat.parEpreuve.maths.composes);
  assert.deepEqual(r.parEpreuve.maths.atteint, resultat.parEpreuve.maths.atteint);
});

test('synthèse : espaces, retours à la ligne et phrases autour sont ignorés', () => {
  const decoupe = code.replace(/(.{20})/g, '$1\n ');
  assert.deepEqual(depuisCode(`Voici la synthèse :\n${decoupe}\nMerci`), synthese);
});

test('synthèse : un code coupé ou modifié est refusé', () => {
  const [prefixe, contenu, somme] = code.split('.');
  const lettre = contenu[10] === 'A' ? 'B' : 'A';
  const altere = `${prefixe}.${contenu.slice(0, 10)}${lettre}${contenu.slice(11)}.${somme}`;
  assert.throws(() => depuisCode(altere), /incomplet ou modifié/);
  assert.throws(() => depuisCode(code.slice(0, -12)), /Aucun code/);
  assert.throws(() => depuisCode('bonjour'), /Aucun code/);
});

test('synthèse : un contenu incohérent est refusé', () => {
  assert.throws(() => depuisCode(versCode({ ...synthese, r: [5, 5, 99] })), /Données invalides/);
  assert.throws(() => depuisCode(versCode({ ...synthese, i: [-1, 0, 0] })), /Données invalides/);
  assert.throws(() => depuisCode(versCode({ ...synthese, v: 2 })), /Version/);
});

test('synthèse : nom du fichier', () => {
  assert.equal(nomFichierSynthese(synthese), 'synthese_ce1_etape2.txt');
});

test('exemple : les codes d\'exemple de chaque niveau sont valides', () => {
  for (let decalage = 0; decalage < 6; decalage++) {
    const s = creerSynthese({
      resultat: resultatExemple(decalage),
      classe: { nom: 'EXEMPLE CE1 (chiffres fictifs)', niveau: 'CE1' },
      etape: 1
    });
    assert.deepEqual(depuisCode(versCode(s)), s);
    assert.equal(versResultat(s).composes.T, 28); // 30 élèves, 2 absents
  }
});

// ---------- Consolidation : la fiche d'étape n°2 passe par les codes ----------
const faux = (ig, if_, cg, cf, rg, rf) => ({
  inscrits: { G: ig, F: if_, T: ig + if_ },
  composes: { G: cg, F: cf, T: cg + cf },
  recus: { G: rg, F: rf, T: rg + rf },
  parEpreuve: {},
  parGroupe: {},
  sansSexe: 0
});
const viaCode = (res, niveau, nom) =>
  versResultat(depuisCode(versCode(creerSynthese({ resultat: res, classe: { nom, niveau }, etape: 2 }))));

const NIVEAUX_FICHE = [
  ['CI', 33, 28, 16, 11, 10, 11],
  ['CP', 31, 24, 28, 21, 22, 12],
  ['CE1', 28, 20, 28, 15, 10, 6],
  ['CE2', 14, 13, 13, 11, 6, 9],
  ['CM1', 5, 5, 5, 5, 0, 1],
  ['CM2', 8, 10, 7, 10, 1, 3]
];

test('consoliderEcole : la ligne « Ensemble » de la fiche signée, via les codes', () => {
  const entrees = NIVEAUX_FICHE.map(([niveau, ...v]) => ({ id: niveau, niveau, resultat: viaCode(faux(...v), niveau, niveau) }));
  const e = consoliderEcole(entrees);
  assert.equal(e.parNiveau.length, 6);
  assert.deepEqual(e.ecole.inscrits, { G: 119, F: 100, T: 219 });
  assert.deepEqual(e.ecole.composes, { G: 97, F: 73, T: 170 });
  assert.deepEqual(e.ecole.recus, { G: 49, F: 42, T: 91 });
  assert.deepEqual(e.ecole.pourcentage, { G: 50.51, F: 57.53, T: 53.52 });
  assert.equal(e.parNiveau[0].resultat.pourcentage.T, 77.77); // CI : 21 sur 27
  assert.equal(e.parNiveau[1].resultat.pourcentage.T, 69.38); // CP : 34 sur 49
});

test('consoliderEcole : deux classes pour un niveau, et un niveau sans données', () => {
  const ce1a = viaCode(faux(10, 8, 9, 8, 5, 4), 'CE1', 'CE1 A');
  const ce1b = viaCode(faux(12, 6, 11, 5, 7, 3), 'CE1', 'CE1 B');
  const e = consoliderEcole([
    { id: 'a', niveau: 'CE1', resultat: ce1a },
    { id: 'b', niveau: 'CE1', resultat: ce1b },
    { id: 'c', niveau: 'CI', resultat: null }
  ]);
  const ce1 = e.parNiveau.find((n) => n.niveau === 'CE1');
  assert.equal(ce1.nbEntrees, 2);
  assert.deepEqual(ce1.resultat.inscrits, { G: 22, F: 14, T: 36 });
  assert.deepEqual(ce1.resultat.composes, { G: 20, F: 13, T: 33 });
  const ci = e.parNiveau.find((n) => n.niveau === 'CI');
  assert.equal(ci.resultat, null);
  assert.equal(ci.nbSansDonnees, 1);
  assert.equal(e.parNiveau.find((n) => n.niveau === 'CP').nbEntrees, 0);
  assert.deepEqual(e.ecole.inscrits, { G: 22, F: 14, T: 36 });
});

test('consoliderEcole : aucune donnée', () => {
  assert.equal(consoliderEcole([]).ecole, null);
});