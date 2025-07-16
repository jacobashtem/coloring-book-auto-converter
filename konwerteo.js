#!/usr/bin/env node
/**
 * Automatyczne przygotowanie plików do kolorowanek.
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
  console.error('\nUżycie: node konwerteo.js <poczatek> <kategoria_nadrzędna> <podkategoria>');
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

// --- Funkcje pomocnicze ----------------------------------------------------

/**
 * 1) Usuwa stare atrybuty <svg>,
 * 2) Dodaje xmlns + xmlns:xlink,
 * 3) Zachowuje oryginalny viewBox (lub domyślny A4),
 * 4) Ustawia width/height = A4 i preserveAspectRatio,
 * 5) Oznacza plik data-normalized="true".
 */
function normalizeSvgHeader(svgPath) {
  const A4_W = 595, A4_H = 842;
  let svg = readFileSync(svgPath, 'utf8');
  if (svg.includes('data-normalized="true"')) return;

  // wyciągnij oryginalny viewBox lub domyślny
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

  // zastąp pierwszy <svg ...>
  svg = svg.replace(/<svg\b[^>]*>/i, header);
  writeFileSync(svgPath, svg, 'utf8');
}

/**
 * Ustawia tylko width/height na A4 i preserveAspectRatio,
 * nie rusza treści.
 */
function safeScaleSvg(svgPath) {
  const A4_W = 595, A4_H = 842;
  let svg = readFileSync(svgPath, 'utf8');
  if (svg.includes('data-scaled="true"')) return;

  svg = svg.replace(
    /<svg\b([^>]*)>/i,
    (m, attrs) => {
      // zachowaj namespace’y
      const ns = (attrs.match(/xmlns(:\w+)?="[^"]*"/g) || []).join(' ');
      // zachowaj viewBox
      const vb = attrs.match(/viewBox="[^"]+"/)?.[0] || `viewBox="0 0 ${A4_W} ${A4_H}"`;
      return `<svg ${ns} ${vb} width="${A4_W}" height="${A4_H}" preserveAspectRatio="xMidYMid meet" data-scaled="true">`;
    }
  );

  writeFileSync(svgPath, svg, 'utf8');
}

/** Dodaje prosty watermark na dole SVG */
function addWatermarkToSvg(svgPath, text = 'twoja-kolorowanka.pl') {
  let svg = readFileSync(svgPath, 'utf8');
  const wm = `
  <text x="10" y="832" font-size="12" fill="gray" opacity="0.6" font-family="Arial, sans-serif">
    ${text}
  </text>
  `;
  if (svg.includes('</svg>')) {
    svg = svg.replace('</svg>', `${wm}\n</svg>`);
    writeFileSync(svgPath, svg, 'utf8');
  }
}

/** Prosty eksport SVG → PDF (Inkscape CLI) */
function convertToPdf(srcSvg, dstPdf) {
  const args = [
    srcSvg,
    '--export-type=pdf',
    `--export-filename=${dstPdf}`,
    '--export-area-page',   // weź całą stronę (=viewBox)
    '--export-width=595'    // dopasuj szerokość do A4
  ];
  const res = spawnSync(bin, args, { stdio: 'inherit' });
  if (res.error || res.status !== 0) {
    throw new Error(res.error?.message || `kod ${res.status}`);
  }
}

const ucFirst = s => s.charAt(0).toUpperCase() + s.slice(1);

// --- Główna pętla ---------------------------------------------------------
let current = startIndex;
for (const file of svgs) {
  const base   = `${subCategory}-${current}`;
  const dirOut = join(PUBLIC_DIR, String(current));
  if (!existsSync(dirOut)) mkdirSync(dirOut, { recursive: true });

  const svgDst = join(dirOut, `${base}.svg`);
  const pdfDst = join(dirOut, `${base}.pdf`);

  // 1) Kopiuj SVG
  copyFileSync(join(SRC_DIR, file), svgDst);

  // 2) Normalizuj nagłówek (<svg> + namespace’y)
  normalizeSvgHeader(svgDst);

  // 3) Opcjonalne „bezpieczne” skalowanie
  safeScaleSvg(svgDst);

  // 4) Dodaj watermark
  addWatermarkToSvg(svgDst);

  // 5) Eksport do PDF
  try {
    convertToPdf(svgDst, pdfDst);
  } catch (e) {
    console.error(`❌ Błąd przy ${file}:`, e.message);
    current++;
    continue;
  }

  // 6) Generuj index.md
  const mdDir = join(CONTENT_DIR, String(current));
  if (!existsSync(mdDir)) mkdirSync(mdDir, { recursive: true });

  const tpl    = altTemplates[(current - startIndex) % altTemplates.length] || '{{ zmienna }}';
  const alt    = tpl.replace('{{ zmienna }}', subCategory);
  const capital= ucFirst(subCategory);

  const md = `---\n` +
    `title: Kolorowanka ${capital} - wariant ${current}\n` +
    `description: Kolorowanka ${capital} - wariant ${current}\n` +
    `canonical: /${parentCategory}/${subCategory}/\n` +
    `variant_of: ${subCategory}\n` +
    `image: /${parentCategory}/${subCategory}/${current}/${base}.svg\n` +
    `pdf: /${parentCategory}/${subCategory}/${current}/${base}.pdf\n` +
    `alt: "${alt}"\n` +
    `tags:\n` +
    `- ${parentCategory}\n` +
    `- ${subCategory}\n` +
    `---\n`;

  writeFileSync(join(mdDir, 'index.md'), md, 'utf8');
  console.log(`✅ ${file} → ${base}`);

  current++;
}

console.log(`\n✅ Gotowe! Warianty od ${startIndex} do ${current - 1}.`);
