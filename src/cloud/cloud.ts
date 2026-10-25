import { auth, firebaseApp } from '../firebase';
import { depuisDocuments, resumer, versDocuments } from './sauvegarde.js';

// ==========================================================
// SAUVEGARDE CLOUD : écriture, lecture, suppression (Firestore, directement depuis l'application)
//
// La bibliothèque Firestore n'est chargée qu'au premier usage (import dynamique) : elle n'alourdit pas l'ouverture
// de l'application. Chaque compte n'accède qu'à ses propres documents : voir firestore.rules.
// Emplacement : utilisateurs/{uid}/classes/{idClasse}, utilisateurs/{uid}/etat/reglages et .../etat/modules
// ==========================================================

// Données des modules (rapports d'étape), enregistrées sur l'appareil et incluses dans la sauvegarde
const CLES_MODULES: Record<string, string> = {
  rapports: 'mastanote-reports-v1',
  meta: 'mastanote-reports-meta-v1',
  ecole: 'mastanote-reports-ecole-v1'
};

export function lireModulesLocaux(): Record<string, any> {
  const sortie: Record<string, any> = {};
  for (const [nom, cle] of Object.entries(CLES_MODULES)) {
    try {
      const brut = localStorage.getItem(cle);
      if (brut) sortie[nom] = JSON.parse(brut);
    } catch (err) {
      console.error(`Données du module « ${nom} » illisibles :`, err);
    }
  }
  return sortie;
}

export function ecrireModulesLocaux(modules: Record<string, any> | undefined) {
  for (const [nom, cle] of Object.entries(CLES_MODULES)) {
    if (modules && modules[nom] !== undefined) {
      try {
        localStorage.setItem(cle, JSON.stringify(modules[nom]));
      } catch (err) {
        console.error(`Impossible d'enregistrer les données du module « ${nom} » :`, err);
      }
    }
  }
}

/** Message lisible pour une erreur de Firebase. */
export function messageErreurCloud(err: any): string {
  const code = String(err?.code ?? '');
  if (code.includes('permission-denied')) {
    return "Accès refusé par le cloud. Vérifiez que votre adresse e-mail est vérifiée, reconnectez-vous, puis réessayez.";
  }
  if (code.includes('unauthenticated')) return 'Reconnectez-vous à votre compte, puis réessayez.';
  if (code.includes('unavailable') || code.includes('network')) return "Pas de connexion au cloud. Vérifiez votre accès à internet, puis réessayez.";
  if (code.includes('resource-exhausted')) return "Limite du service atteinte pour le moment. Réessayez plus tard.";
  return err?.message || "L'opération a échoué. Réessayez dans un instant.";
}

async function ouvrir() {
  const utilisateur = auth?.currentUser;
  if (!utilisateur) throw new Error('Connexion requise : reconnectez-vous, puis réessayez.');
  // Renouvelle le jeton : les règles de sécurité lisent l'état « e-mail vérifié » dans le jeton
  await utilisateur.getIdToken(true);
  const fs: any = await import('firebase/firestore');
  return { fs, db: fs.getFirestore(firebaseApp), uid: utilisateur.uid as string };
}

/** Date et contenu de la dernière sauvegarde (sans rien télécharger de volumineux). */
export async function infoSauvegarde() {
  const { fs, db, uid } = await ouvrir();
  const [classes, reglages] = await Promise.all([
    fs.getDocs(fs.collection(db, 'utilisateurs', uid, 'classes')),
    fs.getDoc(fs.doc(db, 'utilisateurs', uid, 'etat', 'reglages'))
  ]);
  let eleves = 0;
  classes.forEach((d: any) => {
    eleves += Number(d.data().nbEleves) || 0;
  });
  const horodatage = reglages.exists() ? reglages.data().misAJour : null;
  return {
    existe: Boolean(reglages.exists() || classes.size > 0),
    date: horodatage?.toDate ? (horodatage.toDate() as Date) : null,
    classes: classes.size as number,
    eleves
  };
}

/** Enregistre les classes, notes et réglages, plus les données des modules. Remplace la sauvegarde précédente. */
export async function sauvegarder(etat: { classes: any[]; notes: any; ventilationStrategy: string }) {
  const complet = { ...etat, modules: lireModulesLocaux() };
  const docs = versDocuments(complet); // refuse ce qui est trop volumineux, avant tout envoi
  const { fs, db, uid } = await ouvrir();

  const existants = await fs.getDocs(fs.collection(db, 'utilisateurs', uid, 'classes'));
  const idsNouveaux = new Set(
    docs.filter((d: any) => d.chemin.startsWith('classes/')).map((d: any) => d.chemin.slice('classes/'.length))
  );

  const lot = fs.writeBatch(db);
  existants.forEach((d: any) => {
    if (!idsNouveaux.has(d.id)) lot.delete(d.ref); // classe supprimée depuis la dernière sauvegarde
  });
  for (const d of docs) {
    lot.set(fs.doc(db, 'utilisateurs', uid, ...d.chemin.split('/')), { ...d.champs, misAJour: fs.serverTimestamp() });
  }
  await lot.commit();
  return resumer(complet);
}

/** Lit la sauvegarde et la contrôle. Renvoie null s'il n'y en a pas. Ne modifie rien sur l'appareil. */
export async function lireSauvegarde() {
  const { fs, db, uid } = await ouvrir();
  const [classes, reglages, modules] = await Promise.all([
    fs.getDocs(fs.collection(db, 'utilisateurs', uid, 'classes')),
    fs.getDoc(fs.doc(db, 'utilisateurs', uid, 'etat', 'reglages')),
    fs.getDoc(fs.doc(db, 'utilisateurs', uid, 'etat', 'modules'))
  ]);
  const docs: { chemin: string; champs: any }[] = [];
  classes.forEach((d: any) => docs.push({ chemin: `classes/${d.id}`, champs: d.data() }));
  if (reglages.exists()) docs.push({ chemin: 'etat/reglages', champs: reglages.data() });
  if (modules.exists()) docs.push({ chemin: 'etat/modules', champs: modules.data() });
  if (docs.length === 0) return null;
  return depuisDocuments(docs); // refuse une sauvegarde corrompue ou incohérente
}

/** Supprime définitivement les données de ce compte dans le cloud. Les données de l'appareil ne sont pas touchées. */
export async function supprimerSauvegarde() {
  const { fs, db, uid } = await ouvrir();
  const classes = await fs.getDocs(fs.collection(db, 'utilisateurs', uid, 'classes'));
  const lot = fs.writeBatch(db);
  classes.forEach((d: any) => lot.delete(d.ref));
  lot.delete(fs.doc(db, 'utilisateurs', uid, 'etat', 'reglages'));
  lot.delete(fs.doc(db, 'utilisateurs', uid, 'etat', 'modules'));
  await lot.commit();
}