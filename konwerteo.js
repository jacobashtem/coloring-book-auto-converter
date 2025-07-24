#!/usr/bin/env node
/**
 * Automatyczne przygotowanie plików do kolorowanek + watermark w PDF.
 */

const {
  readdirSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  writeFileSync,
  readFileSync
} = require('fs');
const { join, extname } = require('path');
const { spawnSync }     = require('child_process');
const { PDFDocument, rgb, StandardFonts, PDFName } = require('pdf-lib');

// --- ALT Templates ---------------------------------------------------------
const altTemplates = [
  'Kolorowanka {{ zmienna }}',
  'Kolorowanki {{ zmienna }}',
  '{{ zmienna }} kolorowanka dla dzieci',
  '{{ zmienna }} kolorowanki dla dzieci',
  'Kolorowanka do druku {{ zmienna }}',
  'Kolorowanki do druku {{ zmienna }}',
  '{{ zmienna }} do druku i pokolorowania',
  'Darmowa kolorowanka {{ zmienna }} do druku PDF',
  '{{ zmienna }} – pobierz i wydrukuj kolorowankę',
  'Kolorowanka z {{ zmienna }} do pobrania',
  'Malowanka {{ zmienna }} do druku A4',
  'kolorowanka do druku {{ zmienna }} PDF',
  'Łatwa kolorowanka {{ zmienna }} dla przedszkolaka',
  'Edukacyjna kolorowanka {{ zmienna }} do wydruku',
  '{{ zmienna }} kolorowanka dla dzieci',
  'Kolorowanka {{ zmienna }} – format A4 PDF',
  'Prosta kolorowanka {{ zmienna }} do kolorowania',
  'Pokoloruj {{ zmienna }} – darmowy szablon PDF'
];

// --- Argumenty CLI --------------------------------------------------------
const [, , startArg, parentCategory, subCategory] = process.argv;
const startIndex = parseInt(startArg, 10);
if (isNaN(startIndex) || !parentCategory || !subCategory) {
  console.error('\nUżycie: node svg-automate.js <poczatek> <kategoria_nadrzędna> <podkategoria>');
  process.exit(1);
}

// --- Ścieżki katalogów ----------------------------------------------------
const SRC_DIR     = 'svgs';
const OUT_DIR     = 'output';
const CONTENT_DIR = join(OUT_DIR, 'content', parentCategory, subCategory);
const PUBLIC_DIR  = join(OUT_DIR, 'public',  parentCategory, subCategory);
[ CONTENT_DIR, PUBLIC_DIR ].forEach(d => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

// --- Lista SVG ------------------------------------------------------------
const svgs = readdirSync(SRC_DIR)
  .filter(f => extname(f).toLowerCase() === '.svg')
  .sort();
if (!svgs.length) {
  console.error('❌ Brak plików .svg w katalogu "svgs/"');
  process.exit(1);
}
console.log(`Znaleziono ${svgs.length} plików SVG…`);

const bin = process.platform === 'win32' ? 'inkscape.com' : 'inkscape';

// --- Funkcje pomocnicze SVG → PDF -----------------------------------------

/**  
 * Normalizuje <svg> do A4 + namespace’y  
 */
function normalizeSvgHeader(svgPath) {
  const A4_W = 595, A4_H = 842;
  let svg = readFileSync(svgPath, 'utf8');
  if (svg.includes('data-normalized="true"')) return;

  // oryginalny viewBox lub A4
  const vbMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBoxAttr = vbMatch
    ? `viewBox="${vbMatch[1]}"`
    : `viewBox="0 0 ${A4_W} ${A4_H}"`;

  // nowy nagłówek
  const header = `<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  ${viewBoxAttr}
  width="${A4_W}" height="${A4_H}"
  preserveAspectRatio="xMidYMid meet"
  data-normalized="true">`;

  svg = svg.replace(/<svg\b[^>]*>/i, header);
  writeFileSync(svgPath, svg, 'utf8');
}

/**  
 * Ustawia width/height A4, preserveAspectRatio, zachowuje namespace’y i viewBox  
 */
function safeScaleSvg(svgPath) {
  const A4_W = 595, A4_H = 842;
  let svg = readFileSync(svgPath, 'utf8');
  if (svg.includes('data-scaled="true"')) return;

  svg = svg.replace(
    /<svg\b([^>]*)>/i,
    (_, attrs) => {
      const ns = (attrs.match(/xmlns(:\w+)?="[^"]*"/g) || []).join(' ');
      const vb = attrs.match(/viewBox="[^"]+"/)?.[0] || `viewBox="0 0 ${A4_W} ${A4_H}"`;
      return `<svg ${ns} ${vb} width="${A4_W}" height="${A4_H}" preserveAspectRatio="xMidYMid meet" data-scaled="true">`;
    }
  );

  writeFileSync(svgPath, svg, 'utf8');
}

/**  
 * Eksportuje SVG → PDF A4 przez Inkscape CLI  
 */
function convertToPdf(srcSvg, dstPdf) {
  const args = [
    srcSvg,
    '--export-type=pdf',
    `--export-filename=${dstPdf}`,
    '--export-area-page',   // cała strona wg viewBox
    '--export-width=595',   // A4 szerokość
    '--export-height=842'   // A4 wysokość
  ];
  const res = spawnSync(bin, args, { stdio: 'inherit' });
  if (res.error || res.status !== 0) {
    throw new Error(res.error?.message || `kod ${res.status}`);
  }
}

/**  
 * Dopisuje watermark do już istniejącego PDF-a  
 */
async function watermarkPdf(pdfPath, text = 'twoja-kolorowanka.pl') {
  const existingPdfBytes = readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // 1) wyłącz automatyczne skalowanie w viewerze
  const prefs = pdfDoc.context.obj({ PrintScaling: PDFName.of('None') });
  pdfDoc.catalog.set(PDFName.of('ViewerPreferences'), prefs);

  // 2) wstaw watermark
  const pages = pdfDoc.getPages();
  const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);
  pages.forEach(page => {
    page.drawText(text, {
      x: 10,
      y: 10,
      size: 12,
      font,
      color: rgb(0.5,0.5,0.5),
      opacity: 0.6
    });
  });

  const pdfBytes = await pdfDoc.save();
  writeFileSync(pdfPath, pdfBytes);
}

const ucFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

// --- Główna pętla ---------------------------------------------------------
;(async () => {
  let current = startIndex;

  for (const file of svgs) {
    const base   = `${subCategory}-${current}`;
    const dirOut = join(PUBLIC_DIR, String(current));
    if (!existsSync(dirOut)) mkdirSync(dirOut, { recursive: true });

    const svgDst = join(dirOut, `${base}.svg`);
    const pdfDst = join(dirOut, `${base}.pdf`);

    // 1) Kopiuj SVG
    copyFileSync(join(SRC_DIR, file), svgDst);

    // 2) Przygotuj SVG do A4
    normalizeSvgHeader(svgDst);
    safeScaleSvg(svgDst);

    // 3) SVG → PDF
    convertToPdf(svgDst, pdfDst);

    // 4) Dodaj watermark bezpośrednio w PDF
    await watermarkPdf(pdfDst);

    // 5) Generuj index.md
    const mdDir = join(CONTENT_DIR, String(current));
    if (!existsSync(mdDir)) mkdirSync(mdDir, { recursive: true });

    const tpl     = altTemplates[(current - startIndex) % altTemplates.length];
    const altText = tpl.replace('{{ zmienna }}', subCategory);
    const capital = ucFirst(subCategory);

    const md = `---\n` +
      `title: Kolorowanka ${capital} - wariant ${current}\n` +
      `description: Kolorowanka ${capital} - wariant ${current}\n` +
      `canonical: /${parentCategory}/${subCategory}/\n` +
      `variant_of: ${subCategory}\n` +
      `image: /${parentCategory}/${subCategory}/${current}/${base}.svg\n` +
      `pdf: /${parentCategory}/${subCategory}/${current}/${base}.pdf\n` +
      `alt: "${altText}"\n` +
      `tags:\n` +
      `- ${parentCategory}\n` +
      `- ${subCategory}\n` +
      `---\n`;

    writeFileSync(join(mdDir, 'index.md'), md, 'utf8');
    console.log(`✅ ${file} → ${base}`);
    current++;
  }

  console.log(`\n✅ Gotowe! Warianty od ${startIndex} do ${current - 1}.`);
})();
