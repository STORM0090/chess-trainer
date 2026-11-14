# Explanations, batch 2: stage 1 (5 traps, 26 lines)

Status: **written in autonomous mode on 2026-11-14; waits for the owner's read-through.** The
texts are in the trap files (one commit, so the batch can be reverted as a whole) and the app
shows them under the lines.

## How to read this file

The same rules as in [batch 1](batch-1.md):

- **Text** is what the player sees. The main line has one or two sentences, every other line
  one phrase (two short ones where the line has two ideas).
- **Source**: "по доске" means the statement was checked in the position with chess.js;
  "по оценке движка" means it rests on the evaluation stored by verify (Stockfish 19.0.1,
  2,000,000 nodes, from the player's point of view).
- **Checked** quotes the facts from `npm run explain:facts`; the full output is in
  [batch-2-facts.txt](batch-2-facts.txt). Nothing was written from memory.
- No numbers in the texts. Words follow the scale of the app: +2.0 and more is "большой
  перевес", +0.5 and more is "лучше", between -0.5 and +0.5 is "примерно равно".

New in the facts script for this batch: a check names the piece that gives it, so a discovered
check can be told from a direct one ("check from White queen e2" after a knight move).

## 1. Отказанный королевский гамбит: шах с h4 (`kings-gambit-declined-qh4`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 1 | Main: 1.e4 e5 2.f4 Bc5 3.fxe5?? Qh4+ 4.Ke2 Qxe4# | Белые взяли пешку e5, а их король остался открыт для шаха с h4. У белых два ответа; на Ke2 ферзь берёт незащищённую пешку e4, и это мат: поля вокруг короля заняты своими фигурами или биты ферзём и слоном c5. | по доске | 3...Qh4+ is check; White has 2 legal moves (g3, Ke2). The pawn e4 is defended by nobody. 4...Qxe4 is checkmate: d1, d2, f1 blocked by own pieces; d3, e1, f3 covered by the queen; e3 by the queen and the bishop c5; f2 by the bishop c5. |
| 2 | 1.e4 e5 2.f4 Bc5 3.fxe5?? Qh4+ 4.g3 Qxe4+ 5.Qe2 Qxh1 | Белые закрылись пешкой g3: ферзь берёт e4 с шахом, нападая заодно на ладью h1, и следующим ходом забирает её. | по доске | 4...Qxe4+ attacks the king e1 and the rook h1. The rook h1 is defended by nobody. Material at the end: +5 for the player. |
| 3 | 1.e4 e5 2.f4 Bc5 3.Nf3 d6 | Белые сначала выводят коня: ловушки нет. Пешку e5 вы защищаете ходом d6, позиция примерно равна. | по доске; по оценке движка | The pawn e5 is attacked by the pawn f4 and the knight f3 and defended by the pawn d6. Engine: -0.28. |
| 4 | 1.e4 e5 2.f4 Bc5 3.Nf3 d6 4.c3 | Спокойное продолжение 4.c3: позиция примерно равна. | по оценке движка | Engine: -0.07. |

## 2. Конь на g5: вилка на f7 (`knight-attack-f7`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 5 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 h6?? 5.Nxf7 Qe7 6.Nxh8 | Конь и слон вдвоём нападают на f7, а защищает пешку только король. Чёрные сыграли h6 и не прикрыли f7: конь берёт пешку под защитой слона, нападает сразу на ферзя и ладью и забирает ладью. | по доске | Before 5.Nxf7 the pawn f7 is attacked by the knight g5 and the bishop c4 and defended by the king e8 only. From f7 the knight attacks the queen d8 and the rook h8 and is defended by the bishop c4. The rook h8 is defended by nobody. Material at the end: +6. |
| 6 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 Be7?? 5.Nxf7 | Слон на e7 не защищает f7: та же вилка на ферзя и ладью. | по доске | Before 5.Nxf7 the pawn f7 is defended by the king e8 only. From f7 the knight attacks the queen d8 and the rook h8; the rook is defended by nobody. |
| 7 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d6?? 5.Nxf7 | Ход d6 тоже не защищает f7: конь берёт с вилкой на ферзя и ладью. | по доске | Before 5.Nxf7 the pawn f7 is defended by the king e8 only. From f7 the knight attacks the queen d8 and the rook h8; the rook is defended by nobody. |
| 8 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 Qe7 5.Bxf7+ Kd8 6.Bb3 | Чёрные защитили f7 ферзём, но слон всё равно берёт пешку с шахом под защитой коня: у вас лишняя пешка и большой перевес. | по доске; по оценке движка | Before 5.Bxf7+ the pawn is defended by the king e8 and the queen e7; on f7 the bishop is defended by the knight g5. Material at the end: +1. Engine: +2.47. |
| 9 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Bd3 | Лучшая защита: пешка d5 нападает на слона c4. У вас остаётся лишняя пешка, но по оценке позиция примерно равна. | по доске; по оценке движка | 4...d5 attacks the bishop c4. Material at the end: +1. Engine: +0.16. |
| 10 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 Bc5 5.Bxf7+ Ke7 6.Bd5 | Чёрные не защищают f7, а сами нападают на f2: вы берёте пешку f7 слоном с шахом, и по оценке у вас лучше. | по доске; по оценке движка | 4...Bc5 attacks the pawn f2. 5.Bxf7+ is check; material at the end: +1. Engine: +0.86. |

## 3. Русская партия: вскрытый шах (`petrov-damiano`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 11 | Main: 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2 Nf6?? 5.Nc6+ Qe7 6.Nxe7 Bxe7 | Чёрный конь ушёл с e4, и на линии e между вашим ферзём и чёрным королём остался только ваш конь. Он идёт на c6: это шах от ферзя и нападение на ферзя d8, чёрные отдают ферзя за коня. | по доске | 4.Qe2 attacks the knight e4. 5.Nc6+ is check from the queen e2 (the knight left the e-file) and the knight attacks the queen d8. After 6.Nxe7 Bxe7 the material is +6 for the player (a queen for a knight). |
| 12 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2 Nf6?? 5.Nc6+ Be7 6.Nxd8 | Чёрные закрылись от шаха слоном: конь просто берёт ферзя d8. | по доске | 5.Nc6+ is check from the queen e2; the knight attacks the queen d8. 6.Nxd8 captures the queen. Material at the end: +9. |
| 13 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2 Nd6?? 5.Nc6+ Qe7 6.Nxe7 | Конь отступил на d6, но линия e всё равно открылась: тот же шах с c6 выигрывает ферзя. | по доске | 5.Nc6+ is check from the queen e2; the knight attacks the queen d8. 6.Nxe7 captures the queen. |
| 14 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2 Qe7 5.Qxe4 d6 6.d4 dxe5 7.dxe5 | Чёрные ставят ферзя на e7: вы берёте коня e4, чёрные отыгрывают фигуру, но у вас остаётся лишняя пешка и позиция лучше. | по доске; по оценке движка | 5.Qxe4 captures the knight, which is defended by nobody. 6...dxe5 captures the knight e5. Material at the end: +1. Engine: +0.63. |
| 15 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nxe4?! 4.Qe2 d5 5.d3 Qe7 6.dxe4 Qxe5 7.exd5 | Чёрные защищают коня пешкой d5: вы нападаете на него пешкой d3 и после разменов остаётесь с лишней пешкой, у вас лучше. | по доске; по оценке движка | Before 6.dxe4 the knight e4 is attacked by the pawn d3 and the queen e2 and defended by the pawn d5. Material at the end: +1. Engine: +1.67. |
| 16 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 d6 4.Nf3 Nxe4 | Правильный порядок: сначала d6 прогоняет вашего коня, и только потом чёрные берут на e4. По оценке позиция примерно равна. | по доске; по оценке движка | 3...d6 attacks the knight e5. Material at the end: 0. Engine: +0.44. |
| 17 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5.d3 Bc5 6.Be2 | Чёрные отдают пешку e5 и выводят слона на c5 с ударом по f2: после спокойного Be2 у вас лишняя пешка и большой перевес. | по доске; по оценке движка | 5...Bc5 attacks the pawn f2. Material at the end: +1. Engine: +2.16. |
| 18 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5.d3 Bc5 6.Bg5?? Nxe4 7.Bxd8 Bxf2+ 8.Ke2 Bg4# | Так нельзя: на Bg5 конь берёт e4, подставляя ферзя. Если взять ферзя, то Bxf2+ оставляет королю один ход, и Bg4 ставит мат. | по доске | 6...Nxe4 leaves the queen d8 to the bishop g5. After 7.Bxd8 Bxf2+ White has 1 legal move (Ke2). 8...Bg4 is checkmate: d2 and f2 covered by the knight e4, e1 and e3 by the bishop f2, f3 by the bishop g4, d1, d3, f1 blocked by own pieces. |

## 4. Защита Дамиано (`damiano-defence`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 19 | Main: 1.e4 e5 2.Nf3 f6? 3.Nxe5 fxe5? 4.Qh5+ g6 5.Qxe5+ Qe7 6.Qxh8 | Ход f6 защитил пешку e5, но открыл короля: вы жертвуете коня на e5, и после fxe5 ферзь даёт шах с h5. На g6 ферзь берёт e5 с шахом, нападая на ладью h8, и забирает её. | по доске | Before 3.Nxe5 the pawn e5 is defended by the pawn f6. 4.Qh5+ is check and attacks the pawn e5. 5.Qxe5+ attacks the king e8 and the rook h8; the rook is defended by nobody. Material at the end: +4. |
| 20 | 1.e4 e5 2.Nf3 f6? 3.Nxe5 fxe5? 4.Qh5+ Ke7 5.Qxe5+ Kf7 6.Bc4+ d5 7.Bxd5+ Kg6 8.h4 | Король уходит на e7: вы берёте e5 с шахом и шахами выгоняете короля на g6. Материал равный, но по оценке у вас большой перевес. | по доске; по оценке движка | 5.Qxe5+, 6.Bc4+ and 7.Bxd5+ are checks; the king ends on g6. Material at the end: 0. Engine: +4.26. |
| 21 | 1.e4 e5 2.Nf3 f6? 3.Nxe5 Qe7 4.Nf3 Qxe4+ 5.Be2 | Чёрные не берут коня, а нападают на него ферзём: конь отступает, чёрные отыгрывают пешку, но по оценке у вас большой перевес. | по доске; по оценке движка | 3...Qe7 attacks the knight e5. 4...Qxe4+ captures the pawn e4. Material at the end: 0. Engine: +2.46. |
| 22 | 1.e4 e5 2.Nf3 f6? 3.Nxe5 Qe7 4.Nf3 d5 5.d3 dxe4 6.dxe4 | Чёрные играют d5 вместо взятия на e4: у вас остаётся лишняя пешка, по оценке у вас лучше. | по доске; по оценке движка | Material at the end: +1. Engine: +1.96. |
| 23 | 1.e4 e5 2.Nf3 f6? 3.Nxe5 Qe7 4.Qh5+? g6 5.Nxg6 Qxe4+ 6.Be2 Qxg6 | Так нельзя: при ферзе на e7 шах с h5 не проходит. После g6 и Nxg6 ферзь берёт e4 с шахом, нападая на коня, и забирает его: у соперника большой перевес. | по доске; по оценке движка | 5...Qxe4+ is check and attacks the knight g6. 6...Qxg6 captures the knight. Material at the end: -2. Engine: -4.51. |

## 5. Шиллинговый гамбит: как не попасться (`blackburne-shilling-defence`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 24 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxd4 exd4 5.O-O | Конь на d4 оставил пешку e5 без защиты и зовёт взять её, но это ловушка. Вы просто меняете коней и рокируетесь: по оценке у вас лучше. | по доске; по оценке движка | After 3...Nd4 the pawn e5 is attacked by the knight f3 and defended by nobody (see text 26 for what happens after 4.Nxe5). 4.Nxd4 exd4: material 0. Engine: +1.28. |
| 25 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.c3 Nxf3+ 5.Qxf3 | Можно и прогнать коня пешкой c3: после размена ваши ферзь и слон вдвоём нападают на f7, по оценке у вас лучше. | по доске; по оценке движка | 4.c3 attacks the knight d4. At the end the pawn f7 is attacked by the bishop c4 and the queen f3 and defended by the king. Engine: +0.55. |
| 26 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3# | Так нельзя: на взятие e5 ферзь идёт на g5 и нападает сразу на коня и пешку g2. После Nxf7 ферзь берёт g2, потом e4 с шахом, и конь ставит мат на f3. | по доске | 4...Qg5 attacks the knight e5 and the pawn g2. 5...Qxg2, 6...Qxe4+ (check), 7...Nf3 is checkmate: d1, d2, e2, f1, f2 are blocked by White's own pieces. |

## Notes for the read-through

1. The trap titles in the section headings are the Russian titles from the trap files.
2. Text 1 says the king "остался открыт для шаха с h4" and does not say why 3.fxe5 is worse
   than 3.Nf3: that reason (the knight would cover h4) is not printed by the facts script, so
   it is left out rather than written from memory.
3. Text 9 names what 4...d5 attacks, not that it blocks the bishop's diagonal, for the same
   reason.
4. Texts 3, 9, 16 and 23 have two short sentences although they are side lines: each carries
   an idea and a verdict.
