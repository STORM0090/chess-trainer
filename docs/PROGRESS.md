# Progress in autonomous mode

The owner is away from 2026-11-14 for about two days or longer and cannot answer. Work goes
on stage after stage (rules: `docs/PLAN.md`, "Autonomous mode"). **After a limit reset or a new
session, start here.** Things only the owner may decide are in `docs/PENDING.md`.

Branches follow each other: `m5` from `m4`, `m6` from `m5`, and so on. Nothing is merged into
`main`, no tags.

## State

| Stage | Branch | State |
| --- | --- | --- |
| M4 puzzles, entry test, batch 1 texts | `m4` | done: CI green, preview published; phone checklist waits for the owner |
| M5 daily session, streak, settings, `.ics`, FSRS for puzzles, batch 2 | `m5` | built; independent review in progress, then push |
| M6 bot ladder, trap practice, ШВУ checklist, batch 3 | `m6` | not started |
| M7 Capacitor, APK workflows, notifications, license texts, batch 4 | `m7` | not started |
| M8 parts: own games (PGN), basic mates, endgames, opening principles, batches 5-7 | `m8a`... | not started |
| `docs/RETURN.md` | last branch | not started |

## Log

- 2026-11-14: autonomous mode started. Plan revised, this file and `docs/PENDING.md` created.
- 2026-11-14: M4 closed. Batch 1 texts edited as the owner asked, written into the trap files
  and shown under the lines. "большой перевес" from +2.0 in the whole app.

- 2026-11-14: M5 built on `m5`: daily log, streak, session, FSRS for puzzles, settings,
  `.ics`, format 3, size check, offline and migration e2e, batch 2 texts.

## Working notes

- Every stage closes with: typecheck, unit tests, e2e (phone screen, offline), `verify:check`,
  `check:privacy`, size budget, an independent review by a fresh context, a QA file.
- Explanation texts: `docs/explanations/batch-N.md` is the reviewed text;
  `npm run explain:apply` copies it into the trap files; one commit per batch.
