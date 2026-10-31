// ==========================================================
// DONNÉES FICTIVES pour la fiche « EXEMPLE » : permet d'essayer les téléchargements (PDF, image, Excel)
// sans aucune donnée réelle. 30 élèves inventés, 2 absents, notes calculées par une formule fixe
// (toujours les mêmes chiffres). Aucun nom, aucun vrai résultat.
// ==========================================================
import { EPREUVES_IDS, calculerClasse } from './metrics.js';

export function construireElevesExemple(decalage = 0) {
  const eleves = [];
  for (let i = 0; i < 30; i++) {
    const epreuves = {};
    EPREUVES_IDS.forEach((id, j) => {
      const note = ((i * 7 + j * 5 + 3 + decalage) % 15) + 4; // de 4 à 18 (le décalage varie les chiffres d'un niveau à l'autre)
      epreuves[id] = { note, perf: note >= 10 ? ((i + j) % 3) * 0.5 : 0 };
    });
    eleves.push({
      id: `ex${i}`,
      sexe: i % 5 < 3 ? 'M' : 'F', // 18 garçons, 12 filles
      absent: i === 7 || i === 19,
      epreuves
    });
  }
  return eleves;
}

export const resultatExemple = (decalage = 0) => calculerClasse(construireElevesExemple(decalage));