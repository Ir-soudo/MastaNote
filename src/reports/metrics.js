// ==========================================================
// MOTEUR DE CALCUL DES RAPPORTS D'ÉTAPE
// Fonctions pures : elles LISENT des données et renvoient des résultats, sans rien modifier.
// Aucun calcul n'est confié à l'IA. Tous les montants passent par des entiers (centièmes)
// pour éviter les erreurs d'arrondi des nombres à virgule.
// ==========================================================
import { EPREUVES_RAPPORT, MODE_ARRONDI_DEFAUT, SEUIL_REUSSITE } from './config.js';

export const EPREUVES_IDS = EPREUVES_RAPPORT.map((e) => e.id);

/**
 * Données d'un élève pour le moteur :
 * @typedef {Object} EleveRapport
 * @property {string} id
 * @property {'M'|'F'|undefined} [sexe]            M = garçon (colonne G), F = fille
 * @property {boolean} [absent]                    absent à l'étape : exclu des « ont composé »
 * @property {Object<string, {note?: number, perf?: number}>} [epreuves]   épreuve -> note et perfectionnement
 */

const versCentiemes = (valeur) => Math.round(valeur * 100);

/** Note totale d'une épreuve = note obtenue + perfectionnement (en centièmes, sans erreur de virgule). */
export function totalEpreuve(cellule) {
  return (versCentiemes(cellule.note) + versCentiemes(cellule.perf ?? 0)) / 100;
}

/**
 * Pourcentage à 2 décimales de numerateur / denominateur (entiers : des effectifs).
 * Renvoie null si le dénominateur est nul (rien à calculer).
 */
export function pourcentage(numerateur, denominateur, mode = MODE_ARRONDI_DEFAUT) {
  if (!Number.isFinite(numerateur) || !Number.isFinite(denominateur) || denominateur <= 0) return null;
  const centiemes =
    mode === 'arrondi'
      ? Math.floor((numerateur * 20000 + denominateur) / (2 * denominateur)) // moitié vers le haut
      : Math.floor((numerateur * 10000) / denominateur); // troncature
  return centiemes / 100;
}

/** Moyenne à 2 décimales d'une liste de notes (coefficient 1). Renvoie null si la liste est vide. */
export function moyenne(valeurs, mode = MODE_ARRONDI_DEFAUT) {
  const n = valeurs.length;
  if (n === 0) return null;
  const somme = valeurs.reduce((acc, v) => acc + versCentiemes(v), 0); // en centièmes
  const centiemes = mode === 'arrondi' ? Math.floor((somme * 2 + n) / (2 * n)) : Math.floor(somme / n);
  return centiemes / 100;
}

/**
 * Évalue un élève : total par épreuve, moyenne générale et réussite.
 * La comparaison au seuil se fait sur la moyenne déjà ramenée à 2 décimales.
 */
export function evaluerEleve(eleve, epreuveIds = EPREUVES_IDS, options = {}) {
  const { seuil = SEUIL_REUSSITE, mode = MODE_ARRONDI_DEFAUT } = options;
  const totaux = {};
  const manquantes = [];
  for (const id of epreuveIds) {
    const cellule = eleve.epreuves?.[id];
    if (cellule && Number.isFinite(cellule.note)) totaux[id] = totalEpreuve(cellule);
    else manquantes.push(id);
  }
  const moyenneGenerale = moyenne(Object.values(totaux), mode);
  return {
    absent: Boolean(eleve.absent),
    totaux,
    manquantes,
    moyenneGenerale,
    recu: !eleve.absent && moyenneGenerale !== null && moyenneGenerale >= seuil
  };
}

// --- Effectifs par sexe : { G, F, T } ---
const zero = () => ({ G: 0, F: 0, T: 0 });
const additionner = (a, b) => ({ G: a.G + b.G, F: a.F + b.F, T: a.T + b.T });
const soustraire = (a, b) => ({ G: a.G - b.G, F: a.F - b.F, T: a.T - b.T });

function compter(eleves) {
  const r = zero();
  for (const e of eleves) {
    r.T += 1;
    if (e.sexe === 'M') r.G += 1;
    else if (e.sexe === 'F') r.F += 1;
  }
  return r;
}

const pourcentagesTriple = (num, den, mode) => ({
  G: pourcentage(num.G, den.G, mode),
  F: pourcentage(num.F, den.F, mode),
  T: pourcentage(num.T, den.T, mode)
});

/**
 * Calcule les effectifs et les résultats d'UNE classe.
 *  - inscrits   : tous les élèves de la classe
 *  - composes   : les élèves non absents à l'étape
 *  - recus      : parmi les « ont composé », ceux dont la moyenne générale atteint le seuil
 *  - pourcentage: recus / composes
 *  - parEpreuve : pour chaque épreuve, ceux qui ont composé, ceux qui ont atteint le seuil, ceux qui sont à renforcer
 *  - parGroupe  : même chose par groupe d'épreuves (ex. « Français » = moyenne de ses épreuves, coefficient 1)
 * Les élèves sans sexe renseigné comptent dans T seulement (signalés par sansSexe).
 */
export function calculerClasse(eleves, options = {}) {
  const { epreuves = EPREUVES_IDS, seuil = SEUIL_REUSSITE, mode = MODE_ARRONDI_DEFAUT } = options;

  const evalues = eleves.map((eleve) => ({ eleve, ev: evaluerEleve(eleve, epreuves, { seuil, mode }) }));
  const presents = evalues.filter((x) => !x.ev.absent);

  const inscrits = compter(eleves);
  const composes = compter(presents.map((x) => x.eleve));
  const recus = compter(presents.filter((x) => x.ev.recu).map((x) => x.eleve));

  const parEpreuve = {};
  for (const id of epreuves) {
    const ayantComposeCetteEpreuve = presents.filter((x) => id in x.ev.totaux);
    const compose = compter(ayantComposeCetteEpreuve.map((x) => x.eleve));
    const atteint = compter(ayantComposeCetteEpreuve.filter((x) => x.ev.totaux[id] >= seuil).map((x) => x.eleve));
    parEpreuve[id] = {
      composes: compose,
      atteint,
      nonAtteint: soustraire(compose, atteint), // « à renforcer »
      pourcentage: pourcentagesTriple(atteint, compose, mode)
    };
  }

  // Groupes d'épreuves : un élève compte s'il a au moins une note dans le groupe ;
  // sa moyenne de groupe (coefficient 1) est comparée au seuil.
  const parGroupe = {};
  const groupes = [...new Set(EPREUVES_RAPPORT.map((e) => e.groupe))];
  for (const groupe of groupes) {
    const ids = EPREUVES_RAPPORT.filter((e) => e.groupe === groupe && epreuves.includes(e.id)).map((e) => e.id);
    if (ids.length === 0) continue;
    const concernes = presents
      .map((x) => ({ eleve: x.eleve, valeurs: ids.filter((id) => id in x.ev.totaux).map((id) => x.ev.totaux[id]) }))
      .filter((x) => x.valeurs.length > 0);
    const compose = compter(concernes.map((x) => x.eleve));
    const atteint = compter(
      concernes
        .filter((x) => {
          const m = moyenne(x.valeurs, mode);
          return m !== null && m >= seuil;
        })
        .map((x) => x.eleve)
    );
    parGroupe[groupe] = {
      composes: compose,
      atteint,
      nonAtteint: soustraire(compose, atteint),
      pourcentage: pourcentagesTriple(atteint, compose, mode)
    };
  }

  return {
    inscrits,
    composes,
    recus,
    pourcentage: pourcentagesTriple(recus, composes, mode),
    parEpreuve,
    parGroupe,
    sansSexe: eleves.filter((e) => e.sexe !== 'M' && e.sexe !== 'F').length
  };
}

// Additionne les détails (par épreuve ou par groupe) de plusieurs classes, puis recalcule les pourcentages.
function sommerDetails(resultats, cle, mode) {
  const sortie = {};
  for (const r of resultats) {
    for (const [id, st] of Object.entries(r[cle] ?? {})) {
      const courant = sortie[id] ?? { composes: zero(), atteint: zero(), nonAtteint: zero() };
      sortie[id] = {
        composes: additionner(courant.composes, st.composes),
        atteint: additionner(courant.atteint, st.atteint),
        nonAtteint: additionner(courant.nonAtteint, st.nonAtteint)
      };
    }
  }
  for (const st of Object.values(sortie)) {
    st.pourcentage = pourcentagesTriple(st.atteint, st.composes, mode);
  }
  return sortie;
}

/**
 * Additionne plusieurs classes (niveaux d'une école, par exemple) : on additionne les EFFECTIFS,
 * puis on recalcule les pourcentages à partir des sommes (jamais une moyenne de pourcentages).
 */
export function consoliderClasses(resultats, options = {}) {
  const { mode = MODE_ARRONDI_DEFAUT } = options;
  const somme = (cle) => resultats.reduce((acc, r) => additionner(acc, r[cle]), zero());

  const inscrits = somme('inscrits');
  const composes = somme('composes');
  const recus = somme('recus');

  return {
    inscrits,
    composes,
    recus,
    pourcentage: pourcentagesTriple(recus, composes, mode),
    parEpreuve: sommerDetails(resultats, 'parEpreuve', mode),
    parGroupe: sommerDetails(resultats, 'parGroupe', mode),
    sansSexe: resultats.reduce((acc, r) => acc + (r.sansSexe ?? 0), 0)
  };
}

/**
 * Contrôle des données AVANT de produire un rapport. Un rapport n'est généré que si ok === true :
 *  - 'sexe-manquant'  : élève sans sexe (les colonnes G et F seraient fausses)
 *  - 'aucune-note'    : élève non absent sans aucune note (absent non signalé ?)
 *  - 'note-manquante' : élève non absent avec une note manquante dans certaines épreuves
 */
export function verifierDonnees(eleves, epreuveIds = EPREUVES_IDS) {
  const problemes = [];
  for (const e of eleves) {
    if (e.sexe !== 'M' && e.sexe !== 'F') problemes.push({ type: 'sexe-manquant', eleveId: e.id });
    if (e.absent) continue;
    const manquantes = epreuveIds.filter((id) => !(e.epreuves?.[id] && Number.isFinite(e.epreuves[id].note)));
    if (manquantes.length === epreuveIds.length) problemes.push({ type: 'aucune-note', eleveId: e.id });
    else if (manquantes.length > 0) problemes.push({ type: 'note-manquante', eleveId: e.id, epreuves: manquantes });
  }
  return { ok: problemes.length === 0, problemes };
}