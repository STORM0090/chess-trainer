# Plan

Approved by the owner on 2026-11-13. It replaces the milestone list in the first message of the
project; `docs/DECISIONS.md` keeps the reasons. Every stage has its own branch, a preview at
`/preview/<branch>/`, a checklist in `docs/QA/M<n>.md`, and ends with a stop until the owner's "ok".

## Stages

| Stage | Goal | What the owner checks by hand on the S24 | Size |
| --- | --- | --- | --- |
| M1a (done) | Scaffold, CI, deploy, offline shell, board, diagnostics | `docs/QA/M1a.md` | |
| M1b (done) | Verified trap content, verify script, two-year roadmap | `docs/QA/M1b-content.md` | |
| M2 (done) | Learning modes: View and Learn on all 32 traps, ШВУ hints, reliability label | `docs/QA/M2.md` | |
| M3 (done) | Progression: backward chain, FSRS reviews, stages and unlocking, collection, game log, export and import | `docs/QA/M3.md` | |
| M4 | Lichess puzzles by theme, entry test of 10 puzzles, hint ladder | Take the test; solve 5 puzzles in three themes with the network off | medium |
| M5 | Daily session, trap of the day, soft streak, settings, `.ics` reminder | A week of sessions; add the calendar reminder | medium |
| M6 | Bot below 800 (Stockfish lite plus a human-error layer), ШВУ checklist | Three games; watch heat and battery | large |
| M7 | Signed APK from GitHub Actions, local notifications | Install, move the progress over, get a notification the next morning | medium |
| M8 | More content: basic mates, simple endgames, opening principles, PGN import, new trap batches | Per batch | open-ended |

Dependencies that need the owner's approval when their stage starts: `@playwright/test` (M2,
the smoke test; approved and added on 2026-11-13), `idb` and `ts-fsrs` (M3; approved and added on
2026-11-14), the Capacitor packages including
`@capacitor/local-notifications`, `@capacitor/filesystem` and `@capacitor/share` (M7), and a JDK
for `keytool` (M7).

## Owner's requests of 2026-11-14

- **Backward chain** ("откат на ход назад", the owner's main idea) is M3 and is built there:
  see "Progression (M3)" in `docs/DECISIONS.md`.
- **"Skip variant" button** in Learn: done in M3. Deviation steps of the chain can be skipped
  too; the main steps of the chain cannot.
- **"Я это знаю" button** on the trap page and **the `order` field** inside a stage: done in
  M3 at the owner's request; see "Progression (M3)" in `docs/DECISIONS.md`. The owner
  confirmed the proposed order on 2026-11-14.
- **Russian explanations for every line.** Approved by the owner on 2026-11-14 with the
  rules below. The split into batches was redone at the owner's request and waits for a last
  look.
  - **Length.** The main line gets one or two sentences: the idea of the trap and why the
    opponent's mistake can be punished. Every other line gets one phrase.
  - **No invention.** A text states only what can be checked. Each text carries a source
    mark: "по доске" (seen in the position), "по оценке движка" (the stored verify result),
    or a link to a listed source.
  - **Concrete claims are checked by program, not from memory:** which piece is pinned or
    attacked, what is won, whether the line ends in mate or in material. chess.js answers the
    questions about the position, the engine result from verify answers the questions about
    the evaluation, and a new fixed-node search is run where the stored one does not answer.
  - **Review before merge.** The texts of a batch are published as one file,
    `docs/explanations/batch-<n>.md` (trap, line, text, source mark, how it was checked), in
    the stage branch. The owner shows it for review; the batch is merged only after that.
  - **Batches:** at most five traps and about 25 lines each, in ladder order.

    | Batch | Traps | Lines | With stage |
    | --- | --- | --- | --- |
    | 1 | Stage 0: Fool's Mate, Fool's Mate (White), Scholar's Mate, its defence | 23 | M4 (which also has the entry test, so only one batch) |
    | 2 | Stage 1: King's Gambit Declined Qh4, Knight Attack on f7, Petrov discovered check, Damiano Defence, Blackburne Shilling refutation | 26 | M5 |
    | 3 | Stage 2: Legal Trap, Mortimer Trap, Englund Trap | 24 | M6 |
    | 4 | Stage 3 and 4: Blackburne Shilling, Fishing Pole (Exchange), Fishing Pole (Berlin), Fried Liver, Noah's Ark | 25 | M7 |
    | 5 | Stage 5: Caro-Kann smothered mate, Budapest Kieninger, Magnus Smith, Stafford, Owen Greco mate | 17 | M8 |
    | 6 | Marshall Trap (stage 5); stage 6: Halosar, Siberian, Tarrasch, Sea Cadet | 15 | M8 |
    | 7 | Stage 6: Smith-Morra queen trap, Cambridge Springs, QGA b5, Elephant, Lasker | 15 | M8 |

  - If the owner's practice gets ahead of the texts, the next batch can be done earlier as
    its own content branch, with the owner's "ok".

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
- **License texts (M7, before the first APK).** The full texts of the MIT, ISC and BSD
  licenses of the shipped packages are generated into the build and linked from the app;
  `THIRD_PARTY_NOTICES.md` only names them today. Owner's request of 2026-11-14.
