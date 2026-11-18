# MECHSPEC

Practical mechanical engineering dimensions and fabrication calculators.

Live site https://thenirajshah.github.io/mechspec/

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Overview, brand, entry to tools |
| Dimensions | `dimensions.html` | ANSI B16.5 flange dimensions (Class 150 & 300) |
| Calculators | `calculators.html` | Nozzle marking, thickness, weight, blank, helix, pipe |
| Standards | `standards.html` | ASME B16.5 notes |
| Notes | `notes.html` | Usage guidance and disclaimer |
| Upcoming | `upcoming.html` | Placeholder for future pipe dimension tables |

## Brand

- Logo: gear + orbital “M” mark, **MECH** (white) + **SPEC** (saffron `#FF9933`)
- Tagline: ENGINEERING DIMENSIONS
- Font: Montserrat (400–900)
- Theme: deep navy `#000033` + saffron accent `#FF9933`

## GitHub Pages

1. Push this folder as a repository (files at the **root**).
2. Go to **Settings → Pages**.
3. Source: **Deploy from a branch** → `main` → `/ (root)`.
4. Wait a minute, then open the published URL.

All asset paths are relative (`./style.css`, `./logo-header.png`, etc.) so the site works locally and on GitHub Pages.

## Local preview

```bash
npx serve .
# or open index.html directly in a browser
```

## Disclaimer

All calculators and dimension tables are **reference aids only**. Verify results against the governing code, drawings, and approved design data before fabrication or procurement.
