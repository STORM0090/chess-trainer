# Decisions

A running log of decisions and their reasons, so work can continue in a new session.
Newest entries at the bottom of each section. Dates are YYYY-MM-DD.

Do not read this file whole: find the section below and read it, or grep. Decisions of M1b to
M3 (content and verify, learning modes, progression, privacy check) are in
`docs/archive/DECISIONS-M1-M3.md`.

| Section | What it holds |
| --- | --- |
| Product | Target user, session length, what the app is not |
| Milestones | The original milestone order and how it changed |
| Stack | Versions and why each package |
| PWA and deploy | Previews, service worker, update flow, storage of previews |
| Board | chessground setup, touch and drag |
| Local development notes | Windows quirks |
| Quality | CI checks, verify reproducibility, tests |
| Puzzles and the entry test (M4) | Lichess source, themes, levels, the test, hints |
| Daily session, streak, settings (M5) | Day log, streak and freezes, session plan, FSRS for puzzles, `.ics`, format 3 |
| Independent review of M4 and M5 | Findings and fixes |
| The bot (M6) | Policy, calibration, 13 levels, trap practice, ШВУ checklist, format 4 |
| Independent review of M6 | Findings and fixes |
| The Android app (M7) | Capacitor, APK workflows, notifications, share sheet, format 5 |
| Independent review of M7 | Findings and fixes |
| Exercises from the owner's games (M8a) | PGN, mining rules, storage 4, format 6 |
| Known open points | Lichess API, `npm audit`, unchecked device behaviour |

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
- **Stage order revised (2026-11-13).** M1b delivered content only (32 verified traps), so the
  learning modes moved to M2. The owner approved the new order M2 to M8 together with the
  engagement, reminder, data and APK-key plans; all of it is in `docs/PLAN.md`.

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
- **Each preview is a separate PWA** with its own scope and service worker. **Storage
  (corrected on 2026-11-17):** this said "and storage", which was wrong. IndexedDB belongs to
  the origin, not to the path, so until then the root and every preview shared the database
  `chess-trainer`, and a newer preview upgraded it so that older builds (the root among them)
  opened with empty progress. Since then the database name comes from the base path
  (`src/build-info.ts`): the root and the APK keep `chess-trainer`, a preview uses
  `chess-trainer@preview/<branch>`. A unit test checks that the root and the previews never
  share a name.
- **A database newer than the build** (a newer build upgraded it, or a merge was reverted):
  the build opens it at its own version without upgrading, shows the progress read-only with a
  notice and the way to the progress file, and writes nothing, so the newer build finds it as
  it left it. The diagnostics page shows the database name and both versions. An e2e test
  makes a version-99 database and checks the notice, the export and that nothing was written.
- **The test clock ("На день вперёд") exists only in previews**, on the dev server and in
  builds made with `VITE_TEST_CLOCK=1`. The root and the APK have no button and ignore a saved
  shift. The e2e test that needs the clock is skipped in the root build; the stage branch ran
  it on the same tree before the merge. Locally: `VITE_TEST_CLOCK=1 npm run build`, then
  `VITE_TEST_CLOCK=1 npm run test:e2e`.
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
- One Playwright smoke test on a mobile viewport (open a trap, complete it). Planned for M1b,
  written in M2 once the Learn screen existed (see "Learning modes" in `docs/archive/DECISIONS-M1-M3.md`).
- Piece set license is checked and recorded in `THIRD_PARTY_NOTICES.md` before shipping.

## Puzzles and the entry test (M4, 2026-11-14)

- **Source.** The Lichess puzzle database, CC0: `lichess_db_puzzle.csv.zst`, 309,751,173
  bytes, 6,193,530 puzzles, HTTP `Last-Modified` of 1 November 2026, downloaded on
  2026-11-14 with the owner's "ok" into the git-ignored `.cache/lichess/`. Its SHA-256 is
  written into `content/puzzles/lichess.json` and `content/puzzles/README.md`.
- **Selection** (`npm run build:puzzles`, `scripts/build-puzzles.ts`). For every theme and
  every 100-point rating bucket from 400 to 1400: the 30 most played puzzles with popularity
  of 80 or more, 200 plays or more, a rating deviation of 90 or less and at most three moves
  of the player. A theme starts at the lower rating of the level that introduces it. The same
  archive always gives the same file. Every kept puzzle is replayed with chess.js (0 were
  rejected); a unit test replays the committed file again. Result: 1,896 puzzles, 290 KB.
  The table "kept / available" per theme and bucket is in `content/puzzles/README.md`: the
  count the roadmap was waiting for. Below 600 the database has almost nothing but mates and
  hanging pieces, which matches the level table.
- **Node unpacks the archive itself** (`zlib.createZstdDecompress`), so no dependency was
  added.
- **The generated file is committed** (proposed by the developer, confirmed by the owner on
  2026-11-14: it stays in the public repository): CI cannot
  download 295 MB on every build, the data is CC0, and only the id, the position, the moves,
  the rating and the themes are kept. The links to the source games are dropped, so no player
  name is reachable from the file. `THIRD_PARTY_NOTICES.md` names the source.
- **How it ships.** The file is a separate chunk (262 KB, 85 KB gzipped) loaded when the
  puzzle screen opens. The service worker caches it on install with the rest of the app, so
  puzzles work offline. The precache grew from 313 KiB to 587 KiB.
- **One move-tree format.** A puzzle compiles into the same `CompiledLine` as a trap line
  (`src/core/puzzle-model.ts`). The line got a `startFen`, a step got a `moveNumber` for
  display, and the drill and the judge take an `Exercise` (side and lines) instead of a
  trap. So the hint ladder, the promotion window, the pause before the opponent's move and
  "another mate is also accepted" are the same code for traps and puzzles.
- **Levels** are the table of `content/ROADMAP.md`, section 4, as data in
  `shared/puzzle-types.ts`: T0 400-700, T1 600-900, T2 800-1100, T3 1000-1250, T4
  1150-1400, shown to the player as levels 1 to 5. The new themes of T3 and T4 are not
  approved yet, so these two levels serve the nine approved themes at a higher rating.
- **Entry test.** Ten puzzles, two per level, easiest first. A test puzzle comes from the
  middle half of its band (the bands overlap at the edges), the two puzzles of a level have
  different themes, and levels 1 to 3 test the themes they introduce. The puzzles are picked
  at random each time. The level is the first one with a missed puzzle; nothing missed gives
  level 5.
- **A puzzle counts only when it is clean** (no wrong move, no hint), the same bar as a chain
  step. Hints stay available in the test: a beginner always reaches the solution, and a used
  hint simply means "not counted". Developer's decision; the checklist asks the owner.
- **The test sets the puzzle level only.** It does not open or move traps: the trap ladder
  stays with the unlock rule the owner approved. "Stages are reviewed after the entry test"
  is a review by the owner, with the result in hand.
- **Without a test** the player is on level 1. The test can be taken again at any time; the
  new result replaces the level.
- **Level up:** when the last 30 puzzles from the band of the level are solved cleanly at 70%
  or better (the roadmap rule). Only puzzles whose rating is inside the band count. There is
  no level down; taking the test again is the way down.
- **Which puzzle comes next in a theme:** a puzzle failed on an earlier day, then a new one
  from the band, then a new one with the nearest rating, then the one solved longest ago.
  A failed puzzle never comes back on the same day.
- **Themes above the level are open.** They serve puzzles from the band of the level that
  introduces them and carry the mark "сложнее вашего уровня".
- **Storage.** IndexedDB version 2 adds the store `puzzles`; the level lives in `settings`
  under its own key. The progress file is format 2; files of format 1 are still read.
- **Third hint and promotion.** The arrow cannot show the piece a pawn becomes, so the text
  names it. This also applies to traps.
- **Not checked:** the Russian theme names and one-line tasks are the developer's wording.
  They were not compared with the Russian translation on Lichess.
- **Not done in M4:** FSRS for puzzles (a failed puzzle returns by the simple rule above),
  puzzles on the first screen and in a daily session (M5), a link from a puzzle to Lichess.
- **Explanations, batch 1.** Approved by the owner on 2026-11-14 with edits (texts 1, 6, 8,
  14, 21); the list is at the end of `docs/explanations/batch-1.md`.
- **Where the texts live.** The batch file is the reviewed text. `npm run explain:apply`
  copies it into the trap files as a field of the line, `explanation: { ru, sources }`, and
  a unit test fails when the two differ. A batch whose commit is reverted leaves the test
  green: the app then shows the general sentence for the kind of line, as before.
- **Where the app shows them:** under the line in View, and after a run in Learn, in the
  chain and in a review, in place of the general sentence, followed by a quiet source mark
  ("Проверено по доске.", "По оценке движка." or both).
- **Evaluation words** (owner's rule of 2026-11-14): from +2.0 the app says "большой
  перевес", not "выиграно"; from -2.0 "у соперника большой перевес". "Выиграно" is left for
  mate and won material, which the app words separately ("Итог: мат.").
- **Guard check in the facts script.** For a piece that is attacked and is the only defender
  of another attacked piece, `explain:facts` lists the moves that keep the defence and who
  attacks each of those squares. Text 21 rests on it.

## Daily session, streak, settings (M5, 2026-11-14, autonomous mode)

Built without the owner; every item here is the developer's decision unless it says "plan".

- **Navigation.** The start screen is "Сегодня". The header has four links: "Сегодня",
  "Ловушки" (now `#/traps`), "Задачи", "Ещё". The free board, the data screen, the settings
  and the diagnostics are under "Ещё": they are not daily things. The bar stays at the top; a
  bottom bar would be more usual on a phone but cannot be judged without the device (safe
  areas, the gesture bar), so it is left as a question for the owner.
- **The daily log** is a record per local calendar date (`YYYY-MM-DD`): how many exercises,
  when the norm was met, the trap started that day, the plan of the session. Every finished
  exercise counts, inside the session or outside it: a puzzle, a chain step, a review.
- **Local dates.** A day is the device's calendar date. All arithmetic is done on the date
  (`addDays`, `daysBetweenKeys`), never by adding 24 hours. A property test walks every day
  of 2026 in nine time zones, including zones that change the clock at midnight and by half
  an hour. It found a real bug in the M3 code: where midnight is skipped (Chile, Egypt), the
  next day began an hour late. Fixed.
- **Streak (plan: soft, no punishments).** Worked out from the log every time, so there is
  no counter that an import or a clock change could leave wrong. The big number is "Дней
  занятий" (days with the norm met, never goes down); the streak is the small one. A gap of
  missed days is covered by freezes, spent by themselves, only when there are enough for the
  whole gap; otherwise the streak starts again without a word and the freezes are kept.
  One freeze per seven active days (counted over all time, not per streak), two at most.
  Today never breaks anything while it lasts.
- **Travel.** A flight east can skip a local date without a missed day. One date without a
  record is not "missed" when the sessions on both sides are less than 24 hours apart, which
  cannot happen without a change of time zone (or the 23-hour day of the spring clock change).
- **Clock set back or forward by hand.** The streak runs up to the date the device shows.
  Records after it count in "Дней занятий" only.
- **The norm** is 1, 3 or 5 exercises a day (plan: one puzzle; default 1). A day that met
  the norm stays met when the norm is raised later.
- **Session (plan: a trap step, three puzzles, due reviews).** About six items: a warm-up
  puzzle from the easy third of the band; what is due (one trap review, up to two failed
  puzzles); up to two chain steps of the trap in progress; then new puzzles of different
  themes from easy to hard, at least two. The plan is made when the session is first opened
  that day and stays the same all day; it survives leaving and a restart. What the day holds
  decides its shape and its title: "ловушка и задачи", "повторение и задачи", "задачи от
  простой к сложной". An item that was done outside the session meanwhile is skipped.
- **Theme names are hidden in the session** and in the entry test (owner's default of
  2026-11-14); the theme screen shows them.
- **A chain step in the session** that was not clean can be repeated at once or left: the
  session goes on either way, the step stays the next step of the trap.
- **One new trap a day (plan).** A trap whose chain has never been run cannot be started on
  a day when another trap was started. "Я это знаю" is not a start. Traps in progress are
  never held back. The chain screen says "Новая ловушка откроется завтра." and the session
  does not offer the trap.
- **FSRS for failed puzzles (owner's request).** A puzzle that was not solved cleanly gets an
  FSRS card (first answer "again" for a wrong move, "hard" for hints only) and is due the
  next day at the earliest. When due, it is graded like a trap review. An extra try before
  its day changes nothing. A puzzle solved cleanly at once is never scheduled: there are
  1,896 of them and more to come. Only the first attempt at a puzzle counts for the level.
  Records of the M4 build are converted when read: failed last time means a card that is due
  the day after that attempt, which is when the old rule brought the puzzle back.
- **Storage.** IndexedDB version 3 adds the store `days`. Progress file format 3 adds the
  daily log, the puzzle cards and the new settings. Files of formats 1 and 2, as the M3 and
  M4 builds wrote them, are kept in `tests/fixtures` and must open; an e2e test builds an
  M4 database by hand and checks the app carries it over.
- **Calendar reminder (plan: an `.ics` file).** One daily event at a local "floating" time,
  five minutes long, with an alarm at its start and a fixed identifier per app address, so a
  second import should replace the first. Folding at 75 bytes never cuts a Cyrillic letter.
  **Not checked on any device**: how Samsung Calendar, Google Calendar and iOS open it.
- **Backup hint (plan: once a month).** One quiet block on the home screen when the last
  saved file is 30 days old (or, if there never was one, after 30 days of practice).
  "Позже" hides it for 30 days. Saving a file records the time.
- **Size budget** is checked in CI by `npm run check:size`: precache 619 KiB of 1,200,
  largest script 88 kB gzipped of 130, start-up scripts 89 kB of 130.
- **E2E.** Seven tests: the three older ones, the daily session over two days with the
  settings and the calendar file, one new trap a day, the M4 data upgrade, and one run with
  the service worker on and the network off.
- **Not done in M5:** an optional bot game in the session (M6), notifications (M7), a
  bottom navigation bar, weekly or monthly summaries.

## Independent review of M4 and M5 (2026-11-15)

A fresh context that had not seen the code reviewed M4 and M5 (logic, data, texts). Fixed
on `m5` (texts of batch 1 on `m4`):

- **Travel rule forgave ordinary missed days.** The limit was 36 hours; 21:00 on Monday and
  08:00 on Wednesday is 35. Now 24 hours.
- **One record after today broke the streak.** The walk ran to the last record and counted
  every empty day up to it as missed. The streak now runs up to today.
- **Freezes were spent on a gap they could not cover**, and then the streak reset anyway.
  Now a gap is covered whole or not at all.
- **Misses in the entry test got FSRS cards**, so puzzles far above the player's level came
  back as reviews. The test no longer schedules anything.
- **The session looked only at the first open trap**, so a trap started out of order from
  the list was never offered. A trap in progress now comes first.
- **An older build open in another tab** held the database upgrade forever: a blank screen.
  The app now starts from memory and says to close the other tab; a page that is outdated by
  a newer build in another tab stops writing and asks for a reload.
- **Imported FSRS cards** were checked by type only. Now the state must be 0 to 3, stability
  positive, counters whole, times real, and only the known fields are kept.
- **The calendar file** promised that a second import replaces the first. It now has a
  sequence number, and the settings screen says to delete the old event first.
- **Session summary** counted items skipped because they were done elsewhere; an empty plan
  showed "session done" with nothing done; the plan was stored while rendering. Fixed.
- **Texts:** batch 1 texts 1 and 6 said both pawn moves "opened the diagonal"; only f3 (f6)
  does. Text 13 named the rook. Batch 2 text 9 called 4...d5 "the best defence" without a
  program check; text 1 now says "фигурами и пешками".
- Checked and found correct by the reviewer: every mate and legal-move count in batches 1
  and 2, the card and due-date invariant, no double counting, every state the app produces
  imports again, the fixtures are read, folding of the calendar file, the database upgrade.

## The bot (M6, 2026-11-15/16, autonomous mode)

- **What the engine offers, read from its own `uci` output** (Stockfish 19 Lite WASM, the
  build the app ships): `Skill Level` 0 to 20, `UCI_Elo` 1320 to 3190, `MultiPV` up to 256,
  `Threads` 1. The owner's target ladder (about 300 to 1200 for people) starts far below
  the lowest `UCI_Elo`, and `Skill Level 0` plays random-looking blunders mixed with
  engine moves. So the weakness is built in the app, not taken from the engine.
- **The policy** (`shared/bot/policy.ts`). On a "tunnel" move the bot looks only at its own
  idea: it takes what can be taken, gives a check, otherwise makes a natural move
  (development, castling, a centre pawn); it does not ask what the opponent threatens, and
  often does not check whether the square it moves to is attacked. This is where a beginner's
  hanging pieces and missed threats come from. Otherwise it compares the engine's best
  moves (MultiPV 8) and picks one with a preference that sharpens with the level. One
  number, `strength` 0 to 1, sets the share of tunnel moves (60% to 2%), how often a tunnel
  move looks at its square (15% to 90%), the sharpness, and the engine nodes per move
  (300 to 12,000, geometric). A mate in one is always played when the bot sees it.
- **Calibration** (`npm run bot:calibrate`, results in `content/bot/calibration.json`). The
  bot plays itself on the bundled engine with fixed nodes and a cleared hash, so a search
  depends only on the position; searches are cached by FEN. Every game has its own seed.
  Run "grid-v1": 9 strengths from 0 to 1, each against its two neighbours on each side,
  60 games per pairing, plus `Skill Level 0` and `UCI_Elo 1320` at 12,000 nodes as
  landmarks: 1,320 games in 11 minutes. Ratings by Bradley-Terry with one virtual draw per
  pairing. The scale runs from 0 (strength 0) to 1,338 (strength 1); the two engine
  limiters land at 559 and 621. Run "levels-v1": the 13 chosen levels, each against its
  neighbours, 40 games per pairing, 480 games: the order holds (0, 86, 240, 326, 431, 536,
  587, 795, 900, 977, 1029, 1192, 1389).
- **Thirteen levels** about 100 points apart on that scale (the stronger of two neighbours
  scores about 64%). **No human rating is shown or claimed:** nothing was measured against
  people. The owner's own results move the level: one up after a win, one down after two
  losses in a row at the same level.
- **On the phone** the engine runs in a Web Worker (the interface never waits for it), one
  search at a time, at most 12,000 nodes and never longer than 1.5 seconds per move; a hot
  or slow phone makes the bot a little weaker instead of slower. The bot never answers
  faster than 0.65 s, the same pause as in the traps. **Not checked on the device:** heat
  and battery (in the QA file).
- **The engine is not precached** (1.9 MB, outside the size budget): the first game needs
  the network once. Offline before that, the screen says so and offers to try again.
- **Trap practice.** From the page of any open trap. The bot opens along the lines of the
  trap file: at every branching point it chooses among the different moves of the lines
  that match the game so far, with equal weights (the owner's rule for opponent moves). The
  lines of the player's mistakes are included, so a mistake is punished as the trap file
  shows. Once the game leaves every line, the bot plays by its level, and the screen says
  from which move.
- **ШВУ checklist** (owner's plan, switched off by default): before each of the player's
  moves, five short questions (what the last move changed and threatens; checks; captures
  and whether the target is defended; threats; whether the moved piece will hang), and the
  board takes a move only after "Проверил".
- **Game review** (optional in the plan, done). After a game with at least three moves of
  the player: every position before a move of the player and after it is searched at
  20,000 nodes; moves that gave up 1.5 pawns or more are mistakes, the three biggest are
  shown in the order of the game with the engine's move as an arrow. Positions where the
  player was already lost by six pawns are skipped. Takes a few seconds on a desktop; not
  measured on the phone.
- **Trap games do not move the level.** In the book the bot plays the trap's mistakes
  whatever its level (a quarter of Legal games go 4...g6 or h6, half of those 5...Bxd1??), so
  a win there says little about its own play. They count for the day. Found by the review.
- **Games are not saved.** Leaving a game ends it without a result. The review pointed out
  that this lets a losing game be dodged; kept on purpose for now (no pressure, a game is an
  extra), and listed for the owner in `docs/PENDING.md`. The level, the last ten
  results and the checklist switch are settings; progress file format 4 carries them.
- **A finished game counts as one exercise of the day** for the norm and the streak.
- **Not done in M6:** a short game as part of the daily session (the session stays about
  five minutes; a game is an extra), takebacks, a clock, saving an unfinished game.

## Independent review of M6 (2026-11-16)

Fixed on `m6`: the move number in "С N-го хода партия ушла от вариантов" was one too high
after a Black move; trap games raised the bot's level; the game review kept the engine busy
after the player left it, so the next game's bot waited behind it; a crashed or timed-out
engine was never replaced; "Случайно" kept the first colour for every next game; a file
from a build with more bot levels would not import (now it opens at the top level). Texts
of batch 3: text 9 gave the wrong reason (see the batch file), texts 14, 16, 17, 20, 21
reworded. Checked and found correct by the reviewer: the bot's move effect (no double move,
no move after the end or after leaving), promotion both ways, the result recorded once,
the policy's legality and mate scores, the review's score signs, the Bradley-Terry fit. Its
note on the calibration: neighbouring levels measured 51 to 208 points apart in the 40-game
run, with about 60 points of noise per pair, so "about 100 apart" is consistent with the
data but only loosely supported; the bottom of the ladder is compressed.

## The Android app (M7, 2026-11-16, autonomous mode)

### What the documentation says (read on 2026-11-16)

Sources: capacitorjs.com (docs for Capacitor 8: Android, local notifications, filesystem,
share, environment setup, target SDK) and developer.android.com (notification permission,
scheduling alarms, Doze and App Standby), plus the plugin's own Android manifest.

- **Capacitor 8** needs Node 22 or later (we have 24), Android 7 (API 24) at least, targets
  API 36 (fixed by the Capacitor version), Android Studio 2025.2.1 for local builds. The
  generated project uses the Android Gradle Plugin 8.13 and Gradle 8.14, so the CI uses JDK 21.
- **Android 13 notification permission** (POST_NOTIFICATIONS): an app targeting 13+ decides
  when to ask; new installs have notifications off until granted; after "Don't allow" the
  app cannot notify. The docs do not promise a second dialog after a refusal.
- **Exact alarms.** On Android 12+ an app needs SCHEDULE_EXACT_ALARM, granted by the user, not
  pre-granted to fresh installs targeting 13+, revocable. USE_EXACT_ALARM is for alarm
  clocks and calendars under Google Play policy: not for us. Inexact alarms
  (setAndAllowWhileIdle) fire "within one hour" of the time on Android 12+.
- **Doze.** Alarms that may fire in Doze (allowWhileIdle) fire at most once per nine minutes
  per app. A daily reminder is far below that.
- **The plugin** (@capacitor/local-notifications 8.3.1) declares POST_NOTIFICATIONS,
  SCHEDULE_EXACT_ALARM, RECEIVE_BOOT_COMPLETED and WAKE_LOCK itself and has a boot receiver
  that restores scheduled notifications (read in its AndroidManifest.xml; the web docs do
  not say so). By default schedule() opens the "Alarms & reminders" screen when exact alarms
  are not allowed; ids must be 32-bit integers.
- **Files.** Directory.Cache needs no permission, and Capacitor's default FileProvider
  shares only files from the cache folder. Share takes file:// URLs.

### Decisions

- **Packages** (approved in advance by the owner): @capacitor/core, android, local-notifications,
  filesystem, share and the CLI (dev), at exact versions 8.6.2 / 8.6.2 / 8.3.1 / 8.1.5 /
  8.0.3 / 8.6.2, all MIT. They bring tslib (0BSD) and @capacitor/synapse (ISC; its license
  file holds the MIT text). npm audit is unchanged (the six known build-time advisories).
- **appId `io.github.storm0090.chesstrainer`**: the GitHub login is already public in the
  repository address. It cannot change after the first release without users reinstalling,
  so it is listed in `docs/PENDING.md`.
- **`android/` is committed** as `cap add android` made it, with three edits: release signing
  from environment variables (nothing about the key in the repository), the version from
  package.json (versionCode = major·1,000,000 + minor·1,000 + patch), and Android's cloud
  backup switched off, because the plan says progress never leaves the device unless the
  owner sends it. (A direct phone-to-phone transfer by Android's own tool is not blocked;
  blocking it needs data extraction rules and would only hurt the owner's move to a new
  phone.)
- **In the APK the service worker is off**: every file is inside the app, and the update flow
  of a PWA makes no sense there.
- **Reminders are local notifications**, scheduled 14 days ahead (the plan) on every start,
  when the app comes back to the screen and after every change that matters (the switch, the
  time, the norm met today, the permission, the exact-alarm setting). The whole plan is
  scheduled again each time and only ids that are no longer wanted are cancelled: the
  plugin's list of pending notifications is its own record, not what Android holds, and
  Android drops alarms after a force stop. Ids are the dates (20261116). Nine varied, quiet texts; two days in a
  row never get the same one. None on a day whose norm is already met.
- **The permission is asked only when the player switches reminders on** (Android 13+), never
  at start. Refused: one line says so and points to the calendar file; nothing else changes.
- **Exact time only if allowed.** The app never sends the player to the "Alarms & reminders"
  screen by itself (the plugin's default); it schedules inexact reminders and offers a button
  that opens that screen, with one line explaining the possible hour of delay (the plan).
- **Files in the APK** go through the share sheet: export and the calendar file are written
  to the cache and offered to Files, Drive or the calendar app. Import uses the same file
  input as the web; Capacitor's WebView opens the system picker for it.
- **License texts** (the owner's request for M7): `scripts/licenses.ts` builds
  `public/licenses.txt` before every build from the license files of everything shipped (the
  runtime packages and what they pull in, the engine, the service worker runtime) plus the
  Apache 2.0 text for AndroidX, and "Ещё", "Лицензии" shows it. Same texts are printed once.
  It is cached for offline use; the precache grew to 777 KiB of the 1,200 budget.
- **Debug APK in CI** on every push of a stage branch from m7 on (the plan: "on request";
  a workflow_dispatch trigger exists too, but GitHub offers it only once the file is on
  main). Signed with the runner's throwaway debug key. Built and checked in CI on 2026-11-16:
  2 minutes, a 5.5 MB artifact. Not installed on any device.
- **Release workflow** only on a tag `v*`, and only when all four secrets exist; otherwise it
  says so and builds nothing. The key is decoded into the runner's temp folder and removed;
  no secret is echoed. The certificate's SHA-256 goes into the release notes (the plan).
  Never run: there is no key yet.
- **Progress file format 5** adds the notification switch.
- **Not done in M7:** iOS; Play Store listing; a custom notification icon (the app icon is
  used); deep links from a notification to a screen.

## Independent review of M7 (2026-11-16)

Fixed on `m7`:

- **Reminders could silently stop.** The app compared its plan with the plugin's list of
  pending notifications and scheduled only what was missing. That list is the plugin's own
  record; after a force stop or Samsung's battery management Android has dropped the alarms
  while the record still says "pending", so nothing was scheduled again for up to two
  weeks. The whole plan is now scheduled on every sync.
- **Granting the permission did not schedule anything** when the switch was already on (an
  imported file, a permission taken away and given back), and **allowing exact alarms did
  not change the reminders already scheduled.** The permission and the exact-alarm setting
  are now part of what triggers a sync, and the settings screen forces one.
- **Times no longer read back from the plugin** (Android returns them as text that does not
  parse for some time zone names).
- Reminders use the device's clock, not the app's test clock.
- **Workflows:** the checkout no longer keeps the write token for the build's third-party
  code; the release stops when the tag is not the version in package.json; line breaks in
  the Base64 secret are tolerated; an unsigned APK fails the fingerprint step.
- **versionCode** could collide once a minor or patch number reached 100.
- **The file picker in the APK** accepted only "application/json"; a file that came through a
  messenger would have been greyed out. No type filter there now.
- **Export in the APK** said "saved" when the file was only handed to another app, and a
  failed write showed nothing.
- **`docs/APK-SIGNING.md`:** the key's certificate would have carried the owner's name, in
  every published APK; the command now sets "CN=Chess Trainer". The password prompt was
  described for an old JDK; the tag commands ran in the wrong folder.
- **Debug builds** are signed with a new key in every run, so one cannot be installed over
  another: now said in the instructions and the checklist.
- **Texts of batch 4:** every line and mate checked out; four texts reworded.

Not covered by this review: `scripts/licenses.ts` and a privacy sweep of the Android
resources.

## Exercises from the owner's games (M8a, 2026-11-16/17, autonomous mode)

- **No network, no chess.com API.** The owner downloads PGN from chess.com by hand and opens
  the file or pastes the text. The API and its terms were never checked (an open point since
  the roadmap), and a file needs neither.
- **Nothing personal is kept.** The names in the PGN are used on the import screen only, to
  ask which side the player had (the name that plays in every game is offered), and are gone
  when the run ends. An exercise is a position, two moves, the move that was played, the
  size of the loss and the time it was added: no names, dates, sites or links. An e2e test
  searches the progress file, IndexedDB and localStorage for the names of its made-up game.
  The tests use invented games only; no real game is in the repository.
- **What becomes an exercise.** The engine (the bundled lite build, 30,000 nodes, two lines)
  looks at every move of the player after the first. A position is taken when the played
  move gave up at least 1.5 pawns, the best move is at least 1.2 pawns better than the
  second best (so there is one answer), the player was not already lost by more than 3
  pawns, and the second-best move did not win by more than 5 anyway. Developer's numbers;
  the checklist asks the owner whether the exercises feel right.
- **An exercise is a puzzle of one move** that starts with the opponent's move from the game,
  so it runs through the same drill, hints and review cards as the Lichess puzzles. It is
  due at once (the move was missed in a real game) and then follows FSRS. Up to two come up
  in the daily session as "Позиция из вашей партии."; "Мои партии" has its own practice.
- **The same position is one exercise**: the id is a hash of the position and the best move,
  so importing a game twice adds nothing.
- **The solution comes from a short search** and can be wrong now and then. The screen says
  so, and every exercise can be removed. A deeper check of each kept position is possible
  later (it costs seconds per exercise).
- **Twenty games per run**, so the phone is not busy for minutes; the run can be repeated.
- **Storage.** IndexedDB version 4 adds the store `own`; progress file format 6 carries the
  exercises, each checked on import by playing it through. The export screen now says that
  the file holds positions from the owner's games.
- **Not done:** fetching games from chess.com, the opening or date of a position, longer
  solutions (several moves), a statistic of which kinds of mistakes repeat.

## Known open points

- The Lichess opening explorer API requires OAuth2 (it answers 401), so there is no frequency
  data for opponent mistakes yet.
- Reproducibility of verify across machines: confirmed on 2026-11-13. The manual workflow
  "Verify traps (full, no cache)" searched all 109 positions again on a GitHub Linux runner
  (3 workers) and matched every committed result from the owner's Windows machine.

- **`npm audit` on 2026-11-17 (branch `m8b`, without `--force`): 4 moderate, 0 in what is
  shipped.** `npm audit --omit=dev` finds nothing. The four are `glob` (GHSA-3g3m-2fjr-6pw4),
  `minimatch` (GHSA-g3hv-75wg-m249), `workbox-build` 7.4.1 and `vite-plugin-pwa` 2.0.0, the
  same build-time chain as below; the two low ones (`deepmerge`, `@rollup/plugin-node-resolve`)
  are gone. The only offered fix is `--force`, which would downgrade `workbox-build` to 7.3.0
  (a breaking change). Accepted again; next look before the release APK.
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
