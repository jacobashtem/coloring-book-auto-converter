#!/usr/bin/env node
/**
 * Automatyczne przygotowanie plików do kolorowanek.
 *
 * 1. Umieść wszystkie pliki .svg w katalogu `svgs/`.
 * 2. Uruchom:  `node svg-automate.js <poczatek> <kategoria>`
 *    np.       `node svg-automate.js 29 koty`
 *
 *    - <poczatek>  – numer, od którego zaczynamy warianty (np. 29)
 *    - <kategoria> – nazwa kategorii (np. koty, pieski, auta)
 *
 * Skrypt:
 *  • iteruje po wszystkich plikach SVG w `svgs/` (kolejność alfabetyczna),
 *  • dla każdego tworzy strukturę:
 *      output/content/<kategoria>/<N>/index.md
 *      output/public/<kategoria>/<N>/<kategoria>-<N>.svg
 *      output/public/<kategoria>/<N>/<kategoria>-<N>.pdf
 *  • konwertuje SVG → PDF przez Inkscape (A4, 595×842 pt).
 *  • dodaje znak wodny: `twoja-kolorowanka.pl` w lewym dolnym rogu
 */

const { readdirSync, mkdirSync, existsSync, copyFileSync, writeFileSync, readFileSync } = require('fs');
const { join, extname } = require('path');
const { spawnSync } = require('child_process');

// --- Argumenty CLI --------------------------------------------------------
const [, , startArg, category] = process.argv;
const startIndex = parseInt(startArg, 10);
if (isNaN(startIndex) || !category) {
  console.error('\nUżycie: node svg-automate.js <poczatek> <kategoria>');
  console.error('Przykład: node svg-automate.js 29 koty\n');
  process.exit(1);
}

// --- Ścieżki katalogów ----------------------------------------------------
const SRC_DIR = 'svgs';          // katalog z plikami wejściowymi (.svg)
const OUT_DIR = 'output';        // katalog bazowy na wynik
const CONTENT_DIR = join(OUT_DIR, 'content', category);
const PUBLIC_DIR  = join(OUT_DIR, 'public',  category);

// Upewnij się, że katalogi bazowe istnieją
[CONTENT_DIR, PUBLIC_DIR].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// --- Pobierz i posortuj listę plików SVG ----------------------------------
const svgs = readdirSync(SRC_DIR)
  .filter(f => extname(f).toLowerCase() === '.svg')
  .sort();

if (!svgs.length) {
  console.error('❌ Brak plików .svg w katalogu "svgs/"');
  process.exit(1);
}
console.log(`Znaleziono ${svgs.length} plików SVG…`);

const bin = process.platform === 'win32' ? 'inkscape.com' : 'inkscape';

// Konwersja SVG → PDF (A4)
function convertToPdf(srcSvg, dstPdf) {
  const args = [
    srcSvg,
    '--export-type=pdf',
    `--export-filename=${dstPdf}`,
    '--export-area-drawing',
    '--export-height=842'
  ];
  const res = spawnSync(bin, args, { stdio: 'inherit' });
  if (res.error || res.status !== 0) {
    throw new Error(res.error?.message || `kod ${res.status}`);
  }
}

// Dodaj znak wodny do SVG
function addWatermarkToSvg(svgPath, text = 'twoja-kolorowanka.pl') {
  let svgContent = readFileSync(svgPath, 'utf8');

  const watermark = `
    <text x="10" y="832" font-size="12" fill="gray" opacity="0.6" font-family="Arial, sans-serif">
      ${text}
    </text>
  `;

  if (svgContent.includes('</svg>')) {
    svgContent = svgContent.replace('</svg>', `${watermark}\n</svg>`);
    writeFileSync(svgPath, svgContent, 'utf8');
  } else {
    console.warn(`⚠️  Plik ${svgPath} nie wygląda na poprawny SVG – brak </svg>.`);
  }
}

// Kapitalizacja pierwszej litery
const ucFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

// --- Główna pętla ---------------------------------------------------------
let current = startIndex;
svgs.forEach(file => {
  const base   = `${category}-${current}`;
  const svgSrc = join(SRC_DIR, file);

  const contentLeaf = join(CONTENT_DIR, String(current));
  const publicLeaf  = join(PUBLIC_DIR,  String(current));
  [contentLeaf, publicLeaf].forEach(dir => {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  });

  const svgDst = join(publicLeaf, `${base}.svg`);
  const pdfDst = join(publicLeaf, `${base}.pdf`);

  // 1) Kopiuj SVG do katalogu public
  copyFileSync(svgSrc, svgDst);

  // 2) Dodaj znak wodny
  addWatermarkToSvg(svgDst);

  // 3) Konwertuj do PDF
  try {
    convertToPdf(svgDst, pdfDst);
  } catch (e) {
    console.error(`❌ ${file}: ${e.message}`);
    return; // przechodzimy do następnego pliku
  }

  // 4) Generuj index.md
  const capitalCat = ucFirst(category);
  const mdContent = `---\n` +
    `title: ${capitalCat}\n` +
    `description: Kolorowanka ${capitalCat} - wariant ${current}\n` +
    `canonical: /zwierzeta/${category}\n` +
    `variant_of: ${category}\n` +
    `image: /${category}/${current}/${base}.svg\n` +
    `pdf: /${category}/${current}/${base}.pdf\n` +
    `tags:\n` +
    `- zwierzeta\n` +
    `- ${category}\n` +
    `---\n`;

  writeFileSync(join(contentLeaf, 'index.md'), mdContent, 'utf8');
  console.log(`✅ ${file} → ${base}`);

  current += 1;
});

console.log(`\n✅ Gotowe. Utworzono ${svgs.length} wariantów (od ${startIndex} do ${current - 1}).`);
