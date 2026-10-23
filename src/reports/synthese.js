// ==========================================================
// SYNTHÈSE DE CLASSE À TRANSMETTRE AU DIRECTEUR
// Un texte court (« code ») qui contient uniquement des EFFECTIFS et des TOTAUX : aucun nom d'élève.
// Il peut être copié dans WhatsApp, ou enregistré dans un fichier texte (même contenu).
// Le code se termine par une somme de contrôle : s'il est coupé ou modifié, l'import le refuse.
// Fonctions pures, sans dépendance (le navigateur et Node fournissent btoa, atob et TextEncoder).
// ==========================================================
import { EPREUVES_RAPPORT } from './config.js';
import { EPREUVES_IDS, pourcentage } from './metrics.js';

export const VERSION_SYNTHESE = 1;
const PREFIXE = 'MNS1';
const GROUPES_IDS = [...new Set(EPREUVES_RAPPORT.map((e) => e.groupe))];

// --- Codage du texte en base 64 « sûre pour les liens » (sans + / =) ---
const versBase64Url = (texte) => {
  const octets = new TextEncoder().encode(texte);
  let binaire = '';
  octets.forEach((o) => {
    binaire += String.fromCharCode(o);
  });
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const depuisBase64Url = (texte) => {
  const b64 = texte.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texte.length % 4)) % 4);
  const binaire = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(binaire, (c) => c.charCodeAt(0)));
};

// --- Somme de contrôle CRC-32 (détecte une coupure ou un caractère modifié) ---
function crc32(texte) {
  const octets = new TextEncoder().encode(texte);
  let crc = 0xffffffff;
  for (const o of octets) {
    crc ^= o;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

const triple = (t) => [t.G, t.F, t.T];
const versTriple = (a) => ({ G: a[0], F: a[1], T: a[2] });
const estEntierPositif = (v) => Number.isInteger(v) && v >= 0;

/**
 * Crée la synthèse d'une classe à partir du résultat du moteur de calcul.
 * @returns {{ v, n, c, e, a, i, k, r, p, q }}  n = niveau, c = nom de classe, e = étape, a = année,
 *   i = inscrits, k = ont composé, r = ont la moyenne (chacun [G, F, T]),
 *   p = par épreuve [composés G,F,T, seuil atteint G,F,T], q = idem par groupe (ex. Français)
 */
export function creerSynthese({ resultat, classe, etape, annee = '' }) {
  const p = {};
  for (const id of EPREUVES_IDS) {
    const st = resultat.parEpreuve?.[id];
    if (st) p[id] = [...triple(st.composes), ...triple(st.atteint)];
  }
  const q = {};
  for (const [groupe, st] of Object.entries(resultat.parGroupe ?? {})) {
    q[groupe] = [...triple(st.composes), ...triple(st.atteint)];
  }
  return {
    v: VERSION_SYNTHESE,
    n: classe.niveau,
    c: classe.nom ?? '',
    e: etape,
    a: annee,
    i: triple(resultat.inscrits),
    k: triple(resultat.composes),
    r: triple(resultat.recus),
    p,
    q
  };
}

const invalide = (detail) => new Error(`Données invalides : ${detail}.`);

function validerTriple(a, nom) {
  if (!Array.isArray(a) || a.length !== 3 || !a.every(estEntierPositif)) throw invalide(nom);
}

// Vérifie qu'une synthèse reçue est complète et cohérente (un code modifié à la main est refusé).
function validerSynthese(s) {
  if (!s || typeof s !== 'object') throw invalide('contenu illisible');
  if (s.v !== VERSION_SYNTHESE) throw new Error('Version de synthèse non prise en charge : mettez MastaNote à jour.');
  if (typeof s.n !== 'string' || !s.n) throw invalide('niveau absent');
  if (!Number.isInteger(s.e) || s.e < 1) throw invalide('étape absente');

  validerTriple(s.i, 'inscrits');
  validerTriple(s.k, 'ont composé');
  validerTriple(s.r, 'ont la moyenne');
  for (let j = 0; j < 3; j++) {
    if (s.k[j] > s.i[j]) throw invalide('ont composé dépasse inscrits');
    if (s.r[j] > s.k[j]) throw invalide('ont la moyenne dépasse ont composé');
  }
  if (s.i[0] + s.i[1] > s.i[2]) throw invalide('garçons et filles dépassent le total');

  const validerDetails = (obj, cles, nom) => {
    for (const [cle, a] of Object.entries(obj ?? {})) {
      if (!cles.includes(cle)) continue; // épreuve inconnue : ignorée
      if (!Array.isArray(a) || a.length !== 6 || !a.every(estEntierPositif)) throw invalide(`${nom} ${cle}`);
      for (let j = 0; j < 3; j++) {
        if (a[j] > s.i[j]) throw invalide(`${nom} ${cle} : ont composé dépasse inscrits`);
        if (a[3 + j] > a[j]) throw invalide(`${nom} ${cle} : seuil atteint dépasse ont composé`);
      }
    }
  };
  validerDetails(s.p, EPREUVES_IDS, 'épreuve');
  validerDetails(s.q, GROUPES_IDS, 'groupe');
}

/** Code à copier : MNS1.<contenu>.<somme de contrôle> */
export function versCode(synthese) {
  const contenu = versBase64Url(JSON.stringify(synthese));
  return `${PREFIXE}.${contenu}.${crc32(contenu)}`;
}

/**
 * Relit un code (collé ou lu dans un fichier). Les espaces, retours à la ligne et phrases autour sont ignorés
 * (WhatsApp coupe parfois les lignes). Lève une erreur claire si le code est incomplet, modifié ou incohérent.
 */
export function depuisCode(texte) {
  const brut = String(texte ?? '').replace(/\s+/g, '');
  const trouve = brut.match(/MNS1\.([A-Za-z0-9_-]+)\.([0-9a-fA-F]{8})/);
  if (!trouve) {
    throw new Error('Aucun code de synthèse MastaNote (MNS1.…) trouvé dans ce texte. Si le code a été coupé, copiez-le à nouveau en entier.');
  }
  const [, contenu, somme] = trouve;
  if (crc32(contenu) !== somme.toLowerCase()) {
    throw new Error('Code incomplet ou modifié : copiez-le à nouveau en entier.');
  }
  let synthese;
  try {
    synthese = JSON.parse(depuisBase64Url(contenu));
  } catch (err) {
    throw new Error('Code illisible : copiez-le à nouveau en entier.');
  }
  validerSynthese(synthese);
  return synthese;
}

const slug = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

/** Nom du fichier texte contenant le code */
export const nomFichierSynthese = (s) => `synthese_${slug(s.n) || 'classe'}_etape${s.e}.txt`;

/** Remet une synthèse sous la forme d'un résultat de classe, utilisable par la consolidation. */
export function versResultat(s, mode) {
  const pct3 = (num, den) => ({
    G: pourcentage(num.G, den.G, mode),
    F: pourcentage(num.F, den.F, mode),
    T: pourcentage(num.T, den.T, mode)
  });
  const detail = (a) => {
    const composes = versTriple(a.slice(0, 3));
    const atteint = versTriple(a.slice(3, 6));
    return {
      composes,
      atteint,
      nonAtteint: { G: composes.G - atteint.G, F: composes.F - atteint.F, T: composes.T - atteint.T },
      pourcentage: pct3(atteint, composes)
    };
  };

  const parEpreuve = {};
  for (const id of EPREUVES_IDS) if (s.p?.[id]) parEpreuve[id] = detail(s.p[id]);
  const parGroupe = {};
  for (const g of GROUPES_IDS) if (s.q?.[g]) parGroupe[g] = detail(s.q[g]);

  const inscrits = versTriple(s.i);
  const composes = versTriple(s.k);
  const recus = versTriple(s.r);
  return { inscrits, composes, recus, pourcentage: pct3(recus, composes), parEpreuve, parGroupe, sansSexe: 0 };
}