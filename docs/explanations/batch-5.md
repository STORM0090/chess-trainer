# Explanations, batch 5: stage 5 without the Marshall Trap (5 traps, 17 lines)

Status: **written in autonomous mode on 2026-11-17; waits for the owner's read-through.** The
texts are in the trap files (one commit, so the batch can be reverted as a whole).

The rules are those of [batch 1](batch-1.md): one or two sentences for the main line, a
phrase for the others; "по доске" checked with chess.js, "по оценке движка" from the stored
verify result; no numbers; "большой перевес" from +2.0, "лучше" from +0.5, "примерно равно"
between -0.5 and +0.5, "у вас хуже" down to -2.0, "у соперника большой перевес" below. The
facts are in [batch-5-facts.txt](batch-5-facts.txt). Three claims that the facts script does
not print were checked with chess.js directly; the "Checked" column says which.

## 1. Каро-Канн: спёртый мат на d6 (`caro-kann-smothered`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 1 | Main: 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Qe2 Ngf6?? 6.Nd6# | Ход Ngf6 не защищает от шаха конём с d6, и это мат. Пешка e7 не может взять коня, потому что закрывает короля от ферзя e2, а все поля вокруг короля заняты своими фигурами и пешками. | по доске | 6.Nd6 is checkmate: d7, d8, e7, f7, f8 are blocked by Black's own pieces and pawns. The knight d6 is attacked by the pawn e7. Checked with chess.js directly: the pawn e7 has no legal move, and without it the king e8 would be attacked by the queen e2. |
| 2 | 1.e4 c6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nd7 5.Qe2 Ndf6 | Правильно пойти другим конём, с d7: у короля освобождается поле d7, мата нет, позиция примерно равна. | по доске; по оценке движка | After 5...Ndf6 the square d7 is empty and no white piece attacks it (chess.js directly). Engine: +0.24. |

## 2. Будапештский гамбит: ловушка Кинингера (`budapest-kieninger`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 3 | Main: 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Bf4 Nc6 5.Nf3 Bb4+ 6.Nbd2 Qe7 7.a3 Ngxe5 8.axb4?? Nd3# | Конь берёт на e5 и оставляет слона b4 под ударом пешки a3. Если белые берут слона, конь ставит мат с d3: пешка e2 не может его взять, потому что закрывает короля от ферзя e7, а королю некуда уйти. | по доске | 7.a3 attacks the bishop b4. 8...Nd3 is checkmate: d1, d2, e2, f1, f2 blocked by White's own pieces and pawns. The knight d3 is attacked by the pawn e2. Checked with chess.js directly: the pawn e2 has no legal move, and without it the king e1 would be attacked by the queen e7. |
| 4 | 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Bf4 Nc6 5.Nf3 Bb4+ 6.Nbd2 Qe7 7.a3 Ngxe5 8.Nxe5 Nxe5 9.axb4?? Nd3# | После размена коней на e5 ничего не меняется: взятие слона b4 снова разрешает мат конём на d3. | по доске | 8.Nxe5 Nxe5; 9...Nd3 is checkmate with the same blocked squares. |
| 5 | 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Bf4 Nc6 5.Nf3 Bb4+ 6.Nbd2 Qe7 7.a3 Ngxe5 8.Nxe5 Nxe5 9.e3 Bxd2+ 10.Qxd2 | Белые не берут слона, а играют e3: мата нет. Вы меняете слона на коня d2, позиция примерно равна. | по доске; по оценке движка | 9...Bxd2+ 10.Qxd2. Material at the end: 0. Engine: -0.30. |
| 6 | 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.Bf4 Nc6 5.Nf3 Bb4+ 6.Nc3 Bxc3+ 7.bxc3 Qe7 8.Qd5 | Белые закрываются конём c3 и после размена защищают пешку e5 ферзём с d5: пешка остаётся у них, по оценке у вас хуже. | по доске; по оценке движка | At the end the pawn e5 is defended by the queen d5, the bishop f4 and the knight f3. Material: -1. Engine: -0.61. |
| 7 | 1.d4 Nf6 2.c4 e5 3.dxe5 Ng4 4.e4 | Белые сразу играют e4, и ферзь нападает на коня g4: ловушки нет, по оценке у вас хуже. | по доске; по оценке движка | At the end the knight g4 is attacked by the queen d1 and defended by nobody. Engine: -0.78. |

## 3. Ловушка Магнуса Смита (`magnus-smith-trap`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 8 | Main: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bc4 g6?! 7.Nxc6 bxc6 8.e5 dxe5?? 9.Bxf7+ Kxf7 10.Qxd8 | Пешка e5 нападает на коня f6 и на пешку d6. Если чёрные берут её пешкой d6, линия d открывается: слон бьёт на f7 с шахом, у короля единственный ход — взять слона, и ферзь d8 остаётся без защиты. | по доске | 8.e5 attacks the pawn d6 and the knight f6. After 9.Bxf7+ Black has 1 legal move (Kxf7). 10.Qxd8 captures the queen, attacked by the queen d1 and defended by nobody. Material at the end: +6. |
| 9 | 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bc4 g6?! 7.Nxc6 bxc6 8.e5 Ng4 9.Bf4 | Чёрные не берут пешку, а уводят коня на g4 с нападением на неё: вы защищаете e5 слоном f4, по оценке у вас лучше. | по доске; по оценке движка | 8...Ng4 attacks the pawn e5; at the end it is defended by the bishop f4. Engine: +0.53. |
| 10 | 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 Nc6 6.Bc4 e6 | Чёрные играют e6: теперь слон c4 упирается в эту пешку и на f7 больше не нападает. Ловушки нет, позиция примерно равна. | по доске; по оценке движка | 6.Bc4 attacks f7; at the end the bishop c4 attacks the pawn e6 and f7 is not under attack. Engine: +0.28. |

## 4. Стаффордский гамбит (`stafford-gambit`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 11 | Main: 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5.d3 Bc5 6.Bg5? Nxe4 7.Bxd8?? Bxf2+ 8.Ke2 Bg4# | Слон g5 напал на коня f6, но конь берёт e4 и подставляет ферзя. Если белые его берут, слон бьёт f2 с шахом, у короля один ход, и второй слон ставит мат с g4. | по доске | 6...Nxe4; 7.Bxd8 captures the queen. After 7...Bxf2+ White has 1 legal move (Ke2). 8...Bg4 is checkmate: d2, f2 covered by the knight e4, e1, e3 by the bishop f2, f3 by the bishop g4; d1, d3, f1 blocked. |
| 12 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5.d3 Bc5 6.Bg5? Nxe4 7.Be3 Bxe3 8.fxe3 Qh4+ | Белые не берут ферзя, а закрываются слоном e3: после размена слонов ферзь даёт шах с h4, и по оценке у вас большой перевес. | по доске; по оценке движка | 7...Bxe3 8.fxe3; 8...Qh4+ is check. Material at the end: 0. Engine: +6.04. |
| 13 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5.e5 Ne4 6.d3?? Bc5 7.dxe4 Bxf2+ 8.Ke2 Bg4+ | Белые гонят коня пешками и забирают его, но слон бьёт f2 с шахом, а второй слон даёт шах с g4: королю остаётся только взять на f2, и ферзь d1 пропадает без защиты. | по доске; по оценке движка | 7...Bxf2+ and 8...Bg4+ are checks. Checked with chess.js directly: after 8...Bg4+ White has 1 legal move (Kxf2), and then the queen d1 is attacked by the queen d8 and the bishop g4 and defended by nobody. Engine: +7.48. |
| 14 | 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 4.Nxc6 dxc6 5.d3 Bc5 6.Be2 h5 7.h3 | Белые спокойно выводят слона на e2: ловушки нет, лишняя пешка у них, и по оценке у соперника большой перевес. | по оценке движка | Material at the end: -1. Engine: -2.51. |

## 5. Защита Оуэна: мат Греко (`owen-greco-mate`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 15 | Main: 1.e4 b6 2.d4 Bb7 3.Bd3 f5? 4.exf5 Bxg2 5.Qh5+ g6 6.fxg6 Nf6?? 7.gxh7+ Nxh5 8.Bg6# | Чёрные забрали пешку g2, но открыли своего короля: шах с h5, и после g6 пешка берёт на g6. Конь f6 нападает на ферзя, а пешка бьёт h7 и открывает шах от ферзя; конь забирает ферзя, и слон ставит мат на g6. | по доске | 5.Qh5+ leaves 1 legal move (g6). 6...Nf6 attacks the queen h5. 7.gxh7+ is check from the queen h5; Black has 1 legal move (Nxh5). 8.Bg6 is checkmate: f7 covered by the bishop; d7, d8, e7, f8 blocked. |
| 16 | 1.e4 b6 2.d4 Bb7 3.Bd3 f5? 4.exf5 Bxg2 5.Qh5+ g6 6.fxg6 Bg7 7.gxh7+ Kf8 8.Nf3 | Слон уходит на g7 и освобождает королю поле f8: мата нет, но пешка h7 нападает на коня g8, и по оценке у вас большой перевес. | по доске; по оценке движка | 7.gxh7+ attacks the knight g8; Black has 1 legal move (Kf8). Material at the end: +2. Engine: +4.22. |
| 17 | 1.e4 b6 2.d4 Bb7 3.Bd3 e6 | Чёрные не двигают пешку f и играют e6: ловушки нет, по оценке у вас лучше. | по оценке движка | Engine: +0.94. |

## Notes for the read-through

1. Texts 1 and 3 explain a pin without the word "связка": "закрывает короля от ферзя". Both
   pins were checked directly, as the "Checked" column says.
2. Text 14 is the honest price of the Stafford Gambit: "у соперника большой перевес" at -2.51.
3. Text 15 is long (two sentences, six moves); it is the main line of the stage's longest
   combination.
