#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Argumenty: folder z wariantami + fraza kategorii
const folderPath = process.argv[2];
const category = process.argv[3];

if (!folderPath || !category) {
  console.error('❌ Użycie: node modify.js <folder> <fraza>\nPrzykład: node modify.js smoki smoki');
  process.exit(1);
}

const absolutePath = path.join(process.cwd(), folderPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`❌ Folder nie istnieje: ${absolutePath}`);
  process.exit(1);
}

// Iteruj po podfolderach jak 1, 2, 3...
const folders = fs.readdirSync(absolutePath).filter(name => {
  const fullPath = path.join(absolutePath, name);
  return fs.statSync(fullPath).isDirectory() && /^\d+$/.test(name);
});

folders.forEach(folder => {
  const variantNumber = folder;
  const mdPath = path.join(absolutePath, folder, 'index.md');

  if (!fs.existsSync(mdPath)) {
    console.warn(`⚠️  Brak index.md w folderze ${folder}`);
    return;
  }

  let content = fs.readFileSync(mdPath, 'utf-8');

  // Zmiana title
  const newTitle = `title: Kolorowanki ${capitalize(category)} - wariant ${variantNumber}`;
  content = content.replace(/^title:.*$/m, newTitle);

  // Zmiana alt – doklejenie " - wariant X"
  content = content.replace(/^alt:\s*"(.*?)"$/m, (_, altText) => {
    return `alt: "${altText} - wariant ${variantNumber}"`;
  });

  fs.writeFileSync(mdPath, content, 'utf-8');
  console.log(`✅ Zmieniono ${mdPath}`);
});

// Kapitalizacja pierwszej litery
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
