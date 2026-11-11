# Decisions

A running log of decisions and their reasons, so work can continue in a new session.
Newest entries at the bottom of each section. Dates are YYYY-MM-DD.

## Product

- **Name.** The app is "Chess Trainer"; the GitHub repository is `chess-trainer`.
  The local folder is `Chess Trainer` (the rename was not possible from inside the session
  and the owner chose to keep it). (2026-11-11)
- **Audience.** One user to start with: ~400 rapid on chess.com, wants 5 minutes a day.
  Long combinations that start with a sacrifice or a quiet move are the hardest for them,
  so the ladder orders content by number of player moves, forcing first move, and prerequisites.
- **Repertoire.** White: 1.e4 (Légal). Black: 1...e5 (Blackburne Shilling). Against 1.d4 the
  first trap is the Englund Gambit: it starts with 1...e5 like the rest of the Black repertoire
  and is reachable after any White second move, while the Budapest needs 2.c4, which is rare at
  this level. Condition from the owner: every trap has an honest "not fallen for" branch with an
  engine evaluation, and the UI shows a reliability label. (2026-11-11)
- **New traps stretch over several days.** Day 1 is the story view plus the last one or two
  backward-chain steps. A whole trap does not fit in a 5-minute session.

## Milestones

- M1 is split. **M1a:** scaffold, CI, deploy, PWA shell with offline, board (tap and drag),
  diagnostics; goal is a working link on the phone as early as possible. **M1b:** move-tree
  format, verify, 4 traps, View and Learn modes, one Playwright smoke test.
- M2 also adds the rest of the seed traps (10 in total) so ladder steps 0 and 1 exist.
- The trap list and ladder are proposed in `content/ROADMAP.md` and approved by the owner
  before M1b.

## Stack (versions checked against the npm registry on 2026-11-11)

- **Node 24 LTS**, not 26. chessground and ts-fsrs require Node >= 24 and the plan was agreed on
  24. winget's `OpenJS.NodeJS.LTS` package already points to 26, so 24.22.1 was installed with
  an explicit `--version`. A plain `winget upgrade` may move it to 26.
- **Preact 11** for the UI: many screens and shared state; vanilla would become a home-made
  framework.
- **No `@preact/preset-vite`.** It needs `@babel/core` as a peer. JSX is compiled by Vite's
  built-in transformer using `jsx: react-jsx` + `jsxImportSource: preact` from `tsconfig.json`.
  Cost: no Preact fast-refresh in dev (full reload instead).
- **`@lichess-org/chessground`**, not `chessground`: the unscoped package is deprecated.
- **Stockfish 19.0.1, lite single-threaded build.** It needs neither cross-origin isolation nor
  `SharedArrayBuffer`, which Android WebView and GitHub Pages do not provide. The npm package is
  205 MB, so `scripts/copy-engine.mjs` copies only the two lite-single files into
  `public/engine/` (git-ignored) before `dev` and `build`.
- **The engine is not needed at runtime until M4** (bot). Traps and puzzles follow a prepared
  move tree. M1a ships only a diagnostics page that runs the engine, to test devices early.
- **Hash routing** (`#/diag`): GitHub Pages has no SPA fallback.
- **Node version is pinned.** `.nvmrc` is `24.22.1`, `engines.node` is `24.x`, CI uses
  `node-version-file: .nvmrc`. Node is not upgraded through `winget upgrade`. (2026-11-11)
- **Build scripts are plain `.mjs` in M1a.** From M1b scripts are TypeScript: the owner approved
  `@types/node` as a dev dependency for the verify script (2026-11-11). `tsx` is not needed:
  Node 24 runs `.ts` files directly (type stripping, checked locally with 24.22.1).
- **No linter or formatter yet.** ESLint and Prettier were offered and not requested.
- **Exact versions, lockfile committed, `npm ci` in CI.** `.npmrc` sets `save-exact=true`.

## PWA and deploy

- **Branch previews.** GitHub Pages serves one site and has no branch previews, but stages must
  be checked on the phone before merging. CI publishes to the `gh-pages` branch with plain git:
  `main` goes to the site root, any stage branch goes to `/preview/<branch>/`. A root deploy
  keeps the `preview/` directory.
- **Each preview is a separate PWA** with its own scope, service worker and storage. Progress is
  not shared between a preview and the main app.
- **`navigateFallbackDenylist: [/\/preview\//]`.** The root service worker's scope also covers
  `/preview/...`. Without the deny-list, the first visit to a preview would be answered with the
  root app's cached `index.html`.
- **Update flow is "prompt", not auto-update.** A silent reload in the middle of an exercise
  would lose the user's place. The app shows an "update available" banner instead.
- **Engine files are cached at runtime (CacheFirst), not precached.** 1.9 MB that most sessions
  do not need before M4. Consequence: the engine works offline only after it has been loaded
  once online.
- **No third-party deploy action.** The publish step is a few git commands in the workflow.

## Board

- **chessground only draws; chess.js owns the rules.** After every move the board is reset from
  the chess.js FEN, which also takes care of en passant, castling and promotion.
- **The board refreshes its cached screen position before every touch.** chessground caches the
  board rectangle and refreshes it only on scroll and resize. When the update banner appeared
  above the board, taps landed one row off. Found in the M1a browser check; fixed with a
  capture-phase listener in `src/ui/board/Board.tsx`.
- **Promotion uses our own dialog** with four large buttons. While it is open the board shows
  the position before the move and is read-only; "cancel" leaves the pawn where it was.
- **Coordinates are drawn inside the squares.** chessground's default places them in a margin
  around the board, and a full-width phone board has no margin.
- **Board edge is rounded down to a multiple of 8 px** (CSS `round()`), so squares are whole
  pixels and there are no hairline gaps.

## Local development notes

- In Git Bash on Windows, `npm run build -- --base=/chess-trainer/` is rewritten by MSYS path
  conversion into a `C:/Program Files/Git/...` path. Prefix the command with
  `MSYS_NO_PATHCONV=1` or use PowerShell. CI runs on Linux and is not affected.

## Quality

- verify uses a fixed node count (`go nodes N`), one thread, fixed hash, hash cleared between
  positions, pinned engine version, so results are reproducible. The script writes a
  `verification` block (engine version, node count, evaluation per leaf) into the trap file and
  is the only thing that sets `verified`. No date in the block, so re-runs produce no diff.
  CI runs it in check mode and fails on any difference.
- One Playwright smoke test on a mobile viewport (open a trap, complete it) arrives in M1b,
  when traps exist.
- Piece set license is checked and recorded in `THIRD_PARTY_NOTICES.md` before shipping.

## Known open points

- **`npm audit`: 6 advisories (2 low, 4 moderate), accepted for now; revisit in M5.**
  Recorded on 2026-11-11. All six sit in the build-time chain
  `vite-plugin-pwa` -> `workbox-build` -> (`glob` -> `minimatch`, `@rollup/plugin-node-resolve`
  -> `deepmerge`). None of this code is shipped to users; it runs only on the developer machine
  and in CI, on our own files. Owner's decision: never `npm audit fix --force` (it would change
  pinned versions and can downgrade `vite-plugin-pwa`). Re-check in M5, before the APK release,
  or earlier if `workbox-build` publishes a fixed version.

  | Package | Severity | Affected range | Cause |
  | --- | --- | --- | --- |
  | `minimatch` | moderate | 7.0.0 - 11.0.0 | GHSA-g3hv-75wg-m249: denial of service via glob-part amplification |
  | `glob` | moderate | 9.0.0 - 14.0.1 | GHSA-3g3m-2fjr-6pw4: AbortSignal cancellation bypass; also depends on `minimatch` |
  | `workbox-build` | moderate | >=6.0.0-alpha.0 | depends on `glob` and `@rollup/plugin-node-resolve` |
  | `vite-plugin-pwa` | moderate | >=1.2.0 | depends on `workbox-build` |
  | `deepmerge` | low | >=4.2.0 | GHSA-gcqx-w48m-w2h4: `mergeObject()` prototype poisoning of returned objects |
  | `@rollup/plugin-node-resolve` | low | >=8.0.0 | depends on `deepmerge` |
- Stockfish inside a real Capacitor WebView is unconfirmed until tested on the device
  (cheap early check: open the diagnostics page from Telegram's in-app browser).
