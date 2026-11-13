# Plan

Approved by the owner on 2026-11-13. It replaces the milestone list in the first message of the
project; `docs/DECISIONS.md` keeps the reasons. Every stage has its own branch, a preview at
`/preview/<branch>/`, a checklist in `docs/QA/M<n>.md`, and ends with a stop until the owner's "ok".

## Stages

| Stage | Goal | What the owner checks by hand on the S24 | Size |
| --- | --- | --- | --- |
| M1a (done) | Scaffold, CI, deploy, offline shell, board, diagnostics | `docs/QA/M1a.md` | |
| M1b (done) | Verified trap content, verify script, two-year roadmap | `docs/QA/M1b-content.md` | |
| M2 | Learning modes: View and Learn on all 32 traps, ШВУ hints, reliability label | Open a trap, watch it, complete it, make a mistake and get a hint | large |
| M3 | Progression: backward chain, FSRS reviews, stages and unlocking, collection, game log, export and import | Chain a trap, close the app, the stage is still saved; export and import the progress file | large |
| M4 | Lichess puzzles by theme, entry test of 10 puzzles, hint ladder | Take the test; solve 5 puzzles in three themes with the network off | medium |
| M5 | Daily session, trap of the day, soft streak, settings, `.ics` reminder | A week of sessions; add the calendar reminder | medium |
| M6 | Bot below 800 (Stockfish lite plus a human-error layer), ШВУ checklist | Three games; watch heat and battery | large |
| M7 | Signed APK from GitHub Actions, local notifications | Install, move the progress over, get a notification the next morning | medium |
| M8 | More content: basic mates, simple endgames, opening principles, PGN import, new trap batches | Per batch | open-ended |

Dependencies that need the owner's approval when their stage starts: `@playwright/test` (M2,
the smoke test), `idb` and `ts-fsrs` (M3), the Capacitor packages including
`@capacitor/local-notifications`, `@capacitor/filesystem` and `@capacitor/share` (M7), and a JDK
for `keytool` (M7).

## Engagement

- **Collection** (M3). A grid of all traps with three statuses: seen, mastered, worked in a
  game. A counter "mastered N of 32".
- **"It worked in a game" button** (M3). Three outcomes: it worked; the opponent did not fall
  for it; the opponent knew the refutation. The log feeds the Englund review (after 25 games
  that started 1.d4 e5).
- **Trap of the day** (M5). The next unlocked trap; never more than one new trap a day.
- **Session formats** (M5). A trap step, three puzzles, due reviews; from M6 an optional short
  game against the bot.
- **Soft streak** (M5). The daily norm is one puzzle. One freeze is earned per 7 active days,
  at most 2 are stored, and they are spent automatically. The main counter is "days of
  practice in total", which never goes down. No punishments.
- **Adaptive difficulty** (M3, M4). Target success rate 70-80%, a hint ladder, FSRS for reviews.

## Reminders

- Settings screen with the reminder time and the daily norm (M5).
- APK (M7): `@capacitor/local-notifications`, no server. Permission is asked when the user
  switches reminders on (Android 13+). The exact-alarm setting is checked; without it the app
  falls back to inexact notifications and says so in one line. On every launch the app
  schedules 14 days ahead and cancels today's notification once the norm is done. Eight to ten
  varied texts, none of them pressuring.
- PWA, iPad and Windows (M5): a downloadable `.ics` file with a daily repeat.
- No server and no Web Push.
- Not verified yet, to be tested on the S24 in M7: delays in Doze, Samsung "sleeping apps",
  survival of the schedule across a reboot, how Samsung Calendar opens an `.ics` file.
  Scheduled local notifications in a PWA without a server are believed to be unavailable; this
  was not checked.

## Data

- The PWA and the APK store their data separately, so export and import of a JSON file come in
  M3, before the APK. The file holds progress, settings, the game log and the exercises made
  from the owner's games. It never leaves the device unless the owner sends it somewhere.
- A gentle backup reminder once a month and before installing the APK.
- Can be postponed without harm: exact notification time, the bot game inside the daily
  session, exercises from the owner's own games.

## APK signing key

- The owner creates the keystore locally with `keytool` and types the passwords personally.
  Nothing about it is shown in the chat.
- The keystore and its passwords live in GitHub Actions secrets, set by the owner (`gh secret
  set` or the web UI). The workflow builds only on tags and prints no secrets.
- Copies: a password manager and a second offline medium. Losing the key means reinstalling
  the app and losing its data, which is why export comes before the APK.
- The certificate fingerprint is published in the release notes.
