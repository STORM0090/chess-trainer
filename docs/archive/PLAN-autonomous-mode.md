# Plan: autonomous mode (archived)

Archived on 2026-11-17 from `docs/PLAN.md`. The owner cancelled these rules on 2026-11-17;
they are kept for the history of M4 to M8a.

## Autonomous mode (from 2026-11-14 until the owner is back)

The owner is away for about two days or longer and gave new rules for that time. They replace
"stop after every stage" and "merge only after the phone checklist"; everything else in
`CLAUDE.md` stays.

- Stages are built one after another without waiting: `m5` from `m4`, `m6` from `m5`, and
  so on. Every branch has a preview and a green CI. Nothing goes into `main`, no tags.
- Dependencies: only the Capacitor packages of M7 are approved in advance. Anything else is
  written into `docs/PENDING.md` and worked around.
- Only the owner decides: the APK signing key and GitHub secrets, a Lichess token, deleting
  branches or tags, force-push, the license, the visibility of the repository, anything that
  touches the owner's data.
- `docs/PROGRESS.md` says where the work is. `docs/RETURN.md` (last branch) is the hand-over.
- Depth before width: a stage is finished completely before the next one starts. Priority:
  M5, M6, M7, then M8.

### Changes to the stage plan

- **M4** is closed without the phone checklist: the owner approved the batch 1 texts with
  edits and gave defaults for the open questions. The checklist is done after the return.
- **M5** adds FSRS for failed puzzles (instead of "on another day"), the size check, the
  offline e2e run, and a check of day boundaries under clock changes. Batch 2.
- **M6**: the bot ladder is calibrated by matches of the bundled engine against itself at
  fixed nodes; the real ranges of its options are read from its own `uci` output. Trap
  practice against the bot and the ШВУ checklist belong to this stage. A short game review is
  optional. Batch 3.
- **M7**: the debug APK is built in GitHub Actions. A `workflow_dispatch` workflow can be
  started only once its file is on `main`, so on the stage branch the same job also runs on
  pushes to that branch; the release workflow is prepared and stays idle without the secrets.
  Notifications are written against the current Capacitor and Android documentation and
  cannot be checked without the phone. Batch 4.
- **M8** is split into branches in order of use: `m8a` exercises from the owner's own games
  (PGN, on the device only), `m8b` basic mates, `m8c` simple endgames, `m8d` opening
  principles; batches 5 to 7 go with them.
- **Moved to after the return:** every check on a real device, the signing key and the
  release build, the 25-game review of the Englund Gambit, new puzzle themes for levels 4 and
  5 (need approval), anything that needs a Lichess token or the chess.com API.

