// ==========================================================
// DESSIN DU RAPPORT EN SVG (fonction pure, sans dépendance)
// Sert à l'aperçu à l'écran, à l'image (PNG) et, par conversion, au PDF.
// Tous les textes sont "échappés" : un nom d'école contenant < ou & ne peut rien casser.
// ==========================================================

const PT_EN_MM = 0.3528; // 1 point typographique = 0,3528 mm

const echapper = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const n = (v) => Number(Number(v).toFixed(3));

/**
 * @param {{ page: {w: number, h: number}, formes: object[] }} layout
 * @param {{ largeurPx?: number, responsive?: boolean }} [options]
 *   responsive : sans dimensions fixes, l'image s'adapte à la largeur de son conteneur (aperçu)
 */
export function formesVersSvg(layout, options = {}) {
  const { page, formes } = layout;
  const { largeurPx, responsive = false } = options;

  let dimensions;
  if (responsive) {
    dimensions = 'style="width:100%;height:auto;display:block"';
  } else {
    const px = largeurPx ?? Math.round((page.w * 96) / 25.4);
    dimensions = `width="${px}" height="${Math.round((px * page.h) / page.w)}"`;
  }

  const sortie = [
    `<svg xmlns="http://www.w3.org/2000/svg" ${dimensions} viewBox="0 0 ${page.w} ${page.h}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect x="0" y="0" width="${page.w}" height="${page.h}" fill="#ffffff"/>`
  ];

  for (const f of formes) {
    if (f.t === 'rect') {
      sortie.push(
        `<rect x="${n(f.x)}" y="${n(f.y)}" width="${n(f.w)}" height="${n(f.h)}" fill="${f.fill ?? 'none'}" stroke="${f.stroke ?? '#111111'}" stroke-width="${n(f.sw ?? 0.25)}"/>`
      );
    } else if (f.t === 'line') {
      sortie.push(
        `<line x1="${n(f.x1)}" y1="${n(f.y1)}" x2="${n(f.x2)}" y2="${n(f.y2)}" stroke="${f.stroke ?? '#111111'}" stroke-width="${n(f.sw ?? 0.25)}"/>`
      );
    } else if (f.t === 'text') {
      const ancre = f.align === 'left' ? 'start' : f.align === 'right' ? 'end' : 'middle';
      sortie.push(
        `<text x="${n(f.x)}" y="${n(f.y)}" font-size="${n((f.size ?? 8) * PT_EN_MM)}" font-weight="${f.bold ? 700 : 400}" font-style="${f.italic ? 'italic' : 'normal'}" text-anchor="${ancre}" dominant-baseline="central" fill="${f.color ?? '#111111'}">${echapper(f.s)}</text>`
      );
    }
  }

  sortie.push('</svg>');
  return sortie.join('');
}