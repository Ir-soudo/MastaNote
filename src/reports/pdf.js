// ==========================================================
// ÉCRITURE D'UN PDF (fonction pure, sans dépendance)
// Fabrique un PDF d'une page contenant une image JPEG à la taille exacte de la page.
// Le rapport est dessiné une fois (SVG), converti en image, puis placé dans ce PDF :
// le PDF est donc identique à l'aperçu. Le texte n'y est pas sélectionnable.
// ==========================================================

const MM_EN_POINTS = 72 / 25.4;

/**
 * @param {Uint8Array} jpeg  octets d'une image JPEG
 * @param {number} largeurPx largeur de l'image en pixels
 * @param {number} hauteurPx hauteur de l'image en pixels
 * @param {{ w: number, h: number }} page dimensions de la page en millimètres
 * @returns {Uint8Array} le fichier PDF
 */
export function pdfDepuisJpeg(jpeg, largeurPx, hauteurPx, page) {
  const encodeur = new TextEncoder();
  const morceaux = [];
  const positions = {};
  let position = 0;

  const ajouter = (donnees) => {
    const octets = typeof donnees === 'string' ? encodeur.encode(donnees) : donnees;
    morceaux.push(octets);
    position += octets.length;
  };
  const objet = (numero, corps) => {
    positions[numero] = position;
    ajouter(`${numero} 0 obj\n${corps}\nendobj\n`);
  };

  const largeurPt = (page.w * MM_EN_POINTS).toFixed(2);
  const hauteurPt = (page.h * MM_EN_POINTS).toFixed(2);

  ajouter('%PDF-1.4\n');
  objet(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objet(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objet(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${largeurPt} ${hauteurPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );

  positions[4] = position;
  ajouter(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${largeurPx} /Height ${hauteurPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  ajouter(jpeg);
  ajouter('\nendstream\nendobj\n');

  const contenu = `q ${largeurPt} 0 0 ${hauteurPt} 0 0 cm /Im0 Do Q`;
  objet(5, `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`);

  const debutXref = position;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    xref += `${String(positions[i]).padStart(10, '0')} 00000 n \n`;
  }
  ajouter(xref);
  ajouter(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF`);

  const resultat = new Uint8Array(position);
  let decalage = 0;
  for (const m of morceaux) {
    resultat.set(m, decalage);
    decalage += m.length;
  }
  return resultat;
}