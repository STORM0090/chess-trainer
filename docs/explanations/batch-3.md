# Explanations, batch 3: stage 2 (3 traps, 24 lines)

Status: **written in autonomous mode on 2026-11-16; waits for the owner's read-through.** The
texts are in the trap files (one commit, so the batch can be reverted as a whole) and the app
shows them under the lines.

## How to read this file

The same rules as in [batch 1](batch-1.md) and [batch 2](batch-2.md):

- **Text** is what the player sees: one or two sentences for the main line, one phrase (two
  short ones where a line has two ideas) for the others.
- **Source**: "по доске" was checked in the position with chess.js; "по оценке движка" rests
  on the evaluation stored by verify (Stockfish 19.0.1, 2,000,000 nodes, from the player's
  point of view).
- **Checked** quotes `npm run explain:facts`; the full output is in
  [batch-3-facts.txt](batch-3-facts.txt). Nothing was written from memory.
- No numbers in the texts. The words follow the scale of the app: +2.0 and more is "большой
  перевес", +0.5 and more "лучше", between -0.5 and +0.5 "примерно равно", down to -2.0
  "у вас хуже", below that "у соперника большой перевес".
- The texts do not use the word "связка" (pin): the facts script does not detect pins. Where
  a piece stands between an attacker and something behind it, the text says so in plain
  words, and only when the facts show both attacks.

## 1. Мат Легаля (`legal-mate`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 1 | Main: 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5 Bxd1?? 6.Bxf7+ Ke7 7.Nd5# | Конь f3 закрывает ферзя от слона g4, но всё равно берёт пешку e5 и отдаёт ферзя. Если слон его забирает, ставят мат три лёгкие фигуры: Bxf7+ оставляет королю один ход, Ke7, и конь с d5 матует. | по доске | 5.Nxe5 captures e5 and attacks the bishop g4 and f7. 5...Bxd1 captures the queen, which was attacked by the bishop g4. After 6.Bxf7+ Black has 1 legal move (Ke7). 7.Nd5 is checkmate: d7 and f7 covered by the knight e5, e6 and e8 by the bishop f7, f6 by the knight d5; d6, d8, f8 blocked by own pieces and pawns. |
| 2 | 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 h6? 5.Nxe5 Bxd1?? 6.Bxf7+ Ke7 7.Nd5# | Ход h6 ничего не меняет: та же жертва ферзя и тот же мат тремя лёгкими фигурами. | по доске | Same pattern: 5...Bxd1, 6.Bxf7+ (1 legal move, Ke7), 7.Nd5 is checkmate with the same covered squares. |
| 3 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bh5? 6.Nxe5 Bxd1?? 7.Bxf7+ Ke7 8.Nd5# | Пешка h3 прогнала слона на h5, но и оттуда он смотрит на коня f3 и ферзя за ним: конь берёт e5, и после Bxd1 тот же мат. | по доске | 5.h3 attacks the bishop g4; from h5 it attacks the knight f3. 6...Bxd1 captures the queen, which was attacked by the bishop h5. 7.Bxf7+ leaves 1 legal move; 8.Nd5 is checkmate. |
| 4 | 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6? 5.Nxe5 dxe5 6.Qxg4 | Чёрные не берут ферзя, а забирают коня пешкой: ферзь берёт незащищённого слона g4. У вас лишняя пешка и большой перевес. | по доске; по оценке движка | 5...dxe5 captures the knight. 6.Qxg4 captures the bishop, defended by nobody. Material at the end: +1. Engine: +2.38. |
| 5 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bh5? 6.Nxe5 Nxe5 7.Qxh5 Nxc4 8.Qb5+ c6 9.Qxc4 | Чёрные берут коня конём: ферзь забирает слона h5, а потом шахом с b5 нападает на коня c4 и забирает его. У вас лишняя пешка и большой перевес. | по доске; по оценке движка | 7.Qxh5 captures the bishop, defended by nobody. 7...Nxc4 captures the bishop c4. 8.Qb5+ is check and attacks the knight c4; 9.Qxc4 captures it. Material at the end: +1. Engine: +2.22. |
| 6 | 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 Nf6 5.h3 | Чёрные выводят коня на f6, и он защищает слона g4: ловушки нет, позиция примерно равна. | по доске; по оценке движка | At the end the bishop g4 is attacked by the pawn h3 and defended by the knight f6. Engine: +0.41. |
| 7 | 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 Nc6 5.h3 | Конь c6 добавил пешке e5 вторую защиту; вы спокойно гоните слона пешкой h3, по оценке у вас лучше. | по доске; по оценке движка | At the end the pawn e5 is defended by the knight c6 and the pawn d6; the bishop g4 is attacked by the pawn h3. Engine: +0.57. |
| 8 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bxf3 6.Qxf3 | Чёрные меняют слона на коня: ваш ферзь встаёт на f3 и вместе со слоном нападает на f7. Позиция примерно равна. | по доске; по оценке движка | At the end the pawn f7 is attacked by the bishop c4 and the queen f3 and defended by the king. Engine: +0.45. |
| 9 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.Nxe5?? Nxe5 | Так нельзя: здесь пешку e5 защищает ещё и конь c6. Он берёт вашего коня, и вы просто теряете фигуру: у соперника большой перевес. | по доске; по оценке движка | Before 5.Nxe5 the pawn e5 is defended by the knight c6 and the pawn d6. 5...Nxe5 captures the knight. Material at the end: -2. Engine: -4.86. |

## 2. Ловушка Мортимера (`mortimer-trap`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 10 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7?! 5.Nxe5? c6 6.Ba4?? Qa5+ 7.Nc3 Qxe5 | Конь ушёл с c6 на e7 и будто бы отдал пешку e5. После Nxe5 пешка c6 гонит слона, и если он отходит на a4, ферзь даёт шах с a5 и забирает коня e5. | по доске | 5.Nxe5 captures e5, defended by nobody. 5...c6 attacks the bishop b5. 6...Qa5+ is check and attacks the knight e5 and the bishop a4. 7...Qxe5 captures the knight, defended by nobody. Material at the end: +2. |
| 11 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7?! 5.Nxe5? c6 6.Bc4?? Qa5+ 7.Nc3 Qxe5 | Слон отходит на c4: тот же шах с a5, и ферзь забирает коня e5. | по доске | 6...Qa5+ is check and attacks the knight e5. 7...Qxe5 captures the knight, defended by nobody. Material at the end: +2. |
| 12 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7?! 5.Nxe5? c6 6.Nc4 Ng6 7.Ba4 b5 | Конь уходит с e5 на c4. После b5 пешка нападает сразу на слона a4 и коня c4: пешка отдана, но по оценке у вас большой перевес. | по доске; по оценке движка | 7...b5 attacks the bishop a4 and the knight c4. Material at the end: -1. Engine: +3.39. |
| 13 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.d3 Ne7?! 5.Bc4 c6 6.Nc3 Ng6 | Белые не берут пешку e5, а нападают слоном на f7: ловушки нет, и по оценке у вас хуже. | по доске; по оценке движка | 5.Bc4 attacks the pawn f7. Material at the end: 0. Engine: -0.65. |

## 3. Гамбит Энглунда: ловушка (`englund-trap`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 14 | Main: 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Bc3?? Bb4 7.Qd2 Bxc3 8.Qxc3 Qc1# | Шах с b4 нападает и на слона f4, и на пешку b2. После Bd2 ферзь берёт b2; если слон идёт на c3, слон b4 нападает на него, и после размена на c3 ферзь ставит мат на c1. | по доске | 4...Qb4+ is check and attacks the bishop f4 and the pawn b2. 5...Qxb2 captures b2. 6...Bb4 attacks the bishop c3. 8...Qc1 is checkmate: d1 and d2 covered by the queen c1; e2, f1, f2 blocked by own pieces and pawns; the queen on c1 is attacked by nobody. |
| 15 | 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Bc3?? Bb4 7.Bxb4 Nxb4 | Белые меняют слонов: конь отыгрывает слона, а ваш ферзь на b2 нападает на ладью a1. По оценке у вас большой перевес. | по доске; по оценке движка | 7...Nxb4 captures the bishop. At the end the rook a1 is attacked by the queen b2 and defended by nobody. Engine: +6.88. |
| 16 | 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.c3?? Qxf4 | Белые закрылись пешкой c3, и слон f4 остался без защиты: ферзь его забирает. | по доске | 5...Qxf4 captures the bishop, defended by nobody. Material at the end: +2. |
| 17 | 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Nbd2?? Qxf4 | Конь закрыл шах, а слон f4 остался без защиты: ферзь его забирает. | по доске | 5...Qxf4 captures the bishop, defended by nobody. Material at the end: +2. |
| 18 | 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Qd2?? Qxb2 6.Qc3 Bb4 | Белые закрылись ферзём: ваш ферзь берёт b2 и нападает на ладью a1, а на Qc3 слон b4 нападает на белого ферзя. По оценке у вас большой перевес. | по доске; по оценке движка | 5...Qxb2 attacks the rook a1. 6...Bb4 attacks the queen c3. Engine: +9.80. |
| 19 | 1.d4 e5 2.Bf4?? exf4 | Слон пошёл на f4 под удар пешки e5: пешка его забирает. | по доске | 2...exf4 captures the bishop. Material at the end: +3. |
| 20 | 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Nc3 Qxf4 6.Nd5 Qe4 | Белые закрылись конём: ферзь забирает слона f4, но конь d5 нападает на ферзя и на пешку c7. После Qe4 позиция примерно равна. | по доске; по оценке движка | 5...Qxf4 captures the bishop. 6.Nd5 attacks the queen f4 and the pawn c7. At the end c7 is defended by nobody. Engine: -0.18. |
| 21 | 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4+ 5.Bd2 Qxb2 6.Nc3 Bb4 7.Rb1 Qa3 8.Nd5 | Белые выводят коня c3 под защиту слона d2, ладьёй b1 прогоняют ферзя, и конь d5 нападает на c7 и слона b4: по оценке у соперника большой перевес. | по доске; по оценке движка | 6.Nc3 is defended by the bishop d2. 7.Rb1 attacks the queen b2. 8.Nd5 attacks the pawn c7 and the bishop b4. Engine: -2.84. |
| 22 | 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 4.Qd5 | Ферзь встаёт на d5 и защищает пешку e5: ловушки нет, по оценке у вас хуже. | по доске; по оценке движка | At the end the pawn e5 is defended by the queen d5 and the knight f3. Engine: -0.71. |
| 23 | 1.d4 e5 2.d5 Bc5 | Белые не берут пешку e5, а идут вперёд ходом d5: ловушки нет, позиция примерно равна. | по оценке движка | Engine: +0.08. |
| 24 | 1.d4 e5 2.Nf3 e4 | На 2.Nf3 пешка e4 прогоняет коня: позиция примерно равна. | по доске; по оценке движка | At the end the knight f3 is attacked by the pawn e4. Engine: +0.26. |

## Notes for the read-through

1. Text 1 says "конь f3 закрывает ферзя от слона g4" instead of "связан": the facts show that
   the bishop attacks the knight and, once the knight is gone, the queen. Whether the pin
   should be named is the owner's call.
2. Text 14 does not say that the bishop on c3 is pinned for the same reason: the facts show
   only that 6...Bb4 attacks it.
3. Texts 13 and 22 say "у вас хуже": the engine gives -0.65 and -0.71. That is the honest
   price of these traps against correct play, and the trap page shows the same evaluation.
4. Text 21 is the Englund's critical line: "у соперника большой перевес" at -2.84, as in the
   owner's decision to keep the gambit with the label "dubious".
