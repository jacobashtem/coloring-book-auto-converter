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
if (isNaN(parseInt(startArg, 10)) || !parentCategory || !subCategory) {
  console.error('\nUżycie: node svg-automate.js <poczatek> <kategoria_nadrzędna> <podkategoria>');
  console.error('Przykład: node svg-automate.js 29 fantasy jednorożce\n');
  process.exit(1);
}

// --- Ścieżki katalogów ----------------------------------------------------
const SRC_DIR = 'svgs';          // katalog z plikami wejściowymi (.svg)
const OUT_DIR = 'output';        // katalog bazowy na wynik
const CONTENT_DIR = join(OUT_DIR, 'content', parentCategory, subCategory);
const PUBLIC_DIR  = join(OUT_DIR, 'public',  parentCategory, subCategory);

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
const base = `${subCategory}-${current}`;
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
const capitalCat = ucFirst(subCategory);


  const template = altTemplates[(current - startIndex) % altTemplates.length];
const altText = template.replace('{{ zmienna }}', subCategory);

  const mdContent = `---\n` +
`title: ${capitalCat}\n` +
  `description: Kolorowanka ${capitalCat} - wariant ${current}\n` +
  `canonical: /${parentCategory}/${subCategory}/\n` +
  `variant_of: ${subCategory}\n` +
  `image: /${parentCategory}/${subCategory}/${current}/${base}.svg\n` +
  `pdf: /${parentCategory}/${subCategory}/${current}/${base}.pdf\n` +
  `alt: "${altText}"\n` +
  `tags:\n` +
  `- ${parentCategory}\n` +
  `- ${subCategory}\n` +
  `---\n`;

  writeFileSync(join(contentLeaf, 'index.md'), mdContent, 'utf8');
  console.log(`✅ ${file} → ${base}`);

  current += 1;
});

console.log(`\n✅ Gotowe. Utworzono ${svgs.length} wariantów (od ${startIndex} do ${current - 1}).`);

// --- Generowanie index.md dla podkategorii i kategorii ----------------------

const firstIndex = startIndex;
const secondIndex = startIndex + 1;
const baseName1 = `${subCategory}-${firstIndex}`;
const baseName2 = `${subCategory}-${secondIndex}`;

const categoryMdContent = `---\n` +
`title: "Kolorowanki ${parentCategory} do druku PDF – smoki, elfy i magia"\n` +
`categoryName: "${subCategory}"\n` +
`description: "Pobierz darmowe kolorowanki ${parentCategory} do druku w formacie PDF. Smoki, elfy, czarodziejki i magiczne krainy – bez logowania, bez ograniczeń, gotowe do wydruku A4."\n` +
`canonical: "/${parentCategory}/"\n` +
`tags: [${parentCategory}]\n` +
`alt: "kolorowanki ${parentCategory} do druku"\n` +
`h1First: Kolorowanki ${parentCategory}\n` +
`h1Sec: do druku PDF\n` +
`heroImgDesktop: "/${parentCategory}/${subCategory}/hero-desktop.png"\n` +
`heroImgMobile: "/${parentCategory}/${subCategory}/hero-mobile.png"\n` +
`heroImg1: "/${parentCategory}/${subCategory}/${firstIndex}/${baseName1}.svg"\n` +
`heroImg2: "/${parentCategory}/${subCategory}/${secondIndex}/${baseName2}.svg"\n` +
`image: "/${parentCategory}/${subCategory}/hero-desktop.png"\n` +
`keywords: "kolorowanki ${parentCategory}, darmowe malowanki ${parentCategory}, kolorowanki smoki elfy"\n` +
`robots: "index, follow"\n` +
`schemaType: "CollectionPage"\n` +
`---\n`;

const subcategoryMdContent = `---\n` +
`title: "Kolorowanki ${subCategory} do druku PDF – słodkie i magiczne obrazki"\n` +
`description: "Darmowe kolorowanki ${subCategory} do pobrania i druku – idealne dla dzieci. Znajdziesz tu magiczne stworzenia, urocze scenki i wiele więcej."\n` +
`canonical: "/${parentCategory}/${subCategory}/"\n` +
`tags: [${parentCategory}, ${subCategory}]\n` +
`alt: "kolorowanki ${subCategory} do druku"\n` +
`h1First: Kolorowanki ${subCategory}\n` +
`h1Sec: do pobrania PDF\n` +
`heroImg1: "/${parentCategory}/${subCategory}/${firstIndex}/${baseName1}.svg"\n` +
`heroImg2: "/${parentCategory}/${subCategory}/${secondIndex}/${baseName2}.svg"\n` +
`image: "/${parentCategory}/${subCategory}/hero-desktop.png"\n` +
`keywords: "kolorowanki ${subCategory}, malowanki PDF, darmowe do druku"\n` +
`robots: "index, follow"\n` +
`schemaType: "CollectionPage"\n` +
`---\n`;

writeFileSync(join(OUT_DIR, 'content', parentCategory, 'index.md'), categoryMdContent, 'utf8');
writeFileSync(join(OUT_DIR, 'content', parentCategory, subCategory, 'index.md'), subcategoryMdContent, 'utf8');
console.log(`\n📁 Wygenerowano index.md dla kategorii i podkategorii.`);

