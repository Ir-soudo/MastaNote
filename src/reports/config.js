// ==========================================================
// MODULE « RAPPORTS D'ÉTAPE » — règles métier
// Fichier autonome : aucune dépendance, aucune relation avec le reste de l'application.
// Les règles ci-dessous ont été confirmées par l'éditeur le 22/10/2026.
// ==========================================================

// « Avoir la moyenne » et « avoir atteint le seuil de réussite » : note générale d'au moins 10/20.
export const SEUIL_REUSSITE = 10;

// Règle de calcul des moyennes et des pourcentages, à 2 décimales :
//   'troncature' : on garde seulement les deux premiers chiffres après la virgule (comme les fiches papier : 21/27 = 77,77 %)
//   'arrondi'    : arrondi au centième le plus proche, la moitié vers le haut (21/27 = 77,78 %)
export const MODE_ARRONDI_DEFAUT = 'troncature';

// Épreuves du rapport, dans l'ordre de la fiche officielle. Toutes ont le coefficient 1.
// Correspondances confirmées : Lecture = Compréhension de l'écrit ; Chant/Poésie = EA (Oral).
export const EPREUVES_RAPPORT = [
  { id: 'communication_orale', groupe: 'Français', libelle: 'Communication orale' },
  { id: 'comprehension', groupe: 'Français', libelle: 'Lecture' },
  { id: 'expression_ecrite', groupe: 'Français', libelle: 'Expression écrite' },
  { id: 'dictee', groupe: 'Français', libelle: 'Dictée' },
  { id: 'maths', groupe: 'Mathématique', libelle: 'Mathématique' },
  { id: 'est', groupe: 'EST', libelle: 'EST' },
  { id: 'es', groupe: 'ES', libelle: 'ES' },
  { id: 'ea_dessin', groupe: 'EA', libelle: 'Dessin/couture' },
  { id: 'ea_oral', groupe: 'EA', libelle: 'Chant/Poésie' },
  { id: 'eps', groupe: 'EPS', libelle: 'EPS' }
];

// Étape N = Sommative N. (Les évaluations formatives ne sont pas rattachées à une étape pour l'instant.)
export const ETAPES = [
  { numero: 1, evaluationId: 'sommative1' },
  { numero: 2, evaluationId: 'sommative2' },
  { numero: 3, evaluationId: 'sommative3' }
];

export function evaluationPourEtape(numero) {
  return ETAPES.find((e) => e.numero === numero)?.evaluationId ?? null;
}
