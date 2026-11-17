# Progress

**Start here after a limit reset or a new session.** The path is in `docs/PLAN.md`, "Path after
the return"; things only the owner decides are in `docs/PENDING.md`; the hand-over of the
autonomous mode is `docs/RETURN.md`.

Since 2026-11-17 the work is step by step again: every stage ends with a stop and the owner's
"ok", `main` only after the owner's checklist. Branches build on each other (`m5` from `m4`,
and so on); a fix goes on the earliest branch with the problem and is merged forward.

## State

| Stage | Branch | State |
| --- | --- | --- |
| M4 puzzles, entry test, batch 1 texts | `m4` | built, CI green; waits for the owner's pass |
| M5 daily session, streak, settings, `.ics`, FSRS for puzzles, batch 2 | `m5` | built, reviewed, CI green; waits for the owner's pass |
| M6 bot ladder, trap practice, ШВУ checklist, batch 3 | `m6` | built, reviewed, CI green; waits for the owner's pass |
| M7 Capacitor, APK workflows, notifications, license texts, batch 4 | `m7` | built, reviewed, CI green; nothing installed on a device |
| M8a exercises from own games (PGN) | `m8a` | built, CI green; the independent review was never finished |
| M8b batch 5 texts | `m8b` | texts in the trap files (`af71039`), not reviewed |
| M8c basic mates, pawn endgames | none | on hold until the owner decides |

## Next

Step 1 of the path: the storage fix on `m4`, merged forward to `m8b`; fixtures of formats 3 to
5 from the real builds; `npm audit`. Then the owner's pass.

## Log

- 2026-11-14 to 2026-11-17: autonomous mode, M4 to M8a and batch 5 (details in
  `docs/RETURN.md` and `docs/archive/PLAN-autonomous-mode.md`).
- 2026-11-17: the owner is back. `m8a` and `m8b` pushed. Check of the state: all previews and
  the site root share one IndexedDB database (the decision said otherwise). Path revised and
  approved; `docs/DECISIONS.md` shortened (M1b to M3 in `docs/archive/`).

## Working notes

- Every stage closes with: typecheck, unit tests, e2e (phone screen, offline), `verify:check`,
  `check:privacy`, size budget, a QA file. An independent review by a fresh context only for
  logic where a mistake is silent or costly: streak and FSRS, data migrations, notifications,
  the bot, trap texts.
- Explanation texts: `docs/explanations/batch-N.md` is the reviewed text;
  `npm run explain:apply` copies it into the trap files; one commit per batch.
- Engine runs: only changed positions, with the FEN cache.
