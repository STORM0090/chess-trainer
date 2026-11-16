# Back from autonomous mode: what is here and how to check it

Written for the owner, on the last branch of the chain. Built from 2026-11-14 to 2026-11-16
while the owner was away. **Nothing is merged into `main` and no tag was set**; the site root
still serves M3. Everything below is on stage branches with their own previews.

What was done, in one line each:

- **M4**: Lichess puzzles in nine themes, an entry test of ten puzzles that sets the level,
  hints; the 23 texts of batch 1 with your edits, shown under the lines.
- **M5**: a home screen "Сегодня" with a five-minute session, a soft streak with freezes, the
  daily norm, a calendar reminder file, FSRS repeats for failed puzzles, a monthly backup
  hint; batch 2.
- **M6**: a bot with 13 levels, calibrated by 1,800 self-play games, that loses like a
  beginner (hanging pieces, missed threats), trap practice against it, the ШВУ checklist, a
  short game review; batch 3.
- **M7**: the Android app: a debug APK built in GitHub Actions, a prepared signed release,
  local notifications, files through the share sheet, the full license texts; batch 4.
- **M8** (own games, mates, endgames, principles; batches 5 to 7): **not started**. Depth
  went first, as you asked: every stage above was reviewed by an independent context and its
  findings were fixed before the next one.

## 1. Stages

| Stage | Branch | Preview | Done | Automatic checks | Not checked on a device |
| --- | --- | --- | --- | --- | --- |
| M4 | `m4` | https://storm0090.github.io/chess-trainer/preview/m4/ | Puzzles (1,896 from the Lichess database, CC0), entry test, levels, puzzle hints; batch 1 texts in the app | CI green: typecheck, 200+ unit tests, e2e on a phone screen, verify, privacy | Everything in `docs/QA/M4.md` (you planned to check it after the return) |
| M5 | `m5` | https://storm0090.github.io/chess-trainer/preview/m5/ | Home screen, session, streak and freezes, norm, settings, `.ics`, FSRS for failed puzzles, one new trap a day, backup hint, size budget, offline e2e; batch 2 | CI green, plus a test that walks every day of 2026 in nine time zones | The calendar file in Samsung Calendar; the home screen on the real display |
| M6 | `m6` | https://storm0090.github.io/chess-trainer/preview/m6/ | Bot policy, calibration, 13 levels, games, trap practice, ШВУ checklist, game review; batch 3 | CI green; 1,320 + 480 calibration games on the bundled engine | Heat and battery during games; whether level 1 feels right |
| M7 | `m7` | https://storm0090.github.io/chess-trainer/preview/m7/ (web part) | Capacitor 8 project, debug APK workflow, release workflow (idle without a key), notifications, export through the share sheet, license texts; batch 4 | CI green; the debug APK builds in 2 minutes (5.5 MB) | **Everything about the APK**: install, notifications, Doze, reboot, the share sheet, the file picker |

The checklists are `docs/QA/M4.md` to `docs/QA/M7.md`; the scenario below covers their most
important steps in one go.

## 2. One pass on the S24 Ultra, most important first

Use the **M7 preview** (it contains M4 to M6) in Samsung Internet or Chrome, then the APK.
About 40 minutes. Write a word next to every step that does not match.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open https://storm0090.github.io/chess-trainer/preview/m7/ | "Сегодня" with "Сегодня: ловушка и задачи", "Дней занятий: 0", seven empty circles, "Ваш прогресс", a block "Игра с ботом". Header: Сегодня, Ловушки, Задачи, Ещё. |
| 2 | "Ваш прогресс", "Пройти тест", "Начать тест"; do the ten puzzles honestly. | Puzzles get harder; the result names your level (1 to 5) and the rows per level. |
| 3 | "Сегодня", "Начать": do the whole session. | About six items: a warm-up, two steps of "Дурацкий мат", new puzzles. The bars on top turn green or amber. "Сессия завершена", "Дней занятий: 1", "Подряд: 1 день." |
| 4 | Read the texts under the lines of "Дурацкий мат" and "Защита от детского мата" (trap page, choose variants). | Every variant has its own Russian text with "Проверено по доске." or "По оценке движка." Texts 1, 6 and 13 of batch 1 were corrected after a review (see section 4). |
| 5 | "Сыграть" (bot), level 1, white; play a game to the end. | The bot answers in about a second and plays like a beginner, not randomly. After the game: the result, the next level, "Разбор: главные ошибки". |
| 6 | Press "Разбор". | Up to three of your moves, each with the position and the engine's move as an arrow. |
| 7 | Open "Дурацкий мат" again, "Сыграть с ботом". | The bot opens 1.f3 or 1.g4 along the trap's lines; "Партия по ловушке не меняет уровень бота." at the end. |
| 8 | "Ещё", "Данные", "На день вперёд", then "Сегодня". | A new session "Сегодня: повторение и задачи" (yesterday's trap is due). After it "Подряд: 2 дня." |
| 9 | Airplane mode on; reload; do a puzzle and a trap step. | Everything works offline; the bot works offline once it was used online. |
| 10 | "Ещё", "Настройки": "3 упражнения", time two minutes ahead, "Добавить в календарь". | A file `chess-trainer-reminder.ics`; opening it should offer the calendar. Please note what Samsung does. |
| 11 | "Ещё", "Данные", "Сохранить файл"; then "Вернуть как на устройстве". | A progress file in Downloads (you need it for the APK). |
| 12 | Install the debug APK (`docs/QA/M7.md`, A2), open it, load the progress file. | Same data as in the browser. (A debug APK of a later run cannot be installed over it: uninstall first, after saving a progress file.) |
| 13 | In the APK: "Настройки", switch on "Напоминать каждый день" with a time two minutes ahead; allow notifications; leave the app. | One notification "Chess Trainer" at the time. If a line said it may come up to an hour late, try "Разрешить точное время" first. |
| 14 | In the APK: "Сохранить файл" in "Данные". | The share sheet with the JSON file. |
| 15 | Play three bot games in a row at level 8 or more. | Note how warm the phone gets and how much battery went. |
| 16 | Tomorrow morning: did a reminder come (APK)? Did the calendar event fire (browser)? | Please note the time it arrived. |

**iPad Pro (Safari), shorter:** the M7 preview in landscape: a session, one bot game, the
entry test. The board must fit the height; nothing scrolls sideways.

**Windows (Edge or Chrome), shorter:** the M7 preview: a bot game with the mouse (click-click
and dragging), "Добавить в календарь" (Outlook or Calendar should open the file), "Лицензии".

## 3. Merging and rolling back

The branches build on each other: `m5` contains `m4`, `m6` contains `m5`, `m7` contains
`m6`. Merge them **one by one, in order**, each only after its checklist, and tag each merge
as before. In PowerShell, in the project folder:

```powershell
git checkout main
git pull
git merge --no-ff m4 -m "Merge branch 'm4': puzzles, entry test, batch 1 texts"
git tag v0.5.0-m4
git push origin main v0.5.0-m4
```

Then the same for `m5` (`v0.6.0-m5`), `m6` (`v0.7.0-m6`) and `m7` (`v0.8.0-m7`). Each push
of `main` deploys the site root; wait for the green CI before the next.

**Stopping at a stage:** merge only up to it. The later branches stay as they are; nothing is
lost, and they can be merged later.

**Rolling back a stage after it was merged:**

```powershell
git checkout main
git revert -m 1 <the merge commit of that stage>
git push origin main
```

A revert of an earlier stage also removes what later stages built on it, so roll back from
the last merged stage backwards.

**Taking out only the texts of a batch** (the app then shows the general sentences again and
every test stays green): revert the `content: ...` commits of that batch on its branch before
merging, or on `main` after it:

| Batch | Commits to revert (newest first) |
| --- | --- |
| 1 (stage 0) | `c7ae46b` (texts 1, 6, 13 after the review), `51dd27d` |
| 2 (stage 1) | `be21101` (texts 1, 9 after the review), `f6fbf1d` |
| 3 (stage 2) | `5535d6b` (texts after the review), `3c08b88` |
| 4 (stages 3, 4) | `41ebd07` |

**Rolling back the APK part only:** the web app does not depend on it. Reverting the merge of
`m7` removes the Capacitor packages, `android/`, the two workflows and notifications;
M4 to M6 stay.

## 4. To decide or confirm

Everything is also in `docs/PENDING.md`; the reasons are in `docs/DECISIONS.md`.

**Only you:**

- The **APK signing key** and the four GitHub secrets: `docs/APK-SIGNING.md`. Until then the
  release workflow builds nothing.
- The **appId** `io.github.storm0090.chesstrainer` (permanent after the first release).
- Whether to merge, and which stages; deleting the stage branches afterwards.

**Texts to read** (all with the facts they rest on): `docs/explanations/batch-1.md` (texts
1, 6, 13 changed after a review: only f3 or f6 opens the diagonal), `batch-2.md`,
`batch-3.md`, `batch-4.md`.

**Decisions taken in your absence, worth a look** (defaults you gave are not repeated):

- Navigation: four links at the top, "Сегодня" first; the free board, data, settings,
  diagnostics and licenses under "Ещё". A bottom bar would need the device to judge.
- "Дней занятий" is the big number, the streak the small one; freezes are spent only on a
  gap they can cover whole; a date skipped by a flight east does not break the streak.
- One new trap a day is a hard rule, also on the chain screen.
- Puzzles solved cleanly at once never come back; failed ones get FSRS repeats; misses in
  the entry test do not.
- The bot shows levels 1 to 13 and no human rating (nothing was measured against people);
  one level up after a win, down after two losses; trap games do not move it; unfinished
  games are dropped without a result.
- In the APK: reminders inexact unless you allow exact alarms; Android backup off; no
  service worker.

**What the independent reviews found and what was fixed**: `docs/DECISIONS.md`, sections
"Independent review of M4 and M5", "Independent review of M6", "Independent review of M7".
The M7 review found one thing that only the phone can confirm: after a force stop the app
must schedule its reminders again on the next start (step A5b of `docs/QA/M7.md`).
