#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Lista wzorców ALT do rotacji
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
  'Kogut kolorowanka dla dzieci',
  'Kolorowanka {{ zmienna }} – format A4 PDF',
  'Prosta kolorowanka {{ zmienna }} do kolorowania',
  'Jednorożec kolorowanka',
  'Pokoloruj {{ zmienna }} – darmowy szablon PDF'
];

// Pobierz nazwę kategorii z argumentów
const [, , category] = process.argv;
if (!category) {
  console.error("❌ Podaj nazwę kategorii jako argument, np. node update-alt.js koniki");
  process.exit(1);
}

const folderPath = path.join('content', 'zwierzeta', category);

fs.readdir(folderPath, (err, subdirs) => {
  if (err) {
    console.error(`\u274c Błąd przy odczycie folderu ${folderPath}`, err);
    return;
  }

  subdirs.forEach((subdir, index) => {
    const mdPath = path.join(folderPath, subdir, 'index.md');
    if (!fs.existsSync(mdPath)) return;

    const template = altTemplates[index % altTemplates.length];
    const altText = template.replace('{{ zmienna }}', category);

    const originalContent = fs.readFileSync(mdPath, 'utf8');
    const parts = originalContent.split('---');

    if (parts.length < 3) {
      console.warn(`\u26a0\ufe0f Pominięto ${mdPath} – brak poprawnego frontmattera.`);
      return;
    }

    let frontmatter = parts[1].trim();
    const body = parts.slice(2).join('---');

    // Usuń istniejący alt (jeśli jest), a potem dodaj nowy
    frontmatter = frontmatter.replace(/^alt\s*:\s*.*$/m, '').trim();
    frontmatter += `\nalt: "${altText}"`;

    const updatedContent = `---\n${frontmatter}\n---${body}`;
    fs.writeFileSync(mdPath, updatedContent, 'utf8');
    console.log(`\u2705 Zaktualizowano alt w: ${mdPath}`);
  });
});
