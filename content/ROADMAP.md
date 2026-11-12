# Content roadmap

**Status:** the trap catalogue below is verified by `npm run verify`. The ladder rules were
accepted by the owner on 2026-11-12 (section 9).

The horizon is **two years and more**, so the plan is built from ladder stages and tactics
levels that the player moves through at their own speed. Nothing here is tied to weeks.

## 1. Where two years of material comes from

Traps are the hook, not the bulk. With at most one new trap per day, and each trap spread over
several days of backward chaining, the catalogue below lasts for months. The long run rests on
four things that do not run out:

1. **The tactics stream.** Puzzles from the Lichess database (CC0), served by theme and rating
   band. The band rises with the player (section 4). The number of puzzles available per theme
   and band has not been counted yet; `build-puzzles` reports it in M3.
2. **Reviews.** Every trap and every failed puzzle comes back on an FSRS schedule.
3. **Catalogue growth.** New traps are added in batches of 3 to 5 through the same verify
   script. The backlog at the end of the catalogue is the queue.
4. **The player's own games** (section 6): positions where the owner went wrong, found by the
   engine, become exercises in the same format.

Target mix stays 70% tactics and 30% traps. A daily session has about seven items: one new trap
stage, three new puzzles and two or three reviews, at most one of which is a trap.

## 2. What the first results say

| Exercise already tried | Errors | Shape |
| --- | --- | --- |
| Discovered check | 1 | one forcing move |
| Back-rank mate | 1 | one or two forcing moves |
| Elephant Trap | 1 | capture first, queen sacrifice, then a check |
| Légal | 3 | capture first, queen sacrifice, mate with three minor pieces |
| Blackburne | 8 | quiet first move, rook left hanging, four moves |

Five results are too few for statistics, but they agree with the owner's impression: forcing
moves are fine; a **quiet first move** and a **large sacrifice** cost errors, and the cost grows
with the number of moves. From M2 the app stores errors per trap, and the order is re-checked
against real data.

## 3. Trap ladder

Verify measures every main line and writes the numbers into the trap file:

- **S, setup moves:** player moves before the opponent's decisive mistake (the memory load).
- **P, blow moves:** player moves from that mistake to the end of the line.
- **First blow move:** mate, check, capture or quiet.

The decisive mistake is the first opponent move marked `?` or `??` in the main line.
The stage is assigned by rule:

| Stage | Rule | Repertoire |
| --- | --- | --- |
| 0 | P = 1: a single blow. | core |
| 1 | P ≥ 2, the blow starts with a check or a capture, sacrifice at most a minor piece. | core |
| 2 | One hard feature: a queen sacrifice or a quiet first blow move, and P ≤ 3. | core |
| 3 | A quiet move inside a blow of four or more moves, or a quiet first move with a sacrifice. | core |
| 4 | Long setup (S ≥ 5 with deep theory) or an attack without a forced win. | core |
| 5 | A second reply inside the owner's openings ("branch"). | branch |
| 6 | Other openings ("outside"). A collection for later, in any order. | outside |

Defences (how not to fall for a trap) sit on the stage of the trap they answer or lower.
Inside a stage the order is by P, then by S. A trap also waits for its prerequisite puzzle
themes (section 4).

**Repertoire.** Core: White plays 1.e4, 2.Nf3 and the bishop to c4; Black answers 1.e4 with
1...e5 and 1.d4 with the Englund. Branch: the Budapest as a second answer to 1.d4, the Petrov
and Stafford as second replies to 2.Nf3, and White's lines against the Sicilian, the Caro-Kann
and Owen's Defence. Outside: everything that needs a different first move.

**Stages are data.** Each trap file has a `stage` field and a one-sentence `stageReason`; the
code only reads them. The stages are reviewed twice: after the entry test, and after the first two
weeks of the owner's real results.

**Where the known weak spots sit.** Legal (3 errors) is on stage 2. Blackburne (8 errors) is on
stage 3. The Elephant Trap (1 error) is on stage 6 only because it needs 1...d5; by shape it is a
stage 2 trap, like Legal. So the hard shapes start at stage 2, after two stages of forcing lines.

**Unlock rule (as agreed):** the next trap opens when the previous one was completed without
errors and reviewed once; at most one new trap per day. View mode is open for everything.

**Englund Gambit.** It stays the first answer to 1.d4 by the owner's decision, with the label
"dubious": by the engine the critical line is about -2.8 for Black. Review rule: after 25 of the
owner's games that start 1.d4 e5, compare how often a trap line or a one-move win appeared with
how often the opponent played the critical 6.Nc3 line, and decide whether the Budapest replaces
it. The app needs a simple game log for this ("the trap worked" button, stage plan).

## 4. Tactics levels

Theme names are Lichess puzzle theme keys, checked against Lichess's `puzzleTheme.xml`.
Rating bands are on the Lichess puzzle scale, which is not the chess.com rapid scale; they are
starting guesses that the entry test (M3) and the 70-80% target correct. The first three levels
use exactly the nine themes approved for M3. Themes marked `*` are additions that need approval.

| Level | Rating band | New themes | Feeds trap stage |
| --- | --- | --- | --- |
| T0 | 400-700 | `mateIn1`, `hangingPiece` | 0 |
| T1 | 600-900 | `fork`, `backRankMate`, `discoveredAttack` | 1 |
| T2 | 800-1100 | `pin`, `skewer`, `mateIn2`, `deflection` | 2 |
| T3 | 1000-1250 | `attackingF2F7`\*, `sacrifice`\*, `discoveredCheck`\*, `defensiveMove`\* | 2-3 |
| T4 | 1150-1400 | `quietMove`\*, `smotheredMate`\*, `trappedPiece`\* | 3-4 |
| T5 | 1350-1600 | `attraction`\*, `doubleCheck`\*, `capturingDefender`\*, `intermezzo`\* | 4-5 |
| T6 | 1550-1800 | `clearance`\*, `interference`\*, `xRayAttack`\*, `mateIn3`\* | 5-6 |
| T7 | 1750-2000 | `zugzwang`\*, endgame themes\*, long combinations (`long`, `veryLong`) | 6 |

A level is passed when the last 30 puzzles of its band are solved at 70% or better. Each level
keeps serving the themes of the levels below it. `quietMove` and `sacrifice` aim directly at
the weak spot from section 2.

**Entry test (M3, outline):** ten puzzles, two per band from T0 to T4. The starting level is the
first band where at least one of the two is missed.

## 5. Other content tracks

Planned, **not written yet**, sources not chosen. Each becomes its own stage (see the stage
plan) and uses the same exercise format.

| Track | Content | Status |
| --- | --- | --- |
| Basic mates | Queen and king, rook and king, two rooks ("ladder") | planned, no content |
| Simple endgames | The square of the pawn, opposition, king and pawn against king | planned, no content |
| Opening principles | Centre, development, king safety, as short lessons with a checklist | planned, no content |

## 6. How the content grows

One exercise format (a start position, the player's side, a tree of moves with tags) serves
every source. A new source is one adapter.

| Source | How | Status |
| --- | --- | --- |
| Trap files | `content/traps/*.json`, checked by verify, added in batches from the backlog | working |
| Lichess puzzles | A Node script filters `lichess_db_puzzle.csv` (CC0) by theme and rating; wider bands and new themes are a re-run | M3 |
| The owner's games from chess.com | Download the games as PGN, run the engine over them, keep positions where the evaluation dropped sharply and one move was clearly best | later; the chess.com API and its terms have not been checked yet |
| PGN import | Paste or open a PGN, replay it with chess.js, turn a chosen position into an exercise | later |

Exercises made from the owner's own games are personal data. They stay on the device and are
never committed to the public repository (section 9).

## 7. Trap catalogue

<!-- catalog:start -->

_This section is generated by `npm run verify` from `content/traps/*.json`. Do not edit it by hand._

**32 traps with written lines:** 32 verified, 0 failed, 0 unverified drafts. **145 lines:** 145 pass. **9 more names** are in the backlog without lines (unverified).

Evaluations are from the player's point of view, in pawns. "decline": the opponent walks in and bails out. "sound": the opponent avoids it.

### Stage overview

The stage of a trap is the `stage` field of its file. Moving a trap is a data change.

| Trap | Stage | Why |
| --- | --- | --- |
| Fool's Mate (`fools-mate`) | 0 | One move: the queen mates on h4. |
| Fool's Mate, White's version (`fools-mate-white`) | 0 | One move: the queen mates on h5. |
| Scholar's Mate (`scholars-mate`) | 0 | One blow on f7 after three setup moves. |
| Scholar's Mate: the defence (`scholars-mate-defence`) | 0 | Each move answers a one-move threat; learned right after the attack it stops. |
| Blackburne Shilling Gambit: the refutation (`blackburne-shilling-defence`) | 1 | A single safe choice: trade knights instead of taking on e5. |
| Damiano Defence (`damiano-defence`) | 1 | Four moves, all checks and captures, with a knight sacrifice. |
| King's Gambit Declined: the check on h4 (`kings-gambit-declined-qh4`) | 1 | Two forcing moves: a check, then mate or the rook. |
| Knight Attack: the fork on f7 (`knight-attack-f7`) | 1 | One capture that forks queen and rook; needs the fork theme first. |
| Petrov's Defence: the discovered check (`petrov-damiano`) | 1 | Two forcing moves: a discovered check wins the queen. |
| Englund Gambit: the trap (`englund-trap`) | 2 | The key move is a quiet pin (Bb4) before the mate. |
| Legal Trap (`legal-mate`) | 2 | A queen sacrifice, then two forcing moves to mate. |
| Mortimer Trap (`mortimer-trap`) | 2 | The key move is quiet (c6); the win itself is a simple fork. |
| Blackburne Shilling Gambit (`blackburne-shilling`) | 3 | Quiet first move (Qg5), a rook left hanging, four moves. |
| Fishing Pole Trap, Exchange Variation (`fishing-pole-exchange`) | 3 | Five moves with two quiet ones (Qh4, g3) and a piece left hanging. |
| Fishing Pole Trap, Berlin Defence (`fishing-pole-berlin`) | 4 | Same idea as the Exchange version, but the setup itself is dubious. |
| Fried Liver Attack (`fried-liver`) | 4 | Seven setup moves and an attack that is not a forced win. |
| Noah's Ark Trap (`noahs-ark`) | 4 | Seven setup moves; the win comes from quiet pawn moves. |
| Budapest Gambit: Kieninger Trap (`budapest-kieninger`) | 5 | A second answer to 1.d4; seven setup moves before a one-move mate. |
| Caro-Kann: the smothered mate on d6 (`caro-kann-smothered`) | 5 | Only against the Caro-Kann with 4...Nd7; a one-move mate after five setup moves. |
| Magnus Smith Trap (`magnus-smith-trap`) | 5 | Needs the Open Sicilian with 6.Bc4 as White; eight setup moves. |
| Marshall Trap (`marshall-trap`) | 5 | A second reply to 2.Nf3; nine setup moves and a six-move combination. |
| Owen's Defence: Greco's mate (`owen-greco-mate`) | 5 | Only against Owen's Defence; rook and queen are given up before the mate. |
| Stafford Gambit (`stafford-gambit`) | 5 | A second reply to 2.Nf3; a queen sacrifice and a two-bishop mate. |
| Cambridge Springs Defense: the Bd3 trap (`cambridge-springs-trap`) | 6 | Needs 1...d5 as Black; eight setup moves. |
| Elephant Trap (`elephant-trap`) | 6 | Needs 1...d5 as Black. By shape it would be stage 2: capture first, queen sacrifice. |
| Halosar Trap (`halosar-trap`) | 6 | Needs 1.d4 and the Blackmar-Diemer Gambit as White. |
| Lasker Trap (`lasker-trap`) | 6 | Needs the Albin Countergambit as Black; an underpromotion. |
| Queen's Gambit Accepted: the greedy b5 (`qga-b5-trap`) | 6 | Needs 1.d4 as White. |
| Sea-Cadet Mate (`sea-cadet-mate`) | 6 | Needs the Goring Gambit as White; the Legal pattern again. |
| Siberian Trap (`siberian-trap`) | 6 | Needs the Sicilian as Black. |
| Smith-Morra Gambit: the queen trap (`smith-morra-queen-trap`) | 6 | Needs the Smith-Morra Gambit as White. |
| Tarrasch Trap (Open Defence) (`tarrasch-trap`) | 6 | Needs the Ruy Lopez as White; eleven setup moves. |

### Stage 0

#### 1. Fool's Mate · Дурацкий мат (`fools-mate`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.f3 e5
- **Idea:** After f3 and g4 the e1-h4 diagonal is open and the queen mates at once.
- **Correct line:** 2.g4?? Qh4# (checkmate)
- **If the opponent deviates:** 2.e4 (sound, +0.8); 1.g4 e5 2.f3?? Qh4# (trap, checkmate)
- **Note:** Wikipedia: this mate rarely occurs in practice, even among beginners. It is here as the simplest picture of the weak e1-h4 diagonal.
- **Source:** [Wikipedia: Fool's mate (revision 1384532120)](https://en.wikipedia.org/w/index.php?title=Fool's_mate&oldid=1384532120); [Lichess opening name: Barnes Opening: Fool's Mate (A00)](https://github.com/lichess-org/chess-openings)

#### 2. Fool's Mate, White's version · Дурацкий мат за белых (`fools-mate-white`)

- **Side:** White · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 g5 2.d4
- **Idea:** Black has pushed the f- and g-pawns, so the queen mates from h5.
- **Correct line:** 2...f6?? 3.Qh5# (checkmate)
- **If the opponent deviates:** 2...h6 (sound, +2.1); 1...f6 2.d4 g5?? 3.Qh5# (trap, checkmate)
- **Source:** [Wikipedia: Fool's mate (revision 1384532120)](https://en.wikipedia.org/w/index.php?title=Fool's_mate&oldid=1384532120); [Lichess opening name: Borg Defense (B00)](https://github.com/lichess-org/chess-openings)

#### 3. Scholar's Mate · Детский мат (`scholars-mate`)

- **Side:** White · **Kind:** trap · **Repertoire:** core · **Reliability:** risky · **Status:** verified
- **Start:** 1.e4 e5 2.Qh5 Nc6 3.Bc4
- **Idea:** Queen and bishop attack f7 together, and only the king defends it.
- **Correct line:** 3...Nf6?? 4.Qxf7# (checkmate)
- **If the opponent deviates:** 3...g6 4.Qf3 Nf6 (sound, -0.2); 2...Nf6 3.Qxe5+ Be7 (decline, -0.1)
- **Note:** Wikipedia: easy to parry, and once parried the attacker's position usually gets worse.
- **Source:** [Wikipedia: Scholar's mate (revision 1356335449)](https://en.wikipedia.org/w/index.php?title=Scholar's_mate&oldid=1356335449); [Lichess opening name: King's Pawn Game: Wayward Queen Attack (C20)](https://github.com/lichess-org/chess-openings)

#### 4. Scholar's Mate: the defence · Защита от детского мата (`scholars-mate-defence`)

- **Side:** Black · **Kind:** defence · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nf6
- **Idea:** First guard e5 with the knight, then block f7 with g6 and Nf6.
- **Correct line:** 1.e4 e5 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nf6 (+0.2)
- **If the opponent deviates:** 5.Qb3? Nd4 6.Bxf7+ Ke7 7.Qc4 b5 (punish, +5.9); 2...g6?? 3.Qxe5+ (mistake, -7.3)
- **Note:** A defence, not a trap. Wikipedia: games ending in scholar's mate are quite common among beginners.
- **Source:** [Wikipedia: Scholar's mate (revision 1356335449)](https://en.wikipedia.org/w/index.php?title=Scholar's_mate&oldid=1356335449); [Wikipedia: Danvers Opening (revision 1372017778)](https://en.wikipedia.org/w/index.php?title=Danvers_Opening&oldid=1372017778)

### Stage 1

#### 5. Blackburne Shilling Gambit: the refutation · Шиллинговый гамбит: как не попасться (`blackburne-shilling-defence`)

- **Side:** White · **Kind:** defence · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxd4 exd4 5.O-O
- **Idea:** Do not take on e5: trade the knight on d4 and keep the better game.
- **Correct line:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxd4 exd4 5.O-O (+1.3)
- **If the opponent deviates:** 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3# (mistake, the player is checkmated); 4.c3 Nxf3+ 5.Qxf3 (hold, +0.6)
- **Note:** The mirror of blackburne-shilling: the same opening from White's side.
- **Source:** [Wikipedia: Blackburne Shilling Gambit (revision 1382027590)](https://en.wikipedia.org/w/index.php?title=Blackburne_Shilling_Gambit&oldid=1382027590); [Lichess opening name: Italian Game: Blackburne-Kostić Gambit (C50)](https://github.com/lichess-org/chess-openings)

#### 6. Damiano Defence · Защита Дамиано (`damiano-defence`)

- **Side:** White · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3
- **Idea:** The move f6 exposed the king: a knight sacrifice, a check from h5, and the queen collects the rook.
- **Correct line:** 2...f6? 3.Nxe5 fxe5? 4.Qh5+ g6 5.Qxe5+ Qe7 6.Qxh8 (+5.6)
- **If the opponent deviates:** 3...Qe7 4.Nf3 Qxe4+ 5.Be2 (decline, +2.5); 4...Ke7 5.Qxe5+ Kf7 6.Bc4+ d5 7.Bxd5+ Kg6 8.h4 (trap, +4.3)
- **Source:** [Wikipedia: Damiano Defence (revision 1371784700)](https://en.wikipedia.org/w/index.php?title=Damiano_Defence&oldid=1371784700); [Lichess opening name: King's Pawn Game: Damiano Defense, Damiano Gambit (C40)](https://github.com/lichess-org/chess-openings)

#### 7. King's Gambit Declined: the check on h4 · Отказанный королевский гамбит: шах с h4 (`kings-gambit-declined-qh4`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.f4 Bc5
- **Idea:** White took on e5 and opened the diagonal: the check on h4 mates or wins the rook.
- **Correct line:** 3.fxe5?? Qh4+ 4.Ke2 Qxe4# (checkmate)
- **If the opponent deviates:** 3.Nf3 d6 (sound, -0.3); 4.g3 Qxe4+ 5.Qe2 Qxh1 (trap, +5.0)
- **Note:** The opening name and the 2...Bc5 3.Nf3 d6 main line are from the sources. The 3.fxe5 punishment is engine-checked only.
- **Source:** [Wikipedia: King's Gambit (revision 1382023287)](https://en.wikipedia.org/w/index.php?title=King's_Gambit&oldid=1382023287); [Lichess opening name: King's Gambit Declined: Classical Variation (C30)](https://github.com/lichess-org/chess-openings)

#### 8. Knight Attack: the fork on f7 · Конь на g5: вилка на f7 (`knight-attack-f7`)

- **Side:** White · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5
- **Idea:** Knight and bishop both hit f7; if Black ignores it, the knight takes and forks queen and rook.
- **Correct line:** 4...h6?? 5.Nxf7 Qe7 6.Nxh8 (+7.4)
- **If the opponent deviates:** 4...d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Bd3 (sound, +0.2); 4...Qe7 5.Bxf7+ Kd8 6.Bb3 (decline, +2.5)
- **Note:** The 4...h6, 4...Be7 and 4...d6 punishments are engine-checked only.
- **Source:** [Lichess opening name: Italian Game: Two Knights Defense, Knight Attack (C57)](https://github.com/lichess-org/chess-openings); [Wikipedia: Two Knights Defense (revision 1381945263)](https://en.wikipedia.org/w/index.php?title=Two_Knights_Defense&oldid=1381945263)

#### 9. Petrov's Defence: the discovered check · Русская партия: вскрытый шах (`petrov-damiano`)

- **Side:** White · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2
- **Idea:** The knight leaves the e-file with check from the queen and takes the black queen.
- **Correct line:** 4...Nf6?? 5.Nc6+ Qe7 6.Nxe7 Bxe7 (+8.0)
- **If the opponent deviates:** 3...d6 4.Nf3 Nxe4 (sound, +0.4); 4...Qe7 5.Qxe4 d6 6.d4 dxe5 7.dxe5 (decline, +0.6)
- **Source:** [Wikipedia: Petrov's Defence (revision 1382022050)](https://en.wikipedia.org/w/index.php?title=Petrov's_Defence&oldid=1382022050); [Lichess opening name: Petrov's Defense: Damiano Variation (C42)](https://github.com/lichess-org/chess-openings)

### Stage 2

#### 10. Englund Gambit: the trap · Гамбит Энглунда: ловушка (`englund-trap`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** dubious · **Status:** verified
- **Start:** 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2
- **Idea:** A check on b4 forks b2; if the bishop goes to c3 it is pinned and traded, and the queen mates on c1.
- **Correct line:** 6.Bc3?? Bb4 7.Qd2 Bxc3 8.Qxc3 Qc1# (checkmate)
- **If the opponent deviates:** 6.Nc3 Bb4 7.Rb1 Qa3 8.Nd5 (sound, -2.8); 5.Nc3 Qxf4 6.Nd5 Qe4 (decline, -0.2)
- **Note:** Objectively weak by the engine: see the "sound" lines. Kept as the first answer to 1.d4 by the owner's decision. Review rule: after 25 of the owner's games that start 1.d4 e5, compare how often a trap line or a one-move win appeared with how often the critical 6.Nc3 line appeared, and decide whether the Budapest replaces it. The 2...Nc6, 3...Qe7 line was introduced by Kārlis Bētiņš; the opening is named after Fritz Englund.
- **Source:** [Wikipedia: Englund Gambit (revision 1382025129)](https://en.wikipedia.org/w/index.php?title=Englund_Gambit&oldid=1382025129); [Lichess opening name: Englund Gambit: Main Line (A40)](https://github.com/lichess-org/chess-openings)

#### 11. Legal Trap · Мат Легаля (`legal-mate`)

- **Side:** White · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3
- **Idea:** The pinned knight moves and offers the queen, and three minor pieces mate the king.
- **Correct line:** 4...g6? 5.Nxe5 Bxd1?? 6.Bxf7+ Ke7 7.Nd5# (checkmate)
- **If the opponent deviates:** 4...Nf6 5.h3 (sound, +0.4); 5...dxe5 6.Qxg4 (decline, +2.4)
- **Note:** Named after Sire de Legall. The game against Saint Brie is usually dated Paris 1750; Wikipedia reports research pointing to 1787 and a different, flawed move order.
- **Source:** [Wikipedia: Legal Trap (revision 1380541817)](https://en.wikipedia.org/w/index.php?title=Legal_Trap&oldid=1380541817); [Lichess opening name: Philidor Defense (C41)](https://github.com/lichess-org/chess-openings); [Lichess opening name: Italian Game: Paris Defense (C50)](https://github.com/lichess-org/chess-openings)

#### 12. Mortimer Trap · Ловушка Мортимера (`mortimer-trap`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** risky · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7?!
- **Idea:** White took the e5-pawn; the c6-pawn hits the bishop, and a queen check from a5 picks up the knight.
- **Correct line:** 5.Nxe5? c6 6.Ba4?? Qa5+ 7.Nc3 Qxe5 (+3.0)
- **If the opponent deviates:** 5.Bc4 c6 6.Nc3 Ng6 (sound, -0.7); 6.Nc4 Ng6 7.Ba4 b5 (decline, +3.4)
- **Note:** Named after James Mortimer. Wikipedia: Black deliberately plays an inferior move to set it.
- **Source:** [Wikipedia: Ruy Lopez, Mortimer Trap (revision 1356337121)](https://en.wikipedia.org/w/index.php?title=Ruy_Lopez%2C_Mortimer_Trap&oldid=1356337121); [Lichess opening name: Ruy Lopez: Berlin Defense, Anti-Berlin Variation, Mortimer Trap (C65)](https://github.com/lichess-org/chess-openings)

### Stage 3

#### 13. Blackburne Shilling Gambit · Шиллинговый гамбит Блэкберна (`blackburne-shilling`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** dubious · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?!
- **Idea:** White grabs the e5-pawn, the queen on g5 hits the knight and g2, and the knight mates on f3.
- **Correct line:** 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3# (checkmate)
- **If the opponent deviates:** 4.Nxd4 exd4 5.O-O (sound, -1.3); 5.Bxf7+ Kd8 6.O-O Qxe5 (decline, +0.7)
- **Note:** Named after Joseph Henry Blackburne, who reputedly won a shilling a game with it; no recorded Blackburne game with this line is known. Also called the Kostić Gambit. Wikipedia calls the opening dubious.
- **Source:** [Wikipedia: Blackburne Shilling Gambit (revision 1382027590)](https://en.wikipedia.org/w/index.php?title=Blackburne_Shilling_Gambit&oldid=1382027590); [Lichess opening name: Italian Game: Blackburne-Kostić Gambit (C50)](https://github.com/lichess-org/chess-openings)

#### 14. Fishing Pole Trap, Exchange Variation · Удочка в разменном варианте (`fishing-pole-exchange`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O Bg4 6.h3 h5
- **Idea:** The bishop on g4 is the bait: if White takes, the h-file opens and queen and rook mate.
- **Correct line:** 7.hxg4?? hxg4 8.Nxe5 Qh4 9.f4 g3 10.Qh5 Rxh5 11.Rf3 Qh1# (checkmate)
- **If the opponent deviates:** 7.d3 (sound, +0.0); 8.Nh2 Qh4 (trap, +8.3)
- **Source:** [Wikipedia: Fishing Pole Trap (revision 1377229184)](https://en.wikipedia.org/w/index.php?title=Fishing_Pole_Trap&oldid=1377229184); [Lichess opening name: Ruy Lopez: Exchange Variation (C68)](https://github.com/lichess-org/chess-openings)

### Stage 4

#### 15. Fishing Pole Trap, Berlin Defence · Удочка в берлинской защите (`fishing-pole-berlin`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** dubious · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Ng4 5.h3 h5
- **Idea:** The knight on g4 is the bait behind the h5-pawn: taking it opens the h-file for mate.
- **Correct line:** 6.hxg4?? hxg4 7.Ne1 Qh4 (forced mate in 3)
- **If the opponent deviates:** 6.d3 (sound, -1.7); 8.f4 g3 9.Nf3 Qh1# (trap, checkmate)
- **Source:** [Wikipedia: Fishing Pole Trap (revision 1377229184)](https://en.wikipedia.org/w/index.php?title=Fishing_Pole_Trap&oldid=1377229184); [Lichess opening name: Ruy Lopez: Berlin Defense, Fishing Pole Variation (C65)](https://github.com/lichess-org/chess-openings)

#### 16. Fried Liver Attack · Атака жареной печени (`fried-liver`)

- **Side:** White · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5?! 6.Nxf7 Kxf7 7.Qf3+
- **Idea:** The knight is sacrificed on f7, the king comes out, and the pin on d5 decides if the king steps back.
- **Correct line:** 7...Kg8?? 8.Bxd5+ Qxd5 9.Qxd5+ Be6 10.Qxe6# (checkmate)
- **If the opponent deviates:** 5...Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Bd3 (sound, +0.2); 7...Ke6 8.Nc3 Nb4 9.O-O c6 10.d4 (decline, +0.9)
- **Note:** Honest status: after the correct 7...Ke6 this is an attack, not a forced win. Only the 7...Kg8 and 7...Ke8 errors lose by force.
- **Source:** [Wikipedia: Fried Liver Attack (revision 1378760215)](https://en.wikipedia.org/w/index.php?title=Fried_Liver_Attack&oldid=1378760215); [Lichess opening name: Italian Game: Two Knights Defense, Fried Liver Attack (C57)](https://github.com/lichess-org/chess-openings)

#### 17. Noah's Ark Trap · Ноев ковчег (`noahs-ark`)

- **Side:** Black · **Kind:** trap · **Repertoire:** core · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.d4 b5 6.Bb3 Nxd4 7.Nxd4 exd4
- **Idea:** The white queen took on d4, and the pawns on a6, b5, c5 and c4 lock the bishop in on b3.
- **Correct line:** 8.Qxd4?? c5 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4 (+4.7)
- **If the opponent deviates:** 8.Bd5 (sound, +0.1); 5.c3 (sound, -0.3)
- **Note:** Steiner-Capablanca, Budapest 1929, went this way. The origin of the name is uncertain.
- **Source:** [Wikipedia: Ruy Lopez, Noah's Ark Trap (revision 1356337143)](https://en.wikipedia.org/w/index.php?title=Ruy_Lopez%2C_Noah's_Ark_Trap&oldid=1356337143); [Lichess opening name: Ruy Lopez: Noah's Ark Trap (C71)](https://github.com/lichess-org/chess-openings)

### Stage 5

#### 18. Budapest Gambit: Kieninger Trap · Будапештский гамбит: ловушка Кинингера (`budapest-kieninger`)

- **Side:** Black · **Kind:** trap · **Repertoire:** branch · **Reliability:** risky · **Status:** verified
- **Start:** 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Bf4 Nc6 5.Nf3 Bb4+ 6.Nbd2 Qe7 7.a3 Ngxe5
- **Idea:** The knight takes on e5 and leaves the bishop hanging: taking the bishop allows a knight mate on d3.
- **Correct line:** 8.axb4?? Nd3# (checkmate)
- **If the opponent deviates:** 8.Nxe5 Nxe5 9.e3 Bxd2+ 10.Qxd2 (sound, -0.3); 8.Nxe5 Nxe5 9.axb4?? Nd3# (trap, checkmate)
- **Note:** Named after Georg Kieninger (offhand game against Godai, Vienna 1925). Needs 2.c4; Wikipedia notes that 2.Nf3 avoids the Budapest. A second answer to 1.d4, so practice opens after the Englund.
- **Source:** [Wikipedia: Budapest Gambit (revision 1382027140)](https://en.wikipedia.org/w/index.php?title=Budapest_Gambit&oldid=1382027140); [Lichess opening name: Indian Defense: Budapest Gambit Accepted, Main Line, Rubinstein Variation (A52)](https://github.com/lichess-org/chess-openings)

#### 19. Caro-Kann: the smothered mate on d6 · Каро-Канн: спёртый мат на d6 (`caro-kann-smothered`)

- **Side:** White · **Kind:** trap · **Repertoire:** branch · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Qe2
- **Idea:** The queen on e2 pins the e7-pawn, so the knight mates from d6.
- **Correct line:** 5...Ngf6?? 6.Nd6# (checkmate)
- **If the opponent deviates:** 5...Ndf6 (sound, +0.2)
- **Source:** [Wikipedia: Caro–Kann Defence (revision 1381151588)](https://en.wikipedia.org/w/index.php?title=Caro%E2%80%93Kann_Defence&oldid=1381151588); [Wikipedia: Smothered mate (revision 1356335772)](https://en.wikipedia.org/w/index.php?title=Smothered_mate&oldid=1356335772)

#### 20. Magnus Smith Trap · Ловушка Магнуса Смита (`magnus-smith-trap`)

- **Side:** White · **Kind:** trap · **Repertoire:** branch · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bc4 g6?! 7.Nxc6 bxc6 8.e5
- **Idea:** The e5-pawn forces a capture, and the bishop sacrifice on f7 pulls the king away from the queen.
- **Correct line:** 8...dxe5?? 9.Bxf7+ Kxf7 10.Qxd8 (+8.2)
- **If the opponent deviates:** 6...e6 (sound, +0.3); 8...Ng4 9.Bf4 (decline, +0.5)
- **Note:** Needs the Open Sicilian with 6.Bc4 as White. Wikipedia quotes Edward Winter: the name is probably a misnomer.
- **Source:** [Wikipedia: Sicilian Defence, Magnus Smith Trap (revision 1380207873)](https://en.wikipedia.org/w/index.php?title=Sicilian_Defence%2C_Magnus_Smith_Trap&oldid=1380207873); [Lichess opening name: Sicilian Defense: Magnus Smith Trap (B57)](https://github.com/lichess-org/chess-openings)

#### 21. Marshall Trap · Ловушка Маршалла (`marshall-trap`)

- **Side:** Black · **Kind:** trap · **Repertoire:** branch · **Reliability:** dubious · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 5.d4 d5 6.Bd3 Bd6 7.O-O O-O 8.c4 Bg4 9.cxd5 f5
- **Idea:** The bishop is sacrificed on h2, the knight forks from f2, and a queen check wins the rook.
- **Correct line:** 10.Re1? Bxh2+ 11.Kxh2 Nxf2 12.Qe2 Nxd3 13.Qxd3 Bxf3 14.Qxf3 Qh4+ 15.Kg1 Qxe1+ (+6.5)
- **If the opponent deviates:** 10.Nc3 (sound, -1.4); 11.Nxh2 Bxd1 (trap, +4.0)
- **Note:** Named after Frank Marshall. Needs the Petrov as Black, a second reply to 2.Nf3.
- **Source:** [Wikipedia: Petrov's Defence, Marshall Trap (revision 1356337237)](https://en.wikipedia.org/w/index.php?title=Petrov's_Defence%2C_Marshall_Trap&oldid=1356337237); [Lichess opening name: Petrov's Defense: Classical Attack, Marshall Trap (C42)](https://github.com/lichess-org/chess-openings)

#### 22. Owen's Defence: Greco's mate · Защита Оуэна: мат Греко (`owen-greco-mate`)

- **Side:** White · **Kind:** trap · **Repertoire:** branch · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 b6 2.d4 Bb7 3.Bd3
- **Idea:** Black wins the rook and chases the queen, but a pawn check opens the bishop, which mates on g6.
- **Correct line:** 3...f5? 4.exf5 Bxg2 5.Qh5+ g6 6.fxg6 Nf6?? 7.gxh7+ Nxh5 8.Bg6# (checkmate)
- **If the opponent deviates:** 3...e6 (sound, +0.9); 6...Bg7 7.gxh7+ Kf8 8.Nf3 (decline, +4.2)
- **Note:** Wikipedia: the line was given by Greco in the 17th century.
- **Source:** [Wikipedia: Owen's Defence (revision 1384648868)](https://en.wikipedia.org/w/index.php?title=Owen's_Defence&oldid=1384648868); [Lichess opening name: Owen Defense: Matovinsky Gambit (B00)](https://github.com/lichess-org/chess-openings)

#### 23. Stafford Gambit · Стаффордский гамбит (`stafford-gambit`)

- **Side:** Black · **Kind:** trap · **Repertoire:** branch · **Reliability:** dubious · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5.d3 Bc5
- **Idea:** The bishop pins the knight, but the knight takes on e4: capturing the queen allows mate by the two bishops.
- **Correct line:** 6.Bg5? Nxe4 7.Bxd8?? Bxf2+ 8.Ke2 Bg4# (checkmate)
- **If the opponent deviates:** 6.Be2 h5 7.h3 (sound, -2.5); 7.Be3 Bxe3 8.fxe3 Qh4+ (trap, +6.0)
- **Note:** A second reply to 2.Nf3, next to 2...Nc6. Wikipedia: considered dubious; popular online since the early 2020s.
- **Source:** [Wikipedia: Stafford Gambit (revision 1368550067)](https://en.wikipedia.org/w/index.php?title=Stafford_Gambit&oldid=1368550067); [Wikipedia: Petrov's Defence (revision 1382022050)](https://en.wikipedia.org/w/index.php?title=Petrov's_Defence&oldid=1382022050); [Lichess opening name: Petrov's Defense: Stafford Gambit (C42)](https://github.com/lichess-org/chess-openings)

### Stage 6

#### 24. Cambridge Springs Defense: the Bd3 trap · Кембридж-спрингская защита: ловушка (`cambridge-springs-trap`)

- **Side:** Black · **Kind:** trap · **Repertoire:** outside · **Reliability:** solid · **Status:** verified
- **Start:** 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.e3 c6 6.Nf3 Qa5 7.Nd2 Bb4 8.Qc2 O-O
- **Idea:** The pawn takes on c4, attacking the d3-bishop and uncovering the queen against the g5-bishop.
- **Correct line:** 9.Bd3?? dxc4 10.Bxf6 cxd3 11.Qxd3 Nxf6 (+7.2)
- **If the opponent deviates:** 9.Be2 (sound, -0.2)
- **Note:** The opening and its name are from the sources. The 9.Bd3 punishment is engine-checked only. Needs 1...d5 as Black.
- **Source:** [Wikipedia: Queen's Gambit Declined (revision 1382050090)](https://en.wikipedia.org/w/index.php?title=Queen's_Gambit_Declined&oldid=1382050090); [Lichess opening name: Queen's Gambit Declined: Cambridge Springs Defense, Bogoljubow Variation (D52)](https://github.com/lichess-org/chess-openings)

#### 25. Elephant Trap · Слоновья ловушка (`elephant-trap`)

- **Side:** Black · **Kind:** trap · **Repertoire:** outside · **Reliability:** solid · **Status:** verified
- **Start:** 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5
- **Idea:** The pinned knight takes on d5 anyway: a bishop check from b4 wins the queen back with an extra piece.
- **Correct line:** 6.Nxd5?? Nxd5 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8 (+5.2)
- **If the opponent deviates:** 6.e3 (sound, -0.2); 5.e3 c6 6.Nf3 Qa5 (sound, -0.2)
- **Note:** Needs 1...d5 as Black. The owner already passed it once with one error. Earliest recorded game: Mayet-Harrwitz, Berlin 1848.
- **Source:** [Wikipedia: Queen's Gambit Declined, Elephant Trap (revision 1384407150)](https://en.wikipedia.org/w/index.php?title=Queen's_Gambit_Declined%2C_Elephant_Trap&oldid=1384407150)

#### 26. Halosar Trap · Ловушка Халосара (`halosar-trap`)

- **Side:** White · **Kind:** trap · **Repertoire:** outside · **Reliability:** dubious · **Status:** verified
- **Start:** 1.d4 d5 2.e4 dxe4 3.Nc3 Nf6 4.f3 exf3 5.Qxf3 Qxd4 6.Be3 Qb4 7.O-O-O
- **Idea:** The knight jumps to b5 threatening mate on c7, and it cannot be taken because of a bishop check.
- **Correct line:** 7...Bg4? 8.Nb5 Bxf3?? 9.Nxc7# (checkmate)
- **If the opponent deviates:** 6...Qg4 (sound, -1.4); 8...Na6 9.Qxb7 Qe4 10.Qxa6 Qxe3+ 11.Kb1 Qc5 12.Nf3 (decline, +3.3)
- **Note:** Named after Hermann Halosar (Diemer-Halosar, Baden-Baden 1934). Needs 1.d4 and the Ryder Gambit as White.
- **Source:** [Wikipedia: Blackmar–Diemer Gambit (revision 1381541710)](https://en.wikipedia.org/w/index.php?title=Blackmar%E2%80%93Diemer_Gambit&oldid=1381541710)

#### 27. Lasker Trap · Ловушка Ласкера (`lasker-trap`)

- **Side:** Black · **Kind:** trap · **Repertoire:** outside · **Reliability:** risky · **Status:** verified
- **Start:** 1.d4 d5 2.c4 e5 3.dxe5 d4
- **Idea:** The pawn reaches g1 and promotes to a knight with check: promoting to a queen would achieve nothing.
- **Correct line:** 4.e3? Bb4+ 5.Bd2 dxe3 6.Bxb4?? exf2+ 7.Ke2 fxg1=N+ 8.Ke1 Qh4+ 9.Kd2 Nc6 (+7.7)
- **If the opponent deviates:** 4.Nf3 (sound, -0.7); 6.fxe3 (decline, +0.1)
- **Note:** Named after Emanuel Lasker; first noted by Serafino Dubois. Needs 1...d5 and 2...e5 as Black.
- **Source:** [Wikipedia: Albin Countergambit, Lasker Trap (revision 1356337160)](https://en.wikipedia.org/w/index.php?title=Albin_Countergambit%2C_Lasker_Trap&oldid=1356337160); [Lichess opening name: Queen's Gambit Declined: Albin Countergambit, Lasker Trap (D08)](https://github.com/lichess-org/chess-openings)

#### 28. Queen's Gambit Accepted: the greedy b5 · Принятый ферзевый гамбит: жадная пешка b5 (`qga-b5-trap`)

- **Side:** White · **Kind:** trap · **Repertoire:** outside · **Reliability:** solid · **Status:** verified
- **Start:** 1.d4 d5 2.c4 dxc4 3.e3
- **Idea:** Black clings to the c4-pawn, the a8-h1 diagonal weakens, and the queen on f3 wins a piece.
- **Correct line:** 3...b5? 4.a4 c6 5.axb5 cxb5?? 6.Qf3 Nc6 7.Qxc6+ (+5.5)
- **If the opponent deviates:** 3...Nf6 (sound, +0.3); 3...Be6 (sound, +0.6)
- **Note:** Wikipedia: pointed out by Alessandro Salvio in 1604. Needs 1.d4 as White.
- **Source:** [Wikipedia: Queen's Gambit Accepted (revision 1378795157)](https://en.wikipedia.org/w/index.php?title=Queen's_Gambit_Accepted&oldid=1378795157)

#### 29. Sea-Cadet Mate · Мат морского кадета (`sea-cadet-mate`)

- **Side:** White · **Kind:** trap · **Repertoire:** outside · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.c3 dxc3 5.Nxc3 d6 6.Bc4 Bg4 7.O-O
- **Idea:** The same Légal mate in the Scotch: the knight takes on e5, the queen is given, three pieces mate.
- **Correct line:** 7...Ne5?? 8.Nxe5 Bxd1 9.Bxf7+ Ke7 10.Nd5# (checkmate)
- **If the opponent deviates:** 7...Nf6 (sound, +0.1); 8...dxe5 9.Qxg4 (decline, +7.0)
- **Note:** The name and the mating line come from the Lichess opening data set. Needs the Göring Gambit as White.
- **Source:** [Lichess opening name: Scotch Game: Sea-Cadet Mate (C44)](https://github.com/lichess-org/chess-openings)

#### 30. Siberian Trap · Сибирская ловушка (`siberian-trap`)

- **Side:** Black · **Kind:** trap · **Repertoire:** outside · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 Nc6 5.Nf3 e6 6.Bc4 Qc7 7.O-O Nf6 8.Qe2 Ng4
- **Idea:** Knight on g4 and queen on c7 aim at h2: the d4-knight removes the defender and the queen mates.
- **Correct line:** 9.h3?? Nd4 10.Nxd4 Qh2# (checkmate)
- **If the opponent deviates:** 9.Nb5 Qb8 10.h3 h5 (sound, 0.0); 10.hxg4 Nxe2+ (trap, +4.7)
- **Note:** Needs the Sicilian as Black. The name comes from Boris Schipkov of Novosibirsk.
- **Source:** [Wikipedia: Sicilian Defence, Smith–Morra Gambit, Siberian Trap (revision 1317188806)](https://en.wikipedia.org/w/index.php?title=Sicilian_Defence%2C_Smith%E2%80%93Morra_Gambit%2C_Siberian_Trap&oldid=1317188806); [Lichess opening name: Sicilian Defense: Smith-Morra Gambit Accepted, Siberian Variation, Siberian Trap (B21)](https://github.com/lichess-org/chess-openings)

#### 31. Smith-Morra Gambit: the queen trap · Гамбит Смита-Морра: потеря ферзя (`smith-morra-queen-trap`)

- **Side:** White · **Kind:** trap · **Repertoire:** outside · **Reliability:** risky · **Status:** verified
- **Start:** 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Nxc3 Nc6 5.Nf3 d6 6.Bc4 Nf6 7.e5
- **Idea:** The e5-pawn opens the d-file, the bishop is sacrificed on f7, and the king is pulled away from its queen.
- **Correct line:** 7...Nxe5?? 8.Nxe5 dxe5 9.Bxf7+ Kxf7 10.Qxd8 (+8.1)
- **If the opponent deviates:** 6...e6 (sound, -0.1); 7...dxe5 8.Qxd8+ Nxd8 9.Nb5 Rb8 10.Nxe5 (decline, +1.1)
- **Note:** The opening is from the sources; this line is engine-checked only. Wikipedia: the gambit has a minefield of traps for Black.
- **Source:** [Wikipedia: Smith–Morra Gambit (revision 1341932942)](https://en.wikipedia.org/w/index.php?title=Smith%E2%80%93Morra_Gambit&oldid=1341932942); [Lichess opening name: Sicilian Defense: Smith-Morra Gambit Accepted (B21)](https://github.com/lichess-org/chess-openings)

#### 32. Tarrasch Trap (Open Defence) · Ловушка Тарраша (`tarrasch-trap`)

- **Side:** White · **Kind:** trap · **Repertoire:** outside · **Reliability:** solid · **Status:** verified
- **Start:** 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5 Be6 9.c3 Be7 10.Re1 O-O 11.Nd4
- **Idea:** After the trade on e6 the d5-pawn is pinned, so the rook takes the knight on e4.
- **Correct line:** 11...Qd7? 12.Nxe6 fxe6 13.Rxe4 (+6.0)
- **If the opponent deviates:** 11...Nxd4 12.cxd4 (sound, +0.6); 12...Qxe6 13.Rxe4 (trap, +6.2)
- **Note:** Named after Siegbert Tarrasch, who caught Zukertort (1887) and Gunsberg (1890) with it. Needs the Ruy Lopez as White.
- **Source:** [Wikipedia: Ruy Lopez, Tarrasch Trap (revision 1356337163)](https://en.wikipedia.org/w/index.php?title=Ruy_Lopez%2C_Tarrasch_Trap&oldid=1356337163); [Lichess opening name: Ruy Lopez: Open, Tarrasch Trap (C83)](https://github.com/lichess-org/chess-openings)

### Backlog: names without lines (all unverified)

Each name was confirmed to exist in the linked source. No line has been written or checked.

| Name | Side | Repertoire | Note | Source |
| --- | --- | --- | --- | --- |
| Traxler Counterattack | black | branch | The mirror of knight-attack-f7. Wikipedia: wild complications, no clear refutation known. | [Wikipedia: Traxler Counterattack (revision 1373025777)](https://en.wikipedia.org/w/index.php?title=Traxler_Counterattack&oldid=1373025777) |
| Lolli Attack | white | core | Sister line of the Fried Liver (6.d4). | [Wikipedia: Two Knights Defense (revision 1381945263)](https://en.wikipedia.org/w/index.php?title=Two_Knights_Defense&oldid=1381945263); [Lichess opening name: Italian Game: Two Knights Defense, Lolli Attack (C57)](https://github.com/lichess-org/chess-openings) |
| Tarrasch Trap (Steinitz Defence) | white | outside | Second trap of the same name; long, wins the exchange. | [Wikipedia: Ruy Lopez, Tarrasch Trap (revision 1356337163)](https://en.wikipedia.org/w/index.php?title=Ruy_Lopez%2C_Tarrasch_Trap&oldid=1356337163) |
| Würzburger Trap | white | outside | Vienna Gambit; a bishop is trapped on c2. | [Wikipedia: Vienna Game, Würzburger Trap (revision 1356337156)](https://en.wikipedia.org/w/index.php?title=Vienna_Game%2C_W%C3%BCrzburger_Trap&oldid=1356337156) |
| Rubinstein Trap | white | outside | Wins only a pawn, so it will not reach the +2.0 threshold as a trap. | [Wikipedia: Queen's Gambit Declined, Rubinstein Trap (revision 1356337191)](https://en.wikipedia.org/w/index.php?title=Queen's_Gambit_Declined%2C_Rubinstein_Trap&oldid=1356337191) |
| Monticelli Trap | white | outside | Wins the exchange; Wikipedia: unclear whether it is a forced win. | [Wikipedia: Bogo-Indian Defence, Monticelli Trap (revision 1320200217)](https://en.wikipedia.org/w/index.php?title=Bogo-Indian_Defence%2C_Monticelli_Trap&oldid=1320200217) |
| Noah's Ark Trap in the Sicilian | black | outside | Rossolimo: 3...a6 4.Ba4?? b5 5.Bb3 c4. | [Wikipedia: Ruy Lopez, Noah's Ark Trap (revision 1356337143)](https://en.wikipedia.org/w/index.php?title=Ruy_Lopez%2C_Noah's_Ark_Trap&oldid=1356337143) |
| Tennison Gambit traps | white | branch | Against the Scandinavian with 2.Nf3. Wikipedia: theoretically unsound. | [Wikipedia: Tennison Gambit (revision 1358052164)](https://en.wikipedia.org/w/index.php?title=Tennison_Gambit&oldid=1358052164) |
| Peruvian Immortal (Canal) | white | outside | A famous miniature with a double rook sacrifice; a story for view mode rather than a trap. | [Wikipedia: Peruvian Immortal (revision 1365818764)](https://en.wikipedia.org/w/index.php?title=Peruvian_Immortal&oldid=1365818764) |

<!-- catalog:end -->

## 8. Method and limits

- **Verify** (`scripts/verify.ts`) replays every line with chess.js 1.4.0 and requires exact
  SAN. Lines marked as mate must end in checkmate by the player. Every other final position is
  searched by Stockfish 19.0.1, full network, 2,000,000 nodes, one thread, hash cleared before
  each search.
- **Thresholds:** a win is +2.00 or better (or a forced mate); a defence holds down to -0.50;
  a player's mistake must cost at least -1.00.
- **Reliability** compares the evaluation after the opponent's correct play with what the side
  normally has out of the opening (White about +0.25, Black about -0.25): giving up at most
  0.30 is "solid", at most 1.00 is "risky", more is "dubious".
- **Cache:** evaluations are stored in `content/verify-cache.json` by engine, node count and
  FEN. Only new positions are searched. CI replays every line and takes evaluations from the
  cache; the manual workflow "Verify traps (full, no cache)" searches everything again.
- **Names and origins:** English Wikipedia (the exact revision is linked per trap) and the
  `lichess-org/chess-openings` data set (CC0), which holds the names the Lichess opening
  explorer shows. Where a branch has no written source, the trap's note says "engine-checked
  only".
- **No frequency data.** The Lichess opening explorer API answers `401`; its specification
  lists OAuth2. How often players of this level make each mistake is unknown, so opponent
  move weights for the bot are equal (section 9).
- **Unverified** means exactly this: the names in the backlog table, the content tracks of
  section 5, the rating bands of section 4 and the chess.com import.

## 9. Decisions by the owner (2026-11-12)

1. **Ladder.** The stage rules of section 3 are accepted. Stages live in the data and are reviewed
   after the entry test and after two weeks of real results.
2. **Extra puzzle themes.** Yes, added as their levels are reached; `quietMove` and `sacrifice`
   first.
3. **Frequency data.** Equal weights. No Lichess token for now. If the bot stage needs one, the
   owner creates it and keeps it in a local `.env` outside git.
4. **Own-game exercises.** Stored on the device only. The owner's games and user name never enter
   the repository or any public file. Progress can be exported to and imported from a JSON file.
