// ==========================================================
// TESTS DU NOYAU DU STUDIO PHOTO — sans rien installer :
//     node src/photos/noyau.test.js
// ==========================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MESSAGES_ALERTES,
  analyserListe,
  appliquerReglages,
  associerFichiers,
  cadrageDepuisVisage,
  cadrageInitial,
  coinsDansImage,
  corrigerCadrage,
  couvreImage,
  crc32,
  creerZip,
  echelleMin,
  elevesDepuisClasse,
  etapesCompression,
  evaluerQualite,
  genererCsv,
  idEleve,
  lignesRapport,
  luminanceRGBA,
  matriceCanvas,
  messageAlerte,
  nettoyerMatricule,
  nettoyerSegment,
  nomFichier,
  nomsUniques,
  normaliserReglages,
  preparerExport,
  ratioSortie,
  separerNomComplet,
  statsLuminosite,
  varianceLaplacien
} from './noyau.js';

const proche = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} est différent de ${b}`);
const R = (extra = {}) => normaliserReglages(extra);
const appliquer = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// ---------- réglages ----------

test('réglages : valeurs par défaut de photo d\'identité', () => {
  const r = normaliserReglages(undefined);
  assert.equal(r.largeur, 413);
  assert.equal(r.hauteur, 531);
  assert.equal(r.poidsMaxKo, 150);
  assert.equal(r.schemaNom, 'matricule');
  assert.equal(r.autoriserReduction, false);
  assert.equal(r.modeLeger, false);
  proche(ratioSortie(r), 413 / 531);
});

test('réglages : valeurs absurdes ramenées dans les bornes, champs inconnus ignorés', () => {
  const r = normaliserReglages({ poidsMaxKo: 99999, qualiteMin: 5, schemaNom: 'nimporte', profilId: 'inconnu', evil: 1, seuils: { netteteMin: 'abc' } });
  assert.equal(r.poidsMaxKo, 1000);
  assert.equal(r.qualiteMin, 0.95);
  assert.equal(r.schemaNom, 'matricule');
  assert.equal(r.profilId, 'identite-413x531');
  assert.equal(r.evil, undefined);
  assert.equal(r.seuils.netteteMin, 40);
  assert.equal(normaliserReglages({ poidsMaxKo: 1 }).poidsMaxKo, 20);
});

test('réglages : profils prédéfinis et dimensions personnalisées', () => {
  const perso = normaliserReglages({ profilId: 'personnalise', largeur: 600, hauteur: 800 });
  assert.equal(perso.largeur, 600);
  assert.equal(perso.hauteur, 800);
  const predefini = normaliserReglages({ profilId: 'portrait-3x4', largeur: 999, hauteur: 999 });
  assert.equal(predefini.largeur, 480);
  assert.equal(predefini.hauteur, 640);
  assert.equal(normaliserReglages({ zip: { dossier: 'Photos 2026' } }).zip.dossier, 'Photos_2026');
});

// ---------- noms de fichiers ----------

test('noms : nettoyage des accents, apostrophes, ligatures et matricules', () => {
  assert.equal(nettoyerSegment("Kouassi-N'Guessan Éloïse"), 'KOUASSI_NGUESSAN_ELOISE');
  assert.equal(nettoyerSegment('Cœur Æon'), 'COEUR_AEON');
  assert.equal(nettoyerSegment('  --Jean  Pierre--  ', { majuscules: false }), 'Jean_Pierre');
  assert.equal(nettoyerMatricule(' ab 12-3é '), 'AB12-3E');
  assert.equal(nettoyerMatricule('a/b?c'), 'ABC');
});

test('noms de fichiers : les quatre schémas', () => {
  const e = { matricule: 'm 12', nom: 'Kouassi', prenoms: 'Jean Pierre', npi: '9876' };
  assert.equal(nomFichier(e, R({ schemaNom: 'matricule' })).nom, 'M12.jpg');
  assert.equal(nomFichier(e, R({ schemaNom: 'matricule_nom_prenoms' })).nom, 'M12_KOUASSI_JEAN_PIERRE.jpg');
  assert.equal(nomFichier(e, R({ schemaNom: 'nom_prenoms' })).nom, 'KOUASSI_JEAN_PIERRE.jpg');
  assert.equal(nomFichier(e, R({ schemaNom: 'npi' })).nom, '9876.jpg');
  assert.deepEqual(nomFichier(e, R()).alertes, []);
});

test('noms de fichiers : replis quand une donnée manque, longueur limitée, minuscules', () => {
  const sansMat = { nom: 'Kouassi', prenoms: 'Jean' };
  let r = nomFichier(sansMat, R({ schemaNom: 'matricule' }));
  assert.equal(r.nom, 'KOUASSI_JEAN.jpg');
  assert.deepEqual(r.alertes, ['matricule-manquant']);
  r = nomFichier(sansMat, R({ schemaNom: 'npi' }));
  assert.equal(r.nom, 'KOUASSI_JEAN.jpg');
  assert.deepEqual(r.alertes, ['npi-manquant']);
  r = nomFichier(sansMat, R({ schemaNom: 'matricule_nom_prenoms' }));
  assert.equal(r.nom, 'KOUASSI_JEAN.jpg');
  assert.deepEqual(r.alertes, ['matricule-manquant']);
  r = nomFichier({}, R(), 4);
  assert.equal(r.nom, 'ELEVE_5.jpg');
  assert.ok(r.alertes.includes('nom-vide'));
  assert.equal(nomFichier({ nom: 'A'.repeat(150) }, R({ schemaNom: 'nom_prenoms' })).nom.length, 104);
  assert.equal(nomFichier({ nom: 'Kouassi', prenoms: 'Éloïse' }, R({ schemaNom: 'nom_prenoms', majuscules: false })).nom, 'Kouassi_Eloise.jpg');
});

test('noms uniques : numéro ajouté, majuscules ignorées', () => {
  const r = nomsUniques(['A.jpg', 'a.jpg', 'B.jpg', 'A.jpg']);
  assert.deepEqual(r.map((x) => x.nom), ['A.jpg', 'a_2.jpg', 'B.jpg', 'A_3.jpg']);
  assert.deepEqual(r.map((x) => x.doublon), [false, true, false, true]);
});

// ---------- liste de classe ----------

test('liste : avec en-tête, guillemets et point-virgule', () => {
  const r = analyserListe('Matricule;Nom;Prénoms;NPI\n20240001;KOUASSI;Jean Pierre;123\n20240002;"DOSSOU, Jr";Marie;');
  assert.equal(r.entete, true);
  assert.equal(r.separateur, ';');
  assert.equal(r.eleves.length, 2);
  assert.equal(r.eleves[0].matricule, '20240001');
  assert.equal(r.eleves[0].nom, 'KOUASSI');
  assert.equal(r.eleves[0].prenoms, 'Jean Pierre');
  assert.equal(r.eleves[0].npi, '123');
  assert.equal(r.eleves[0].id, 'm:20240001');
  assert.equal(r.eleves[1].nom, 'DOSSOU, Jr');
  assert.equal(r.eleves[1].npi, '');
});

test('liste : sans en-tête (tabulations, une colonne, colonnes forcées)', () => {
  const tab = analyserListe('20240001\tKOUASSI\tJean\n20240002\tDOSSOU\tMarie');
  assert.equal(tab.entete, false);
  assert.equal(tab.separateur, '\t');
  assert.equal(tab.eleves[1].matricule, '20240002');
  assert.equal(tab.eleves[1].nom, 'DOSSOU');
  assert.equal(tab.eleves[1].prenoms, 'Marie');

  const une = analyserListe('KOUASSI Jean Pierre\r\nDOSSOU Marie');
  assert.equal(une.eleves.length, 2);
  assert.equal(une.eleves[0].nom, 'KOUASSI');
  assert.equal(une.eleves[0].prenoms, 'Jean Pierre');

  const forcee = analyserListe('KOUASSI;Jean', { colonnes: ['nom', 'prenoms'] });
  assert.equal(forcee.eleves[0].nom, 'KOUASSI');
  assert.equal(forcee.eleves[0].prenoms, 'Jean');

  const avecEntete = analyserListe('Nom;Prénoms\nKOUASSI;Jean', { colonnes: ['nom', 'prenoms'] });
  assert.equal(avecEntete.eleves.length, 1);
});

test('liste : alertes (vide, matricules manquants, doublons)', () => {
  assert.deepEqual(analyserListe('  \n ').alertes, [{ code: 'liste-vide' }]);
  assert.deepEqual(analyserListe('').eleves, []);
  const sansMat = analyserListe('KOUASSI;Jean\nDOSSOU;Marie');
  assert.deepEqual(sansMat.alertes.find((a) => a.code === 'liste-matricules-manquants'), { code: 'liste-matricules-manquants', nombre: 2 });
  const doubles = analyserListe('A1;X;Y\nA1;X;Y');
  assert.equal(doubles.eleves.length, 2);
  assert.equal(doubles.eleves[1].id, 'm:A1#2');
  assert.deepEqual(doubles.alertes.find((a) => a.code === 'liste-doublons'), { code: 'liste-doublons', nombre: 1 });
  assert.equal(idEleve({ matricule: 'ab-1' }), 'm:AB-1');
});

test('séparation du nom complet', () => {
  assert.deepEqual(separerNomComplet('KOUASSI Jean Pierre'), { nom: 'KOUASSI', prenoms: 'Jean Pierre' });
  assert.deepEqual(separerNomComplet('DE SOUZA Marie'), { nom: 'DE SOUZA', prenoms: 'Marie' });
  assert.deepEqual(separerNomComplet('DOSSOU JEAN'), { nom: 'DOSSOU', prenoms: 'JEAN' });
  assert.deepEqual(separerNomComplet('AGBO'), { nom: 'AGBO', prenoms: '' });
  assert.deepEqual(separerNomComplet('   '), { nom: '', prenoms: '' });
});

test('élèves lus depuis une classe de MastaNote (champs tolérants)', () => {
  const classe = {
    eleves: [{ matricule: 'M1', nom: 'Kouassi', prenoms: 'Jean' }, { prenom: 'Marie', nom: 'Dossou' }, { nomComplet: 'AGBO Paul' }, {}]
  };
  const r = elevesDepuisClasse(classe);
  assert.equal(r.length, 3);
  assert.equal(r[0].matricule, 'M1');
  assert.equal(r[1].prenoms, 'Marie');
  assert.equal(r[2].nom, 'AGBO');
  assert.equal(r[2].prenoms, 'Paul');
  assert.equal(new Set(r.map((e) => e.id)).size, 3);
  assert.deepEqual(elevesDepuisClasse(null), []);
});

// ---------- association des photos aux élèves ----------

test('association : matricule dans le nom, puis nom et prénoms, puis ordre', () => {
  const eleves = [
    { id: 'a', matricule: 'A1234', nom: 'Kouassi', prenoms: 'Jean Pierre' },
    { id: 'b', matricule: 'B5678', nom: 'Dossou', prenoms: 'Marie' },
    { id: 'c', matricule: '', nom: 'Agbo', prenoms: 'Paul' }
  ];
  const fichiers = [{ nom: 'IMG_A1234.jpg' }, { nom: 'dossou marie.JPG' }, { nom: 'photo (3).jpg' }];
  const sans = associerFichiers(fichiers, eleves);
  assert.deepEqual(sans.map((r) => r.statut), ['ok', 'ok', 'non-associe']);
  assert.equal(sans[0].eleveId, 'a');
  assert.equal(sans[0].methode, 'matricule');
  assert.equal(sans[1].eleveId, 'b');
  assert.equal(sans[1].methode, 'nom');
  const avec = associerFichiers(fichiers, eleves, { parOrdre: true });
  assert.equal(avec[2].eleveId, 'c');
  assert.equal(avec[2].methode, 'ordre');
  assert.equal(avec[2].statut, 'ok');
});

test('association : tiret dans le matricule, matricule trop court, ambiguïté, doublon', () => {
  const tiret = associerFichiers([{ nom: '20-123_photo.jpg' }], [{ id: 'x', matricule: '20-123', nom: '', prenoms: '' }]);
  assert.equal(tiret[0].eleveId, 'x');
  assert.equal(tiret[0].methode, 'matricule');

  const court = associerFichiers([{ nom: 'A1.jpg' }], [{ id: 'x', matricule: 'A1', nom: '', prenoms: '' }]);
  assert.equal(court[0].statut, 'non-associe');

  const memeNom = [
    { id: 'x1', matricule: '', nom: 'Kouassi', prenoms: 'Jean' },
    { id: 'x2', matricule: '', nom: 'Kouassi', prenoms: 'Marie' }
  ];
  assert.equal(associerFichiers([{ nom: 'kouassi jean marie.jpg' }], memeNom)[0].statut, 'ambigu');
  assert.equal(associerFichiers([{ nom: 'kouassi.jpg' }], memeNom)[0].statut, 'non-associe');

  const doublon = associerFichiers([{ nom: 'A1234.jpg' }, { nom: 'A1234_bis.jpg' }], [{ id: 'x1', matricule: 'A1234', nom: 'K', prenoms: 'J' }]);
  assert.deepEqual(doublon.map((r) => r.statut), ['ok', 'doublon']);
});

test('association : l\'ordre suit le tri naturel des noms de fichiers', () => {
  const eleves = [
    { id: 'e1', matricule: '', nom: 'Un', prenoms: 'A' },
    { id: 'e2', matricule: '', nom: 'Deux', prenoms: 'B' },
    { id: 'e3', matricule: '', nom: 'Trois', prenoms: 'C' }
  ];
  const r = associerFichiers([{ nom: 'p10.jpg' }, { nom: 'p2.jpg' }, { nom: 'p1.jpg' }], eleves, { parOrdre: true });
  assert.equal(r[2].eleveId, 'e1');
  assert.equal(r[1].eleveId, 'e2');
  assert.equal(r[0].eleveId, 'e3');
});

// ---------- cadrage ----------

test('cadrage : échelle minimale et cadrage de départ', () => {
  proche(echelleMin(1000, 2000, 413, 531, 0), 0.413);
  proche(echelleMin(1000, 500, 413, 531, 0), 531 / 500);
  proche(echelleMin(1000, 500, 413, 531, 90), 413 / 500);
  const c = cadrageInitial(1000, 2000, 413, 531);
  proche(c.echelle, 0.413);
  proche(c.cx, 500);
  proche(c.cy, 900);
  assert.ok(couvreImage(c, 1000, 2000, 413, 531));
});

test('cadrage : correction des valeurs impossibles, aucune zone blanche', () => {
  const c = corrigerCadrage({ cx: 0, cy: 0, echelle: 0.1, angle: 0 }, 1000, 2000, 413, 531);
  proche(c.echelle, 0.413);
  proche(c.cx, 500);
  proche(c.cy, 531 / (2 * 0.413));
  const tourne = corrigerCadrage({ cx: 50, cy: 50, echelle: 0.05, angle: 12 }, 1000, 800, 413, 531);
  assert.ok(tourne.echelle >= echelleMin(1000, 800, 413, 531, 12) - 1e-9);
  assert.ok(couvreImage(tourne, 1000, 800, 413, 531));
  const absurde = corrigerCadrage({ cx: NaN, cy: undefined, echelle: NaN, angle: NaN }, 1000, 2000, 413, 531);
  assert.ok(Number.isFinite(absurde.cx) && Number.isFinite(absurde.cy) && Number.isFinite(absurde.echelle));
});

test('cadrage : la matrice et les coins de l\'image sont cohérents', () => {
  const p = { cx: 300, cy: 400, echelle: 0.8, angle: 17 };
  const m = matriceCanvas(p, 413, 531);
  const [x, y] = appliquer(m, 300, 400);
  proche(x, 206.5);
  proche(y, 265.5);
  const coins = coinsDansImage(p, 413, 531);
  const cadre = [[0, 0], [413, 0], [413, 531], [0, 531]];
  coins.forEach(([px, py], i) => {
    const [qx, qy] = appliquer(m, px, py);
    proche(qx, cadre[i][0]);
    proche(qy, cadre[i][1]);
  });
});

test('cadrage : à partir d\'un visage détecté', () => {
  const boite = { x: 900, y: 500, width: 300, height: 350 };
  const c = cadrageDepuisVisage(2000, 1500, 413, 531, boite);
  const m = matriceCanvas(c, 413, 531);
  const [x, y] = appliquer(m, 1050, 675);
  proche(x, 413 / 2);
  proche(y, 0.45 * 531);
  proche(c.echelle * 350, 0.42 * 531);
  assert.ok(couvreImage(c, 2000, 1500, 413, 531));
  assert.deepEqual(cadrageDepuisVisage(2000, 1500, 413, 531, null), cadrageInitial(2000, 1500, 413, 531));
});

// ---------- pixels et qualité ----------

test('pixels : luminance, statistiques et netteté', () => {
  assert.deepEqual(Array.from(luminanceRGBA([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255])), [255, 0, 76]);
  const s = statsLuminosite([0, 255]);
  proche(s.moyenne, 127.5);
  proche(s.ecartType, 127.5);
  assert.deepEqual(statsLuminosite([]), { moyenne: 0, ecartType: 0 });
  const w = 10;
  const h = 10;
  const uniforme = new Uint8Array(w * h).fill(100);
  const damier = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) damier[y * w + x] = (x + y) % 2 ? 255 : 0;
  assert.equal(varianceLaplacien(uniforme, w, h), 0);
  assert.ok(varianceLaplacien(damier, w, h) > 1000);
  assert.equal(varianceLaplacien(uniforme, 2, 2), 0);
});

test('pixels : luminosité et contraste', () => {
  const intact = new Uint8ClampedArray([100, 150, 200, 255]);
  assert.equal(appliquerReglages(intact, 0, 0), intact);
  assert.deepEqual(Array.from(intact), [100, 150, 200, 255]);
  const clair = appliquerReglages(new Uint8ClampedArray([100, 100, 100, 255]), 10, 0);
  assert.deepEqual(Array.from(clair), [126, 126, 126, 255]);
  const contraste = appliquerReglages(new Uint8ClampedArray([100, 200, 128, 255]), 0, 100);
  assert.deepEqual(Array.from(contraste), [72, 255, 128, 255]);
});

test('qualité : les mesures deviennent des alertes, chaque contrôle peut être coupé', () => {
  const v = { nettete: true, luminosite: true, cadrage: true };
  const s = { netteteMin: 40, luminositeMin: 70, luminositeMax: 200, contrasteMin: 25 };
  const bon = { nettete: 100, moyenne: 120, ecartType: 50 };
  assert.deepEqual(evaluerQualite(bon, v, s), []);
  assert.deepEqual(evaluerQualite({ ...bon, nettete: 10 }, v, s), ['floue']);
  assert.deepEqual(evaluerQualite({ ...bon, moyenne: 30 }, v, s), ['sombre']);
  assert.deepEqual(evaluerQualite({ ...bon, moyenne: 230 }, v, s), ['claire']);
  assert.deepEqual(evaluerQualite({ ...bon, ecartType: 10 }, v, s), ['contraste-faible']);
  assert.deepEqual(evaluerQualite({ ...bon, visage: undefined }, v, s), []);
  assert.deepEqual(evaluerQualite({ ...bon, visage: null }, v, s), ['visage-absent']);
  assert.deepEqual(evaluerQualite({ ...bon, visage: { hauteurRelative: 0.2, decentrage: 0.3 } }, v, s), ['visage-petit', 'visage-decentre']);
  assert.deepEqual(evaluerQualite({ ...bon, visage: { hauteurRelative: 0.7, decentrage: 0 } }, v, s), ['visage-grand']);
  assert.deepEqual(evaluerQualite({ ...bon, visage: { hauteurRelative: 0.42, decentrage: 0.02 } }, v, s), []);
  assert.deepEqual(evaluerQualite({ ...bon, nettete: 0 }, { ...v, nettete: false }, s), []);
  assert.deepEqual(evaluerQualite({ ...bon, visage: null }, { ...v, cadrage: false }, s), []);
});

test('compression : la qualité baisse d\'abord, les dimensions seulement si autorisé', () => {
  const sans = etapesCompression(0.5, false);
  assert.equal(sans.length, 7);
  assert.ok(sans.every((e) => e.facteur === 1));
  assert.equal(sans[0].qualite, 0.92);
  assert.equal(sans[sans.length - 1].qualite, 0.5);
  const avec = etapesCompression(0.5, true);
  assert.equal(avec.length, 13);
  assert.deepEqual(avec[avec.length - 1], { qualite: 0.5, facteur: 0.7 });
  assert.equal(etapesCompression(0.95, false).length, 1);
});

// ---------- export et rapport ----------

const ELEVES_EXPORT = [
  { id: 'e1', matricule: 'A1', nom: 'Kouassi', prenoms: 'Jean', npi: '' },
  { id: 'e2', matricule: 'B2', nom: 'Dossou', prenoms: 'Marie', npi: '' },
  { id: 'e3', matricule: 'A1', nom: 'Agbo', prenoms: 'Paul', npi: '' }
];
const PHOTOS_EXPORT = [
  { eleveId: 'e1', donnees: new Uint8Array([1, 2, 3]) },
  { eleveId: 'e3', donnees: new Uint8Array([4, 5]) }
];

test('export : noms uniques, dossier optionnel, élèves sans photo', () => {
  const r = preparerExport(ELEVES_EXPORT, PHOTOS_EXPORT, R());
  assert.deepEqual(r.entrees.map((e) => e.nom), ['A1.jpg', 'A1_2.jpg']);
  assert.deepEqual(r.sansPhoto, ['e2']);
  assert.ok(r.correspondances[1].alertes.includes('doublon-nom'));
  assert.deepEqual(Array.from(r.entrees[1].donnees), [4, 5]);
  const avecDossier = preparerExport(ELEVES_EXPORT, PHOTOS_EXPORT, R({ zip: { dossier: 'Photos 2026' } }));
  assert.equal(avecDossier.entrees[0].nom, 'Photos_2026/A1.jpg');
});

test('rapport : statut conforme, alerte ou sans photo', () => {
  const { correspondances } = preparerExport(ELEVES_EXPORT, PHOTOS_EXPORT, R());
  const meta = new Map([
    ['e1', { poidsOctets: 20480, largeur: 413, hauteur: 531, alertes: [] }],
    ['e3', { poidsOctets: 10240, largeur: 413, hauteur: 531, alertes: ['floue'] }]
  ]);
  const lignes = lignesRapport(ELEVES_EXPORT, correspondances, meta);
  assert.equal(lignes[0].statut, 'conforme');
  assert.equal(lignes[0].poids_ko, '20.0');
  assert.equal(lignes[1].statut, 'sans photo');
  assert.equal(lignes[1].fichier, '');
  assert.equal(lignes[2].statut, 'alerte');
  assert.ok(lignes[2].alertes.includes(messageAlerte('floue')));
  assert.ok(lignes[2].alertes.includes(messageAlerte('doublon-nom')));
});

test('csv : séparateur « ; », accents conservés, formules neutralisées', () => {
  const csv = genererCsv([{ matricule: '=1+1', nom: 'a;b"c' }], ['matricule', 'nom']);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv, "\uFEFFmatricule;nom\r\n'=1+1;\"a;b\"\"c\"\r\n");
  assert.ok(!genererCsv([], ['x'], { bom: false }).startsWith('\uFEFF'));
});

// ---------- ZIP ----------

function lireZip(octets) {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const fin = octets.length - 22;
  assert.equal(vue.getUint32(fin, true), 0x06054b50);
  const total = vue.getUint16(fin + 10, true);
  const tailleRep = vue.getUint32(fin + 12, true);
  const debutRep = vue.getUint32(fin + 16, true);
  assert.equal(debutRep + tailleRep, fin);
  const decodeur = new TextDecoder();
  const entrees = [];
  let pos = debutRep;
  for (let i = 0; i < total; i += 1) {
    assert.equal(vue.getUint32(pos, true), 0x02014b50);
    const drapeaux = vue.getUint16(pos + 8, true);
    const crc = vue.getUint32(pos + 16, true);
    const tailleComprimee = vue.getUint32(pos + 20, true);
    const taille = vue.getUint32(pos + 24, true);
    const tailleNom = vue.getUint16(pos + 28, true);
    const decalage = vue.getUint32(pos + 42, true);
    const nom = decodeur.decode(octets.subarray(pos + 46, pos + 46 + tailleNom));
    assert.equal(tailleComprimee, taille);
    assert.equal(vue.getUint32(decalage, true), 0x04034b50);
    const tailleNomLocal = vue.getUint16(decalage + 26, true);
    const debut = decalage + 30 + tailleNomLocal;
    entrees.push({ nom, crc, drapeaux, donnees: octets.slice(debut, debut + taille) });
    pos += 46 + tailleNom;
  }
  return entrees;
}

test('crc32 : valeurs de référence', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('zip : structure relue, contenus et sommes de contrôle identiques', () => {
  const binaire = Uint8Array.from({ length: 1000 }, (_, i) => i % 256);
  const texte = new TextEncoder().encode('bonjour');
  const zip = creerZip([{ nom: 'A1.jpg', donnees: binaire }, { nom: 'dossier/b.txt', donnees: texte }, { nom: 'é.jpg', donnees: new Uint8Array([9]) }], {
    date: new Date(2026, 10, 20, 12, 30, 40)
  });
  const lu = lireZip(zip);
  assert.deepEqual(lu.map((e) => e.nom), ['A1.jpg', 'dossier/b.txt', 'é.jpg']);
  assert.deepEqual(Array.from(lu[0].donnees), Array.from(binaire));
  assert.equal(new TextDecoder().decode(lu[1].donnees), 'bonjour');
  lu.forEach((e) => assert.equal(crc32(e.donnees), e.crc));
  assert.equal(lu[0].drapeaux & 0x0800, 0);
  assert.equal(lu[2].drapeaux & 0x0800, 0x0800);
  assert.deepEqual(lireZip(creerZip([])), []);
  assert.equal(creerZip([]).length, 22);
});

test('zip : noms dangereux ou en double refusés', () => {
  const un = new Uint8Array(1);
  assert.throws(() => creerZip([{ nom: '../x.jpg', donnees: un }]), /refusé/);
  assert.throws(() => creerZip([{ nom: '/abs.jpg', donnees: un }]), /refusé/);
  assert.throws(() => creerZip([{ nom: 'a\\b.jpg', donnees: un }]), /refusé/);
  assert.throws(() => creerZip([{ nom: '', donnees: un }]), /refusé/);
  assert.throws(() => creerZip([{ nom: 'A.jpg', donnees: un }, { nom: 'a.jpg', donnees: un }]), /double/);
});

// ---------- messages ----------

test('messages : tous les codes d\'alerte ont un texte en français', () => {
  const codes = [
    'floue', 'sombre', 'claire', 'contraste-faible', 'visage-absent', 'visage-petit', 'visage-grand', 'visage-decentre',
    'poids-depasse', 'dimensions-reduites', 'matricule-manquant', 'npi-manquant', 'nom-vide', 'doublon-nom',
    'liste-vide', 'liste-matricules-manquants', 'liste-doublons'
  ];
  for (const code of codes) assert.ok(MESSAGES_ALERTES[code] && MESSAGES_ALERTES[code].length > 10, `message manquant : ${code}`);
  assert.equal(messageAlerte('code-inconnu'), 'code-inconnu');
  assert.ok(messageAlerte('floue').includes('nette'));
});