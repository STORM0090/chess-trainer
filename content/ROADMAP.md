# Content roadmap: ladder, seed traps, puzzle themes

**Status: proposal, waiting for the owner's approval (2026-11-11). Nothing here is implemented.**
No trap is `verified` yet. Every line below is unverified until the M1b verify script passes it.

Evaluations in this document are **preliminary**: a scratch run (not the project's verify script)
with Stockfish 19 from the pinned `stockfish` package, fixed node counts, see
[Method](#method-and-limits). They are always given from the **player's** point of view, in pawns:
`+2.0` means the player is two pawns better, `-1.5` means the player is worse.

## 1. What the first results say

| Exercise already tried | Errors | Shape |
| --- | --- | --- |
| Discovered check | 1 | one forcing move |
| Back-rank mate | 1 | one or two forcing moves |
| Elephant Trap | 1 | capture first, queen sacrifice, then a check |
| Légal | 3 | capture first, queen sacrifice, mate with three minor pieces |
| Blackburne | 8 | quiet first move, rook left hanging, four moves |

Five results are too few for statistics, but they point the same way as the owner's own
impression: forcing moves are fine; **a quiet first move** and **a large sacrifice** are what
cost errors, and the cost grows with the number of moves. The ladder is built on exactly that.
In M2 the app stores errors per trap, and the order is re-checked against real data.

## 2. How a trap is measured

Every trap file carries these numbers (they go into the `difficulty` block of the JSON):

- **S, setup moves:** player moves from move 1 up to the opponent's decisive mistake.
  This is the memory load. Backward chaining walks back through them.
- **P, blow moves:** player moves from the mistake to mate or to the capture that wins material.
- **First blow move:** check, capture, or quiet (a threat, a pin).
- **Sacrifice:** none, minor piece, rook, queen.
- **Prerequisites:** Lichess puzzle themes the player should have met before.

Steps are assigned by rule, not by feeling:

| Step | Rule |
| --- | --- |
| 0 | P = 1: a single blow. |
| 1 | P ≥ 2, every blow move is a check or a capture, sacrifice at most a minor piece. |
| 2 | P ≤ 3 with exactly one hard feature: a queen sacrifice **or** a quiet key move. |
| 3 | Two hard features (quiet first move **and** a sacrifice), or P ≥ 4 with a quiet move. |
| 4 | Outside the starting repertoire, or S ≥ 7. |

A trap cannot sit on a step lower than the step that introduces its prerequisite theme.
Inside a step the order is by P, then by S. One exception: `scholars-mate-defence` has three
moves but sits on step 0, because each of them answers a one-move threat, and it is learned
right after the attack it stops.

## 3. The ladder

Puzzle themes are Lichess theme keys, checked against Lichess's `puzzleTheme.xml`.
Rating bands are **starting guesses** on the Lichess puzzle scale, which is not the chess.com
rapid scale. The entry test (M3) and the 70-80% target move them.

| Step | Idea | Traps (in unlock order) | Puzzle themes | Length tags | Rating band |
| --- | --- | --- | --- | --- | --- |
| 0 | One blow | `fools-mate`, `scholars-mate`, `scholars-mate-defence` | `mateIn1`, `hangingPiece` | `oneMove` | 400-700 |
| 1 | Forcing sequence | `knight-attack-f7`, `petrov-damiano`, `damiano-defence` | `fork`, `discoveredAttack`, `backRankMate` | `oneMove`, `short` | 600-900 |
| 2 | One sacrifice or one quiet move | `legal-mate`, `englund-trap` | `pin`, `mateIn2`, `skewer` | `short` | 800-1100 |
| 3 | Quiet first move and a sacrifice | `blackburne-shilling` | `deflection`, `mateIn2`, `discoveredAttack` | `short`, `long` | 1000-1250 |
| 4 | Repertoire extension | `budapest-kieninger` | all nine, mixed | `long` | 1150-1400 |

All nine themes requested for M3 are placed. Each step also keeps serving the themes of the
steps below it as review.

**Unlock rule (as agreed):** the next trap opens when the previous one was completed without
errors and reviewed once; at most one new trap per day. View mode is open for everything.
**Proposed addition:** a trap also waits until each of its prerequisite themes has at least
5 solved puzzles at 70% or better. This only starts working in M3, when puzzles exist.

**70/30 balance.** A daily session has about seven items: one new trap stage, three new puzzles,
and two or three reviews. To stay near 70% tactics, at most one of the reviews is a trap; the
rest are puzzles the player got wrong earlier. That gives 2 trap items out of 7 (29%).

**Entry test (M3, outline):** ten puzzles, two per step band. The starting step is the first
band where at least one of the two is missed.

## 4. Seed traps

Ten traps. M1b builds the four mandatory ones (they are the hardest, which is fine for testing
the mechanics). M2 adds the other six, so steps 0 and 1 exist when progression starts.

| # | id | UI name (RU) | Side | Step | S | P | First blow move | Sacrifice | Reliability | Stage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `fools-mate` | Дурацкий мат | Black | 0 | 1 | 1 | mate | none | solid | M2 |
| 2 | `scholars-mate` | Детский мат | White | 0 | 3 | 1 | mate | none | risky | M2 |
| 3 | `scholars-mate-defence` | Защита от детского мата | Black | 0 | 0 | 3 parries | defence | none | solid | M2 |
| 4 | `knight-attack-f7` | Конь на g5: вилка на f7 | White | 1 | 4 | 2 | capture (fork) | none | solid | M2 |
| 5 | `petrov-damiano` | Русская партия: вскрытый шах | White | 1 | 4 | 2 | check | none | solid | M2 |
| 6 | `damiano-defence` | Защита Дамиано | White | 1 | 2 | 4 | capture | knight | solid | M2 |
| 7 | `legal-mate` | Мат Легаля | White | 2 | 4 | 3 | capture | queen | solid | M1b |
| 8 | `englund-trap` | Гамбит Энглунда: ловушка | Black | 2 | 5 | 3 | quiet (pin) | none | dubious | M1b |
| 9 | `blackburne-shilling` | Шиллинговый гамбит Блэкберна | Black | 3 | 3 | 4 | quiet (double attack) | rook | dubious | M1b |
| 10 | `budapest-kieninger` | Будапештский гамбит: ловушка Кинингера | Black | 4 | 7 | 1 | mate | bishop | risky | M1b |

Russian names are display names for the UI. Names and origins come from the sources listed
per trap; nothing is invented.

**Repertoire fit.** White: 1.e4 and 2.Nf3 with the bishop on c4. Traps 4, 5, 6 and 7 are four
Black replies to the same two moves (2...Nc6 and 3...Nf6, 2...Nf6, 2...f6, 2...d6), so White
learns one setup. Trap 2 (2.Qh5) is the odd one out and is there because it is the owner's
known starting point. Black against 1.e4: 1...e5 (traps 1, 3, 9). Black against 1.d4: the
Englund (trap 8). The Budapest (trap 10) is a second answer to 1.d4, so its practice opens last.

### Reliability label

Shown in the UI for every trap. It is computed from the engine evaluation of the opponent's best
reply, the line where the opponent does **not** fall for it:

| Label | Evaluation for the player if the opponent plays correctly | Meaning |
| --- | --- | --- |
| solid | -0.2 or better | You lose nothing by trying. |
| risky | between -0.2 and -1.0 | Playable, but you are slightly worse if they know it. |
| dubious | worse than -1.0 | Objectively bad. Works against players who do not know it. |

The thresholds are a proposal.

### Line cards

Tags follow the tree format: `trap` (the opponent goes wrong and is punished), `decline` (the
opponent goes into it but bails out), `sound` (the opponent avoids it). "Mate" means the line
was played through with chess.js and ends in checkmate.

#### 1. `fools-mate` (Black, step 0)

- **Main line:** 1.f3 e5 2.g4?? Qh4#. Also 1.g4 e5 2.f3?? Qh4#.
- **trap:** 2.h3? Qh4+ 3.g3 Qxg3# (mate).
- **sound:** 2.e4 `+0.8`, 2.Nc3 `+0.7`, 1.g4 e5 2.Bg2 `+0.8`. Play on; Black is already better
  because White's first move was poor.
- **Honest note:** Wikipedia states that this mate rarely occurs in practice even among
  beginners. It is here as the simplest picture of the weak e1-h4 diagonal, which comes back in
  `damiano-defence`.
- **Sources:** Wikipedia, "Fool's mate" (rev. 1384532120). Lichess opening name:
  "Barnes Opening: Fool's Mate" (A00).

#### 2. `scholars-mate` (White, step 0)

- **Main line:** 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7#. Same mate after 2.Bc4 Nc6 3.Qh5 Nf6??
  and after 2...d6 3.Bc4 Nf6??.
- **trap:** 3...g6 4.Qf3 and now any move that forgets f7, such as 4...Nd4??, allows 5.Qxf7#.
  2...g6?? 3.Qxe5+ Qe7 4.Qxh8 wins a rook (`+5.7`). 2...Ke7?? 3.Qxe5#.
- **decline:** 2...Nf6 3.Qxe5+ Be7. White has won a pawn but is behind in development: `-0.1`.
  Not a win.
- **sound:** 3...g6 4.Qf3 Nf6 `-0.2`; 3...Qe7 `0.0`.
- **Honest note:** Wikipedia: it is easy to parry, and once parried the attacker's position
  usually gets worse. Label: risky.
- **Sources:** Wikipedia, "Scholar's mate" (rev. 1356335449). Lichess name for 2.Qh5:
  "King's Pawn Game: Wayward Queen Attack" (C20).

#### 3. `scholars-mate-defence` (Black, step 0)

This is a defence, not a trap: the player learns to stop trap 2. It is in the seed because,
according to Wikipedia, games ending in scholar's mate are quite common among beginners.

- **Main line:** 1.e4 e5 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nf6. Black is fine: `+0.2`.
  After 5.Ne2 `+0.3`.
- **Accepted alternatives:** 2...d6 (`+0.3`), 3...Qe7. Against 2.Bc4: 2...Nc6 3.Qf3 Nf6 (`0.0`),
  or 2...Bc5 3.Qh5 Qe7 (`+0.1`).
- **Player mistakes shown with their refutation:** 2...g6?? 3.Qxe5+ (`-5.8`, loses the rook);
  3...Nf6?? 4.Qxf7#; 4...any move that leaves f7, 5.Qxf7#.
- **Punishing a greedy attacker (engine only, no written source found):** 5.Qb3? Nd4 6.Bxf7+
  Ke7 7.Qc4 b5 `+5.1`; 5.g4? Nd4 `+5.0`. Keep or drop in M2.
- **Sources:** Wikipedia, "Scholar's mate", section "Prevention" (rev. 1356335449);
  Wikipedia, "Danvers Opening" (rev. 1372017778).

#### 4. `knight-attack-f7` (White, step 1)

- **Main line:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 and Black ignores the threat:
  4...h6?? 5.Nxf7, forking queen and rook (`+6.4`). Same after 4...Be7?? (`+6.0`) and
  4...d6?? (`+5.4`).
- **decline:** 4...Qe7 5.Bxf7+ Kd8 6.Bb3: a pawn up, Black cannot castle (`+2.5`).
- **sound:** 4...d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Bd3: `+0.2`, a normal game.
  4...Bc5 (Traxler Counterattack) 5.Bxf7+ Ke7 6.Bd5: `+0.9`.
- **Fried Liver branch:** 4...d5 5.exd5 Nxd5?! 6.Nxf7 Kxf7 7.Qf3+ Ke6 8.Nc3: `+1.3`, and
  `+0.9` after 8...Nb4 9.O-O c6 10.d4. 7...Kg8?? loses to 8.Bxd5+ (mate in both replies).
- **Honest note:** the Fried Liver itself is **not** a forced win. Wikipedia says the attack has
  not been proven decisive, and the preliminary evaluation agrees. So it does not meet the
  "mate or engine win" rule for a trap's main line. Proposal: the trap is the fork on f7; the
  Fried Liver is a branch with its honest evaluation, and the deep line goes to the M6 backlog.
- **Sources:** Lichess names "Italian Game: Two Knights Defense, Knight Attack" and
  "..., Fried Liver Attack" (C57). Wikipedia, "Fried Liver Attack" (rev. 1378760215).
  The 4...h6, 4...Be7 and 4...d6 branches are engine-checked only.

#### 5. `petrov-damiano` (White, step 1)

- **Main line:** 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2 Nf6?? 5.Nc6+ (discovered check)
  and the queen falls: 5...Qe7 6.Nxe7 `+6.6`, or 5...Be7 6.Nxd8 `+5.5`.
  The same blow follows 4...Nd6?? and 4...Nc5?? (`+6.6` or more).
- **decline:** 4...Qe7 (best) 5.Qxe4 d6 6.d4 dxe5 7.dxe5: `+0.6`, a moderate advantage only.
  4...d5 5.d3 Qe7 6.dxe4 Qxe5 7.exd5: a pawn up, `+1.7`. 4...d6 5.Nxf7 Kxf7 6.Qxe4: `+1.7`.
- **sound:** 3...d6 4.Nf3 Nxe4: the normal Petrov, `+0.4`. 3...Nc6 (Stafford Gambit) 4.Nxc6
  dxc6 5.d3 Bc5 6.Be2: `+2.2`, but 6.Bg5?? loses to 6...Nxe4, so this branch needs care.
- **Sources:** Wikipedia, "Petrov's Defence", section "Damiano Variation" (rev. 1382022050).
  Lichess name: "Petrov's Defense: Damiano Variation" (C42).

#### 6. `damiano-defence` (White, step 1)

- **Main line:** 1.e4 e5 2.Nf3 f6? 3.Nxe5 fxe5? 4.Qh5+ g6 5.Qxe5+ Qe7 6.Qxh8: `+4.4`.
  After 6...Qxe4+ both 7.Kd1 (`+4.4`) and 7.Be2 (`+3.7`) keep the win, so no quiet move is
  required.
- **trap:** 4...Ke7 5.Qxe5+ Kf7 6.Bc4+: `+4.2`. Then 6...d5 7.Bxd5+ Kg6 8.h4 `+3.1`;
  6...Kg6?? leads to mate.
- **decline:** 3...Qe7 (best) 4.Nf3 Qxe4+ 5.Be2: `+2.5`. 4...d5 5.d3 dxe4 6.dxe4: `+2.0`.
- **Player mistake shown:** 4.Qh5+? g6 5.Nxg6 Qxe4+ 6.Be2 Qxg6: `-4.0`.
- **Honest note:** 2...f6 is simply a bad move; White is better whatever Black does next.
- **Sources:** Wikipedia, "Damiano Defence" (rev. 1371784700). Lichess names:
  "King's Pawn Game: Damiano Defense" and "..., Damiano Gambit" (C40).

#### 7. `legal-mate` (White, step 2)

- **Main line (the version cited in most publications):** 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6?
  5.Nxe5 Bxd1?? 6.Bxf7+ Ke7 7.Nd5#. Same mate after 4...h6? and 4...a6?.
- **decline:** 5...dxe5 6.Qxg4: a pawn up, `+2.3`.
- **Second branch, the natural move order from Wikipedia:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3
  Bg4 5.h3 Bh5? 6.Nxe5 Bxd1?? 7.Bxf7+ Ke7 8.Nd5#. Declined: 6...Nxe5 7.Qxh5 Nxc4 8.Qb5+ and
  9.Qxc4, `+2.2`.
- **sound:** 4...Nf6 `+0.5` or 4...Nc6 `+0.6`, then 5.h3. In the second branch 5...Bxf3
  6.Qxf3 `+0.5`.
- **Player mistake shown:** with a black knight on c6 and the bishop still on g4, 5.Nxe5??
  Nxe5 loses a piece (`-4.2`). The app teaches when the sacrifice does **not** work.
- **Origin, from Wikipedia:** named after Sire de Legall; the game against Saint Brie is usually
  dated Paris 1750, but research suggests 1787 and a different, flawed move order.
  Wikipedia now spells the article "Legal Trap" and also gives "Blackburne Trap".
- **Sources:** Wikipedia, "Legal Trap" (rev. 1380541817). Lichess has no name for the trap;
  the positions are "Philidor Defense" (C41) and "Italian Game: Paris Defense" (C50).

#### 8. `englund-trap` (Black, step 2)

- **Main line:** 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Bc3?? Bb4 7.Qd2 Bxc3
  8.Qxc3 Qc1#.
- **trap:** 7.Bxb4 Nxb4 `+6.1`; 8.Nxc3 Qxa1+ `+6.4`. Earlier one-move wins after 4...Qb4+:
  5.c3?? Qxf4 `+5.2`; 5.Nbd2?? Qxf4 `+4.7`; 5.Qd2?? Qxb2 `+6.9`.
  Also 2.Bf4?? exf4 `+6.1`.
- **decline:** 5.Nc3: take the bishop, 5...Qxf4 6.Nd5 Qe4, between `-0.2` and `0.0`.
  (5...Qxb2 instead runs into the sound line below.) Wikipedia calls 5.Nc3 perfectly playable because of 6.Nd5;
  verify has to settle this branch.
- **sound:** 5.Bd2 Qxb2 6.Nc3 Bb4 7.Rb1 Qa3: **`-2.4`**, and `-2.8` after 8.Nd5.
  4.Qd5 (Stockholm Variation): `-0.7`. 4.Nc3 Nxe5: `-1.6`.
  White declines the pawn: 2.d5 Bc5 `+0.1`; 2.e3 exd4 3.exd4 d5 `-0.2`; 2.Nf3 e4 `+0.3`;
  2.e4 exd4 `+0.1`.
- **Honest note:** the position after 2.dxe5 is already `-1.5`, and an opponent who knows 6.Nc3
  gets a nearly winning game. This is worse than the "about one pawn" I gave in the plan.
  Label: dubious. See question 2.
- **Origin, from Wikipedia:** the 2...Nc6, 3...Qe7 line was introduced by Kārlis Bētiņš; the
  opening is named after Fritz Englund, who sponsored a thematic tournament in 1932-33.
- **Sources:** Wikipedia, "Englund Gambit" (rev. 1382025129). Lichess name:
  "Englund Gambit: Main Line" (A40).

#### 9. `blackburne-shilling` (Black, step 3)

- **Main line:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2
  Nf3#.
- **trap:** 6.Nxh8 Qxh1+ 7.Bf1 Qxe4+ 8.Be2 Nxc2+ 9.Kf1 Qh1# (mate); 7.Qe2 Nxe2 `+6.5`;
  5.Ng4 d5 `+4.2`.
- **decline:** Wikipedia gives 5.Bxf7+ as White's best chance after 4...Qg5. The engine
  prefers 5...Kd8 in reply and gives about `+0.7`. The line printed on Wikipedia, 5...Ke7
  6.O-O Qxe5 7.Bxg8 Rxg8, comes out at `-0.6`, and `-1.0` after 8.c3 Nc6 9.d4. Verify has to
  settle which king move the app teaches. The position after 4...Qg5 as a whole is only
  about `+0.5`: falling for 4.Nxe5 does not lose by force.
- **sound:** 4.Nxd4 exd4: `-1.3` (`-0.6` after 5.c3). 4.O-O: `-1.1`. 4.c3 Nxf3+ 5.Qxf3: `-0.6`,
  and Black must still guard f7. The bait move itself: `-1.4`.
- **Honest note:** Wikipedia calls the opening dubious; if White avoids the trap, White has a
  large advantage. Label: dubious.
- **Origin, from Wikipedia:** named after Joseph Henry Blackburne, who reputedly won a shilling
  a game with it; no recorded Blackburne game with this line is known. Also called the
  Kostić Gambit.
- **Sources:** Wikipedia, "Blackburne Shilling Gambit" (rev. 1382027590). Lichess name:
  "Italian Game: Blackburne-Kostić Gambit" (C50).

#### 10. `budapest-kieninger` (Black, step 4)

- **Main line:** 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Bf4 Nc6 5.Nf3 Bb4+ 6.Nbd2 Qe7 7.a3 Ngxe5
  8.axb4?? Nd3#.
- **trap:** 8.Nxe5 Nxe5 9.axb4?? Nd3# and 8.Bxe5 Nxe5 9.axb4?? Nd3# (both mate).
- **sound:** 8.Nxe5 Nxe5 9.e3 Bxd2+ 10.Qxd2: `-0.3`. 7.e3 Ngxe5: `-0.4`.
  6.Nc3 Bxc3+ 7.bxc3 Qe7 8.Qd5: `-0.6`. The gambit position after 3...Ng4: `-0.7`.
- **Honest note:** the trap needs White to play 2.c4 and six more book moves. Wikipedia notes
  that 2.Nf3 avoids the Budapest altogether. It is a second answer to 1.d4, so practice opens
  only after the Englund is learned. Label: risky.
- **Origin, from Wikipedia:** named after Georg Kieninger, who used it in an offhand game
  against Godai in Vienna in 1925.
- **Sources:** Wikipedia, "Budapest Gambit", section "Kieninger Trap" (rev. 1382027140).
  Lichess name of the position: "Indian Defense: Budapest Gambit Accepted, Main Line,
  Rubinstein Variation" (A52). Lichess has no name for the trap itself.

## 5. Backlog for M6

Names below were confirmed to exist on 2026-11-11 as a Wikipedia article and/or a Lichess
opening name. **Their lines are not written and not checked.** Batches of 3-5 are chosen in M6.

| Candidate | Side | Fits the repertoire | Note |
| --- | --- | --- | --- |
| Fried Liver Attack, deep line | White | yes | Preliminary `+0.9` to `+1.5`: an attack, not a forced win. Needs an "attack" outcome type or stays view-only. |
| Lolli Attack | White | yes | Sister line of the Fried Liver (6.d4). |
| Fool's mate, White's version (1.e4 g5 2.d4 f6?? 3.Qh5#) | White | yes | Step 0. From Wikipedia, "Fool's mate". |
| Magnus Smith Trap | White | yes, against the Sicilian with Bc4 | |
| Fishing Pole Trap | Black | yes, against the Ruy Lopez | Preliminary `-1.7` if declined: dubious. |
| Noah's Ark Trap | Black | yes, against the Ruy Lopez | Trapped bishop, quiet pawn moves. |
| Mortimer Trap | Black | yes, against the Ruy Lopez | |
| Traxler Counterattack | Black | yes, against 4.Ng5 | The mirror of trap 4. |
| Stafford Gambit | Black | adds a second reply to 2.Nf3 | Contains a Légal-style mate. |
| Marshall Trap (Petrov) | Black | adds a second reply to 2.Nf3 | |
| Elephant Trap | Black | no, needs 1...d5 | Already passed once by the owner. View-only candidate. |
| Tarrasch Trap, Würzburger Trap, Lasker Trap, Rubinstein Trap, Monticelli Trap, Siberian Trap, Halosar Trap | mixed | no | Outside the starting repertoire. |

## Method and limits

- **Names and origins:** English Wikipedia, read on 2026-11-11; revision ids are given per trap.
  Lichess opening names come from the `lichess-org/chess-openings` data set (CC0), the same
  names the opening explorer shows.
- **The Lichess opening explorer API could not be used.** It answers `401`; the Lichess API
  specification lists OAuth2 for it. So this roadmap has **no frequency data**: how often
  players of this level actually make each mistake is unknown, and the `weight` values that
  drive the bot's deviations cannot be sourced yet. See question 5.
- **Legality:** every line above was replayed with chess.js 1.4.0. All are legal; every line
  marked as mate ends in checkmate.
- **Evaluations:** Stockfish 19 from the pinned `stockfish` 19.0.1 package, one thread.
  Most sound and decline branches: full network, 2,000,000 nodes. Winning branches:
  lite network, 1,000,000 nodes. Rounded to one decimal.
  A few decline branches (for example 6.Qxg4 in `legal-mate`) were checked with the lite
  network only. On the positions checked with both networks the two differed by 0.3 or less
  in most cases and by 0.5 at most (the Fried Liver position after 5...Nxd5).
- **This was a scratch run outside the repository.** It is not the verify script, sets no
  `verified` flag and writes nothing to trap files.

## Questions for the owner

1. **Seed list and order.** Approve the ten traps and the unlock order of section 3?
   Two points to decide: `scholars-mate-defence` is a defence, not a trap, and takes one of the
   ten places; the Fried Liver enters only as a branch of `knight-attack-f7`.
2. **Englund.** Its honest branch is about `-2.4`, not "about one pawn". Keep it as the first
   answer to 1.d4 with the label "dubious", or change the plan? Recommendation: keep it for
   now, because it was chosen for reaching the trap after any second move, and decide again
   when there is frequency data.
3. **Extra puzzle themes.** Add to the nine in M3: `quietMove` and `sacrifice` (the weak spot),
   `attackingF2F7` (traps 2, 4, 7), `defensiveMove` (trap 3), `smotheredMate` (traps 9, 10),
   `discoveredCheck` (trap 5)? Recommendation: yes.
4. **Verify engine.** Use the full Stockfish network in Node for verify (it is already in
   `node_modules` and is not shipped to users) at 2,000,000 nodes, and count a branch as won
   from `+2.0`? Recommendation: yes. The app's bot still uses the lite build.
5. **Frequency data.** The explorer needs a Lichess token. Option A: the owner creates a
   personal token with no scopes and keeps it in a local, git-ignored `.env`; a script fetches
   frequencies in M2. Option B: no frequencies, equal weights. This can wait until M2.
