// ==========================================================
// SAUVEGARDE CLOUD : DÉCOUPAGE DES DONNÉES EN DOCUMENTS (fonctions pures, sans Firebase)
//
// L'état de l'application est découpé en petits documents (un par classe, plus les réglages et les données des
// modules), chacun bien en dessous de la limite de 1 Mio de Firestore. Chaque document garde son contenu dans un
// seul champ texte « donnees » (du JSON) : pas de contrainte de format Firestore, et une taille facile à contrôler.
//
// Ce qui est sauvegardé : classes, élèves, notes, réglage de ventilation, données des modules (rapports, école).
// Ce qui ne l'est JAMAIS : le profil et la licence (seules les clés connues sont retenues, tout le reste est ignoré).
//
// Emplacement dans Firestore (réservé au compte propriétaire par les règles de sécurité) :
//   utilisateurs/{uid}/classes/{idClasse}   une classe, ses élèves et ses notes
//   utilisateurs/{uid}/etat/reglages        réglage de ventilation et ordre des classes
//   utilisateurs/{uid}/etat/modules         données des modules (rapports, école)
// ==========================================================

export const VERSION_SAUVEGARDE = 1;
export const TAILLE_MAX_DOC_OCTETS = 900000; // Firestore : 1 Mio par document, on garde une marge
export const MAX_CLASSES = 50;
export const MAX_ELEVES_PAR_CLASSE = 500;

const nbOctets = (texte) => new TextEncoder().encode(texte).length;
const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Aller-retour JSON : supprime les valeurs « undefined », que Firestore refuse
const nettoyer = (valeur) => JSON.parse(JSON.stringify(valeur ?? null));

function enDocument(chemin, contenu, index, etiquette) {
  const donnees = JSON.stringify(contenu);
  if (nbOctets(donnees) > TAILLE_MAX_DOC_OCTETS) {
    throw new Error(`Sauvegarde impossible : ${etiquette} est trop volumineux pour le cloud.`);
  }
  return { chemin, champs: { donnees, version: VERSION_SAUVEGARDE, ...index } };
}

/** Ne retient que les parties sauvegardables de l'état de l'application (le profil et la licence sont écartés). */
export function construireInstantane(etat = {}) {
  return {
    classes: Array.isArray(etat.classes) ? etat.classes : [],
    notes: estObjet(etat.notes) ? etat.notes : {},
    ventilationStrategy: typeof etat.ventilationStrategy === 'string' ? etat.ventilationStrategy : 'proportionnelle',
    modules: estObjet(etat.modules) ? etat.modules : {}
  };
}

/** Transforme l'état en liste de documents { chemin, champs } prêts à être écrits. */
export function versDocuments(etat) {
  const inst = construireInstantane(etat);
  if (inst.classes.length > MAX_CLASSES) throw new Error(`Sauvegarde impossible : trop de classes (${MAX_CLASSES} au maximum).`);

  const docs = inst.classes.map((c) => {
    const id = String(c?.id ?? '');
    if (!id || id.includes('/') || id === '.' || id === '..' || /^__.*__$/.test(id)) {
      throw new Error(`Identifiant de classe invalide : « ${id} ».`);
    }
    return enDocument(
      `classes/${id}`,
      { classe: nettoyer(c), notes: nettoyer(inst.notes[id] ?? {}) },
      { nom: String(c.nom ?? ''), niveau: String(c.niveau ?? ''), nbEleves: Array.isArray(c.eleves) ? c.eleves.length : 0 },
      `la classe « ${c.nom ?? id} »`
    );
  });

  docs.push(
    enDocument(
      'etat/reglages',
      { ventilationStrategy: inst.ventilationStrategy, ordreClasses: inst.classes.map((c) => String(c.id)) },
      {},
      'les réglages'
    )
  );
  docs.push(enDocument('etat/modules', nettoyer(inst.modules), {}, 'les données des modules'));
  return docs;
}

function lire(doc) {
  try {
    return JSON.parse(doc.champs.donnees);
  } catch (err) {
    throw new Error(`Sauvegarde illisible : ${doc.chemin}.`);
  }
}

function validerClasse(classe, chemin) {
  const eleves = classe.eleves;
  if (
    !Array.isArray(eleves) ||
    eleves.length > MAX_ELEVES_PAR_CLASSE ||
    eleves.some((e) => !estObjet(e) || typeof e.id !== 'string' || !e.id)
  ) {
    throw new Error(`Sauvegarde incohérente : ${chemin}.`);
  }
}

/**
 * Reconstitue l'état à partir des documents lus dans le cloud. Les données sont contrôlées avant d'être rendues :
 * un document corrompu fait échouer la restauration entière, sans rien modifier sur l'appareil.
 */
export function depuisDocuments(docs) {
  const parChemin = new Map(docs.map((d) => [d.chemin, d]));
  const reglagesDoc = parChemin.get('etat/reglages');
  const reglages = reglagesDoc ? lire(reglagesDoc) : {};

  const docsClasses = docs.filter((d) => d.chemin.startsWith('classes/'));
  if (docsClasses.length > MAX_CLASSES) throw new Error(`Sauvegarde incohérente : trop de classes (${MAX_CLASSES} au maximum).`);

  const parId = {};
  const notes = {};
  for (const d of docsClasses) {
    const idChemin = d.chemin.slice('classes/'.length);
    const contenu = lire(d);
    if (!estObjet(contenu) || !estObjet(contenu.classe) || String(contenu.classe.id) !== idChemin) {
      throw new Error(`Sauvegarde incohérente : ${d.chemin}.`);
    }
    validerClasse(contenu.classe, d.chemin);
    parId[idChemin] = contenu.classe;
    notes[idChemin] = estObjet(contenu.notes) ? contenu.notes : {};
  }

  // Ordre d'origine des classes, puis celles qui n'y figureraient pas
  const ordre = Array.isArray(reglages.ordreClasses) ? reglages.ordreClasses.filter((id) => id in parId) : [];
  for (const id of Object.keys(parId)) if (!ordre.includes(id)) ordre.push(id);

  const modulesDoc = parChemin.get('etat/modules');
  const modules = modulesDoc ? lire(modulesDoc) : {};

  return {
    classes: ordre.map((id) => parId[id]),
    notes,
    ventilationStrategy: typeof reglages.ventilationStrategy === 'string' ? reglages.ventilationStrategy : 'proportionnelle',
    modules: estObjet(modules) ? modules : {}
  };
}

/** Compte ce que contient une sauvegarde : pour l'afficher à l'utilisateur avant toute écriture ou restauration. */
export function resumer(etat) {
  const inst = construireInstantane(etat);
  let eleves = 0;
  let notes = 0;
  for (const c of inst.classes) {
    eleves += Array.isArray(c.eleves) ? c.eleves.length : 0;
    for (const parEvaluation of Object.values(inst.notes[c.id] ?? {})) {
      for (const parMatiere of Object.values(parEvaluation ?? {})) notes += Object.keys(parMatiere ?? {}).length;
    }
  }
  return { classes: inst.classes.length, eleves, notes };
}