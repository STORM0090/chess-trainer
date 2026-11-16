# Waiting for the owner

Things that only the owner decides or checks. Nothing here was done on the owner's behalf.

## Checks on real devices

- **M4 phone checklist** (`docs/QA/M4.md`) and its five "by feel" questions. Defaults taken
  until then (owner's message of 2026-11-14): the test stays as it is; the theme name is
  shown in theme mode and hidden in the test and in a mixed session; the level rule of 30
  puzzles at 70% stays; the theme names stay.

- **M5 phone checklist** (`docs/QA/M5.md`). Not checked on any device: the calendar file in
  Samsung Calendar and on iOS, touch behaviour of the new screens, the look of the home
  screen on the real display.

## Texts waiting for a read-through before merge

- Batch 1 (stage 0, 23 lines): approved by the owner on 2026-11-14 with edits; the edits are
  applied. Text 21 got one more sentence from a program check. **Texts 1, 6 and 13 were
  corrected after the independent review of 2026-11-15** (only f3 or f6 opens the diagonal;
  see the end of `docs/explanations/batch-1.md`). Please read them again.

- Batch 2 (stage 1, 26 lines): written in autonomous mode, in the trap files in two commits
  ("content: explanation texts of batch 2..." and "content: batch 2 texts 1 and 9..."). Revert
  both to take the texts out; the app then shows the general sentences again and the tests
  stay green.

- Batch 3 (stage 2, 24 lines): written in autonomous mode, in the trap files as one commit
  ("content: explanation texts of batch 3..."). Revert that commit to take the texts out.

- Batch 4 (stages 3 and 4, 25 lines): in the trap files as one commit ("content:
  explanation texts of batch 4...").

- **M8a** (`docs/QA/M8a.md`): never tried on a real chess.com export. The first import of
  your own games is the real test of the PGN reader and of the rules for what becomes an
  exercise.

## The APK

- **The signing key and the four GitHub secrets**: only the owner, step by step in
  `docs/APK-SIGNING.md`. Until then the release workflow builds nothing.
- **appId `io.github.storm0090.chesstrainer`**: please confirm before the first release; it
  cannot change afterwards without a reinstall.
- **A debug APK cannot be installed over the debug APK of another run** (a new debug key
  every run): uninstall first and move the progress by file. A stable debug key would need a
  secret; say so if you want one.
- **The debug APK was built in CI but never installed.** Everything in `docs/QA/M7.md`
  section A is unchecked: install, notifications, Doze, reboot, Samsung, the share sheet,
  the file picker, the back gesture.

## Decisions to confirm

- **Navigation at the top** with "Сегодня / Ловушки / Задачи / Ещё". A bottom bar is the
  alternative; it needs the device to judge.
- **One new trap a day is a hard rule** on the chain screen, not only in the session.
- **The streak is the small number**, "Дней занятий" the big one.
- **A date skipped by travelling** (sessions less than 36 hours apart) does not break the
  streak.
- **Puzzles solved cleanly at the first try are never repeated**; only failed ones get FSRS
  cards.
- **The bot shows levels 1 to 13 and no human rating**: nothing was measured against people.
- **The bot's level moves by itself**: up after every win, down after two losses in a row.
- **Games against the bot are not saved**; leaving a game drops it without a result, so a
  losing game can be dodged. The alternative is to count leaving after a few moves as a loss.
- **Trap practice does not move the bot level.**
