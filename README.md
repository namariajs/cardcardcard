# GO Desk — Vite + React

A React port of the GO Desk group-order-manager prototype, built with [Vite](https://vite.dev/guide/).

## Running it

```bash
npm install
npm run dev
```

Open the URL Vite prints (defaults to http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview   # serve the production build locally
```

## Data persistence

The original prototype ran inside Claude's artifact sandbox and used a bespoke
`window.storage` API. This project swaps in **`localStorage`** as the backing store
(see `src/lib/storage.js`) with the exact same async shape, so if this ever grows a
real backend, only that one file needs to change — nothing else in the app talks to
storage directly.

Note: since data lives in the browser's localStorage, it's per-browser/per-device.
There's no sync between different people's devices — if you need that, you'd want to
swap `storage.js` for calls to a real API/database.

## GOM PIN

The default "Modo GOM" PIN is `1003` (see `src/lib/constants.js` -> `GOM_PIN`). Change
it there before deploying if you want a different one.

## Project structure

```
src/
  lib/            # pure logic: formatting, calculations, constants, storage
  hooks/          # usePersistedState (load+auto-save a collection), useItemPhoto
  context/        # AppContext -- all app state and actions
  components/
    shared/       # Modal, ConfirmModal, EmptyState, PhotoThumb, ValueBoxes, ...
    items/        # ItemCard, ItemRow, ItemModal (add/edit)
    shipping/     # Frete Nacional wizard + modals
    inter/        # Inter (international shipping boxes) box card + item detail modal
    registry/     # Cadastro (joiner registry) modal
    tabs/         # one file per tab, wired up in App.jsx
```

## Known gaps vs. the original prototype

- The "quick track" tool in Arquivo just opens the Correios tracking page in a new tab
  (same as the original) -- there's still no free public Correios API to auto-verify
  delivery status.
- Photo/receipt uploads are resized client-side and stored as base64 in localStorage,
  so very large numbers of photos will eventually hit the browser's storage quota
  (~5-10MB depending on browser). For heavier use, swap in real file storage (S3, etc.)
  via `src/lib/storage.js`.
