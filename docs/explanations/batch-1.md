# Explanations, batch 1: stage 0 (4 traps, 23 lines)

Status: **draft for the owner's review.** Nothing here is in the app yet. After the review the
texts go into the trap files and the app shows them under the lines.

## How to read this file

- **Text** is what the player will see, in Russian. The main line has one or two sentences:
  the idea and why the opponent's mistake can be punished. Every other line has one phrase.
- **Source** is the mark shown with the text:
  - "по доске": the statement can be seen in the position. It was checked with chess.js
    (which piece attacks which square, what defends it, whether it is checkmate).
  - "по оценке движка": the statement rests on the evaluation stored by verify
    (Stockfish 19.0.1, 2,000,000 nodes per position, from the player's point of view).
  - A link would mean "a listed source says so". This batch has none: every statement is
    about the position or the evaluation.
- **Checked** quotes the facts behind the text. All of them come from
  `npm run explain:facts -- <trap id>`; the full output for this batch is in
  [batch-1-facts.txt](batch-1-facts.txt). Nothing was written from memory.
- The texts give no numbers. The app already shows the evaluation next to every line, and
  the words follow the same scale as there: +2.0 and more is "выиграно", +0.5 and more is
  "лучше", between -0.5 and +0.5 is "примерно равно".

## 1. Дурацкий мат (`fools-mate`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 1 | Main: 1.f3 e5 2.g4?? Qh4# | Ходы f3 и g4 открыли диагональ от h4 к королю, и ферзь с h4 ставит мат. Королю некуда уйти: вокруг свои фигуры, а взять ферзя или закрыться от шаха нечем. | по доске | Checkmate. King e1: d1, d2, e2, f1 blocked by own pieces, f2 covered by the queen. The queen on h4 is attacked by nobody. |
| 2 | 1.g4 e5 2.f3?? Qh4# | Те же два хода пешками в другом порядке: мат тот же. | по доске | Same final position, checkmate. |
| 3 | 1.f3 e5 2.h3? Qh4+ 3.g3 Qxg3# | Белые сыграли h3 вместо g4: после шаха с h4 у них единственный ход g3, и ферзь берёт эту пешку с матом. | по доске | After 2...Qh4+ White has 1 legal move (g3). The pawn g3 is defended by nobody. 3...Qxg3 is checkmate. |
| 4 | 1.f3 e5 2.e4 | Белые не двигают пешку g: мата нет, но у вас лучше. | по оценке движка | No mate. Engine: +0.80. |
| 5 | 1.f3 e5 2.Nc3 | Белые выводят коня: мата нет, но у вас лучше. | по оценке движка | No mate. Engine: +0.72. |

## 2. Дурацкий мат за белых (`fools-mate-white`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 6 | Main: 1.e4 g5 2.d4 f6?? 3.Qh5# | Чёрные двинули пешки g и f и открыли диагональ от h5 к королю: ферзь с h5 ставит мат. Король зажат своими фигурами, взять ферзя или закрыться от шаха нечем. | по доске | Checkmate. King e8: d7, d8, e7, f8 blocked by own pieces, f7 covered by the queen. The queen on h5 is attacked by nobody. |
| 7 | 1.e4 f6 2.d4 g5?? 3.Qh5# | Те же два хода пешками в другом порядке: мат тот же. | по доске | Same final position, checkmate. |
| 8 | 1.e4 g5 2.d4 h6 | Чёрные не трогают пешку f: мата нет, но по оценке у вас уже выиграно. | по оценке движка | No mate. Engine: +2.15. |
| 9 | 1.e4 f6 2.d4 e6 | Чёрные не двигают пешку g: мата нет, но у вас лучше. | по оценке движка | No mate. Engine: +1.51. |

## 3. Детский мат (`scholars-mate`), вы играете белыми

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 10 | Main: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7# | Ферзь и слон вдвоём нападают на пешку f7, а защищает её только король. Конь с f6 напал на ферзя, но f7 не прикрыл: ферзь берёт на f7 под защитой слона, и это мат. | по доске | Before 4.Qxf7 the pawn f7 is attacked by the queen h5 and the bishop c4 and defended by the king only. 3...Nf6 attacks the queen h5. The queen on f7 is defended by the bishop c4. Checkmate. |
| 11 | 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7# | Слон и ферзь выходят в другом порядке: удар по f7 тот же. | по доске | Same final position, checkmate. |
| 12 | 1.e4 e5 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nd4?? 5.Qxf7# | Чёрные прогнали ферзя ходом g6, но с f3 он снова бьёт на f7: конь на d4 напал на ферзя и не защитил f7, мат. | по доске | 3...g6 attacks the queen h5. 4.Qf3 attacks f7. 4...Nd4 attacks the queen f3. Before 5.Qxf7 the pawn is attacked by the bishop c4 and the queen f3, defended by the king only. Checkmate. |
| 13 | 1.e4 e5 2.Qh5 g6?? 3.Qxe5+ Qe7 4.Qxh8 | Чёрные прогоняют ферзя, не защитив пешку e5: ферзь берёт её с шахом, нападает на ладью h8 и следующим ходом забирает её. | по доске | Before 3.Qxe5 the pawn e5 is attacked by the queen and defended by nobody. From e5 the queen attacks the king e8 and the rook h8. The rook h8 is defended by nobody. Material at the end: +6 for the player. |
| 14 | 1.e4 e5 2.Qh5 Ke7?? 3.Qxe5# | Король сам вышел под удар: ферзь берёт незащищённую пешку e5 с матом. | по доске | The pawn e5 is defended by nobody. 3.Qxe5 is checkmate. |
| 15 | 1.e4 e5 2.Qh5 Nf6 3.Qxe5+ Be7 | Чёрные отдали пешку e5: у вас лишняя пешка, но по оценке позиция примерно равна. | по оценке движка | Material at the end: +1 for the player. Engine: -0.13. |
| 16 | 1.e4 e5 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nf6 | Правильная защита: g6 прогоняет ферзя, конь на f6 закрывает ему путь к f7. Позиция примерно равна. | по доске; по оценке движка | 3...g6 attacks the queen h5. After 4.Qf3 the queen attacks f7; after 4...Nf6 only the bishop c4 attacks f7. Engine: -0.24. |
| 17 | 1.e4 e5 2.Qh5 Nc6 3.Bc4 Qe7 | Ферзь с e7 защищает f7 второй раз: мата нет, позиция примерно равна. | по доске; по оценке движка | f7 is attacked by the queen h5 and the bishop c4, defended by the king e8 and the queen e7. Engine: -0.03. |

## 4. Защита от детского мата (`scholars-mate-defence`), вы играете чёрными

| # | Line | Text | Source | Checked |
| --- | --- | --- | --- | --- |
| 18 | Main: 1.e4 e5 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nf6 | Сначала конь с c6 защищает пешку e5, на которую напал ферзь. Потом g6 прогоняет ферзя с h5, а конь на f6 закрывает ему путь к f7: мата нет, позиция примерно равна. | по доске; по оценке движка | 2.Qh5 attacks f7, h7 and e5; the knight c6 defends e5. 3...g6 attacks the queen h5. After 4...Nf6 only the bishop c4 attacks f7, and the king defends it. Engine: +0.24. |
| 19 | 1.e4 e5 2.Bc4 Nc6 3.Qf3 Nf6 | Ферзь вышел на f3: конь на f6 сразу закрывает ему путь к f7. | по доске | 3.Qf3 attacks f7; after 3...Nf6 only the bishop c4 attacks it. Engine: 0.00. |
| 20 | 1.e4 e5 2.Bc4 Bc5 3.Qh5 Qe7 | Ферзь с e7 защищает сразу и f7, и e5. | по доске | f7 is defended by the king e8 and the queen e7; e5 is defended by the queen e7. Engine: +0.14. |
| 21 | 1.e4 e5 2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nf6 5.Qb3? Nd4 6.Bxf7+ Ke7 7.Qc4 b5 | Белые упрямо бьют на f7, но теперь их ферзь защищает слона f7 и сам стоит под ударом пешки b5: по оценке у вас выиграно. | по доске; по оценке движка | Final position: the bishop f7 is attacked by the king e7 and defended by the queen c4 only; the queen c4 is attacked by the pawn b5. Material: -1 for the player. Engine: +5.93. The trap file notes that no written source was found for this line. |
| 22 | 1.e4 e5 2.Qh5 g6?? 3.Qxe5+ | Так нельзя: пешка e5 осталась без защиты, ферзь берёт её с шахом и нападает на ладью h8. | по доске | Before 3.Qxe5 the pawn e5 is defended by nobody. From e5 the queen attacks the king e8 and the rook h8, which is defended by nobody. Engine: -7.26. |
| 23 | 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7# | Так нельзя: конь напал на ферзя, но не защитил f7, и ферзь ставит там мат. | по доске | 3...Nf6 attacks the queen h5. Before 4.Qxf7 the pawn f7 is defended by the king only. Checkmate. |

## Questions for the review

1. Texts 2, 7 and 11 only say "the same in another order". Is that enough for a side line?
2. Texts 8 says "уже выиграно" at move 2 because the engine gives +2.15 and the app uses
   that word from +2.0. Softer wording ("большой перевес") is possible if the word is too strong.
3. Text 21 is the only one about a long line (seven moves). It names the final picture and
   leaves the reason to the evaluation. Should it say more, or is one phrase right?
