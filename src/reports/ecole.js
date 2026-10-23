// ==========================================================
// CONSOLIDATION DE L'ÉCOLE (fonction pure)
// Additionne les classes d'un même niveau (une ou plusieurs par niveau), puis les niveaux de l'école.
// On additionne toujours des EFFECTIFS et on recalcule les pourcentages à partir des sommes.
// ==========================================================
import { consoliderClasses } from './metrics.js';

export const NIVEAUX = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];

/**
 * @param {{ id: string, niveau: string, resultat: object|null }[]} entrees
 *   resultat : résultat d'une classe (calculerClasse ou versResultat), ou null si les données manquent
 * @returns {{ parNiveau: { niveau, nbEntrees, nbSansDonnees, resultat|null }[], ecole: object|null }}
 */
export function consoliderEcole(entrees, options = {}) {
  const parNiveau = NIVEAUX.map((niveau) => {
    const liste = entrees.filter((e) => e.niveau === niveau);
    const avecDonnees = liste.filter((e) => e.resultat);
    return {
      niveau,
      nbEntrees: liste.length,
      nbSansDonnees: liste.length - avecDonnees.length,
      resultat: avecDonnees.length ? consoliderClasses(avecDonnees.map((e) => e.resultat), options) : null
    };
  });
  const consolides = parNiveau.filter((n) => n.resultat).map((n) => n.resultat);
  return { parNiveau, ecole: consolides.length ? consoliderClasses(consolides, options) : null };
}