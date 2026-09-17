# TaxStack — Cascading Tax Structure Calculator

A small, dependency-light web app for working out cascading ("tax on tax")
structures — Service Charge, SSCL, TDL, VAT and anything else a client sends
you — before configuring them in an ERP/PMS. Runs entirely in the browser;
nothing is saved or sent anywhere.

## What it does

- Add any number of tax types: name, stated rate, **exclusive** (adds on top)
  or **inclusive** (already embedded, extracted only).
- Drag to reorder taxes, and for each tax toggle exactly which earlier taxes
  (and/or the net base) it should be calculated on. This is what produces the
  real "actual" rate — e.g. a stated 2.5% SSCL calculated on top of a 10% SC
  works out to an **effective 2.75%** of the net rate.
- Calculate in **both directions**:
  - **Build ↑ from net** — enter the tax-exclusive base, see it build up to
    the final total.
  - **Extract ↓ from gross** — enter the final all-inclusive price a client
    gave you, and it solves backward for the net base (accounting for the
    same cascading rules and rounding).
- Choose display/rounding precision from **0 to 5 decimal places**, so
  advanced/high-precision tax setups aren't limited to 2dp.
- **Import/export** a client's tax structure as CSV or XLSX, so you can keep
  a file per client (there's no backend or database — this is the only form
  of "saving").

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

## Building for production

```bash
npm run build
```

This outputs a fully static site into `dist/`. Because `vite.config.ts` sets
`base: './'`, the build uses relative asset paths, so `dist/` works whether
you host it at the root of a domain or under a GitHub Pages project subpath
(e.g. `https://username.github.io/repo-name/`).

## Deploying to GitHub Pages

**Option A — GitHub Actions (recommended, auto-deploys on every push):**

1. Push this project to a GitHub repository.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Add `.github/workflows/deploy.yml` (see below) and push it.
4. Every push to `main` will build and publish `dist/` automatically.

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Option B — `gh-pages` package (manual, one command per release):**

```bash
npm install -D gh-pages
npm run build
npx gh-pages -d dist
```

Then in **Settings → Pages**, set the source branch to `gh-pages`.

**Option C — any static host:** the `dist/` folder is a complete static
site — drop it into Netlify, Vercel, Cloudflare Pages, S3, or a plain web
server exactly as-is.

## CSV / XLSX file format

Both import and export use the same columns:

| Order | Tax Name | Rate (%) | Mode | Applies On Base | Applies On Taxes |
|-------|----------|----------|------|------------------|-------------------|
| 1     | Service Charge (SC) | 10 | Exclusive | Yes | |
| 2     | SSCL | 2.5 | Exclusive | Yes | Service Charge (SC) |
| 3     | VAT | 18 | Exclusive | Yes | Service Charge (SC); SSCL |

`Applies On Taxes` references other taxes **by the name in the same file**,
separated by `;` — so you can hand-edit these files in Excel directly and
re-import them.

## Notes on the math

- **Exclusive** tax: `amount = base × rate`, added on top of the running
  total.
- **Inclusive** tax: `amount = base × rate / (1 + rate)` — extracted from
  within its base; it's reported but does not add anything further to the
  running total, since it was already embedded.
- Each line is rounded to the selected decimal precision **before** feeding
  into any later tax's base, mirroring how a real ERP rounds each ledger
  line — this is what surfaces genuine rounding drift between the stated
  and effective rates.
- **Extract ↓ from gross** is solved by bisection against the unrounded
  cascade (so it's precision-independent and robust to any dependency
  graph), then the final breakdown is recomputed once at your chosen display
  precision.

## Tech stack

React + TypeScript + Vite + Tailwind CSS v4. CSV via PapaParse, XLSX via
SheetJS (loaded on demand so the main bundle stays small). No backend, no
database, no analytics.

## Turning this into a mobile app later

Because this is a plain React app with no browser-storage dependency, it can
be wrapped with [Capacitor](https://capacitorjs.com/) into an iOS/Android app
without a rewrite:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/android @capacitor/ios
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

That gives you native app shells pointing at the same `dist/` build.
