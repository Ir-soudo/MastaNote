// ==========================================================
// MISE EN PAGE DE LA FICHE DE CLASSE (« Résultats de l'évaluation d'étape »)
// Fonctions pures, sans dépendance. Le rapport est décrit UNE SEULE FOIS comme une liste de formes
// (rectangles, textes, lignes) en millimètres ; l'aperçu, le PDF et l'image sont dessinés à partir de cette liste,
// donc identiques entre eux.
// ==========================================================

export const PAGE_A4_PAYSAGE = { w: 297, h: 210 };

// Lignes de la fiche, dans l'ordre lu sur la fiche de référence, avec l'épreuve MastaNote correspondante.
// À corriger ici si l'ordre ou un libellé de la fiche officielle diffère.
export const LIGNES_FICHE_CLASSE = [
  { label: 'CE', epreuve: 'comprehension' },
  { label: 'CO', epreuve: 'communication_orale' },
  { label: 'EE', epreuve: 'expression_ecrite' },
  { label: 'EST', epreuve: 'est' },
  { label: 'ES', epreuve: 'es' },
  { label: 'EA/OR', epreuve: 'ea_oral' },
  { label: 'MATHS', epreuve: 'maths' },
  { label: 'DICTÉE', epreuve: 'dictee' },
  { label: 'EA/DESSIN/COUTURE', epreuve: 'ea_dessin' },
  { label: 'EPS', epreuve: 'eps' }
];

// Groupes de colonnes (chacun en G, F, T)
const GROUPES = [
  { cle: 'inscrits', titre: ['INSCRITS'] },
  { cle: 'composes', titre: ['ONT COMPOSÉ'] },
  { cle: 'partielle', titre: ['Ont la maîtrise', "partielle / n'ont pas", 'atteint le seuil', 'de réussite'] },
  { cle: 'minimale', titre: ['Ont atteint la', 'maîtrise minimale /', 'atteint le seuil', 'de réussite'] },
  { cle: 'pourcentage', titre: ['POURCENTAGE', 'DE RÉUSSITE'] }
];
const SEXES = ['G', 'F', 'T'];

// Géométrie (millimètres)
const MARGE = 10;
const COL_LABEL = 38;
const COL_NUM = 11.5;
const COL_RENF = 14;
const HAUT_ENTETE = 20;
const HAUT_SOUS_ENTETE = 6;
const HAUT_LIGNE = 9;
const Y_TABLEAU = 46;
const FOND_ENTETE = '#eef1f6';

export const fmtEntier = (v) => (v === null || v === undefined ? '' : String(v));
export const fmtPctCourt = (v) => (v === null || v === undefined ? '-' : `${String(v).replace('.', ',')}%`);

const sansAccents = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** « CM2 » + « CM2 Émeraude » -> « CM2 Émeraude » (le niveau n'est pas répété) ; « CM2 » + « Émeraude » -> « CM2 - Émeraude ». */
export function libelleClasse(classe) {
  if (!classe.nom) return classe.niveau;
  return sansAccents(classe.nom).includes(sansAccents(classe.niveau)) ? classe.nom : `${classe.niveau} - ${classe.nom}`;
}

/** Découpe un texte en lignes de maxCar caractères au plus ; au-delà de maxLignes, la dernière ligne finit par « ... ». */
export function envelopper(texte, maxCar, maxLignes) {
  const mots = String(texte ?? '').split(/\s+/).filter(Boolean);
  const lignes = [];
  let courante = '';
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (essai.length <= maxCar) {
      courante = essai;
    } else {
      if (courante) lignes.push(courante);
      courante = mot.length > maxCar ? mot.slice(0, maxCar) : mot;
    }
  }
  if (courante) lignes.push(courante);
  if (lignes.length > maxLignes) {
    const gardees = lignes.slice(0, maxLignes);
    gardees[maxLignes - 1] = gardees[maxLignes - 1].slice(0, Math.max(0, maxCar - 3)) + '...';
    return gardees;
  }
  return lignes;
}

// Les 5 groupes de chiffres d'une ligne (chacun { G, F, T })
function groupesDeLigne(resultat, epreuveId) {
  const st = resultat.parEpreuve[epreuveId];
  return {
    inscrits: resultat.inscrits,
    composes: st.composes,
    partielle: st.nonAtteint,
    minimale: st.atteint,
    pourcentage: st.pourcentage
  };
}

const renforcerMaths = (resultat) => resultat.parEpreuve?.maths?.nonAtteint?.T ?? 0;
const renforcerFrancais = (resultat) => resultat.parGroupe?.['Français']?.nonAtteint?.T ?? 0;

/**
 * Construit la fiche de classe.
 * @param {{ classe: {nom: string, niveau: string}, etape: number, resultat: object, meta?: object, observations?: string }} donnees
 * @returns {{ page: {w: number, h: number}, formes: object[] }}
 */
export function construireFicheClasse({ classe, etape, resultat, meta = {}, observations = '', filigrane = '' }) {
  const page = PAGE_A4_PAYSAGE;
  const formes = [];
  const texte = (x, y, s, o = {}) => formes.push({ t: 'text', x, y, s, size: 8, align: 'center', ...o });
  const rect = (x, y, w, h, o = {}) => formes.push({ t: 'rect', x, y, w, h, sw: 0.25, ...o });

  // --- En-tête de la page ---
  texte(MARGE, 14, 'MINISTÈRE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE', { align: 'left', size: 7, bold: true });
  texte(MARGE, 18, 'RÉPUBLIQUE DU BÉNIN', { align: 'left', size: 7 });
  texte(MARGE, 25, `CIRCONSCRIPTION SCOLAIRE : ${meta.circonscription || '..........'}`, { align: 'left', size: 7.5 });
  texte(MARGE, 29.5, `ÉCOLE : ${meta.ecole || '..........'}`, { align: 'left', size: 7.5 });
  texte(page.w - MARGE, 14, `Année scolaire : ${meta.annee || '..........'}`, { align: 'right', size: 8 });
  texte(page.w / 2, 34, `RÉSULTATS DE L'ÉVALUATION D'ÉTAPE N°${etape}`, { size: 13, bold: true });
  texte(page.w / 2, 40.5, `CLASSE : ${libelleClasse(classe)}`, { size: 9, bold: true });

  // --- Géométrie du tableau ---
  const xGroupe = (i) => MARGE + COL_LABEL + i * 3 * COL_NUM;
  const xRenf = MARGE + COL_LABEL + GROUPES.length * 3 * COL_NUM;
  const xObs = xRenf + 2 * COL_RENF;
  const wObs = page.w - MARGE - xObs;
  const yEntete = Y_TABLEAU;
  const ySous = yEntete + HAUT_ENTETE;
  const yCorps = ySous + HAUT_SOUS_ENTETE;
  const hCorps = LIGNES_FICHE_CLASSE.length * HAUT_LIGNE;
  const yFin = yCorps + hCorps;

  // --- En-têtes ---
  rect(MARGE, yEntete, COL_LABEL, HAUT_ENTETE + HAUT_SOUS_ENTETE, { fill: FOND_ENTETE });
  texte(MARGE + COL_LABEL / 2, yEntete + (HAUT_ENTETE + HAUT_SOUS_ENTETE) / 2, 'ÉPREUVES', { size: 8, bold: true });

  GROUPES.forEach((g, i) => {
    rect(xGroupe(i), yEntete, 3 * COL_NUM, HAUT_ENTETE, { fill: FOND_ENTETE });
    const n = g.titre.length;
    g.titre.forEach((ligne, k) => {
      texte(xGroupe(i) + 1.5 * COL_NUM, yEntete + HAUT_ENTETE / 2 + (k - (n - 1) / 2) * 3.2, ligne, {
        size: n > 1 ? 6.5 : 7.5,
        bold: n === 1 || k === 0 ? n === 1 : false
      });
    });
    SEXES.forEach((s, j) => {
      rect(xGroupe(i) + j * COL_NUM, ySous, COL_NUM, HAUT_SOUS_ENTETE, { fill: FOND_ENTETE });
      texte(xGroupe(i) + (j + 0.5) * COL_NUM, ySous + HAUT_SOUS_ENTETE / 2, s, { size: 7, bold: true });
    });
  });

  rect(xRenf, yEntete, 2 * COL_RENF, HAUT_ENTETE, { fill: FOND_ENTETE });
  texte(xRenf + COL_RENF, yEntete + HAUT_ENTETE / 2, 'À RENFORCER', { size: 7.5, bold: true });
  ['Maths', 'Français'].forEach((s, j) => {
    rect(xRenf + j * COL_RENF, ySous, COL_RENF, HAUT_SOUS_ENTETE, { fill: FOND_ENTETE });
    texte(xRenf + (j + 0.5) * COL_RENF, ySous + HAUT_SOUS_ENTETE / 2, s, { size: 6.5, bold: true });
  });

  rect(xObs, yEntete, wObs, HAUT_ENTETE + HAUT_SOUS_ENTETE, { fill: FOND_ENTETE });
  texte(xObs + wObs / 2, yEntete + (HAUT_ENTETE + HAUT_SOUS_ENTETE) / 2, 'OBS', { size: 8, bold: true });

  // --- Corps : une ligne par épreuve ---
  LIGNES_FICHE_CLASSE.forEach((ligne, k) => {
    const y = yCorps + k * HAUT_LIGNE;
    rect(MARGE, y, COL_LABEL, HAUT_LIGNE);
    texte(MARGE + 1.5, y + HAUT_LIGNE / 2, ligne.label, { align: 'left', size: 8, bold: true });

    const valeurs = groupesDeLigne(resultat, ligne.epreuve);
    GROUPES.forEach((g, i) => {
      SEXES.forEach((s, j) => {
        const v = valeurs[g.cle][s];
        rect(xGroupe(i) + j * COL_NUM, y, COL_NUM, HAUT_LIGNE);
        texte(
          xGroupe(i) + (j + 0.5) * COL_NUM,
          y + HAUT_LIGNE / 2,
          g.cle === 'pourcentage' ? fmtPctCourt(v) : fmtEntier(v),
          { size: g.cle === 'pourcentage' ? 7 : 9 }
        );
      });
    });
  });

  // --- Colonnes fusionnées : à renforcer et observations ---
  [renforcerMaths(resultat), renforcerFrancais(resultat)].forEach((v, j) => {
    rect(xRenf + j * COL_RENF, yCorps, COL_RENF, hCorps);
    texte(xRenf + (j + 0.5) * COL_RENF, yCorps + hCorps / 2, fmtEntier(v), { size: 12, bold: true });
  });

  rect(xObs, yCorps, wObs, hCorps);
  envelopper(observations, 22, 26).forEach((ligne, k) => {
    texte(xObs + 1.5, yCorps + 3.5 + k * 3.2, ligne, { align: 'left', size: 7 });
  });

  // --- Pied de page ---
  const yPied = yFin + 8;
  texte(MARGE, yPied, `Fait à ${meta.lieu || '..........'}, le ${meta.date || '..........'}`, { align: 'left', size: 8 });
  texte(page.w - MARGE - 25, yPied, 'Le Directeur', { size: 8, bold: true });
  if (meta.directeur) texte(page.w - MARGE - 25, yPied + 22, meta.directeur, { size: 8 });

  // Filigrane (fiche d'exemple) : grand mot en travers de la page, pour qu'elle ne soit jamais prise pour un vrai rapport
  if (filigrane) {
    formes.push({
      t: 'text', x: page.w / 2, y: page.h / 2, s: filigrane, size: 80, bold: true,
      color: '#c0392b', opacite: 0.18, rotate: -25, align: 'center'
    });
  }

  return { page, formes };
}

/** Le même rapport sous forme de tableau (lignes de cellules), pour l'export Excel. */
export function tableauFicheClasse({ classe, etape, resultat, meta = {}, observations = '', filigrane = '' }) {
  const entete = ['Épreuve'];
  for (const g of ['Inscrits', 'Ont composé', 'Maîtrise partielle (sous le seuil)', 'Seuil atteint', '% de réussite']) {
    for (const s of SEXES) entete.push(`${g} ${s}`);
  }
  entete.push('À renforcer Maths', 'À renforcer Français', 'Observations');

  const lignes = [
    [`RÉSULTATS DE L'ÉVALUATION D'ÉTAPE N°${etape}${filigrane ? ` [${filigrane}]` : ''}`],
    [`École : ${meta.ecole || ''}`, `Classe : ${classe.niveau} ${classe.nom || ''}`.trim(), `Année scolaire : ${meta.annee || ''}`],
    [],
    entete
  ];

  LIGNES_FICHE_CLASSE.forEach((ligne, k) => {
    const valeurs = groupesDeLigne(resultat, ligne.epreuve);
    const cellules = [ligne.label];
    for (const g of GROUPES) {
      for (const s of SEXES) cellules.push(valeurs[g.cle][s] ?? '');
    }
    cellules.push(k === 0 ? renforcerMaths(resultat) : '', k === 0 ? renforcerFrancais(resultat) : '', k === 0 ? observations : '');
    lignes.push(cellules);
  });

  return lignes;
}