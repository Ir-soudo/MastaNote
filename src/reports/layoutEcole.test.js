// ==========================================================
// TESTS DES FICHES DE L'ÉCOLE — sans rien installer :
//     node --test src/reports/layoutEcole.test.js
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { NIVEAUX, consoliderEcole } from './ecole.js';
import { resultatExemple } from './exemple.js';
import { PAGE_A4_PAYSAGE, fmtPctCourt } from './layout.js';
import { formesVersSvg } from './svg.js';
import {
  construireSyntheseEcole,
  construireSyntheseNiveaux,
  tableauSyntheseEcole,
  tableauSyntheseNiveaux
} from './layoutEcole.js';

// Une école de 6 niveaux, chiffres fictifs (30 élèves par niveau, 2 absents)
const entrees = NIVEAUX.map((niveau, i) => ({ id: niveau, niveau, resultat: resultatExemple(i) }));
const consolidation = consoliderEcole(entrees);
const meta = {
  ecole: 'EPP Test',
  circonscription: 'Toviklin',
  annee: '2025-2026',
  direction: 'COUFFO',
  region: '11',
  bp: '48 Dogbo',
  lieu: 'Tchankada',
  date: '27/03/2026'
};

const textes = (layout) => layout.formes.filter((f) => f.t === 'text').map((f) => f.s);

function verifierDansLaPage(layout) {
  assert.deepEqual(layout.page, PAGE_A4_PAYSAGE);
  for (const f of layout.formes) {
    if (f.t === 'rect') {
      assert.ok(f.x >= 0 && f.y >= 0, 'rectangle hors page');
      assert.ok(f.x + f.w <= PAGE_A4_PAYSAGE.w + 0.001 && f.y + f.h <= PAGE_A4_PAYSAGE.h + 0.001, `rectangle hors page (x=${f.x}, y=${f.y}, w=${f.w}, h=${f.h})`);
    }
    if (f.t === 'text') {
      assert.ok(f.x >= 0 && f.x <= PAGE_A4_PAYSAGE.w && f.y >= 0 && f.y <= PAGE_A4_PAYSAGE.h, `texte hors page : ${f.s}`);
    }
  }
}

// ---------- Fiche 1 : synthèse par niveau et champs de formation ----------
test('synthèse par niveau : tout reste dans la page', () => {
  verifierDansLaPage(construireSyntheseNiveaux({ consolidation, etape: 2, meta }));
});

test('synthèse par niveau : titres, niveaux, champs et chiffres présents', () => {
  const t = textes(construireSyntheseNiveaux({ consolidation, etape: 2, meta }));
  assert.ok(t.includes("FICHE DE SYNTHÈSE DES RÉSULTATS DE L'ÉVALUATION D'ÉTAPE N°2"));
  assert.ok(t.includes('POURCENTAGE DE RÉUSSITE DANS LES CHAMPS DE FORMATION'));
  for (const n of [...NIVEAUX, 'Ensemble']) assert.ok(t.includes(n), `niveau absent : ${n}`);
  for (const l of ['Français', 'Communication orale', 'Lecture', 'Expression écrite', 'Dictée', 'Mathématique', 'EST', 'ES', 'EA', 'Dessin/couture', 'Chant/Poésie', 'EPS']) {
    assert.ok(t.includes(l), `libellé absent : ${l}`);
  }
  const ens = consolidation.ecole;
  assert.equal(ens.inscrits.T, 180); // 6 niveaux de 30 élèves
  assert.ok(t.includes(String(ens.inscrits.T)));
  assert.ok(t.includes(String(ens.recus.T)));
  assert.ok(t.includes(fmtPctCourt(ens.pourcentage.T)));
  assert.ok(t.includes(String(ens.parEpreuve.maths.atteint.T)));
  assert.ok(t.includes(fmtPctCourt(ens.parEpreuve.maths.pourcentage.T)));
  assert.ok(t.includes('Le Directeur'));
  assert.ok(t.includes('Fait à Tchankada, le 27/03/2026'));
});

test('synthèse par niveau : un niveau absent reste vide sans rien casser', () => {
  const partielle = consoliderEcole(entrees.slice(0, 3)); // CI, CP, CE1 seulement
  const layout = construireSyntheseNiveaux({ consolidation: partielle, etape: 1, meta: {} });
  verifierDansLaPage(layout);
  const t = textes(layout);
  assert.ok(t.includes('CM2')); // la colonne existe toujours
  assert.ok(t.includes('ÉCOLE : ..........')); // champs non renseignés : pointillés
});

// ---------- Fiche 2 : synthèse niveau école ----------
test('synthèse niveau école : tout reste dans la page, en-tête et chiffres présents', () => {
  const layout = construireSyntheseEcole({ consolidation, etape: 2, meta });
  verifierDansLaPage(layout);
  const t = textes(layout);
  assert.ok(t.includes("SYNTHÈSE DE L'ÉVALUATION CERTIFICATIVE D'ÉTAPE N°2"));
  assert.ok(t.includes('DIRECTION DÉPARTEMENTALE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE DU COUFFO'));
  assert.ok(t.includes('RÉGION PÉDAGOGIQUE N°11'));
  assert.ok(t.includes('CIRCONSCRIPTION SCOLAIRE DE Toviklin'));
  assert.ok(t.includes('BP : 48 Dogbo'));
  assert.ok(t.includes('EPP Test'));
  assert.ok(t.includes(String(consolidation.ecole.inscrits.T)));
  assert.ok(t.includes(fmtPctCourt(consolidation.ecole.pourcentage.T)));
});

// ---------- Filigrane, tableaux, dessin ----------
test('filigrane EXEMPLE sur les deux fiches', () => {
  for (const construire of [construireSyntheseNiveaux, construireSyntheseEcole]) {
    const svg = formesVersSvg(construire({ consolidation, etape: 2, meta, filigrane: 'EXEMPLE' }));
    assert.ok(svg.includes('EXEMPLE'));
    assert.ok(svg.includes('rotate(-25'));
    assert.ok(!formesVersSvg(construire({ consolidation, etape: 2, meta })).includes('EXEMPLE'));
  }
});

test('tableaux Excel des fiches de l\'école', () => {
  const t1 = tableauSyntheseNiveaux({ consolidation, etape: 2, meta });
  assert.equal(t1[3].length, 1 + 7 * 3); // en-tête des effectifs : libellé + 7 colonnes x G, F, T
  assert.deepEqual(t1[4].slice(0, 1), ['Inscrits']);
  assert.equal(t1[4][1 + 7 * 3 - 1], consolidation.ecole.inscrits.T); // Ensemble, total
  assert.equal(t1.length, 10 + 10); // 10 lignes d'en-tête et d'effectifs, puis 10 épreuves
  assert.equal(t1[9].length, 2 + 7 * 2);

  const t2 = tableauSyntheseEcole({ consolidation, etape: 2, meta, filigrane: 'EXEMPLE' });
  assert.ok(t2[0][0].includes('[EXEMPLE]'));
  assert.equal(t2[3].length, 1 + 4 * 3);
  assert.equal(t2[4].length, 1 + 4 * 3);
  assert.equal(t2[4][0], 'EPP Test');
  assert.equal(t2[4][3], consolidation.ecole.inscrits.T);
});