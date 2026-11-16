# Explanations, batch 4: stages 3 and 4 (5 traps, 25 lines)

Status: **written in autonomous mode on 2026-11-16; waits for the owner's read-through.** The
texts are in the trap files (one commit, so the batch can be reverted as a whole).

The rules are those of [batch 1](batch-1.md): one or two sentences for the main line, a
phrase for the others; "по доске" checked with chess.js, "по оценке движка" from the stored
verify result; no numbers; "большой перевес" from +2.0, "лучше" from +0.5, "примерно
равно" between -0.5 and +0.5, "у вас хуже" down to -2.0. The facts are in
[batch-4-facts.txt](batch-4-facts.txt). Two claims that the facts script does not print were
checked with chess.js directly; the "Checked" column says so.

## 1. Шиллинговый гамбит Блэкберна (`blackburne-shilling`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 1 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Rf1 Qxe4+ 7.Be2 Nf3# | Конь d4 оставил пешку e5 без защиты, и это наживка. После Nxe5 ферзь с g5 нападает на коня и на пешку g2; если конь бьёт f7, ферзь берёт g2, потом e4 с шахом, и конь ставит мат на f3: королю мешают его собственные фигуры. | по доске | After 3...Nd4 the pawn e5 is defended by nobody (batch 2, text 24). 4...Qg5 attacks the knight e5 and the pawn g2 (batch 2, text 26). 5...Qxg2, 6...Qxe4+ check, 7...Nf3 checkmate: d1, d2, e2, f1, f2 blocked by White's own pieces and pawns. |
| 2 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Nxf7?? Qxg2 6.Nxh8 Qxh1+ 7.Bf1 Qxe4+ 8.Be2 Nxc2+ 9.Kf1 Qh1# | Белые забирают ладью h8, а ферзь берёт ладью h1 и пешку e4 с шахами; конь даёт шах с c2, и ферзь матует на h1. | по доске | 6...Qxh1+ and 7...Qxe4+ are checks; 8...Nxc2+ is check; 9...Qh1 is checkmate: e1 covered by the knight c2 and the queen, g1 and g2 by the queen, e2 and f2 blocked. |
| 3 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Ng4 d5 | Конь отступает на g4 под защиту ферзя, а пешка d5 нападает на слона c4 и пешку e4. Пешка отдана, но по оценке у вас большой перевес. | по доске; по оценке движка | 5.Ng4 is defended by the queen d1. 5...d5 attacks the bishop c4 and the pawn e4. Material at the end: -1. Engine: +5.04. |
| 4 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Bxf7+ Kd8 6.O-O Qxe5 | Белые сначала берут f7 с шахом: король уходит на d8, а ферзь забирает коня e5. По оценке у вас лучше. | по доске; по оценке движка | 5.Bxf7+ is check; 6...Qxe5 captures the knight, defended by nobody. Material at the end: +1. Engine: +0.68. |
| 5 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxe5? Qg5 5.Bxf7+ Ke7 6.O-O Qxe5 7.Bxg8 Rxg8 8.c3 Nc6 9.d4 | Если король идёт на e7, белые меняют слона на коня g8 и гонят фигуры пешками c3 и d4: по оценке у вас хуже. | по доске; по оценке движка | 7.Bxg8 Rxg8. 8.c3 attacks the knight d4; 9.d4 attacks the queen e5. Engine: -0.97. |
| 6 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.Nxd4 exd4 5.O-O | Белые просто меняют коней и рокируются: ловушки нет, и по оценке у вас хуже. | по оценке движка | Material at the end: 0. Engine: -1.28. |
| 7 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.c3 Nxf3+ 5.Qxf3 | Пешка c3 нападает на коня; после размена на f3 ферзь и слон вдвоём нападают на f7, и по оценке у вас хуже. | по доске; по оценке движка | 4.c3 attacks the knight d4. At the end f7 is attacked by the bishop c4 and the queen f3 and defended by the king. Engine: -0.55. |
| 8 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.O-O | Белые спокойно рокируются и не трогают пешку e5: ловушки нет, по оценке у вас хуже. | по оценке движка | Engine: -1.11. |
| 9 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! 4.c3 Nxf3+ 5.Qxf3 d6?? 6.Qxf7# | Так нельзя: пешку f7 защищает только король, а ферзь и слон бьют её вдвоём, и Qxf7 — мат. | по доске | Before 6.Qxf7 the pawn f7 is attacked by the bishop c4 and the queen f3 and defended by the king e8. Checkmate: d7, e7 covered by the queen, f7 by the bishop c4, d8 and f8 blocked. |

## 2. Удочка в разменном варианте (`fishing-pole-exchange`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 10 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O Bg4 6.h3 h5 7.hxg4?? hxg4 8.Nxe5 Qh4 9.f4 g3 10.Qh5 Rxh5 11.Rf3 Qh1# | Слон на g4 — наживка: если белые его берут, пешка h5 забирает обратно, и линия h открыта для ладьи h8. Ферзь идёт на h4, пешка на g3; ладья забирает ферзя на h5, и ферзь ставит мат на h1 под защитой ладьи. | по доске | 7.hxg4 captures the bishop, defended by the pawn h5; 7...hxg4. 10...Rxh5 shows the h-file open from h8. 11...Qh1 is checkmate: f1 covered by the queen, f2 by the pawn g3, h1 and h2 by the rook h5, g2 blocked. |
| 11 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O Bg4 6.h3 h5 7.hxg4?? hxg4 8.Nh2 Qh4 | Белые закрывают линию h конём h2, но ферзь с h4 нападает и на коня, и на пешку f2: по оценке у вас большой перевес. | по доске; по оценке движка | 8...Qh4 attacks the pawn f2 and the knight h2. Material at the end: -2. Engine: +8.35. |
| 12 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O Bg4 6.h3 h5 7.d3 | Белые не берут слона: ловушки нет, позиция примерно равна. | по оценке движка | Engine: +0.03. |
| 13 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O Bg4 6.h3 h5 7.c3 | Белые не берут слона и играют c3: позиция примерно равна. | по оценке движка | Engine: 0.00. |

## 3. Удочка в берлинской защите (`fishing-pole-berlin`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 14 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Ng4 5.h3 h5 6.hxg4?? hxg4 7.Ne1 Qh4 | Конь на g4 — наживка: после hxg4 пешка h5 берёт обратно, и линия h открыта для ладьи h8. Ферзь идёт на h4, и по оценке движка мат уже не остановить. | по доске; по оценке движка | 6.hxg4 captures the knight, defended by the pawn h5; 6...hxg4. Engine: mate in 3 for the player. Line 15 shows the rook h8 covering h1 and h2. |
| 15 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Ng4 5.h3 h5 6.hxg4?? hxg4 7.Ne1 Qh4 8.f4 g3 9.Nf3 Qh1# | Например, f4 g3, и после Nf3 ферзь ставит мат на h1 под защитой ладьи h8: поле f2 отнимает пешка g3. | по доске | 9...Qh1 is checkmate: f2 covered by the pawn g3, h1 and h2 by the rook h8, f1 and g2 blocked. |
| 16 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Ng4 5.h3 h5 6.d3 | Белые не берут коня: ловушки нет, и по оценке у вас хуже. | по оценке движка | Engine: -1.73. |
| 17 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O Ng4 5.h3 Nf6 6.Bxc6 dxc6 7.Nxe5 | Если конь отступает на f6, белые меняют слона на коня c6 и забирают пешку e5: по оценке у вас хуже. | по доске; по оценке движка | 6.Bxc6 dxc6; 7.Nxe5 captures the pawn, defended by nobody. Material at the end: -1. Engine: -1.89. |

## 4. Атака жареной печени (`fried-liver`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 18 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5?! 6.Nxf7 Kxf7 7.Qf3+ Kg8?? 8.Bxd5+ Qxd5 9.Qxd5+ Be6 10.Qxe6# | Жертва коня на f7 выгоняет короля, а шах ферзём с f3 нападает ещё и на коня d5. Король ушёл на g8 и запер себя: слон берёт d5 с шахом, и после Qxd5 Qxd5+ Be6 ферзь ставит мат на e6. | по доске | 7.Qf3+ is check and attacks the knight d5. 8.Bxd5+ is check. 10.Qxe6 is checkmate: f7 covered by the queen; f8, g7, h7, h8 blocked by Black's own pieces and pawns. |
| 19 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5?! 6.Nxf7 Kxf7 7.Qf3+ Kg8?? 8.Bxd5+ Be6 9.Bxe6# | Если чёрные закрываются слоном e6, слон берёт его с матом. | по доске | 8...Be6; 9.Bxe6 is checkmate: f7 covered by the bishop and the queen; f8, g7, h7, h8 blocked. |
| 20 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5?! 6.Nxf7 Kxf7 7.Qf3+ Ke8? 8.Bxd5 | Король вернулся на e8: слон забирает коня d5 под защитой ферзя. У вас лишняя пешка и большой перевес. | по доске; по оценке движка | 8.Bxd5 captures the knight; on d5 the bishop is defended by the queen f3. Material at the end: +1. Engine: +3.43. |
| 21 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5?! 6.Nxf7 Kxf7 7.Qf3+ Ke6 8.Nc3 Nb4 9.O-O c6 10.d4 | Король идёт на e6 и защищает коня d5: вы отдали фигуру за пешку, но по оценке у вас всё равно лучше. | по доске; по оценке движка | At the end the knight d5 is defended by the queen d8, the pawn c6, the king e6 and the knight b4. Material at the end: -2. Engine: +0.91. |
| 22 | 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Bd3 | Чёрные не берут на d5, а нападают конём на слона c4: жертвы на f7 нет, у вас лишняя пешка, но позиция примерно равна. | по доске; по оценке движка | 5...Na5 attacks the bishop c4. Material at the end: +1. Engine: +0.16. |

## 5. Ноев ковчег (`noahs-ark`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 23 | Main: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.d4 b5 6.Bb3 Nxd4 7.Nxd4 exd4 8.Qxd4?? c5 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4 | Белые забрали пешку d4 ферзём, и пешки идут вперёд с темпом: c5 гонит ферзя, а c4 нападает на слона b3. Отступить слону некуда: и на a4, и на c4 его берёт пешка b5. | по доске; по оценке движка | 8...c5 attacks the queen d4. 11...c4 attacks the bishop b3. Checked with chess.js after 11...c4: the bishop has 2 moves, Ba4 and Bxc4, and on both squares it is attacked by the pawn b5. Engine: +4.72. |
| 24 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.d4 b5 6.Bb3 Nxd4 7.Nxd4 exd4 8.Bd5 | Белые не берут d4 ферзём, а ставят слона на d5 с ударом по ладье a8: позиция примерно равна. | по доске; по оценке движка | 8.Bd5 attacks the rook a8 and the pawn f7. Engine: +0.14. |
| 25 | 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 d6 5.c3 | Белые не идут на d4: ловушки нет, позиция примерно равна. | по оценке движка | Engine: -0.26. |

## Independent review (2026-11-16)

Every line replays as legal and every mate is a mate; the evaluation words match the stored
numbers. Reworded after the review: text 10 (the rook gets to h5 by taking the queen; not
every square is taken by the pawn and the rook), text 15 (the same), text 7 (the knight is
not driven away, it is exchanged), text 9 (the pronoun had no noun).

## Notes for the read-through

1. Texts 6 to 8 and 16 say "у вас хуже": that is the honest price of the Blackburne Shilling
   and of the Berlin "Fishing Pole" against correct play, as the trap pages show.
2. Text 14 says "мат уже не остановить" from the engine's "mate in 3"; line 15 shows one way.
3. Text 21 does not say why the engine likes White after the piece sacrifice; the facts do
   not show a reason, so none is given.
