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
  applied. Text 21 got one more sentence from a program check, see `docs/explanations/batch-1.md`.

- Batch 2 (stage 1, 26 lines): written in autonomous mode, in the trap files as one commit
  ("content: explanation texts of batch 2..."). Revert that commit to take the texts out;
  the app then shows the general sentences again and the tests stay green.

## Decisions to confirm

- **Navigation at the top** with "Сегодня / Ловушки / Задачи / Ещё". A bottom bar is the
  alternative; it needs the device to judge.
- **One new trap a day is a hard rule** on the chain screen, not only in the session.
- **The streak is the small number**, "Дней занятий" the big one.
- **A date skipped by travelling** (sessions less than 36 hours apart) does not break the
  streak.
- **Puzzles solved cleanly at the first try are never repeated**; only failed ones get FSRS
  cards.
