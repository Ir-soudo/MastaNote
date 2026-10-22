// ==========================================================
// TESTS DE LA MISE EN PAGE, DU DESSIN ET DU PDF — sans rien installer :
//     node --test src/reports/rendu.test.js
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculerClasse } from './metrics.js';
import {
  LIGNES_FICHE_CLASSE,
  PAGE_A4_PAYSAGE,
  construireFicheClasse,
  envelopper,
  fmtPctCourt,
  tableauFicheClasse
} from './layout.js';
import { formesVersSvg } from './svg.js';
import { pdfDepuisJpeg } from './pdf.js';

const ELEVES = [
  { id: 'a', sexe: 'M', epreuves: { maths: { note: 12 }, dictee: { note: 9 } } },
  { id: 'b', sexe: 'F', epreuves: { maths: { note: 8 }, dictee: { note: 15 } } }
];
const resultat = calculerClasse(ELEVES);
const donnees = {
  classe: { nom: 'CM2 Emeraude', niveau: 'CM2' },
  etape: 2,
  resultat,
  meta: { ecole: 'EPP Test', annee: '2025-2026' },
  observations: 'RAS'
};

// ---------- Formats ----------
test('fmtPctCourt : style des fiches papier', () => {
  assert.equal(fmtPctCourt(62.5), '62,5%');
  assert.equal(fmtPctCourt(100), '100%');
  assert.equal(fmtPctCourt(77.77), '77,77%');
  assert.equal(fmtPctCourt(0), '0%');
  assert.equal(fmtPctCourt(null), '-');
});

test('envelopper : retours à la ligne et coupure', () => {
  assert.deepEqual(envelopper('un deux trois quatre', 8, 5), ['un deux', 'trois', 'quatre']);
  assert.deepEqual(envelopper('aaa bbb ccc ddd', 3, 2), ['aaa', '...']);
  assert.deepEqual(envelopper('', 10, 3), []);
});

// ---------- Mise en page ----------
test('construireFicheClasse : tout reste dans la page', () => {
  const layout = construireFicheClasse(donnees);
  assert.deepEqual(layout.page, PAGE_A4_PAYSAGE);
  assert.ok(layout.formes.length > 100);
  for (const f of layout.formes) {
    if (f.t === 'rect') {
      assert.ok(f.x >= 0 && f.y >= 0, 'rectangle hors page (haut gauche)');
      assert.ok(f.x + f.w <= PAGE_A4_PAYSAGE.w + 0.001 && f.y + f.h <= PAGE_A4_PAYSAGE.h + 0.001, 'rectangle hors page');
    }
    if (f.t === 'text') {
      assert.ok(f.x >= 0 && f.x <= PAGE_A4_PAYSAGE.w && f.y >= 0 && f.y <= PAGE_A4_PAYSAGE.h, `texte hors page : ${f.s}`);
    }
  }
});

test('construireFicheClasse : titres, libellés et chiffres présents', () => {
  const textes = construireFicheClasse(donnees).formes.filter((f) => f.t === 'text').map((f) => f.s);
  assert.ok(textes.includes("RÉSULTATS DE L'ÉVALUATION D'ÉTAPE N°2"));
  assert.ok(textes.includes('INSCRITS'));
  assert.ok(textes.includes('ONT COMPOSÉ'));
  assert.ok(textes.includes('À RENFORCER'));
  for (const ligne of LIGNES_FICHE_CLASSE) assert.ok(textes.includes(ligne.label), `ligne absente : ${ligne.label}`);
  // Maths : élève a = 12 (atteint), élève b = 8 : 1 garçon sur 1 (100 %), 0 fille sur 1 (0 %), 1 sur 2 au total (50 %)
  assert.ok(textes.includes('100%'));
  assert.ok(textes.includes('0%'));
  assert.ok(textes.includes('50%'));
  assert.ok(textes.includes('RAS'));
});

// ---------- Dessin SVG ----------
test('formesVersSvg : document valide, textes échappés', () => {
  const layout = construireFicheClasse({ ...donnees, meta: { ecole: 'A & <B>' } });
  const svg = formesVersSvg(layout);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('INSCRITS'));
  assert.ok(svg.includes('A &amp; &lt;B&gt;'));
  assert.ok(!svg.includes('<B>'));
  assert.ok(formesVersSvg(layout, { responsive: true }).includes('width:100%'));
});

// ---------- Tableau pour Excel ----------
test('tableauFicheClasse : en-têtes et lignes', () => {
  const tableau = tableauFicheClasse(donnees);
  assert.equal(tableau.length, 4 + LIGNES_FICHE_CLASSE.length);
  const entete = tableau[3];
  assert.equal(entete.length, 1 + 15 + 3);
  assert.equal(entete[0], 'Épreuve');
  for (const ligne of tableau.slice(4)) assert.equal(ligne.length, entete.length);
  assert.equal(tableau[4][0], LIGNES_FICHE_CLASSE[0].label);
});

// ---------- PDF ----------
test('pdfDepuisJpeg : structure et table des positions valides', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(60).fill(7), 0xff, 0xd9]);
  const pdf = pdfDepuisJpeg(jpeg, 100, 70, PAGE_A4_PAYSAGE);
  const texte = Buffer.from(pdf).toString('latin1'); // un caractère par octet : les positions restent exactes

  assert.ok(texte.startsWith('%PDF-1.4'));
  assert.ok(texte.trimEnd().endsWith('%%EOF'));
  assert.ok(texte.includes(`/Length ${jpeg.length} `));

  const debutXref = Number(texte.match(/startxref\n(\d+)/)[1]);
  assert.ok(texte.slice(debutXref).startsWith('xref'));

  const positions = [...texte.slice(debutXref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
  assert.equal(positions.length, 5);
  positions.forEach((p, i) => {
    assert.ok(texte.slice(p).startsWith(`${i + 1} 0 obj`), `objet ${i + 1} mal positionné`);
  });
});