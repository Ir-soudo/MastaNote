// ==========================================================
// EXPORTS DU RAPPORT : PDF, image PNG, Excel, partage
// Fonctions qui s'exécutent dans le navigateur. Aucune bibliothèque supplémentaire
// (Excel utilise « xlsx », déjà présent dans l'application).
// ==========================================================
import * as XLSX from 'xlsx';
import { formesVersSvg } from './svg.js';
import { pdfDepuisJpeg } from './pdf.js';

const LARGEUR_EXPORT_PX = 2339; // A4 paysage à 200 points par pouce : net à l'impression

function chargerImage(svg) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de dessiner le rapport sur cet appareil."));
    };
    image.src = url;
  });
}

async function dessinerCanvas(layout) {
  const svg = formesVersSvg(layout, { largeurPx: LARGEUR_EXPORT_PX });
  const image = await chargerImage(svg);
  const canvas = document.createElement('canvas');
  canvas.width = LARGEUR_EXPORT_PX;
  canvas.height = Math.round((LARGEUR_EXPORT_PX * layout.page.h) / layout.page.w);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const canvasVersBlob = (canvas, type, qualite) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Impossible de créer le fichier sur cet appareil."))),
      type,
      qualite
    );
  });

/** Image PNG du rapport */
export async function genererPng(layout) {
  const canvas = await dessinerCanvas(layout);
  return canvasVersBlob(canvas, 'image/png');
}

/** PDF du rapport (une page, identique à l'aperçu) */
export async function genererPdf(layout) {
  const canvas = await dessinerCanvas(layout);
  const jpeg = await canvasVersBlob(canvas, 'image/jpeg', 0.92);
  const octets = new Uint8Array(await jpeg.arrayBuffer());
  const pdf = pdfDepuisJpeg(octets, canvas.width, canvas.height, layout.page);
  return new Blob([pdf], { type: 'application/pdf' });
}

/** Fichier Excel à partir d'un tableau de lignes de cellules */
export function genererXlsx(lignes, nomFeuille = 'Rapport') {
  const feuille = XLSX.utils.aoa_to_sheet(lignes);
  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, nomFeuille);
  const sortie = XLSX.write(classeur, { bookType: 'xlsx', type: 'array' });
  return new Blob([sortie], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Déclenche le téléchargement d'un fichier */
export function telecharger(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Le téléphone sait-il partager une image (WhatsApp...) ? */
export function peutPartagerImage() {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
    return navigator.canShare({ files: [new File([''], 'rapport.png', { type: 'image/png' })] });
  } catch (err) {
    return false;
  }
}

/** Ouvre le partage du téléphone avec l'image ; un partage annulé n'est pas une erreur. */
export async function partagerImage(blob, nomFichier, titre) {
  const fichier = new File([blob], nomFichier, { type: 'image/png' });
  try {
    await navigator.share({ files: [fichier], title: titre });
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    throw err;
  }
}