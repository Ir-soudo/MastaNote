// ==========================================================
// STATISTIQUES D'ABONNEMENT : compte les licences Chariow par formule et par statut.
// À placer à la racine du dépôt, à côté de server.js. Sans dépendance.
//
// CONFIDENTIALITÉ : la liste des licences renvoie, pour chaque licence, l'e-mail et le téléphone du client et la clé
// complète. Ce fichier les LIT pour compter, puis les oublie : le résultat ne contient que des nombres.
// Rien n'est enregistré, et aucun contenu de réponse n'est écrit dans les journaux ni dans les messages d'erreur.
//
// Clé utilisée : une clé Chariow de LECTURE SEULE, avec le seul droit « licenses.read » (variable CHARIOW_STATS_KEY).
// ==========================================================

const BASE_API = 'https://api.chariow.com/v1';
export const STATUTS = ['active', 'pending_activation', 'expired', 'revoked'];

// Les trois formules actuelles (identifiants Chariow, publics : ils figurent dans les liens de paiement)
export const PRODUITS_PAR_DEFAUT = [
  { id: 'prd_z2kjla30', libelle: '1 an (Découverte)' },
  { id: 'prd_6duiuhl1', libelle: '3 ans (Sérénité)' },
  { id: 'prd_s877x4vl', libelle: '5 ans (VIP)' }
];

const statutsVides = () => ({ active: 0, pending_activation: 0, expired: 0, revoked: 0, autre: 0 });

// Messages d'erreur sûrs : construits ici, jamais recopiés depuis la réponse de Chariow
function erreurHttp(statut) {
  if (statut === 401) return new Error('Chariow refuse la clé de lecture (401) : elle est invalide ou a été supprimée.');
  if (statut === 403) return new Error("Chariow refuse l'accès (403) : la clé de lecture doit avoir le droit « licenses.read ».");
  if (statut === 429) return new Error('Chariow limite les requêtes (429) : réessayez dans une minute.');
  return new Error(`Chariow a répondu par une erreur (${statut}).`);
}

async function lirePage(url, cle, fetchImpl, delaiMs) {
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), delaiMs);
  try {
    const reponse = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${cle}`, Accept: 'application/json' },
      signal: controleur.signal
    });
    if (!reponse.ok) throw erreurHttp(reponse.status);
    return await reponse.json();
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error("Chariow n'a pas répondu à temps.");
    throw err;
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Compte les licences de chaque formule, page par page (100 licences par page).
 * @returns {{ produits: { id, libelle, total, parStatut, incomplet }[], total: { total, parStatut }, genereLe: string }}
 *   incomplet = true si la limite de pages a été atteinte avant la fin de la liste.
 */
export async function compterLicences({
  cle,
  produits = PRODUITS_PAR_DEFAUT,
  fetchImpl = fetch,
  base = BASE_API,
  maxPages = 50,
  delaiMs = 15000,
  maintenant = () => new Date()
} = {}) {
  if (!cle) throw new Error('Clé de lecture Chariow manquante.');

  const resultat = [];
  for (const produit of produits) {
    const parStatut = statutsVides();
    let total = 0;
    let curseur = null;
    let pages = 0;
    let incomplet = false;

    for (;;) {
      const url =
        `${base}/licenses?product_id=${encodeURIComponent(produit.id)}&per_page=100` +
        (curseur ? `&cursor=${encodeURIComponent(curseur)}` : '');
      const corps = await lirePage(url, cle, fetchImpl, delaiMs);
      pages += 1;

      for (const licence of Array.isArray(corps?.data) ? corps.data : []) {
        total += 1;
        parStatut[STATUTS.includes(licence?.status) ? licence.status : 'autre'] += 1;
      }

      const pagination = corps?.pagination;
      if (!pagination?.has_more_pages || !pagination?.next_cursor) break;
      if (pages >= maxPages) {
        incomplet = true;
        break;
      }
      curseur = pagination.next_cursor;
    }
    resultat.push({ id: produit.id, libelle: produit.libelle, total, parStatut, incomplet });
  }

  const somme = statutsVides();
  let totalGeneral = 0;
  for (const p of resultat) {
    totalGeneral += p.total;
    for (const [statut, nombre] of Object.entries(p.parStatut)) somme[statut] += nombre;
  }
  return { produits: resultat, total: { total: totalGeneral, parStatut: somme }, genereLe: maintenant().toISOString() };
}

/**
 * Garde un résultat en mémoire quelques minutes : Chariow limite à 100 requêtes par minute et par clé.
 * Deux demandes simultanées partagent le même calcul ; une erreur n'est jamais gardée.
 */
export function creerCache(dureeMs, maintenant = () => Date.now()) {
  const entrees = new Map();
  return {
    async obtenir(cle, fabrique) {
      const existant = entrees.get(cle);
      if (existant && existant.promesse) return existant.promesse;
      if (existant && maintenant() - existant.t < dureeMs) return existant.valeur;

      const promesse = fabrique()
        .then((valeur) => {
          entrees.set(cle, { t: maintenant(), valeur });
          return valeur;
        })
        .catch((err) => {
          entrees.delete(cle);
          throw err;
        });
      entrees.set(cle, { promesse });
      return promesse;
    },
    invalider() {
      entrees.clear();
    }
  };
}