// ==========================================================
// STUDIO PHOTO ÉLÈVES — NOYAU
// Logique pure : aucun navigateur, aucun React, aucune dépendance. Testable avec « node ».
// Tout se passe sur l'appareil : rien n'est envoyé nulle part.
//
// Les règles exactes d'EducMaster (dimensions, poids, nom des fichiers) ne sont pas connues : tout est réglable,
// avec des valeurs de départ « photo d'identité ». À vérifier sur l'écran d'import d'EducMaster au premier essai réel.
// ==========================================================

// ---------- 1. NORMES ET RÉGLAGES ----------

export const PROFILS = [
    { id: 'identite-413x531', libelle: "Photo d'identité 35×45 mm (413×531)", largeur: 413, hauteur: 531 },
    { id: 'portrait-3x4', libelle: 'Portrait 3:4 (480×640)', largeur: 480, hauteur: 640 },
    { id: 'portrait-4x5', libelle: 'Portrait 4:5 (480×600)', largeur: 480, hauteur: 600 },
    { id: 'personnalise', libelle: 'Personnalisé', largeur: 413, hauteur: 531 }
  ];
  
  export const SCHEMAS_NOMS = [
    { id: 'matricule', libelle: 'MATRICULE.jpg' },
    { id: 'matricule_nom_prenoms', libelle: 'MATRICULE_NOM_PRENOMS.jpg' },
    { id: 'nom_prenoms', libelle: 'NOM_PRENOMS.jpg' },
    { id: 'npi', libelle: 'NPI.jpg' }
  ];
  
  export function reglagesParDefaut() {
    return {
      profilId: 'identite-413x531',
      largeur: 413,
      hauteur: 531,
      poidsMaxKo: 150,
      qualiteMin: 0.5, // plancher de qualité JPEG
      autoriserReduction: false, // réduire les dimensions pour tenir dans le poids : NON par défaut
      schemaNom: 'matricule',
      majuscules: true,
      modeLeger: false, // true : saute les contrôles lourds (netteté)
      verifications: { nettete: true, luminosite: true, cadrage: true },
      // Valeurs de départ À CALIBRER sur vos téléphones
      seuils: { netteteMin: 40, luminositeMin: 70, luminositeMax: 200, contrasteMin: 25 },
      zip: { inclureRapport: false, dossier: '' }
    };
  }
  
  const entier = (v, min, max, defaut) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
  };
  const nombre = (v, min, max, defaut) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
  };
  const booleen = (v, defaut) => (typeof v === 'boolean' ? v : defaut);
  
  /** Remet n'importe quel objet (lu du stockage, saisi à la main) dans une forme valide. Rien d'inconnu n'est conservé. */
  export function normaliserReglages(brut) {
    const d = reglagesParDefaut();
    const b = brut && typeof brut === 'object' ? brut : {};
    const profilId = PROFILS.some((p) => p.id === b.profilId) ? b.profilId : d.profilId;
    const profil = PROFILS.find((p) => p.id === profilId);
    const personnalise = profilId === 'personnalise';
    const v = b.verifications && typeof b.verifications === 'object' ? b.verifications : {};
    const s = b.seuils && typeof b.seuils === 'object' ? b.seuils : {};
    const z = b.zip && typeof b.zip === 'object' ? b.zip : {};
    return {
      profilId,
      largeur: personnalise ? entier(b.largeur, 100, 2000, d.largeur) : profil.largeur,
      hauteur: personnalise ? entier(b.hauteur, 100, 2000, d.hauteur) : profil.hauteur,
      poidsMaxKo: entier(b.poidsMaxKo, 20, 1000, d.poidsMaxKo),
      qualiteMin: nombre(b.qualiteMin, 0.3, 0.95, d.qualiteMin),
      autoriserReduction: booleen(b.autoriserReduction, d.autoriserReduction),
      schemaNom: SCHEMAS_NOMS.some((x) => x.id === b.schemaNom) ? b.schemaNom : d.schemaNom,
      majuscules: booleen(b.majuscules, d.majuscules),
      modeLeger: booleen(b.modeLeger, d.modeLeger),
      verifications: {
        nettete: booleen(v.nettete, d.verifications.nettete),
        luminosite: booleen(v.luminosite, d.verifications.luminosite),
        cadrage: booleen(v.cadrage, d.verifications.cadrage)
      },
      seuils: {
        netteteMin: nombre(s.netteteMin, 0, 10000, d.seuils.netteteMin),
        luminositeMin: nombre(s.luminositeMin, 0, 255, d.seuils.luminositeMin),
        luminositeMax: nombre(s.luminositeMax, 0, 255, d.seuils.luminositeMax),
        contrasteMin: nombre(s.contrasteMin, 0, 128, d.seuils.contrasteMin)
      },
      zip: {
        inclureRapport: booleen(z.inclureRapport, d.zip.inclureRapport),
        dossier: nettoyerSegment(z.dossier ?? '', { majuscules: false })
      }
    };
  }
  
  export const ratioSortie = (reglages) => reglages.largeur / reglages.hauteur;
  
  // ---------- 2. MESSAGES ----------
  
  export const MESSAGES_ALERTES = {
    floue: 'Photo peu nette : reprenez-la en tenant le téléphone bien stable.',
    sombre: "Photo trop sombre : placez l'élève face à la lumière.",
    claire: 'Photo trop claire : évitez le soleil direct sur le visage.',
    'contraste-faible': 'Contraste faible : éclairez le visage de face, sur un fond uni.',
    'visage-absent': 'Aucun visage détecté dans le cadre.',
    'visage-petit': 'Visage trop petit : rapprochez-vous ou agrandissez.',
    'visage-grand': 'Visage trop grand : reculez ou réduisez.',
    'visage-decentre': 'Visage décentré : recentrez-le dans le cadre.',
    'poids-depasse': 'Poids supérieur à la limite malgré la compression maximale.',
    'dimensions-reduites': 'Dimensions réduites pour respecter la limite de poids.',
    'matricule-manquant': 'Matricule manquant : le nom du fichier est fabriqué avec le nom et les prénoms.',
    'npi-manquant': 'NPI manquant : le nom du fichier est fabriqué avec le nom et les prénoms.',
    'nom-vide': "Aucun nom ni matricule : nom de fichier générique.",
    'doublon-nom': 'Nom de fichier déjà pris : un numéro a été ajouté.',
    'liste-vide': 'La liste est vide.',
    'liste-matricules-manquants': 'Élèves sans matricule dans la liste.',
    'liste-doublons': 'Élèves en double dans la liste.'
  };
  
  export const messageAlerte = (code) => MESSAGES_ALERTES[code] || code;
  
  // ---------- 3. NOMS DE FICHIERS ----------
  
  const LIGATURES = { œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE', ß: 'ss' };
  
  function sansAccents(texte) {
    return String(texte ?? '')
      .replace(/[œŒæÆß]/g, (c) => LIGATURES[c])
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  
  /** Nom, prénoms… : sans accents, sans espaces ni signes, séparés par « _ ». */
  export function nettoyerSegment(texte, { majuscules = true } = {}) {
    const s = sansAccents(texte)
      .replace(/['’`]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return majuscules ? s.toUpperCase() : s;
  }
  
  /** Matricule, NPI : sans accents ni espaces ; seuls les lettres, chiffres, « - » et « _ » restent. */
  export function nettoyerMatricule(texte, { majuscules = true } = {}) {
    const s = sansAccents(texte).replace(/\s+/g, '').replace(/[^A-Za-z0-9_-]/g, '');
    return majuscules ? s.toUpperCase() : s;
  }
  
  const LONGUEUR_MAX_NOM = 100;
  
  /** Nom du fichier d'un élève selon le schéma choisi. Renvoie { nom, alertes }. */
  export function nomFichier(eleve, reglages, rang = 0) {
    const maj = reglages.majuscules !== false;
    const mat = nettoyerMatricule(eleve.matricule, { majuscules: maj });
    const npi = nettoyerMatricule(eleve.npi, { majuscules: maj });
    const nom = nettoyerSegment(eleve.nom, { majuscules: maj });
    const prenoms = nettoyerSegment(eleve.prenoms, { majuscules: maj });
    const alertes = [];
    let parties;
    switch (reglages.schemaNom) {
      case 'matricule_nom_prenoms':
        if (!mat) alertes.push('matricule-manquant');
        parties = [mat, nom, prenoms];
        break;
      case 'nom_prenoms':
        parties = [nom, prenoms];
        break;
      case 'npi':
        if (npi) parties = [npi];
        else {
          alertes.push('npi-manquant');
          parties = [nom, prenoms];
        }
        break;
      case 'matricule':
      default:
        if (mat) parties = [mat];
        else {
          alertes.push('matricule-manquant');
          parties = [nom, prenoms];
        }
    }
    let base = parties.filter(Boolean).join('_');
    if (!base) {
      base = `ELEVE_${rang + 1}`;
      alertes.push('nom-vide');
    }
    base = base.slice(0, LONGUEUR_MAX_NOM).replace(/_+$/, '');
    return { nom: `${base}.jpg`, alertes };
  }
  
  /** Garantit des noms tous différents (sans tenir compte des majuscules) : « X.jpg », « X_2.jpg », « X_3.jpg »… */
  export function nomsUniques(noms) {
    const pris = new Set();
    return noms.map((nom) => {
      const point = nom.lastIndexOf('.');
      const base = point > 0 ? nom.slice(0, point) : nom;
      const ext = point > 0 ? nom.slice(point) : '';
      let candidat = nom;
      let n = 1;
      while (pris.has(candidat.toLowerCase())) {
        n += 1;
        candidat = `${base}_${n}${ext}`;
      }
      pris.add(candidat.toLowerCase());
      return { nom: candidat, doublon: n > 1 };
    });
  }
  
  // ---------- 4. LISTE DE CLASSE ----------
  
  function normaliserCle(texte) {
    return sansAccents(texte).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  
  const SYNONYMES = {
    matricule: ['matricule', 'mat', 'n matricule', 'no matricule', 'numero matricule'],
    nom: ['nom', 'noms', 'nom de famille'],
    prenoms: ['prenom', 'prenoms'],
    npi: ['npi', 'n p i', 'numero personnel d identification'],
    complet: ['nom et prenoms', 'nom et prenom', 'noms et prenoms', 'nom complet', 'eleve', 'eleves']
  };
  
  function cleColonne(cellule) {
    const c = normaliserCle(cellule);
    for (const [cle, mots] of Object.entries(SYNONYMES)) if (mots.includes(c)) return cle;
    return null;
  }
  
  function decouperLigne(ligne, sep) {
    const cellules = [];
    let courant = '';
    let guillemets = false;
    for (let i = 0; i < ligne.length; i += 1) {
      const c = ligne[i];
      if (guillemets) {
        if (c === '"') {
          if (ligne[i + 1] === '"') {
            courant += '"';
            i += 1;
          } else guillemets = false;
        } else courant += c;
      } else if (c === '"') guillemets = true;
      else if (c === sep) {
        cellules.push(courant.trim());
        courant = '';
      } else courant += c;
    }
    cellules.push(courant.trim());
    return cellules;
  }
  
  function detecterSeparateur(lignes) {
    let meilleur = null;
    let max = 0;
    for (const sep of ['\t', ';', ',']) {
      const total = lignes.slice(0, 5).reduce((n, l) => n + (l.split(sep).length - 1), 0);
      if (total > max) {
        max = total;
        meilleur = sep;
      }
    }
    return meilleur;
  }
  
  /** « KOUASSI Jean Pierre » → { nom: 'KOUASSI', prenoms: 'Jean Pierre' }. Tout en majuscules : le premier mot est le nom. */
  export function separerNomComplet(texte) {
    const mots = String(texte ?? '').trim().split(/\s+/).filter(Boolean);
    if (mots.length === 0) return { nom: '', prenoms: '' };
    const estMajuscule = (m) => m === m.toUpperCase() && m !== m.toLowerCase();
    let i = 0;
    while (i < mots.length && estMajuscule(mots[i])) i += 1;
    if (i === 0 || i >= mots.length) i = 1;
    return { nom: mots.slice(0, i).join(' '), prenoms: mots.slice(i).join(' ') };
  }
  
  /** Identifiant stable d'un élève : le matricule s'il existe, sinon le nom. Une nouvelle importation garde donc ses photos. */
  export function idEleve(eleve, dejaVus = new Set()) {
    const mat = nettoyerMatricule(eleve.matricule, { majuscules: true });
    const base = mat ? `m:${mat}` : `n:${normaliserCle(eleve.nom)}|${normaliserCle(eleve.prenoms)}`;
    let id = base;
    let n = 1;
    while (dejaVus.has(id)) {
      n += 1;
      id = `${base}#${n}`;
    }
    dejaVus.add(id);
    return id;
  }
  
  /**
   * Lit une liste collée ou un fichier CSV/TXT. Colonnes reconnues par leur en-tête (matricule, nom, prénoms, npi, « nom et
   * prénoms »), sinon dans l'ordre matricule, nom, prénoms, npi. `colonnes` force l'ordre (ex. ['nom','prenoms']).
   */
  export function analyserListe(texte, { colonnes } = {}) {
    const lignes = String(texte ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lignes.length === 0) return { eleves: [], alertes: [{ code: 'liste-vide' }], colonnes: [], entete: false, separateur: null };
  
    const sep = detecterSeparateur(lignes);
    const lignesCellules = lignes.map((l) => (sep ? decouperLigne(l, sep) : [l]));
    const premiere = lignesCellules[0];
    const reconnues = premiere.map(cleColonne);
    const nbReconnues = reconnues.filter(Boolean).length;
    const entete = nbReconnues >= Math.min(2, premiere.length) && nbReconnues >= 1;
  
    let mapping;
    if (colonnes) mapping = colonnes.slice();
    else if (entete) mapping = reconnues;
    else {
      const n = premiere.length;
      mapping = n >= 4 ? ['matricule', 'nom', 'prenoms', 'npi'] : n === 3 ? ['matricule', 'nom', 'prenoms'] : n === 2 ? ['nom', 'prenoms'] : ['complet'];
    }
  
    const donnees = entete ? lignesCellules.slice(1) : lignesCellules;
    const eleves = [];
    const dejaVus = new Set();
    let sansMatricule = 0;
    let doublons = 0;
    for (const cellules of donnees) {
      const e = { matricule: '', nom: '', prenoms: '', npi: '' };
      mapping.forEach((cle, i) => {
        const valeur = (cellules[i] ?? '').trim();
        if (!cle || !valeur) return;
        if (cle === 'complet') Object.assign(e, separerNomComplet(valeur));
        else e[cle] = valeur;
      });
      if (!e.matricule && !e.nom && !e.prenoms) continue;
      if (!e.matricule) sansMatricule += 1;
      e.id = idEleve(e, dejaVus);
      if (e.id.includes('#')) doublons += 1;
      eleves.push(e);
    }
    const alertes = [];
    if (sansMatricule > 0) alertes.push({ code: 'liste-matricules-manquants', nombre: sansMatricule });
    if (doublons > 0) alertes.push({ code: 'liste-doublons', nombre: doublons });
    if (eleves.length === 0) alertes.push({ code: 'liste-vide' });
    return { eleves, alertes, colonnes: mapping, entete, separateur: sep };
  }
  
  const premierNonVide = (objet, cles) => {
    for (const c of cles) {
      if (objet && objet[c] != null && String(objet[c]).trim() !== '') return String(objet[c]).trim();
    }
    return '';
  };
  
  /** Adaptateur tolérant vers une classe de MastaNote. Les noms de champs sont devinés : l'aperçu dira ce qui a été lu. */
  export function elevesDepuisClasse(classe) {
    const dejaVus = new Set();
    return (Array.isArray(classe?.eleves) ? classe.eleves : [])
      .map((e) => {
        const r = {
          matricule: premierNonVide(e, ['matricule', 'mat', 'numeroMatricule']),
          nom: premierNonVide(e, ['nom', 'lastName', 'nomFamille']),
          prenoms: premierNonVide(e, ['prenoms', 'prenom', 'firstName']),
          npi: premierNonVide(e, ['npi'])
        };
        if (!r.nom && !r.prenoms) {
          const complet = premierNonVide(e, ['nomComplet', 'nomPrenoms', 'name', 'fullName']);
          if (complet) Object.assign(r, separerNomComplet(complet));
        }
        return r;
      })
      .filter((r) => r.matricule || r.nom || r.prenoms)
      .map((r) => ({ ...r, id: idEleve(r, dejaVus) }));
  }
  
  // ---------- 5. ASSOCIATION DES PHOTOS AUX ÉLÈVES ----------
  
  const sansExtension = (nom) => String(nom ?? '').replace(/\.[A-Za-z0-9]{1,5}$/, '');
  const ordreNaturel = (a, b) => String(a).localeCompare(String(b), 'fr', { numeric: true, sensitivity: 'base' });
  
  function contientMatricule(tokens, mat) {
    for (let i = 0; i < tokens.length; i += 1) {
      let cumul = '';
      for (let j = i; j < tokens.length; j += 1) {
        cumul += tokens[j];
        if (cumul === mat) return true;
        if (cumul.length > mat.length) break;
      }
    }
    return false;
  }
  
  /**
   * Associe des fichiers (objets { nom }) à des élèves : 1) matricule dans le nom du fichier, 2) nom et prénoms,
   * 3) ordre de la liste si `parOrdre`. Renvoie, pour chaque fichier : { index, nomFichier, eleveId, methode, score, statut }
   * avec statut 'ok' | 'non-associe' | 'ambigu' | 'doublon'. Rien n'est appliqué : l'utilisateur vérifie et corrige avant.
   */
  export function associerFichiers(fichiers, eleves, { parOrdre = false } = {}) {
    const resultats = fichiers.map((f, index) => ({ index, nomFichier: f.nom, eleveId: null, methode: null, score: 0, statut: 'non-associe' }));
    const prepares = eleves.map((e) => ({
      id: e.id,
      mat: normaliserCle(e.matricule).replace(/ /g, ''),
      nomTokens: normaliserCle(e.nom).split(' ').filter(Boolean),
      prenomsTokens: normaliserCle(e.prenoms).split(' ').filter(Boolean)
    }));
  
    fichiers.forEach((f, i) => {
      const tokens = normaliserCle(sansExtension(f.nom)).split(' ').filter(Boolean);
      const ensemble = new Set(tokens);
  
      // 1) matricule
      const parMatricule = prepares.filter((p) => p.mat.length >= 3 && contientMatricule(tokens, p.mat));
      if (parMatricule.length > 0) {
        const longueurMax = Math.max(...parMatricule.map((p) => p.mat.length));
        const meilleurs = parMatricule.filter((p) => p.mat.length === longueurMax);
        if (meilleurs.length === 1) Object.assign(resultats[i], { eleveId: meilleurs[0].id, methode: 'matricule', score: 1, statut: 'ok' });
        else resultats[i].statut = 'ambigu';
        return;
      }
  
      // 2) nom et prénoms
      let meilleur = null;
      let egalite = false;
      for (const p of prepares) {
        if (p.nomTokens.length === 0 || !p.nomTokens.every((t) => ensemble.has(t))) continue;
        const tous = [...p.nomTokens, ...p.prenomsTokens];
        const score = tous.filter((t) => ensemble.has(t)).length / tous.length;
        if (score < 0.6) continue;
        if (!meilleur || score > meilleur.score) {
          meilleur = { id: p.id, score };
          egalite = false;
        } else if (score === meilleur.score) egalite = true;
      }
      if (meilleur && !egalite) Object.assign(resultats[i], { eleveId: meilleur.id, methode: 'nom', score: meilleur.score, statut: 'ok' });
      else if (meilleur && egalite) resultats[i].statut = 'ambigu';
    });
  
    // Un élève ne peut avoir qu'une photo : on garde le meilleur fichier, les autres deviennent « doublon »
    const parEleve = new Map();
    for (const r of resultats) {
      if (r.statut !== 'ok') continue;
      const actuel = parEleve.get(r.eleveId);
      if (!actuel) parEleve.set(r.eleveId, r);
      else if (r.score > actuel.score) {
        Object.assign(actuel, { eleveId: null, methode: null, score: 0, statut: 'doublon' });
        parEleve.set(r.eleveId, r);
      } else Object.assign(r, { eleveId: null, methode: null, score: 0, statut: 'doublon' });
    }
  
    // 3) ordre de la liste, pour ce qui reste
    if (parOrdre) {
      const prisEleves = new Set(resultats.filter((r) => r.statut === 'ok').map((r) => r.eleveId));
      const libres = eleves.filter((e) => !prisEleves.has(e.id));
      const fichiersLibres = resultats.filter((r) => r.statut === 'non-associe').sort((a, b) => ordreNaturel(a.nomFichier, b.nomFichier));
      const n = Math.min(libres.length, fichiersLibres.length);
      for (let k = 0; k < n; k += 1) Object.assign(fichiersLibres[k], { eleveId: libres[k].id, methode: 'ordre', score: 0.1, statut: 'ok' });
    }
    return resultats;
  }
  
  // ---------- 6. CADRAGE (géométrie pure) ----------
  // Un cadrage = { cx, cy, echelle, angle } : le point (cx, cy) de l'image (en pixels) est au centre du cadre,
  // `echelle` = pixels de sortie par pixel d'image, `angle` = rotation de l'image en degrés, dans le sens des aiguilles d'une montre.
  
  const rad = (deg) => (deg * Math.PI) / 180;
  
  /** Échelle minimale pour que l'image, tournée de `angle`, couvre entièrement un cadre W×H. */
  export function echelleMin(imgW, imgH, W, H, angle = 0) {
    const c = Math.abs(Math.cos(rad(angle)));
    const s = Math.abs(Math.sin(rad(angle)));
    return Math.max((W * c + H * s) / imgW, (W * s + H * c) / imgH);
  }
  
  /** Ramène un cadrage dans le possible : échelle suffisante, cadre entièrement dans l'image (aucune zone blanche). */
  export function corrigerCadrage(params, imgW, imgH, W, H) {
    const angle = Number.isFinite(params.angle) ? params.angle : 0;
    const echelle = Math.max(Number.isFinite(params.echelle) ? params.echelle : 0, echelleMin(imgW, imgH, W, H, angle));
    const c = Math.abs(Math.cos(rad(angle)));
    const s = Math.abs(Math.sin(rad(angle)));
    const demiX = (W * c + H * s) / (2 * echelle);
    const demiY = (W * s + H * c) / (2 * echelle);
    const borne = (v, demi, taille) => {
      const x = Number.isFinite(v) ? v : taille / 2;
      return demi * 2 >= taille ? taille / 2 : Math.min(taille - demi, Math.max(demi, x));
    };
    return { cx: borne(params.cx, demiX, imgW), cy: borne(params.cy, demiY, imgH), echelle, angle };
  }
  
  /** Cadrage de départ sans détection de visage : couvre l'image, et le cadre est remonté (la tête est le plus souvent en haut). */
  export function cadrageInitial(imgW, imgH, W, H, { positionVerticale = 0.45 } = {}) {
    const echelle = echelleMin(imgW, imgH, W, H, 0);
    return corrigerCadrage({ cx: imgW / 2, cy: imgH * positionVerticale, echelle, angle: 0 }, imgW, imgH, W, H);
  }
  
  /** Cadrage à partir d'un visage détecté { x, y, width, height } : visage à 42 % de la hauteur, centré à 45 % depuis le haut. */
  export function cadrageDepuisVisage(imgW, imgH, W, H, boite, { hauteurVisage = 0.42, positionVisage = 0.45 } = {}) {
    if (!boite || !(boite.height > 0)) return cadrageInitial(imgW, imgH, W, H);
    const echelle = (hauteurVisage * H) / boite.height;
    const fx = boite.x + boite.width / 2;
    const fy = boite.y + boite.height / 2;
    return corrigerCadrage({ cx: fx, cy: fy + ((0.5 - positionVisage) * H) / echelle, echelle, angle: 0 }, imgW, imgH, W, H);
  }
  
  /** Matrice pour `ctx.setTransform(a, b, c, d, e, f)` : dessine l'image à (0,0) et elle tombe dans le cadre W×H. */
  export function matriceCanvas(params, W, H) {
    const t = rad(params.angle || 0);
    const a = params.echelle * Math.cos(t);
    const b = params.echelle * Math.sin(t);
    const c = -params.echelle * Math.sin(t);
    const d = params.echelle * Math.cos(t);
    return [a, b, c, d, W / 2 - a * params.cx - c * params.cy, H / 2 - b * params.cx - d * params.cy];
  }
  
  /** Les quatre coins du cadre, exprimés en pixels de l'image. */
  export function coinsDansImage(params, W, H) {
    const t = rad(params.angle || 0);
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    return [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H]
    ].map(([x, y]) => {
      const dx = x - W / 2;
      const dy = y - H / 2;
      return [params.cx + (dx * cos + dy * sin) / params.echelle, params.cy + (-dx * sin + dy * cos) / params.echelle];
    });
  }
  
  /** Vrai si le cadre est entièrement dans l'image (aucune zone blanche). */
  export function couvreImage(params, imgW, imgH, W, H) {
    const eps = 0.5;
    return coinsDansImage(params, W, H).every(([x, y]) => x >= -eps && y >= -eps && x <= imgW + eps && y <= imgH + eps);
  }
  
  // ---------- 7. PIXELS ET QUALITÉ ----------
  
  /** RGBA → niveaux de gris 0-255. */
  export function luminanceRGBA(rgba) {
    const n = Math.floor(rgba.length / 4);
    const gris = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) gris[i] = Math.round(0.299 * rgba[4 * i] + 0.587 * rgba[4 * i + 1] + 0.114 * rgba[4 * i + 2]);
    return gris;
  }
  
  export function statsLuminosite(gris) {
    if (gris.length === 0) return { moyenne: 0, ecartType: 0 };
    let somme = 0;
    for (let i = 0; i < gris.length; i += 1) somme += gris[i];
    const moyenne = somme / gris.length;
    let carres = 0;
    for (let i = 0; i < gris.length; i += 1) carres += (gris[i] - moyenne) ** 2;
    return { moyenne, ecartType: Math.sqrt(carres / gris.length) };
  }
  
  /** Netteté : variance du laplacien (noyau 3×3) d'une image en niveaux de gris. Plus c'est élevé, plus c'est net. */
  export function varianceLaplacien(gris, w, h) {
    if (w < 3 || h < 3) return 0;
    let somme = 0;
    let carres = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = y * w + x;
        const l = gris[i - w] + gris[i + w] + gris[i - 1] + gris[i + 1] - 4 * gris[i];
        somme += l;
        carres += l * l;
        n += 1;
      }
    }
    const moyenne = somme / n;
    return carres / n - moyenne * moyenne;
  }
  
  /** Luminosité et contraste appliqués en place sur des pixels RGBA. Réglages de -100 à +100 ; (0, 0) ne change rien. */
  export function appliquerReglages(rgba, luminosite = 0, contraste = 0) {
    if (!luminosite && !contraste) return rgba;
    const facteur = 1 + Math.max(-100, Math.min(100, contraste)) / 100;
    const decalage = (Math.max(-100, Math.min(100, luminosite)) * 255) / 100;
    const table = new Uint8Array(256);
    for (let v = 0; v < 256; v += 1) table[v] = Math.max(0, Math.min(255, Math.round((v - 128) * facteur + 128 + decalage)));
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = table[rgba[i]];
      rgba[i + 1] = table[rgba[i + 1]];
      rgba[i + 2] = table[rgba[i + 2]];
    }
    return rgba;
  }
  
  /**
   * Transforme les mesures en alertes. `visage` : undefined = pas de détection possible, null = aucun visage trouvé,
   * sinon { hauteurRelative, decentrage } (fractions du cadre).
   */
  export function evaluerQualite({ nettete, moyenne, ecartType, visage }, verifications, seuils) {
    const alertes = [];
    if (verifications.nettete && Number.isFinite(nettete) && nettete < seuils.netteteMin) alertes.push('floue');
    if (verifications.luminosite && Number.isFinite(moyenne)) {
      if (moyenne < seuils.luminositeMin) alertes.push('sombre');
      else if (moyenne > seuils.luminositeMax) alertes.push('claire');
      if (Number.isFinite(ecartType) && ecartType < seuils.contrasteMin) alertes.push('contraste-faible');
    }
    if (verifications.cadrage && visage !== undefined) {
      if (visage === null) alertes.push('visage-absent');
      else {
        if (visage.hauteurRelative < 0.28) alertes.push('visage-petit');
        else if (visage.hauteurRelative > 0.6) alertes.push('visage-grand');
        if (Math.abs(visage.decentrage) > 0.15) alertes.push('visage-decentre');
      }
    }
    return alertes;
  }
  
  // ---------- 8. COMPRESSION ----------
  
  /**
   * Essais successifs pour tenir dans le poids : d'abord la qualité JPEG baisse (dimensions intactes), puis, seulement si
   * `autoriserReduction`, les dimensions diminuent. Le navigateur s'arrête au premier essai assez léger.
   */
  export function etapesCompression(qualiteMin = 0.5, autoriserReduction = false) {
    const plancher = Math.max(0.1, Math.min(0.95, qualiteMin));
    let qualites = [0.92, 0.85, 0.78, 0.7, 0.62, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3].filter((q) => q >= plancher - 1e-9);
    if (qualites.length === 0) qualites = [plancher];
    const etapes = qualites.map((qualite) => ({ qualite, facteur: 1 }));
    if (autoriserReduction) {
      for (const facteur of [0.95, 0.9, 0.85, 0.8, 0.75, 0.7]) etapes.push({ qualite: qualites[qualites.length - 1], facteur });
    }
    return etapes;
  }
  
  // ---------- 9. EXPORT, RAPPORT CSV ----------
  
  /**
   * Prépare l'export. `photos` : [{ eleveId, donnees: Uint8Array }]. Renvoie les entrées du ZIP (photos seulement, noms
   * uniques) et les élèves sans photo. Les noms suivent l'ordre de la liste.
   */
  export function preparerExport(eleves, photos, reglages) {
    const parEleve = new Map(photos.map((p) => [p.eleveId, p]));
    const retenus = [];
    const sansPhoto = [];
    eleves.forEach((e, rang) => {
      const p = parEleve.get(e.id);
      if (!p) {
        sansPhoto.push(e.id);
        return;
      }
      retenus.push({ eleve: e, photo: p, ...nomFichier(e, reglages, rang) });
    });
    const uniques = nomsUniques(retenus.map((r) => r.nom));
    const dossier = reglages.zip?.dossier ? `${reglages.zip.dossier}/` : '';
    const correspondances = retenus.map((r, i) => ({
      eleveId: r.eleve.id,
      nom: uniques[i].nom,
      alertes: [...r.alertes, ...(uniques[i].doublon ? ['doublon-nom'] : [])]
    }));
    const entrees = retenus.map((r, i) => ({ nom: `${dossier}${uniques[i].nom}`, donnees: r.photo.donnees }));
    return { entrees, correspondances, sansPhoto };
  }
  
  export const COLONNES_RAPPORT = ['matricule', 'nom', 'prenoms', 'npi', 'fichier', 'poids_ko', 'largeur', 'hauteur', 'statut', 'alertes'];
  
  /** Lignes du rapport de suivi. `meta` : Map eleveId → { poidsOctets, largeur, hauteur, alertes: [codes] }. */
  export function lignesRapport(eleves, correspondances, meta) {
    const noms = new Map(correspondances.map((c) => [c.eleveId, c]));
    return eleves.map((e) => {
      const c = noms.get(e.id);
      const m = meta.get(e.id);
      const alertes = [...(c?.alertes || []), ...(m?.alertes || [])];
      return {
        matricule: e.matricule,
        nom: e.nom,
        prenoms: e.prenoms,
        npi: e.npi,
        fichier: c?.nom || '',
        poids_ko: m ? (m.poidsOctets / 1024).toFixed(1) : '',
        largeur: m?.largeur ?? '',
        hauteur: m?.hauteur ?? '',
        statut: !c ? 'sans photo' : alertes.length ? 'alerte' : 'conforme',
        alertes: alertes.map(messageAlerte).join(' | ')
      };
    });
  }
  
  function cellule(valeur, sep) {
    let s = String(valeur ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // neutralise les formules dans Excel
    return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  
  /** CSV pour Excel français : séparateur « ; » et BOM UTF-8 pour garder les accents. */
  export function genererCsv(lignes, colonnes = COLONNES_RAPPORT, { separateur = ';', bom = true } = {}) {
    const corps = [colonnes.map((c) => cellule(c, separateur)).join(separateur)];
    for (const l of lignes) corps.push(colonnes.map((c) => cellule(l[c], separateur)).join(separateur));
    return (bom ? '\uFEFF' : '') + corps.join('\r\n') + '\r\n';
  }
  
  // ---------- 10. ZIP (méthode « stocké », sans compression : les JPEG sont déjà compressés) ----------
  
  let tableCrc = null;
  
  export function crc32(octets) {
    if (!tableCrc) {
      tableCrc = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        tableCrc[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < octets.length; i += 1) crc = tableCrc[(crc ^ octets[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  
  /** Archive ZIP à plat. Chaque entrée : { nom, donnees: Uint8Array }. Refuse les noms dangereux ou en double. */
  export function creerZip(entrees, { date = new Date() } = {}) {
    if (entrees.length > 65535) throw new Error('Trop de fichiers pour un ZIP.');
    const encodeur = new TextEncoder();
    const dosHeure = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dosDate = (Math.max(0, date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  
    const pris = new Set();
    const pieces = entrees.map((e) => {
      const nom = String(e.nom);
      if (!nom || nom.startsWith('/') || nom.includes('\\') || nom.split('/').includes('..')) throw new Error(`Nom de fichier refusé : ${nom}`);
      if (pris.has(nom.toLowerCase())) throw new Error(`Nom de fichier en double : ${nom}`);
      pris.add(nom.toLowerCase());
      const nomOctets = encodeur.encode(nom);
      return { nomOctets, donnees: e.donnees, crc: crc32(e.donnees), drapeaux: nomOctets.length === nom.length ? 0 : 0x0800 };
    });
  
    let taille = 22;
    for (const p of pieces) taille += 30 + p.nomOctets.length + p.donnees.length + 46 + p.nomOctets.length;
    if (taille > 0xffffffff) throw new Error('Archive trop volumineuse.');
  
    const sortie = new Uint8Array(taille);
    const vue = new DataView(sortie.buffer);
    let pos = 0;
    const decalages = [];
    for (const p of pieces) {
      decalages.push(pos);
      vue.setUint32(pos, 0x04034b50, true);
      vue.setUint16(pos + 4, 20, true);
      vue.setUint16(pos + 6, p.drapeaux, true);
      vue.setUint16(pos + 8, 0, true);
      vue.setUint16(pos + 10, dosHeure, true);
      vue.setUint16(pos + 12, dosDate, true);
      vue.setUint32(pos + 14, p.crc, true);
      vue.setUint32(pos + 18, p.donnees.length, true);
      vue.setUint32(pos + 22, p.donnees.length, true);
      vue.setUint16(pos + 26, p.nomOctets.length, true);
      vue.setUint16(pos + 28, 0, true);
      sortie.set(p.nomOctets, pos + 30);
      sortie.set(p.donnees, pos + 30 + p.nomOctets.length);
      pos += 30 + p.nomOctets.length + p.donnees.length;
    }
    const debutRepertoire = pos;
    pieces.forEach((p, i) => {
      vue.setUint32(pos, 0x02014b50, true);
      vue.setUint16(pos + 4, 20, true);
      vue.setUint16(pos + 6, 20, true);
      vue.setUint16(pos + 8, p.drapeaux, true);
      vue.setUint16(pos + 10, 0, true);
      vue.setUint16(pos + 12, dosHeure, true);
      vue.setUint16(pos + 14, dosDate, true);
      vue.setUint32(pos + 16, p.crc, true);
      vue.setUint32(pos + 20, p.donnees.length, true);
      vue.setUint32(pos + 24, p.donnees.length, true);
      vue.setUint16(pos + 28, p.nomOctets.length, true);
      vue.setUint16(pos + 30, 0, true);
      vue.setUint16(pos + 32, 0, true);
      vue.setUint16(pos + 34, 0, true);
      vue.setUint16(pos + 36, 0, true);
      vue.setUint32(pos + 38, 0, true);
      vue.setUint32(pos + 42, decalages[i], true);
      sortie.set(p.nomOctets, pos + 46);
      pos += 46 + p.nomOctets.length;
    });
    vue.setUint32(pos, 0x06054b50, true);
    vue.setUint16(pos + 4, 0, true);
    vue.setUint16(pos + 6, 0, true);
    vue.setUint16(pos + 8, pieces.length, true);
    vue.setUint16(pos + 10, pieces.length, true);
    vue.setUint32(pos + 12, pos - debutRepertoire, true);
    vue.setUint32(pos + 16, debutRepertoire, true);
    vue.setUint16(pos + 20, 0, true);
    return sortie;
  }