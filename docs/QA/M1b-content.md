# QA checklist: M1b, content step (roadmap, trap files, verify)

Preview URL: https://storm0090.github.io/chess-trainer/preview/m1b/

## Results

| Check | Status | Date | Notes |
| --- | --- | --- | --- |
| Samsung S24 Ultra (section A) | **Passed** | 2026-11-12 | Checked by the owner. |
| Content review (section B) | **Passed** | 2026-11-12 | ROADMAP read and accepted; the four questions were answered (ROADMAP section 9). |
| iPad Pro and Windows | Pending | | Not blocking. |

Merged into `main` as `v0.2.0-m1b`.

This step adds no screens. The app in the preview is the same as M1a. What changed is the
content behind it: 32 trap files, the verify script and the roadmap. The checks are a short
phone check that nothing broke and a reading check of the content.

## A. Samsung S24 Ultra (two minutes)

| # | Step | Expected |
| --- | --- | --- |
| A1 | Open the preview URL. | The board loads as in M1a. |
| A2 | Make a few moves; open "Диагностика" and run the engine test. | Moves work; "Движок работает." |
| A3 | In "Диагностика" read "Сборка". | It shows `m1b @` and a commit hash. |

## B. Content review (on any device, in the GitHub app or a browser)

Open `content/ROADMAP.md` on the `m1b` branch:
https://github.com/STORM0090/chess-trainer/blob/m1b/content/ROADMAP.md

| # | Step | Expected |
| --- | --- | --- |
| B1 | Read sections 1 to 6. | The two-year plan, the ladder rules, the tactics levels and the growth paths match what you want. Note anything to change. |
| B2 | In section 7 find the four traps you named: Légal, Englund, Blackburne, Budapest, and the Petrov line with Qe2. | Each has side, start moves, idea, correct line, deviations, source links and "Status: verified". The Englund is marked "dubious" with a note. |
| B3 | Pick any two traps and play their "Correct line" on the preview board or on a real board. | Every move is legal and the line ends as the catalogue says (checkmate, or a clearly won position). |
| B4 | Pick one trap you know from elsewhere and compare the line with your own source. | Same moves. If your source differs, send the line: it is checked against verify. |
| B5 | Read section 9 and answer the questions. | |

## C. iPad Pro and Windows

Nothing new to check for this step. The pending M1a checks (sections B and C of `M1a.md`)
still apply and do not block.

## Known limits of this step

- Trap texts for the player (the "why it works" explanations, comments per move) are not
  written yet; each trap has a one-sentence idea in Russian and English.
- There is no frequency data: the Lichess opening explorer needs a token.
- Reproducibility of the engine results: first checked on one machine only. After the merge
  the manual workflow re-ran every position on GitHub (2026-11-13) and matched all results.
