# Decisions of M1b to M3 (archived)

Moved here on 2026-11-17 from `docs/DECISIONS.md` to keep that file short. These decisions
still hold unless a later section of `docs/DECISIONS.md` changes them.

## Content and verify (step "M1b content", 2026-11-12)

- **Horizon is two years and more.** The roadmap is built from ladder stages and tactics
  levels, not weeks. Long-term material comes from the Lichess puzzle stream, FSRS reviews,
  trap batches and the owner's own games; see `content/ROADMAP.md`.
- **Trap files hold lines, not a hand-written tree.** `content/traps/<id>.json` lists full
  move texts from move 1 (`"1.e4 e5 2.Nf3 f6? 3.Nxe5"`), each with a tag and an expectation.
  Lines that share a prefix form the tree; the app-side compile step builds it later. Reason:
  30+ traps are readable, diffable and can be pasted into any analysis board.
- **The decisive mistake is marked in the move text** (`?` or `??` on an opponent move of the
  main line). Verify derives setup moves, blow moves and the first blow move from it, so these
  numbers are never typed by hand.
- **Verify parameters (owner's decision):** Stockfish full network from the pinned `stockfish`
  package, 2,000,000 nodes, one thread, 64 MB hash cleared before every search; a win is
  +2.00 or a forced mate. Added by me: a defence holds down to -0.50; a player's mistake must
  cost at least -1.00.
- **Reliability is side-aware.** It compares the evaluation after correct play with the side's
  normal opening balance (White +0.25, Black -0.25). A flat threshold labelled ordinary Black
  openings such as the Queen's Gambit Declined as "risky".
- **Evaluations are cached** in `content/verify-cache.json` by engine, node count, hash size and
  FEN, and the cache is committed. CI replays every line and reads evaluations from the cache;
  positions missing from it are searched. The manual workflow `verify-full.yml` ignores the
  cache and fails on any difference. It can only be started once it is on `main`.
- **Searches run in up to four worker threads.** Each search is independent, so parallelism does
  not change results. The first full run (109 positions) took about four minutes locally.
- **CI fails on a trap that does not verify**, unless the file is marked `"draft": true`.
  Drafts are listed as unverified.
- **The catalogue in `content/ROADMAP.md` is generated** by verify between two markers, so the
  document cannot drift from the trap files. Names without lines live in `content/backlog.json`.
- **Englund Gambit stays first against 1.d4** (owner's decision), labelled "dubious": the
  critical line is about -2.8. Review after 25 of the owner's games that start 1.d4 e5.
- **The Fried Liver is not treated as a forced win.** Its trap lines are the two king retreats
  that lose by force; the correct 7...Ke6 is recorded with its honest evaluation.
- **Defences are trap files of kind `defence`** (`scholars-mate-defence`,
  `blackburne-shilling-defence`): the main line must hold, mistakes must lose.
- **`@types/node` 24.19.2** added as a dev dependency (approved by the owner). Scripts are
  TypeScript run directly by Node 24; `tsconfig.scripts.json` checks them with
  `erasableSyntaxOnly`.

## Owner's decisions on the roadmap (2026-11-12)

- **Stages are data.** Every trap file has `stage` and `stageReason`; no stage is decided in
  code. Stages are reviewed after the entry test and after the first two weeks of the owner's
  real results.
- **Extra puzzle themes** are added as their tactics levels are reached, `quietMove` and
  `sacrifice` first.
- **Opponent move weights are equal.** No Lichess token for now. If the bot stage needs
  frequency data, the owner creates the token and keeps it in a local `.env` outside git.
- **Exercises from the owner's own games stay on the device.** The owner's games and user name
  never enter the repository or any public file. Progress export and import as JSON is required.

## Learning modes (M2, 2026-11-13)

- **`shared/`** holds pure modules used by both the Node scripts and the app (move text
  parsing, trap file types). Imports there use the `.ts` extension because Node needs it.
- **Trap files are bundled** into the main script with `import.meta.glob` (eager). Only
  verified, non-draft traps are loaded. They are compiled into positions with chess.js on
  first use. No extra requests, so everything works offline.
- **Routes.** The start screen is the trap list; the free board moved to `#/board`.
  `#/trap/<id>` is View, `#/trap/<id>/learn` is Learn.
- **Learn queue.** The main line from move 1, then the other lines in the order: more trap
  lines, decline, hold, punish, sound. Each later line starts at the move where it leaves the
  lines before it. Lines that end with the opponent's move are skipped (View shows them).
- **Judging a move.** The move of the line is correct. Another move that gives checkmate is
  accepted. A move that belongs to another line of the same trap is refused without counting
  an error. A move described by a `mistake` line gets a message with the opponent's reply and
  the engine evaluation. Anything else is "wrong".
- **Hint ladder.** Level 1 says what kind of move is needed (the ШВУ scan: check, capture,
  quiet move), level 2 circles the piece, level 3 draws the move. Each wrong move in a
  position raises the level by one; the "Подсказка" button does the same without an error.
  M4 will reuse the ladder for puzzles.
- **Line notes are not shown.** The `note` fields in trap files are in English and mostly
  name the source. The UI shows one general Russian sentence per kind of line plus the engine
  evaluation. Russian per-line explanations would be new content and are not written yet.
- **Nothing is saved in M2** and every trap is open. Storage arrives with M3.
- **The UI addresses the user as "вы"**, as the M1a strings already did.
- **Header.** On screens narrower than 27rem the app title is hidden so three navigation
  links fit on one row.
- **Playwright smoke test.** The owner approved `@playwright/test` 1.65.0 (Apache-2.0) as a
  dev dependency on 2026-11-13. It brings `playwright` and `playwright-core` (same version
  and license) and nothing else.
  - One test, `e2e/smoke.spec.ts`, run with `npm run test:e2e` against the production build
    in `dist`: list of 32 traps, View of the Legal Trap, Learn with one wrong move and then
    the whole main line, the next variant. It also fails on any console error and on
    sideways scrolling.
  - The browser is a 384 x 824 headless Chromium with touch events: the test taps squares
    the way a finger does. This is not a replacement for the phone checklist: it is desktop
    Chromium, not Samsung Internet or the Android WebView.
  - Only the headless shell is installed (`--only-shell`), to keep the download small.
  - The service worker is blocked in the test, so the "ready to work offline" banner cannot
    move the board between two taps. Offline behaviour stays a hand check.
  - In CI the test runs after the build, under the same GitHub Pages base path, and before
    the deploy: a failed smoke test means nothing is published. The trace of a failed run
    is kept as a workflow artifact for 7 days.
  - Texts are written in the test as the user sees them (Russian), not imported from
    `src/i18n`, so a changed UI string must be changed in the test too.

## Progression (M3, 2026-11-14)

- **Dependencies.** The owner approved `idb` 8.0.4 (ISC) and `ts-fsrs` 6.0.0 (MIT) on
  2026-11-14. ts-fsrs brings one package of its own, `@open-spaced-repetition/srs-kit` 1.0.0
  (BSD-3-Clause). All three licenses are compatible with GPL-3.0-or-later.
- **ts-fsrs 6 is not the 5.x API.** The scheduler is created with `await DefaultScheduler()`
  (asynchronous), cards have `dueAt` and `lastReviewAt` as `Date`, and the default model is
  FSRS-7. `src/core/schedule.ts` is the only module that imports the library. It pins
  `version: 'FSRS-7'`, retention 0.9, no learning steps in minutes, no fuzz. The build emits
  small chunks for FSRS 3 to 6 as well (about 20 kB in total); only FSRS-7 is loaded.
- **Backward chain, one player move at a time.** Depth 1 is the last move of the main line
  alone, depth 2 the last two moves of the player, and so on; the last depth starts at move 1.
  The owner's words were "one move before the blow, then two": the chain goes finer than
  that and also splits the blow itself, so a three-move combination is learned as mate in 1,
  then 2, then 3. The screen says whether the step is inside the blow or adds setup moves
  (`blowMoves` from verify). To be confirmed by the owner on the phone.
- **A step counts only when it is clean:** no wrong move and no hint. Otherwise the same step
  is repeated. This is the "help, then do it yourself" rule from the first plan.
- **Deviations are woven into the chain.** After each depth come the lines in which the
  opponent plays another move inside the part of the main line that this depth added. The run
  starts where the depth started, so the deviation is a surprise. A deviation can be skipped;
  a main step cannot. Lines where the player has a second good move, and lines that end with
  the opponent's move, are not chain steps (Learn and View show them).
- **Following another good line.** In chain and review runs a good move that belongs to
  another line with the same moves so far is accepted and the run goes on along that line.
  Learn mode still asks for the move of its own line.
- **Learned, mastered, unlocked.** A trap is *learned* when the last depth is passed. Its
  first review opens the next calendar day (FSRS alone would wait almost five days). It is
  *mastered* after the first review without a wrong move; hints are allowed there. Mastering a
  trap opens the next one in the order of the list (stage, then the `order` field). A trap
  that was started stays open whatever happens to the order. Mastery is not taken away by a later
  failed review.
- **One new trap a day** is not a rule of its own yet: it follows from the next-day review.
  The explicit limit comes with the daily session in M5.
- **Reviews.** One line from move 1: the main line half of the time, otherwise one of the
  deviations, chosen at random. Grade: no errors and no hints is "good", hints only is
  "hard", any wrong move is "again". "Easy" is not used. Reviews open at midnight of the day
  FSRS chose and never on the day of the previous review, so a failed one comes back tomorrow.
- **Learn mode stays** as free practice of all lines in a row. It saves nothing and is closed
  together with the trap. It got the "Пропустить вариант" button.
- **Storage.** IndexedDB database `chess-trainer`, version 1, stores `traps`, `games`,
  `settings`. The whole state is read once before the first render and every change is
  written immediately. If the database cannot be opened the app works from memory and says so
  in a banner; a failed write is reported the same way. After the first write the app asks
  the browser for persistent storage (`navigator.storage.persist()`); nothing depends on the
  answer. `main.tsx` uses top-level `await` for the load.
- **Saved progress per line** is keyed by a hash of the line's moves, not by its position in
  the file, so reordering lines keeps progress and a changed line starts again.
- **Export and import.** One JSON file, `format: 1`, named `chess-trainer-YYYY-MM-DD.json`.
  It holds trap progress, the game log and settings, and nothing that identifies the owner.
  Import checks every field, refuses a damaged or newer file as a whole, and *replaces* the
  data on the device in one transaction. Merging two devices is not supported. Progress for
  trap ids this version does not know is kept.
- **Collection is the trap list.** Every card shows the status (viewed, in progress, learned,
  mastered), a "closed" mark and "worked in a game"; the counter "Освоено N из 32" sits on
  top. A separate grid screen would repeat the list.
- **Game log.** Three outcomes per trap with the time of the tap; nothing about the game.
  The last record can be removed. Doubtful traps show how many records exist out of the 25
  after which the trap should be reconsidered; the app does not decide anything by itself.
- **Navigation.** The third header link is "Данные" (export, import, test clock);
  "Диагностика" is opened from there.
- **Test clock.** "Данные" can move the app's clock forward by whole days so reviews can be
  checked without waiting. It is a setting like any other and is marked on the screen while
  it is on. Dates written while it is on stay shifted.
- **License texts.** `THIRD_PARTY_NOTICES.md` names every shipped package with its license
  and, for the M3 additions, the copyright line. The full texts of the permissive licenses
  (MIT, ISC, BSD) are not copied into the built site. The owner put this into stage M7: a
  generated file with the full texts, linked from the app, before the first APK.
- **Order inside a stage is a field** (`order`, from 1) in every trap file, at the owner's
  request; file names no longer decide. `shared/ladder.ts` sorts by stage, then order, for
  the app and for the ROADMAP catalogue alike. verify requires the field and a unit test
  requires 1, 2, 3 without gaps in every stage. The numbers were proposed by one rule and
  confirmed by the owner on 2026-11-14: shorter blow first, then shorter setup, then a forcing
  first move before a quiet one; a defence after the attacks of its stage.
  - Stage 0: Fool's Mate, Fool's Mate (White), Scholar's Mate, the defence against it.
  - Stage 1: King's Gambit Declined Qh4, Knight Attack on f7, Petrov discovered check,
    Damiano Defence, Blackburne Shilling refutation.
  - Stage 2: Legal Trap, Mortimer Trap, Englund Trap.
  - Stage 3: Blackburne Shilling, Fishing Pole (Exchange).
  - Stage 4: Fishing Pole (Berlin), Fried Liver, Noah's Ark.
  - Stage 5: Caro-Kann smothered mate, Budapest Kieninger, Magnus Smith, Stafford, Owen Greco
    mate, Marshall.
  - Stage 6: Halosar, Siberian, Tarrasch, Sea Cadet, Smith-Morra queen trap, Cambridge
    Springs, QGA b5, Elephant, Lasker.
- **"Я это знаю"** (owner's request: stage 0 would otherwise take days of mates he knows).
  On the page of an open trap that is not learned yet. After a confirmation the trap becomes
  learned without the chain, its first review is tomorrow like for any learned trap, and the
  next trap opens at once. It is "mastered" only after that review goes without a wrong move;
  a failed review brings it back more often but closes nothing. Not offered for closed traps,
  so the ladder cannot be jumped in the middle. It cannot be undone. Saved as `knownAt`;
  files and records written before the field existed read as "not marked".
- **Russian explanations: the owner's rules** (2026-11-14) are in `docs/PLAN.md`: one or two
  sentences for the main line, one phrase for the others, a source mark on every text, claims
  checked by program, batches of at most five traps published as a file before merge.
- **Not done in M3:** the adaptive part beyond the hint ladder (runs are counted per trap but
  the success rate is not used yet), the monthly backup reminder (needs the settings screen of
  M5), an explicit position of a trap inside its stage.
- **M2 phone check.** The owner reported section A as passed on 2026-11-14 with the remark
  field and the three "by feel" answers left as unfilled template text. The merge went ahead
  on the explicit instruction; the three questions are repeated in `docs/QA/M3.md`.

## M3 accepted (2026-11-14)

- The owner reported section A of `docs/QA/M3.md` as passed on the S24 Ultra and confirmed
  the merge. As worded, the report says the ШВУ hints are clear, 8 to 10 variants per trap
  are not too many, and a chain step of one player move is convenient. Nothing was said about
  the 0.65 s pause before the opponent's move; the owner then said to leave it as it is until
  he writes otherwise.
- **Commit rule clarified by the owner:** trailers and authorship signatures are forbidden;
  the file name `CLAUDE.md` in a commit message is not a violation. `CLAUDE.md` says so now.
- Merged into `main` as `v0.4.0-m3`.

## Privacy check (2026-11-14)

- **`npm run check:privacy`** (owner's request) scans every file tracked by git and fails the
  build on a Windows path with a user name (also the Git Bash and WSL spellings), an e-mail
  address that is not a noreply or `example.*` address, or a token-like string (GitHub, "sk-"
  keys, AWS, Google, Slack, Lichess, private key headers). CI runs it right after `npm ci`,
  so nothing is built or published when it fails.
- **Not scanned:** `package-lock.json` and the Stockfish build (`public/engine/`, published
  as `engine/`): they hold other people's addresses and paths. The project's own code in
  `src/engine/` is scanned. Device models are not checked; they are in the documents on
  purpose.
- **The report never prints the match**, only file, line and kind: CI logs of a public
  repository are public.
- **Added on the developer's initiative:** the author and committer address of the checked
  commit must be a noreply address, the same rule `CLAUDE.md` has for history.
- **Limits.** It checks the pushed commit, not every commit between two pushes, and not the
  built site on the `gh-pages` branch. A full scan of all 50 commits on all branches and tags
  was done by hand on 2026-11-14 and found nothing personal.
- **Chat exports** and other files with personal data are not created inside the project
  folder (rule in `CLAUDE.md`). `.claude/` has been git-ignored from the first commit and no
  commit ever touched it.

