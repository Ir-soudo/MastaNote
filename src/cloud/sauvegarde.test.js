// ==========================================================
// TESTS DU DÉCOUPAGE POUR LA SAUVEGARDE CLOUD — sans rien installer :
//     node src/cloud/sauvegarde.test.js
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CLASSES,
  TAILLE_MAX_DOC_OCTETS,
  construireInstantane,
  depuisDocuments,
  resumer,
  versDocuments
} from './sauvegarde.js';

const ETAT = {
  user: { nom: 'Prof', licenceCle: 'SECRET-LICENCE-123' }, // ne doit JAMAIS partir dans le cloud
  classes: [
    {
      id: 'class-1',
      nom: 'CM2 Émeraude',
      niveau: 'CM2',
      eleves: [
        { id: 'e1', matricule: '1234567890123', nom: 'ABALO', prenoms: 'Sena' },
        { id: 'e2', matricule: '9876543210987', nom: 'BIO', prenoms: "N'gobi", sexe: undefined }
      ]
    },
    { id: 'class-2', nom: 'CE1 A', niveau: 'CE1', eleves: [{ id: 'e3', matricule: '1', nom: 'SESSOU', prenoms: 'Koffi' }] }
  ],
  notes: {
    'class-1': { sommative1: { maths: { e1: { note: 13.5, perf: 1.5 }, e2: { note: 8, perf: 0 } }, dictee: { e1: { note: 12 } } } },
    'class-2': { sommative1: { maths: { e3: { note: 10, perf: 0 } } } },
    'class-orpheline': { sommative1: { maths: { x: { note: 1 } } } } // classe supprimée : ses notes ne sont pas sauvegardées
  },
  ventilationStrategy: 'perf_max',
  modules: { rapports: { 'class-1': { sexe: { e1: 'M' } } }, meta: { meta: { ecole: 'EPP Test' } } }
};

test('aller-retour : ce qui est sauvegardé se restaure à l\'identique', () => {
  const relu = depuisDocuments(versDocuments(ETAT));
  assert.deepEqual(relu.classes, JSON.parse(JSON.stringify(ETAT.classes)));
  assert.deepEqual(relu.notes, { 'class-1': ETAT.notes['class-1'], 'class-2': ETAT.notes['class-2'] });
  assert.equal(relu.ventilationStrategy, 'perf_max');
  assert.deepEqual(relu.modules, ETAT.modules);
});

test('un document par classe, plus les réglages et les modules', () => {
  const chemins = versDocuments(ETAT).map((d) => d.chemin).sort();
  assert.deepEqual(chemins, ['classes/class-1', 'classes/class-2', 'etat/modules', 'etat/reglages']);
});

test('champs de chaque document : contenu texte, version, index de la classe', () => {
  const docs = versDocuments(ETAT);
  for (const d of docs) {
    assert.equal(typeof d.champs.donnees, 'string');
    assert.equal(d.champs.version, 1);
  }
  const classe1 = docs.find((d) => d.chemin === 'classes/class-1');
  assert.equal(classe1.champs.nom, 'CM2 Émeraude');
  assert.equal(classe1.champs.niveau, 'CM2');
  assert.equal(classe1.champs.nbEleves, 2);
});

test('aucune valeur « undefined » (Firestore la refuse)', () => {
  assert.ok(versDocuments(ETAT).every((d) => !d.champs.donnees.includes('undefined')));
});

test('le profil et la licence ne sont jamais sauvegardés', () => {
  const texte = JSON.stringify(versDocuments(ETAT));
  assert.ok(!texte.includes('SECRET-LICENCE-123'));
  assert.ok(!texte.includes('licenceCle'));
  assert.deepEqual(Object.keys(construireInstantane(ETAT)).sort(), ['classes', 'modules', 'notes', 'ventilationStrategy']);
});

test('construireInstantane : valeurs par défaut et types incorrects', () => {
  assert.deepEqual(construireInstantane({}), { classes: [], notes: {}, ventilationStrategy: 'proportionnelle', modules: {} });
  assert.deepEqual(construireInstantane({ classes: 'x', notes: [], modules: 3 }), {
    classes: [],
    notes: {},
    ventilationStrategy: 'proportionnelle',
    modules: {}
  });
});

test('une classe trop volumineuse est refusée, avec son nom', () => {
  const enorme = { id: 'c1', nom: 'Énorme', niveau: 'CM2', eleves: [{ id: 'e', nom: 'x'.repeat(TAILLE_MAX_DOC_OCTETS) }] };
  assert.throws(() => versDocuments({ classes: [enorme] }), /Énorme.*trop volumineux/);
});

test('identifiant de classe invalide : refusé', () => {
  for (const id of ['a/b', '', '..', '__reserve__']) {
    assert.throws(() => versDocuments({ classes: [{ id, nom: 'X', niveau: 'CI', eleves: [] }] }), /Identifiant de classe invalide/);
  }
});

test('trop de classes : refusé à l\'écriture comme à la restauration', () => {
  const classes = Array.from({ length: MAX_CLASSES + 1 }, (_, i) => ({ id: `c${i}`, nom: `C${i}`, niveau: 'CI', eleves: [] }));
  assert.throws(() => versDocuments({ classes }), /trop de classes/);
  const docs = classes.map((c) => ({
    chemin: `classes/${c.id}`,
    champs: { donnees: JSON.stringify({ classe: c, notes: {} }) }
  }));
  assert.throws(() => depuisDocuments(docs), /trop de classes/);
});

test('restauration : un document illisible est refusé', () => {
  assert.throws(() => depuisDocuments([{ chemin: 'classes/c1', champs: { donnees: '{pas du json' } }]), /illisible/);
});

test('restauration : un document incohérent est refusé', () => {
  const doc = (contenu) => ({ chemin: 'classes/c1', champs: { donnees: JSON.stringify(contenu) } });
  assert.throws(() => depuisDocuments([doc({ classe: { id: 'autre', eleves: [] }, notes: {} })]), /incohérente/); // identifiant différent
  assert.throws(() => depuisDocuments([doc({ classe: { id: 'c1' }, notes: {} })]), /incohérente/); // sans liste d'élèves
  assert.throws(() => depuisDocuments([doc({ classe: { id: 'c1', eleves: [{ nom: 'sans id' }] }, notes: {} })]), /incohérente/);
});

test('restauration : rien dans le cloud donne un état vide', () => {
  assert.deepEqual(depuisDocuments([]), { classes: [], notes: {}, ventilationStrategy: 'proportionnelle', modules: {} });
  assert.deepEqual(versDocuments({}).map((d) => d.chemin).sort(), ['etat/modules', 'etat/reglages']);
});

test('restauration : l\'ordre des classes est conservé', () => {
  const docs = versDocuments(ETAT);
  const inverse = [...docs].reverse(); // l'ordre de lecture dans le cloud n'est pas garanti
  assert.deepEqual(depuisDocuments(inverse).classes.map((c) => c.id), ['class-1', 'class-2']);
});

test('résumé : classes, élèves et notes', () => {
  assert.deepEqual(resumer(ETAT), { classes: 2, eleves: 3, notes: 4 });
  assert.deepEqual(resumer({}), { classes: 0, eleves: 0, notes: 0 });
});