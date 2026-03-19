# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is a **Three.js Demo Showcase** — a frontend-only single-page gallery of ~180 interactive 3D demos. No backend, no database, no external APIs. Built with **Vite** + **Three.js** (vendored in `src/lib/three/`).

### Running the dev server

```bash
pnpm dev
```

Starts Vite on **port 6500**. Visit `http://localhost:6500`.

### Linting

```bash
npx eslint .
```

Pre-existing lint warnings/errors exist in the codebase (especially in `bin/screenshot.js` and `.commitlintrc.cjs`). These are not regressions.

### Key caveats

- **Three.js is vendored** at `src/lib/three/`, not used from `node_modules`. The Vite config aliases `three` and `three/examples/jsm` to the vendored paths.
- **`.npmrc`** points to `https://registry.npmmirror.com` (Chinese npm mirror). This works fine in the cloud environment.
- After `pnpm install`, you may see a warning about ignored build scripts for `esbuild` and `puppeteer`. The Vite dev server still works; dependency pre-bundling scan fails but pages load correctly on demand.
- There is no automated test suite in this project. Verification is done by running the dev server and loading demos in the browser.
- The `pnpm screenshot` command requires Puppeteer with Chrome and is optional (generates preview thumbnails).
