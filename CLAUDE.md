# Chess Trainer: working rules

Chess Trainer teaches opening traps and basic tactics to beginner-level players
(target user: ~400 rapid on chess.com) in five-minute daily sessions.
Read `docs/DECISIONS.md` before starting work: it records what was decided and why.
`docs/PLAN.md` holds the approved stage order and the plans for engagement, reminders and the APK.

## Language

- Code, comments, README, commit messages and documentation: English.
- UI text: Russian, and i18n-ready. Every user-visible string lives in `src/i18n/`.
- Conversation with the project owner: Russian.

## Commits and branches

- These rules cover every commit and every pull request in the whole repository:
  - Never add `Co-Authored-By` or any similar trailer.
  - No signature or mention of Claude or any AI tool in commit messages or PR descriptions
    (no "Generated with ..." line either).
  - The commit author is the owner, through the GitHub noreply address. Never write a personal
    email into history.
- Small commits. Every milestone must build, pass CI and deploy.
- One branch per stage (`m1a`, `m1b`, `m2`, ...). Merge into `main` only when CI is green
  **and** the owner has passed the phone checklist for that stage.
- Stage branches deploy to `/preview/<branch>/` on GitHub Pages; `main` deploys to the site root.

## Stage workflow

- For every stage write `docs/QA/M<number>.md`: what to check on the Samsung S24 Ultra and
  on the iPad Pro (M5), with the expected result for each step.
- At the end of a stage, stop and report: what was done, what the owner must check,
  known problems, and decisions made on your own (also appended to `docs/DECISIONS.md`).
- Do not start the next stage without an explicit "ok" from the owner.
- If something in the plan turns out to be wrong (a version, WebView behaviour, a license),
  stop and report it. Do not work around it silently.

## Dependencies

- Exact versions only (no `^` or `~`); `package-lock.json` is committed; CI uses `npm ci`.
- No new dependency without the owner's approval. This includes dev dependencies.
- Node is pinned: `.nvmrc` holds the exact version, `engines` in `package.json` allows only
  that major, and CI reads the version from `.nvmrc`. Do not upgrade Node as a side effect of
  anything else. On the owner's Windows machine winget's `OpenJS.NodeJS.LTS` package already
  points to a newer major, so never run `winget upgrade` for Node; if upgrades become a
  problem, offer `winget pin add --id OpenJS.NodeJS.LTS` to the owner (do not run it unasked).
- Never run `npm audit fix --force`. Known advisories are listed in `docs/DECISIONS.md`.
- Scripts are written for Node, not Python. Node 24 runs `.ts` files directly (type
  stripping), so `tsx` is not needed.
- Project license is GPL-3.0-or-later (Stockfish and chessground are GPL).
  Check the license of anything new and record it in `THIRD_PARTY_NOTICES.md`.

## Secrets

- Tokens, keys and keystores never enter the repository and are never shown in the chat
  (do not print them, do not echo command output that contains them).
  The APK keystore lives outside the repository.
- Never ask the owner to paste tokens into the chat. Only the owner runs `gh auth login`.
- Anything that affects the license, the user's data or the public repository is asked first.

## Content

- Traps are data: `content/traps/*.json`. Puzzles are built from the Lichess puzzle database (CC0).
- Both sources share one move-tree format so sources can be swapped or added.
- Only the verify script may set `verified: true`. Lines written from memory are unverified
  until verify passes. Engine evaluation is reproducible (fixed node count) and written to the file.
- Trap names and origins must be checked against the Lichess opening explorer or Wikipedia
  and the source recorded. Never invent a name or an origin.
- Every trap has honest `decline` and `sound` branches with an engine evaluation,
  and the UI shows how reliable the trap is.

## Platforms

- Priority: Android (Samsung S24 Ultra), then Windows (Edge/Chrome), then iPad (Safari).
- Phone first: portrait layout, full-width board, large touch targets, no hover-only interactions.
- One web codebase, PWA with offline support; later an APK through Capacitor.

## Commands

- `npm run dev`: dev server
- `npm run build`: production build (CI passes `--base` for GitHub Pages)
- `npm run typecheck`, `npm test`, `npm run verify:check`: checks that CI runs
- `npm run verify`: verify every trap, update trap files, the cache and the ROADMAP catalogue
