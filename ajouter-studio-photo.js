// ==========================================================
// SCRIPT À USAGE UNIQUE : ajoute à src/App.tsx le bouton « Studio Photo EducMaster » du menu et l'écran qu'il ouvre.
//   node ajouter-studio-photo.js --verifier   : contrôle seulement, n'écrit RIEN
//   node ajouter-studio-photo.js              : applique les modifications
// Chaque point d'ancrage doit être trouvé EXACTEMENT UNE FOIS ; sinon, rien n'est écrit.
// Une copie de l'original est faite dans /tmp/App.avant-studio.tsx. À supprimer après usage (ne pas l'enregistrer dans Git).
//
// Tout est invisible tant que VITE_PHOTOS n'est pas « on » (voir src/photos/StudioPhotos.tsx).
// Les points d'ancrage viennent du raccordement de l'affiliation (ajouter-affiliation.js), déjà appliqué.
// ==========================================================
import fs from 'node:fs';

const FICHIER = 'src/App.tsx';
const SEULEMENT_VERIFIER = process.argv.includes('--verifier');

const contenu = fs.readFileSync(FICHIER, 'utf8');
const crlf = contenu.includes('\r\n');
const adapter = (s) => (crlf ? s.replace(/\r?\n/g, '\r\n') : s);

const MODIFICATIONS = [
  {
    nom: "1. imports (écran du Studio Photo et son icône, sous un nom à part pour ne rien heurter)",
    ancre: "import AffiliationPanel, { AFFILIATION_ACTIVE } from './AffiliationPanel';",
    remplacement:
      "import AffiliationPanel, { AFFILIATION_ACTIVE } from './AffiliationPanel';\n" +
      "import StudioPhotos, { STUDIO_PHOTO_ACTIVE } from './photos/StudioPhotos';\n" +
      "import { Camera as IconeStudioPhoto } from 'lucide-react';"
  },
  {
    nom: "2. variable d'état : l'écran est-il ouvert ?",
    ancre: 'const [affiliationOpen, setAffiliationOpen] = useState(false);',
    remplacement:
      'const [affiliationOpen, setAffiliationOpen] = useState(false);\n' +
      '  const [studioPhotoOpen, setStudioPhotoOpen] = useState(false);'
  },
  {
    nom: '3. bouton du menu, juste avant « Gagner 30 % »',
    ancre: '{AFFILIATION_ACTIVE && (',
    remplacement:
      '{STUDIO_PHOTO_ACTIVE && (\n' +
      '                  <button onClick={() => { setMenuOpen(false); setStudioPhotoOpen(true); }} className={drawerItemClass}>\n' +
      '                    <IconeStudioPhoto className="w-4 h-4 text-sky-400" />\n' +
      '                    Studio Photo EducMaster\n' +
      '                  </button>\n' +
      '                )}\n' +
      '                {AFFILIATION_ACTIVE && ('
  },
  {
    nom: "4. écran par-dessus l'application, avec son bouton de retour",
    ancre: '{/* ---------------- GAGNER 30 % (affiliation) ---------------- */}',
    remplacement:
      '{/* ---------------- STUDIO PHOTO EDUCMASTER ---------------- */}\n' +
      '        {STUDIO_PHOTO_ACTIVE && studioPhotoOpen && (\n' +
      '          <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto p-4 sm:p-8">\n' +
      '            <div className="max-w-2xl mx-auto w-full">\n' +
      '              <button\n' +
      '                onClick={() => setStudioPhotoOpen(false)}\n' +
      '                className="mb-4 text-xs font-bold text-indigo-300 hover:text-indigo-200"\n' +
      '              >\n' +
      "                ← Retour à l'application\n" +
      '              </button>\n' +
      '              <StudioPhotos uid={authUser?.uid} classes={classes} notify={triggerNotif} />\n' +
      '            </div>\n' +
      '          </div>\n' +
      '        )}\n\n' +
      '        {/* ---------------- GAGNER 30 % (affiliation) ---------------- */}'
  }
];

let resultat = contenu;
const problemes = [];
for (const m of MODIFICATIONS) {
  const ancre = adapter(m.ancre);
  const occurrences = resultat.split(ancre).length - 1;
  if (occurrences !== 1) {
    problemes.push(`${m.nom} : ${occurrences} occurrence(s) trouvée(s) au lieu d'une seule`);
    continue;
  }
  resultat = resultat.replace(ancre, () => adapter(m.remplacement));
}

if (problemes.length > 0) {
  console.log('AUCUNE MODIFICATION ÉCRITE. Points à vérifier :');
  problemes.forEach((p) => console.log(' - ' + p));
  process.exit(1);
}

if (SEULEMENT_VERIFIER) {
  console.log(`VÉRIFICATION RÉUSSIE : les ${MODIFICATIONS.length} points d'ancrage sont trouvés une seule fois. Rien n'a été écrit.`);
  process.exit(0);
}

fs.writeFileSync('/tmp/App.avant-studio.tsx', contenu);
fs.writeFileSync(FICHIER, resultat);
console.log(`OK : ${MODIFICATIONS.length} modifications appliquées à ${FICHIER}. Copie de l'original : /tmp/App.avant-studio.tsx`);