// ==========================================================
// STUDIO PHOTO ÉLÈVES — COUCHE NAVIGATEUR
// Caméra, mémoire locale (IndexedDB, une base par compte), rendu du recadrage, compression JPEG, contrôle qualité, export.
// TOUT se passe sur l'appareil : aucune photo n'est envoyée nulle part.
// Aucun code ici n'est exécuté à l'import : le fichier peut être vérifié par « node --check ».
// ==========================================================
import {
    appliquerReglages,
    etapesCompression,
    evaluerQualite,
    luminanceRGBA,
    matriceCanvas,
    normaliserReglages,
    statsLuminosite,
    varianceLaplacien
  } from './noyau.js';
  
  const MAX_COTE = 2048; // les grandes photos de téléphone sont réduites à l'ouverture : moins de mémoire, aucun intérêt à garder plus
  
  const creerCanvas = (largeur, hauteur) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(largeur));
    c.height = Math.max(1, Math.round(hauteur));
    return c;
  };
  
  // ---------- 1. MÉMOIRE LOCALE (IndexedDB) ----------
  
  const NOM_BASE = (uid) => `mastanote-photos-v1-${uid || 'local'}`;
  const STORES = { eleves: 'id', photos: 'eleveId', reglages: 'cle' };
  
  export const baseDisponible = () => typeof indexedDB !== 'undefined';
  
  export function ouvrirBase(uid) {
    return new Promise((resolve, reject) => {
      if (!baseDisponible()) {
        reject(new Error("Le stockage local n'est pas disponible sur cet appareil."));
        return;
      }
      const req = indexedDB.open(NOM_BASE(uid), 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [nom, cle] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(nom)) db.createObjectStore(nom, { keyPath: cle });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Ouverture de la base impossible.'));
      req.onblocked = () => reject(new Error('Base bloquée par un autre onglet : fermez-le puis réessayez.'));
    });
  }
  
  const attendre = (tx) =>
    new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Écriture impossible.'));
      tx.onabort = () => reject(tx.error || new Error('Opération annulée (espace insuffisant ?).'));
    });
  
  export function lireTout(db, store) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  
  export function lire(db, store, cle) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(cle);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  
  export async function ecrireTout(db, store, valeurs) {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    for (const v of valeurs) st.put(v);
    await attendre(tx);
  }
  
  export const ecrire = (db, store, valeur) => ecrireTout(db, store, [valeur]);
  
  export async function supprimer(db, store, cle) {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(cle);
    await attendre(tx);
  }
  
  export async function viderStore(db, store) {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    await attendre(tx);
  }
  
  /** Efface TOUTE la base du compte (élèves, photos, réglages). Fermer la connexion (db.close()) avant. */
  export function supprimerBase(uid) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(NOM_BASE(uid));
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Suppression impossible.'));
      req.onblocked = () => reject(new Error('Fermez les autres onglets de MastaNote, puis réessayez.'));
    });
  }
  
  export async function chargerReglages(db) {
    const r = await lire(db, 'reglages', 'normes');
    return normaliserReglages(r?.valeur);
  }
  
  export const sauverReglages = (db, reglages) => ecrire(db, 'reglages', { cle: 'normes', valeur: reglages });
  
  /** Demande au navigateur de ne pas effacer ces photos quand l'espace manque. Sans conséquence si refusé. */
  export async function demanderStockagePersistant() {
    try {
      return (await navigator.storage?.persist?.()) === true;
    } catch (err) {
      return false;
    }
  }
  
  /** Téléphone à ressources limitées : le mode léger (sans calcul de netteté) peut être proposé par défaut. */
  export function appareilLimite() {
    if (typeof navigator === 'undefined') return false;
    return Boolean((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));
  }
  
  // ---------- 2. OUVERTURE D'UNE IMAGE ----------
  
  function chargerViaElement(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image illisible.'));
      };
      img.src = url;
    });
  }
  
  /**
   * Ouvre un fichier image (galerie) ou un Blob. Renvoie { source, largeur, hauteur } où `source` se dessine sur un canvas.
   * L'orientation de la photo (EXIF) est respectée. Les très grandes photos sont réduites à 2048 pixels.
   */
  export async function chargerImage(blob, { maxCote = MAX_COTE } = {}) {
    let source;
    try {
      source = typeof createImageBitmap === 'function' ? await createImageBitmap(blob, { imageOrientation: 'from-image' }) : await chargerViaElement(blob);
    } catch (err) {
      try {
        source = await chargerViaElement(blob);
      } catch (err2) {
        throw new Error('Image illisible : utilisez un fichier JPEG ou PNG (les photos HEIC des iPhone ne sont pas prises en charge).');
      }
    }
    const largeur = source.naturalWidth || source.width;
    const hauteur = source.naturalHeight || source.height;
    const plusGrand = Math.max(largeur, hauteur);
    if (plusGrand > maxCote) {
      const k = maxCote / plusGrand;
      const c = creerCanvas(largeur * k, hauteur * k);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, c.width, c.height);
      if (typeof source.close === 'function') source.close();
      return { source: c, largeur: c.width, hauteur: c.height };
    }
    return { source, largeur, hauteur };
  }
  
  /** Libère la mémoire d'une image ouverte. */
  export function libererImage(image) {
    if (image?.source && typeof image.source.close === 'function') image.source.close();
  }
  
  // ---------- 3. CAMÉRA ----------
  
  export function cameraDisponible() {
    return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && (typeof window === 'undefined' || window.isSecureContext !== false);
  }
  
  export function messageErreurCamera(err) {
    const nom = err?.name || '';
    if (nom === 'NotAllowedError' || nom === 'SecurityError') {
      return "L'accès à la caméra est refusé : autorisez-le dans les réglages du navigateur, ou importez des photos depuis la galerie.";
    }
    if (nom === 'NotFoundError' || nom === 'DevicesNotFoundError') return "Aucune caméra n'a été trouvée sur cet appareil.";
    if (nom === 'NotReadableError' || nom === 'TrackStartError') return 'La caméra est utilisée par une autre application : fermez-la puis réessayez.';
    if (err?.message === 'camera-indisponible') {
      return "La caméra n'est pas disponible ici (connexion non sécurisée ou navigateur trop ancien). Importez des photos depuis la galerie.";
    }
    return "Impossible d'ouvrir la caméra. Importez des photos depuis la galerie.";
  }
  
  /**
   * Ouvre la caméra dans un élément <video>. `face` : 'user' (avant) ou 'environment' (arrière).
   * Renvoie { arreter(), capturer() } ; capturer() renvoie { source, largeur, hauteur } non retourné en miroir.
   * À appeler après un geste de l'utilisateur (clic), sinon certains navigateurs refusent de démarrer la vidéo.
   */
  export async function ouvrirCamera(video, { face = 'user' } = {}) {
    if (!cameraDisponible()) throw new Error('camera-indisponible');
    let flux;
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    } catch (err) {
      if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
        flux = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } else throw err;
    }
    video.srcObject = flux;
    video.muted = true;
    video.setAttribute('playsinline', 'true');
    await video.play();
    return {
      arreter() {
        flux.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      },
      capturer() {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) throw new Error("La caméra n'est pas encore prête.");
        const k = Math.min(1, MAX_COTE / Math.max(w, h));
        const c = creerCanvas(w * k, h * k);
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        return { source: c, largeur: c.width, hauteur: c.height };
      }
    };
  }
  
  // ---------- 4. DÉTECTION DE VISAGE (seulement si le navigateur la propose) ----------
  
  export const detectionVisageDisponible = () => typeof window !== 'undefined' && 'FaceDetector' in window;
  
  /** undefined = détection impossible ; null = aucun visage ; sinon { x, y, width, height } du plus grand visage (pixels de l'image). */
  export async function detecterVisage(image) {
    if (!detectionVisageDisponible()) return undefined;
    try {
      const detecteur = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      const visages = await detecteur.detect(image.source);
      if (!visages || visages.length === 0) return null;
      const plusGrand = visages.reduce((a, b) => (b.boundingBox.width * b.boundingBox.height > a.boundingBox.width * a.boundingBox.height ? b : a));
      const { x, y, width, height } = plusGrand.boundingBox;
      return { x, y, width, height };
    } catch (err) {
      return undefined;
    }
  }
  
  /** Position du visage dans le cadre final, en fractions du cadre : { hauteurRelative, decentrage }. Conserve undefined et null. */
  export function visageDansCadre(boite, params, W, H) {
    if (boite === undefined) return undefined;
    if (boite === null) return null;
    const m = matriceCanvas(params, W, H);
    const centreX = boite.x + boite.width / 2;
    const centreY = boite.y + boite.height / 2;
    const x = m[0] * centreX + m[2] * centreY + m[4];
    return { hauteurRelative: (boite.height * params.echelle) / H, decentrage: (x - W / 2) / W };
  }
  
  // ---------- 5. RENDU DU CADRAGE ----------
  
  /** Dessine l'image cadrée dans un contexte 2D de taille W×H (fond blanc). Rapide : sert à l'aperçu pendant le déplacement. */
  export function dessinerCadrage(ctx, source, params, W, H) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(...matriceCanvas(params, W, H));
    ctx.drawImage(source, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  
  /**
   * Aperçu dans un canvas de n'importe quelle taille (même proportion que la sortie). Applique luminosité et contraste.
   * `reglages` donne la taille de sortie (largeur × hauteur) ; l'aperçu est une réduction fidèle.
   */
  export function dessinerApercu(canvas, image, params, reglages, { luminosite = 0, contraste = 0 } = {}) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const s = canvas.width / reglages.largeur;
    dessinerCadrage(ctx, image.source, { ...params, echelle: params.echelle * s }, canvas.width, canvas.height);
    if (luminosite || contraste) {
      const donnees = ctx.getImageData(0, 0, canvas.width, canvas.height);
      appliquerReglages(donnees.data, luminosite, contraste);
      ctx.putImageData(donnees, 0, 0);
    }
  }
  
  // Réduction en deux temps : une grande photo réduite d'un seul coup devient crénelée sur beaucoup de téléphones
  function reduireSource(source, largeur, hauteur, facteur) {
    const c = creerCanvas(largeur * facteur, hauteur * facteur);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, c.width, c.height);
    return { canvas: c, k: c.width / largeur };
  }
  
  /** Rendu final à la taille exacte de la norme, avec luminosité et contraste. Renvoie un canvas. */
  export function rendreCanvas(image, params, W, H, { luminosite = 0, contraste = 0 } = {}) {
    const canvas = creerCanvas(W, H);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let source = image.source;
    let p = params;
    if (params.echelle < 0.5) {
      const reduite = reduireSource(image.source, image.largeur, image.hauteur, Math.max(0.05, params.echelle * 2));
      source = reduite.canvas;
      p = { ...params, cx: params.cx * reduite.k, cy: params.cy * reduite.k, echelle: params.echelle / reduite.k };
    }
    dessinerCadrage(ctx, source, p, W, H);
    if (luminosite || contraste) {
      const donnees = ctx.getImageData(0, 0, W, H);
      appliquerReglages(donnees.data, luminosite, contraste);
      ctx.putImageData(donnees, 0, 0);
    }
    return canvas;
  }
  
  // ---------- 6. QUALITÉ ET COMPRESSION ----------
  
  function copieReduite(canvas, largeurCible) {
    const k = largeurCible / canvas.width;
    const c = creerCanvas(largeurCible, Math.max(3, canvas.height * k));
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, c.width, c.height);
    return { canvas: c, ctx };
  }
  
  /** Mesures sur une version réduite (200 px de large, 96 en mode léger, sans netteté). Renvoie { nettete, moyenne, ecartType, alertes }. */
  export function analyserQualiteCanvas(canvas, reglages, visage) {
    const { canvas: petit, ctx } = copieReduite(canvas, Math.min(reglages.modeLeger ? 96 : 200, canvas.width));
    const gris = luminanceRGBA(ctx.getImageData(0, 0, petit.width, petit.height).data);
    const { moyenne, ecartType } = statsLuminosite(gris);
    const nettete = reglages.modeLeger ? undefined : varianceLaplacien(gris, petit.width, petit.height);
    const alertes = evaluerQualite({ nettete, moyenne, ecartType, visage }, reglages.verifications, reglages.seuils);
    return { nettete, moyenne, ecartType, alertes };
  }
  
  function canvasVersBlob(canvas, qualite) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage JPEG impossible.'))), 'image/jpeg', qualite);
    });
  }
  
  /** JPEG sous la limite de poids : la qualité baisse d'abord ; les dimensions ne baissent que si `autoriserReduction`. */
  export async function compresserCanvas(canvas, { poidsMaxKo, qualiteMin, autoriserReduction }) {
    const limite = poidsMaxKo * 1024;
    let dernier = null;
    for (const { qualite, facteur } of etapesCompression(qualiteMin, autoriserReduction)) {
      let cible = canvas;
      if (facteur < 1) {
        cible = creerCanvas(canvas.width * facteur, canvas.height * facteur);
        const ctx = cible.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, cible.width, cible.height);
      }
      const blob = await canvasVersBlob(cible, qualite);
      dernier = { blob, qualite, largeur: cible.width, hauteur: cible.height, reduit: facteur < 1, depasse: blob.size > limite };
      if (!dernier.depasse) return dernier;
    }
    return dernier;
  }
  
  export function blobVersOctets(blob) {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resolve(lecteur.result);
      lecteur.onerror = () => reject(lecteur.error);
      lecteur.readAsArrayBuffer(blob);
    });
  }
  
  export const octetsVersBlob = (donnees, type = 'image/jpeg') => new Blob([donnees], { type });
  
  /**
   * Photo finale : rendu, contrôle qualité, compression. Renvoie
   * { donnees: ArrayBuffer, poidsOctets, largeur, hauteur, qualiteJpeg, mesures, alertes: [codes] }.
   * `visage` : résultat de detecterVisage (facultatif).
   */
  export async function produirePhoto(image, params, reglages, { luminosite = 0, contraste = 0, visage } = {}) {
    const canvas = rendreCanvas(image, params, reglages.largeur, reglages.hauteur, { luminosite, contraste });
    const mesures = analyserQualiteCanvas(canvas, reglages, visageDansCadre(visage, params, reglages.largeur, reglages.hauteur));
    const compression = await compresserCanvas(canvas, reglages);
    const alertes = [...mesures.alertes];
    if (compression.depasse) alertes.push('poids-depasse');
    if (compression.reduit) alertes.push('dimensions-reduites');
    return {
      donnees: await blobVersOctets(compression.blob),
      poidsOctets: compression.blob.size,
      largeur: compression.largeur,
      hauteur: compression.hauteur,
      qualiteJpeg: compression.qualite,
      mesures: { nettete: mesures.nettete ?? null, moyenne: mesures.moyenne, ecartType: mesures.ecartType },
      alertes
    };
  }
  
  // ---------- 7. FICHIERS : LECTURE, TÉLÉCHARGEMENT, PARTAGE ----------
  
  /** Lit un fichier texte (liste de classe) : UTF-8, sinon Windows-1252 (CSV français d'Excel). Le BOM est retiré. */
  export async function lireTexteFichier(fichier) {
    const octets = await blobVersOctets(fichier);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(octets).replace(/^\uFEFF/, '');
    } catch (err) {
      return new TextDecoder('windows-1252').decode(octets);
    }
  }
  
  export function telechargerBlob(blob, nom) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  
  /** Partage de fichiers par le téléphone (WhatsApp, e-mail, Drive…). Renvoie false si l'appareil ne sait pas le faire. */
  export async function partagerFichiers(fichiers, titre) {
    try {
      if (navigator.canShare && navigator.canShare({ files: fichiers })) {
        await navigator.share({ files: fichiers, title: titre });
        return true;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return true; // l'utilisateur a refermé la fenêtre de partage
    }
    return false;
  }