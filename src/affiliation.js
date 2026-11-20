// ==========================================================
// AFFILIATION — logique pure (sans React, testable avec « node src/affiliation.test.js »)
//
// Principe : l'utilisateur crée son espace affilié chez Chariow, qui lui donne un code personnel. Ce code est le même pour
// toutes les formules : « ?chw_affiliate=CODE » à la suite de l'adresse du produit. MastaNote construit donc lui-même
// les liens à partir de ce code, TOUJOURS sur la boutique ci-dessous (jamais sur un domaine collé par l'utilisateur).
// ==========================================================

export const BOUTIQUE = 'https://soudoboutik-ebook.mychariow.shop';
export const ESPACE_AFFILIE = 'https://affiliate.chariow.com';
export const TAUX_COMMISSION = 30;

// Formules ouvertes à l'affiliation (identifiants Chariow, publics : ils figurent dans les liens de paiement)
export const FORMULES = [
  { id: 'prd_6duiuhl1', libelle: 'Formule 3 ans', prix: 3000 },
  { id: 'prd_s877x4vl', libelle: 'Formule 5 ans', prix: 5000 }
];

const FORMAT_CODE = /^[A-Za-z0-9_-]{4,50}$/;

/**
 * Lit ce que l'utilisateur a collé : un code seul, ou un lien contenant « chw_affiliate=CODE » (éventuellement noyé dans
 * une phrase). Renvoie { code } si tout va bien, sinon { raison } : 'lien-court' | 'sans-code' | 'invalide'.
 * Une saisie vide renvoie {}.
 */
export function extraireCode(saisie) {
  const texte = String(saisie ?? '').trim();
  if (!texte) return {};

  const trouve = texte.match(/https?:\/\/[^\s]+/i);
  if (trouve) {
    let url;
    try {
      url = new URL(trouve[0]);
    } catch (err) {
      return { raison: 'invalide' };
    }
    // Le lien court de Chariow est une simple redirection : il ne contient pas le code
    if (url.hostname === 'chariow.ly' || url.hostname.endsWith('.chariow.ly')) return { raison: 'lien-court' };
    const code = url.searchParams.get('chw_affiliate');
    if (!code) return { raison: 'sans-code' };
    return FORMAT_CODE.test(code) ? { code } : { raison: 'invalide' };
  }
  return FORMAT_CODE.test(texte) ? { code: texte } : { raison: 'invalide' };
}

/** Lien d'achat d'une formule avec le code de l'affilié. Toujours sur la boutique, le code est encodé. */
export function construireLien(code, produitId) {
  return `${BOUTIQUE}/${produitId}?chw_affiliate=${encodeURIComponent(code)}`;
}

/** Commission en FCFA pour un prix donné. */
export function commission(prix, taux = TAUX_COMMISSION) {
  return Math.round((prix * taux) / 100);
}

/** 1500 → « 1 500 ». Espace ordinaire, identique partout. */
export function formaterMontant(nombre) {
  return String(Math.round(nombre)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Message de partage. Il décrit l'application et donne le prix : il ne promet AUCUN gain et ne parle pas de commission
 * (règles données aux affiliés : honnêteté sur le prix, pas de promesse de gain, pas de spam).
 */
export function messagePartage(formule, lien) {
  return (
    'Découvrez MastaNote AI+ : une application de gestion des notes et des moyennes pour les enseignants du primaire. ' +
    `${formule.libelle} à ${formaterMontant(formule.prix)} FCFA : ${lien}`
  );
}