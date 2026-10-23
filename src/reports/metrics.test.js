// ==========================================================
// TESTS DU MOTEUR DE CALCUL — se lancent sans rien installer (outil intégré à Node) :
//     node --test src/reports/metrics.test.js
// Les valeurs attendues viennent de la fiche signée « Synthèse d'évaluation certificative d'étape n°2 »
// (EPP Tchankada) et de calculs refaits à la main.
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculerClasse,
  consoliderClasses,
  evaluerEleve,
  moyenne,
  pourcentage,
  totalEpreuve,
  verifierDonnees
} from './metrics.js';

// ---------- Note totale ----------
test('totalEpreuve : note + perfectionnement, sans erreur de virgule', () => {
  assert.equal(totalEpreuve({ note: 13.5, perf: 1.5 }), 15);
  assert.equal(totalEpreuve({ note: 16.25, perf: 1.75 }), 18);
  assert.equal(totalEpreuve({ note: 8 }), 8);
  assert.equal(totalEpreuve({ note: 0.1, perf: 0.2 }), 0.3);
});

// ---------- Pourcentages : troncature à 2 décimales (comme les fiches papier) ----------
test('pourcentage (troncature) : valeurs de la fiche d\'étape n°2', () => {
  assert.equal(pourcentage(10, 16), 62.5); // CI garçons
  assert.equal(pourcentage(11, 11), 100); // CI filles
  assert.equal(pourcentage(21, 27), 77.77); // CI total
  assert.equal(pourcentage(22, 28), 78.57); // CP garçons
  assert.equal(pourcentage(12, 21), 57.14); // CP filles
  assert.equal(pourcentage(34, 49), 69.38); // CP total
  assert.equal(pourcentage(10, 28), 35.71); // CE1 garçons
  assert.equal(pourcentage(6, 15), 40); // CE1 filles
  assert.equal(pourcentage(16, 43), 37.2); // CE1 total
  assert.equal(pourcentage(4, 17), 23.52); // CM2 total
});

test('pourcentage : cas limites', () => {
  assert.equal(pourcentage(0, 10), 0);
  assert.equal(pourcentage(5, 0), null);
  assert.equal(pourcentage(1, 32), 3.12); // 3,125 tronqué
});

test('pourcentage (arrondi) : moitié vers le haut', () => {
  assert.equal(pourcentage(21, 27, 'arrondi'), 77.78);
  assert.equal(pourcentage(34, 49, 'arrondi'), 69.39);
  assert.equal(pourcentage(16, 43, 'arrondi'), 37.21);
  assert.equal(pourcentage(1, 32, 'arrondi'), 3.13); // 3,125 arrondi vers le haut
});

// ---------- Moyenne ----------
test('moyenne : coefficient 1, 2 décimales', () => {
  assert.equal(moyenne([15, 8, 18, 10]), 12.75);
  assert.equal(moyenne([]), null);
  assert.equal(moyenne([9.99, 10, 10]), 9.99); // troncature
  assert.equal(moyenne([9.99, 10, 10], 'arrondi'), 10); // arrondi
});

// ---------- Élève ----------
test('evaluerEleve : reçu selon la moyenne ramenée à 2 décimales', () => {
  const eleve = { id: 'x', epreuves: { a: { note: 9.99 }, b: { note: 10 }, c: { note: 10 } } };
  assert.equal(evaluerEleve(eleve, ['a', 'b', 'c']).recu, false); // 9,99 tronqué
  assert.equal(evaluerEleve(eleve, ['a', 'b', 'c'], { mode: 'arrondi' }).recu, true); // 10 arrondi
});

test('evaluerEleve : absent jamais reçu, épreuves manquantes signalées', () => {
  const r = evaluerEleve({ id: 'x', absent: true, epreuves: { a: { note: 18 } } }, ['a', 'b']);
  assert.equal(r.absent, true);
  assert.equal(r.recu, false); // un absent n'est jamais reçu, même s'il a des notes
  assert.deepEqual(r.manquantes, ['b']);
});

// ---------- Classe (jeu d'essai calculé à la main) ----------
const ELEVES = [
  { id: 'e1', sexe: 'M', epreuves: { maths: { note: 13.5, perf: 1.5 }, dictee: { note: 8 } } }, // 15 et 8 -> 11,5 : reçu
  { id: 'e2', sexe: 'M', absent: true, epreuves: { maths: { note: 12 } } }, // absent : ignoré
  { id: 'e3', sexe: 'F', epreuves: { maths: { note: 8 }, dictee: { note: 9 } } }, // 8,5 : non reçue
  { id: 'e4', sexe: 'F', epreuves: { maths: { note: 16.25, perf: 1.75 }, dictee: { note: 10 } } } // 18 et 10 -> 14 : reçue
];

test('calculerClasse : effectifs et résultats', () => {
  const r = calculerClasse(ELEVES, { epreuves: ['maths', 'dictee'] });
  assert.deepEqual(r.inscrits, { G: 2, F: 2, T: 4 });
  assert.deepEqual(r.composes, { G: 1, F: 2, T: 3 });
  assert.deepEqual(r.recus, { G: 1, F: 1, T: 2 });
  assert.deepEqual(r.pourcentage, { G: 100, F: 50, T: 66.66 });
  assert.equal(r.sansSexe, 0);
});

test('calculerClasse : détail par épreuve (dont « à renforcer »)', () => {
  const r = calculerClasse(ELEVES, { epreuves: ['maths', 'dictee'] });
  assert.deepEqual(r.parEpreuve.maths.composes, { G: 1, F: 2, T: 3 });
  assert.deepEqual(r.parEpreuve.maths.atteint, { G: 1, F: 1, T: 2 });
  assert.deepEqual(r.parEpreuve.maths.nonAtteint, { G: 0, F: 1, T: 1 });
  assert.deepEqual(r.parEpreuve.maths.pourcentage, { G: 100, F: 50, T: 66.66 });
  assert.deepEqual(r.parEpreuve.dictee.atteint, { G: 0, F: 1, T: 1 });
  assert.deepEqual(r.parEpreuve.dictee.nonAtteint, { G: 1, F: 1, T: 2 });
  assert.deepEqual(r.parEpreuve.dictee.pourcentage, { G: 0, F: 50, T: 33.33 });
});

test('calculerClasse : groupe Français = moyenne des épreuves du groupe', () => {
  const eleves = [
    { id: 'a', sexe: 'M', epreuves: { dictee: { note: 12 }, expression_ecrite: { note: 6 } } }, // moyenne 9 : à renforcer
    { id: 'b', sexe: 'F', epreuves: { dictee: { note: 8 }, expression_ecrite: { note: 14 } } }, // moyenne 11 : atteint
    { id: 'c', sexe: 'F', absent: true, epreuves: { dictee: { note: 1 } } } // absent : ignoré
  ];
  const r = calculerClasse(eleves, { epreuves: ['dictee', 'expression_ecrite'] });
  assert.deepEqual(r.parGroupe['Français'].composes, { G: 1, F: 1, T: 2 });
  assert.deepEqual(r.parGroupe['Français'].atteint, { G: 0, F: 1, T: 1 });
  assert.deepEqual(r.parGroupe['Français'].nonAtteint, { G: 1, F: 0, T: 1 });
  assert.equal(r.parGroupe['Mathématique'], undefined);
});

// ---------- Consolidation de l'école : ligne « Ensemble » de la fiche ----------
const niveau = (ig, if_, cg, cf, rg, rf) => ({
  inscrits: { G: ig, F: if_, T: ig + if_ },
  composes: { G: cg, F: cf, T: cg + cf },
  recus: { G: rg, F: rf, T: rg + rf },
  parEpreuve: {},
  sansSexe: 0
});

const NIVEAUX_FICHE = [
  niveau(33, 28, 16, 11, 10, 11), // CI
  niveau(31, 24, 28, 21, 22, 12), // CP
  niveau(28, 20, 28, 15, 10, 6), //  CE1
  niveau(14, 13, 13, 11, 6, 9), //   CE2
  niveau(5, 5, 5, 5, 0, 1), //       CM1
  niveau(8, 10, 7, 10, 1, 3) //      CM2
];

test('consoliderClasses : ligne « Ensemble » de la fiche d\'étape n°2', () => {
  const e = consoliderClasses(NIVEAUX_FICHE);
  assert.deepEqual(e.inscrits, { G: 119, F: 100, T: 219 }); // identique à la fiche signée
  assert.deepEqual(e.composes, { G: 97, F: 73, T: 170 });
  assert.deepEqual(e.recus, { G: 49, F: 42, T: 91 });
  assert.deepEqual(e.pourcentage, { G: 50.51, F: 57.53, T: 53.52 }); // jamais une moyenne de pourcentages
  assert.equal(consoliderClasses(NIVEAUX_FICHE, { mode: 'arrondi' }).pourcentage.T, 53.53);
});

// ---------- Contrôle des données ----------
test('verifierDonnees : sexe manquant, notes manquantes, absent', () => {
  const eleves = [
    { id: 'a', sexe: 'M', epreuves: { maths: { note: 12 }, dictee: { note: 11 } } }, // complet
    { id: 'b', epreuves: { maths: { note: 12 }, dictee: { note: 11 } } }, //           sans sexe
    { id: 'c', sexe: 'F', epreuves: { maths: { note: 12 } } }, //                      note manquante
    { id: 'd', sexe: 'F', epreuves: {} }, //                                            aucune note
    { id: 'e', sexe: 'F', absent: true } //                                             absent : accepté
  ];
  const r = verifierDonnees(eleves, ['maths', 'dictee']);
  assert.equal(r.ok, false);
  assert.deepEqual(
    r.problemes.map((p) => [p.type, p.eleveId]),
    [
      ['sexe-manquant', 'b'],
      ['note-manquante', 'c'],
      ['aucune-note', 'd']
    ]
  );
  assert.deepEqual(r.problemes[1].epreuves, ['dictee']);
  assert.equal(verifierDonnees([eleves[0], eleves[4]], ['maths', 'dictee']).ok, true);
});