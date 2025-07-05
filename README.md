# SVG to PDF Coloring Book Converter

🖍️ **Automatyczne przygotowanie kolorowanek z plików SVG** – konwertuje pliki do formatu PDF, dodaje znak wodny i generuje pliki treści dla statycznej strony (np. opartej na Nuxt Content).

## 📁 Struktura projektu

```
svg-to-pdf-converter/
├── svgs/               # Tutaj wrzuć pliki .svg do przetworzenia
├── output/
│   ├── content/        # Wygenerowane pliki index.md dla Nuxt Content
│   └── public/         # Wygenerowane pliki SVG i PDF do pobrania
├── svg-automate.js     # Główny skrypt konwertujący
├── .gitignore
└── package.json
```

## ⚙️ Wymagania

- Node.js (v14+)
- [Inkscape](https://inkscape.org) (musi być dostępny w ścieżce systemowej jako `inkscape` lub `inkscape.com` na Windowsie)

## 🚀 Jak używać

1. Umieść wszystkie pliki `.svg` w katalogu `svgs/`
2. Uruchom komendę:

```bash
node svg-automate.js <numer_startowy> <kategoria>
```

Przykład:

```bash
node svg-automate.js 29 koty
```

### 🔤 Argumenty:

- `<numer_startowy>` – numer, od którego zaczynamy generowanie wariantów (np. 29)
- `<kategoria>` – nazwa kategorii kolorowanek (np. `koty`, `pieski`, `auta`)

## 🧠 Co robi skrypt?

- iteruje po wszystkich plikach `.svg` w `svgs/` (kolejność alfabetyczna),
- dla każdego tworzy strukturę:

```
output/
├── content/<kategoria>/<N>/index.md
└── public/<kategoria>/<N>/<kategoria>-<N>.{svg,pdf}
```

- konwertuje SVG → PDF w formacie A4 (595×842 pt),
- dodaje znak wodny `twoja-kolorowanka.pl` w lewym dolnym rogu SVG,
- generuje metadane (YAML frontmatter) do pliku `index.md` (np. dla Nuxt Content).

## ✍️ Przykład wygenerowanego `index.md`

```md
---
title: Koty
description: Kolorowanka Koty - wariant 29
canonical: /zwierzeta/koty
variant_of: koty
image: /koty/29/koty-29.svg
pdf: /koty/29/koty-29.pdf
alt: "Kolorowanka koty"
tags:
- zwierzeta
- koty
---
```

## 🧹 Ignorowane foldery

W `.gitignore` znajdują się:

```
node_modules/
dist/
output/
svgs/
```

Dlatego foldery z danymi wejściowymi i wynikowymi nie są śledzone przez Git.

## 🧪 Przykład działania

```bash
$ node svg-automate.js 29 koty
Znaleziono 12 plików SVG…
✅ kotek01.svg → koty-29
✅ kotek02.svg → koty-30
...
✅ Gotowe. Utworzono 12 wariantów (od 29 do 40).
```

## ➕ Dodawanie opisów ALT

Skrypt automatycznie dodaje pola `alt` do generowanych plików `index.md`. Tekst
jest rotowany z listy szablonów tak, aby kolejne warianty miały różne opisy.
Jeśli chcesz zaktualizować ALT w już istniejących plikach, możesz użyć
dodatkowego skryptu `update-alt.js`:

```bash
node update-alt.js <kategoria>
```

## 📄 Licencja

MIT – używaj, przerabiaj, dziel się!
