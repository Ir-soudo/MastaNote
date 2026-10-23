// ==========================================================
// MISE EN PAGE DES FICHES DE L'ÉCOLE (fonctions pures, sans dépendance)
//  1. « Fiche de synthèse des résultats de l'évaluation d'étape — niveau école » :
//     tableau par niveau (CI à CM2 + Ensemble) puis « pourcentage de réussite dans les champs de formation »
//  2. « Synthèse de l'évaluation certificative d'étape — niveau école » : une seule ligne pour l'école
// Même principe que la fiche de classe : une liste de formes en millimètres, dessinée en aperçu, PDF et image.
// Aucun logo, armoiries ni cachet : seul le texte de l'en-tête est repris.
// ==========================================================
import { EPREUVES_RAPPORT } from './config.js';
import { NIVEAUX } from './ecole.js';
import { PAGE_A4_PAYSAGE, fmtEntier, fmtPctCourt } from './layout.js';

const MARGE = 10;
const FOND = '#eef1f6';
const POINTILLES = '..........';
const SEXES = ['G', 'F', 'T'];

function creerOutils() {
  const formes = [];
  const texte = (x, y, s, o = {}) => formes.push({ t: 'text', x, y, s, size: 8, align: 'center', ...o });
  const rect = (x, y, w, h, o = {}) => formes.push({ t: 'rect', x, y, w, h, sw: 0.25, ...o });
  return { formes, texte, rect };
}

function pied(texte, page, meta, y) {
  texte(MARGE, y, `Fait à ${meta.lieu || POINTILLES}, le ${meta.date || POINTILLES}`, { align: 'left', size: 8 });
  texte(page.w - MARGE - 25, y, 'Le Directeur', { size: 8, bold: true });
  if (meta.directeur) texte(page.w - MARGE - 25, y + 16, meta.directeur, { size: 8 });
}

function ajouterFiligrane(formes, page, mot) {
  if (!mot) return;
  formes.push({
    t: 'text', x: page.w / 2, y: page.h / 2, s: mot, size: 80, bold: true,
    color: '#c0392b', opacite: 0.18, rotate: -25, align: 'center'
  });
}

// Les 6 niveaux puis « Ensemble » : { nom, r } où r est le résultat consolidé (ou null s'il manque)
function colonnesNiveaux(consolidation) {
  return [
    ...consolidation.parNiveau.map((n) => ({ nom: n.niveau, r: n.resultat })),
    { nom: 'Ensemble', r: consolidation.ecole }
  ];
}

// ==========================================================
// FICHE 1 : synthèse par niveau + champs de formation
// ==========================================================
export function construireSyntheseNiveaux({ consolidation, etape, meta = {}, filigrane = '' }) {
  const page = PAGE_A4_PAYSAGE;
  const { formes, texte, rect } = creerOutils();
  const colonnes = colonnesNiveaux(consolidation);

  // --- En-tête ---
  texte(MARGE, 13, 'MINISTÈRE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE', { align: 'left', size: 7, bold: true });
  texte(MARGE, 17, 'RÉPUBLIQUE DU BÉNIN', { align: 'left', size: 7 });
  texte(MARGE, 22, `CIRCONSCRIPTION SCOLAIRE : ${meta.circonscription || POINTILLES}`, { align: 'left', size: 7.5 });
  texte(MARGE, 26.5, `ÉCOLE : ${meta.ecole || POINTILLES}`, { align: 'left', size: 7.5 });
  texte(page.w - MARGE, 13, `Année scolaire : ${meta.annee || POINTILLES}`, { align: 'right', size: 8 });
  texte(page.w / 2, 32, `FICHE DE SYNTHÈSE DES RÉSULTATS DE L'ÉVALUATION D'ÉTAPE N°${etape}`, { size: 12, bold: true });
  texte(page.w / 2, 37.5, 'NIVEAU ÉCOLE', { size: 9, bold: true });

  // --- Tableau 1 : effectifs et réussite par niveau ---
  const wLabel = 31;
  const wNum = 11.7;
  const y1 = 42;
  const hNom = 6;
  const hSous = 5;
  const hLigne = 6.5;
  const xGroupe = (i) => MARGE + wLabel + i * 3 * wNum;

  rect(MARGE, y1, wLabel, hNom + hSous, { fill: FOND });
  colonnes.forEach(({ nom }, i) => {
    rect(xGroupe(i), y1, 3 * wNum, hNom, { fill: FOND });
    texte(xGroupe(i) + 1.5 * wNum, y1 + hNom / 2, nom, { size: 8, bold: true });
    SEXES.forEach((s, j) => {
      rect(xGroupe(i) + j * wNum, y1 + hNom, wNum, hSous, { fill: FOND });
      texte(xGroupe(i) + (j + 0.5) * wNum, y1 + hNom + hSous / 2, s, { size: 7, bold: true });
    });
  });

  const lignes1 = [
    { lib: ['Inscrits'], cle: 'inscrits' },
    { lib: ['Ont composé'], cle: 'composes' },
    { lib: ['Ont atteint le seuil', 'de réussite'], cle: 'recus' },
    { lib: ['Pourcentage'], cle: 'pourcentage' }
  ];
  lignes1.forEach((ligne, k) => {
    const y = y1 + hNom + hSous + k * hLigne;
    rect(MARGE, y, wLabel, hLigne);
    ligne.lib.forEach((l, m) =>
      texte(MARGE + 1.5, y + hLigne / 2 + (m - (ligne.lib.length - 1) / 2) * 2.6, l, {
        align: 'left', size: ligne.lib.length > 1 ? 6 : 7.5, bold: true
      })
    );
    colonnes.forEach(({ r }, i) =>
      SEXES.forEach((s, j) => {
        rect(xGroupe(i) + j * wNum, y, wNum, hLigne);
        if (r) {
          const v = r[ligne.cle][s];
          texte(xGroupe(i) + (j + 0.5) * wNum, y + hLigne / 2, ligne.cle === 'pourcentage' ? fmtPctCourt(v) : fmtEntier(v), {
            size: ligne.cle === 'pourcentage' ? 6.5 : 8
          });
        }
      })
    );
  });
  const yFin1 = y1 + hNom + hSous + lignes1.length * hLigne;

  // --- Tableau 2 : pourcentage de réussite dans les champs de formation ---
  const yTitre2 = yFin1 + 6;
  texte(page.w / 2, yTitre2, 'POURCENTAGE DE RÉUSSITE DANS LES CHAMPS DE FORMATION', { size: 8, bold: true });
  const y2 = yTitre2 + 3.5;
  const wChamp = 22;
  const wSous = 30;
  const wLev = 32.1;
  const wNb = 16.5;
  const hNom2 = 6;
  const hSous2 = 11;
  const hLig2 = 6;
  const xLev = (i) => MARGE + wChamp + wSous + i * wLev;

  rect(MARGE, y2, wChamp + wSous, hNom2 + hSous2, { fill: FOND });
  colonnes.forEach(({ nom }, i) => {
    rect(xLev(i), y2, wLev, hNom2, { fill: FOND });
    texte(xLev(i) + wLev / 2, y2 + hNom2 / 2, nom, { size: 8, bold: true });
    rect(xLev(i), y2 + hNom2, wNb, hSous2, { fill: FOND });
    ["Nbre d'élèves", 'ayant atteint', 'la moyenne'].forEach((l, m) =>
      texte(xLev(i) + wNb / 2, y2 + hNom2 + hSous2 / 2 + (m - 1) * 2.6, l, { size: 5.5 })
    );
    rect(xLev(i) + wNb, y2 + hNom2, wLev - wNb, hSous2, { fill: FOND });
    texte(xLev(i) + wNb + (wLev - wNb) / 2, y2 + hNom2 + hSous2 / 2, '%', { size: 7, bold: true });
  });

  const yCorps2 = y2 + hNom2 + hSous2;

  // Étiquettes de gauche : un champ (ex. Français) couvre ses épreuves consécutives
  let k = 0;
  while (k < EPREUVES_RAPPORT.length) {
    const groupe = EPREUVES_RAPPORT[k].groupe;
    let n = 0;
    while (k + n < EPREUVES_RAPPORT.length && EPREUVES_RAPPORT[k + n].groupe === groupe) n++;
    const yG = yCorps2 + k * hLig2;
    if (n === 1) {
      rect(MARGE, yG, wChamp + wSous, hLig2);
      texte(MARGE + 1.5, yG + hLig2 / 2, groupe, { align: 'left', size: 7, bold: true });
    } else {
      rect(MARGE, yG, wChamp, n * hLig2);
      texte(MARGE + wChamp / 2, yG + (n * hLig2) / 2, groupe, { size: 7, bold: true });
      for (let m = 0; m < n; m++) {
        rect(MARGE + wChamp, yG + m * hLig2, wSous, hLig2);
        texte(MARGE + wChamp + 1.5, yG + m * hLig2 + hLig2 / 2, EPREUVES_RAPPORT[k + m].libelle, { align: 'left', size: 6.5 });
      }
    }
    k += n;
  }

  EPREUVES_RAPPORT.forEach((ep, idx) => {
    const y = yCorps2 + idx * hLig2;
    colonnes.forEach(({ r }, i) => {
      rect(xLev(i), y, wNb, hLig2);
      rect(xLev(i) + wNb, y, wLev - wNb, hLig2);
      const st = r?.parEpreuve?.[ep.id];
      if (st) {
        texte(xLev(i) + wNb / 2, y + hLig2 / 2, fmtEntier(st.atteint.T), { size: 7.5 });
        texte(xLev(i) + wNb + (wLev - wNb) / 2, y + hLig2 / 2, fmtPctCourt(st.pourcentage.T), { size: 6.5 });
      }
    });
  });
  const yFin2 = yCorps2 + EPREUVES_RAPPORT.length * hLig2;

  pied(texte, page, meta, yFin2 + 8);
  ajouterFiligrane(formes, page, filigrane);
  return { page, formes };
}

// ==========================================================
// FICHE 2 : synthèse niveau école (une seule ligne)
// ==========================================================
export function construireSyntheseEcole({ consolidation, etape, meta = {}, filigrane = '' }) {
  const page = PAGE_A4_PAYSAGE;
  const { formes, texte, rect } = creerOutils();

  // --- En-tête ---
  texte(MARGE, 13, 'MINISTÈRE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE', { align: 'left', size: 7, bold: true });
  texte(MARGE, 17, 'RÉPUBLIQUE DU BÉNIN', { align: 'left', size: 7 });
  texte(MARGE, 24, `DIRECTION DÉPARTEMENTALE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE DU ${meta.direction || POINTILLES}`, { align: 'left', size: 7 });
  texte(MARGE, 28, `RÉGION PÉDAGOGIQUE N°${meta.region || POINTILLES}`, { align: 'left', size: 7 });
  texte(MARGE, 32.5, `CIRCONSCRIPTION SCOLAIRE DE ${meta.circonscription || POINTILLES}`, { align: 'left', size: 7.5, bold: true });
  texte(MARGE, 37, `ÉCOLE : ${meta.ecole || POINTILLES}`, { align: 'left', size: 7.5 });
  texte(page.w - MARGE, 13, `Année scolaire : ${meta.annee || POINTILLES}`, { align: 'right', size: 8 });
  texte(page.w - MARGE, 28, `BP : ${meta.bp || POINTILLES}`, { align: 'right', size: 7.5 });
  texte(page.w / 2, 46, `SYNTHÈSE DE L'ÉVALUATION CERTIFICATIVE D'ÉTAPE N°${etape}`, { size: 12, bold: true });
  texte(page.w / 2, 52, 'NIVEAU ÉCOLE', { size: 9, bold: true });

  // --- Tableau : une ligne pour l'école ---
  const wEcole = 70;
  const wNum = 17;
  const y0 = 58;
  const hNom = 9;
  const hSous = 7;
  const hLigne = 12;
  const xGroupe = (i) => MARGE + wEcole + i * 3 * wNum;
  const yCorps = y0 + hNom + hSous;
  const r = consolidation.ecole;

  rect(MARGE, y0, wEcole, hNom + hSous, { fill: FOND });
  texte(MARGE + wEcole / 2, y0 + (hNom + hSous) / 2, 'ÉCOLE', { size: 9, bold: true });
  rect(MARGE, yCorps, wEcole, hLigne);
  texte(MARGE + 2, yCorps + hLigne / 2, meta.ecole || '', { align: 'left', size: 9, bold: true });

  [
    ['INSCRITS', 'inscrits'],
    ['ONT COMPOSÉ', 'composes'],
    ['ONT LA MOYENNE', 'recus'],
    ['POURCENTAGE', 'pourcentage']
  ].forEach(([titre, cle], i) => {
    rect(xGroupe(i), y0, 3 * wNum, hNom, { fill: FOND });
    texte(xGroupe(i) + 1.5 * wNum, y0 + hNom / 2, titre, { size: 8, bold: true });
    SEXES.forEach((s, j) => {
      rect(xGroupe(i) + j * wNum, y0 + hNom, wNum, hSous, { fill: FOND });
      texte(xGroupe(i) + (j + 0.5) * wNum, y0 + hNom + hSous / 2, s, { size: 8, bold: true });
      rect(xGroupe(i) + j * wNum, yCorps, wNum, hLigne);
      if (r) {
        const v = r[cle][s];
        texte(xGroupe(i) + (j + 0.5) * wNum, yCorps + hLigne / 2, cle === 'pourcentage' ? fmtPctCourt(v) : fmtEntier(v), {
          size: cle === 'pourcentage' ? 8 : 10, bold: true
        });
      }
    });
  });

  pied(texte, page, meta, yCorps + hLigne + 14);
  ajouterFiligrane(formes, page, filigrane);
  return { page, formes };
}

// ==========================================================
// TABLEAUX POUR EXCEL
// ==========================================================
const titreExcel = (base, etape, filigrane) => `${base} N°${etape}${filigrane ? ` [${filigrane}]` : ''}`;

export function tableauSyntheseNiveaux({ consolidation, etape, meta = {}, filigrane = '' }) {
  const colonnes = colonnesNiveaux(consolidation);
  const val = (r, cle, s) => (r ? r[cle][s] : '');

  const lignes = [
    [titreExcel("FICHE DE SYNTHÈSE DES RÉSULTATS DE L'ÉVALUATION D'ÉTAPE", etape, filigrane)],
    [`École : ${meta.ecole || ''}`, `Circonscription : ${meta.circonscription || ''}`, `Année scolaire : ${meta.annee || ''}`],
    [],
    ['Effectifs', ...colonnes.flatMap(({ nom }) => SEXES.map((s) => `${nom} ${s}`))],
    ['Inscrits', ...colonnes.flatMap(({ r }) => SEXES.map((s) => val(r, 'inscrits', s)))],
    ['Ont composé', ...colonnes.flatMap(({ r }) => SEXES.map((s) => val(r, 'composes', s)))],
    ['Ont atteint le seuil de réussite', ...colonnes.flatMap(({ r }) => SEXES.map((s) => val(r, 'recus', s)))],
    ['Pourcentage (%)', ...colonnes.flatMap(({ r }) => SEXES.map((s) => val(r, 'pourcentage', s)))],
    [],
    ['Champ de formation', 'Épreuve', ...colonnes.flatMap(({ nom }) => [`${nom} : nb ayant atteint la moyenne`, `${nom} : %`])]
  ];
  for (const ep of EPREUVES_RAPPORT) {
    lignes.push([
      ep.groupe,
      ep.libelle,
      ...colonnes.flatMap(({ r }) => {
        const st = r?.parEpreuve?.[ep.id];
        return st ? [st.atteint.T, st.pourcentage.T ?? ''] : ['', ''];
      })
    ]);
  }
  return lignes;
}

export function tableauSyntheseEcole({ consolidation, etape, meta = {}, filigrane = '' }) {
  const r = consolidation.ecole;
  const val = (cle, s) => (r ? r[cle][s] : '');
  return [
    [titreExcel("SYNTHÈSE DE L'ÉVALUATION CERTIFICATIVE D'ÉTAPE", etape, filigrane)],
    [`Circonscription : ${meta.circonscription || ''}`, `Année scolaire : ${meta.annee || ''}`],
    [],
    ['École', ...['Inscrits', 'Ont composé', 'Ont la moyenne', 'Pourcentage (%)'].flatMap((g) => SEXES.map((s) => `${g} ${s}`))],
    [meta.ecole || '', ...['inscrits', 'composes', 'recus', 'pourcentage'].flatMap((cle) => SEXES.map((s) => val(cle, s)))]
  ];
}