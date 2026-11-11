# QA checklist: M1a (app shell, board, diagnostics)

Preview URL: https://storm0090.github.io/chess-trainer/preview/m1a/

## Results

| Device | Status | Date | Notes |
| --- | --- | --- | --- |
| Samsung S24 Ultra (section A) | **Passed** | 2026-11-12 | Checked by the owner: a normal game works, checklist passed. |
| iPad Pro M5 (section B) | Pending | | Not blocking. To be checked separately. |
| Windows, Edge or Chrome (section C) | Pending | | Not blocking. To be checked separately. |

The stage was accepted on the S24 Ultra result and merged into `main` as `v0.1.0-m1a`.
Problems found later on the iPad or on Windows are fixed in the stage that is open at the time.

Stage M1a has no training content yet. It proves that the app installs, works offline,
that the board handles touch well, and that the Stockfish engine runs on each device.

How to report: for anything that does not match "Expected", note the step number and what
happened. For engine or install problems, open "Диагностика", tap "Скопировать отчёт" and paste
the text.

## A. Samsung S24 Ultra, Chrome

| # | Step | Expected |
| --- | --- | --- |
| A1 | Open the preview URL in Chrome. | The board appears within a couple of seconds, full width, in the starting position. Header shows "Chess Trainer" and the tabs "Доска" / "Диагностика". |
| A2 | Look at the board edges and the coordinates. | No gaps or lines between squares. Rank numbers 1-8 on the left file and file letters a-h on the bottom rank are readable. |
| A3 | Tap the e2 pawn, then tap e4. | After the first tap the pawn is highlighted and dots mark e3 and e4. After the second tap the pawn moves. Status changes to "Ход чёрных". The move list shows "1. e4". |
| A4 | Drag the e7 pawn to e5 with a finger. | The pawn follows the finger, the page does not scroll, the pawn lands on e5. Status: "Ход белых". |
| A5 | Tap a white piece, then tap a square it cannot move to. | Nothing moves; the selection is cleared or moved. No illegal move is possible. |
| A6 | Try to move a black piece while it is White's turn. | Nothing happens. |
| A7 | Tap "Перевернуть". | The board flips: Black is at the bottom, coordinates follow. Tap again to flip back. |
| A8 | Tap "Отменить ход" twice, then "Сначала". | Each undo takes back one move. "Сначала" returns to the starting position and both buttons become disabled. |
| A9 | Play 1.a4 b5 2.axb5 a6 3.bxa6 Bb7 4.axb7 Nc6, then take the rook: bxa8. | A dialog asks "В какую фигуру превратить пешку?" with four large buttons. Choosing "Конь" puts a white knight on a8 and the move list ends with "bxa8=N". |
| A10 | Repeat a promotion and tap "Отмена" in the dialog. | The pawn returns to b7; it is still White's turn. |
| A11 | Rotate the phone to landscape and back. | The board stays square and fully visible in both orientations; no horizontal scrolling. |
| A12 | Check how comfortable the touch targets are. | Buttons and squares are easy to hit with a thumb; no mis-taps on neighbouring squares. |
| A13 | Open "Диагностика" and tap "Запустить тест движка". | Within a few seconds: "Движок работает." in green, engine name "Stockfish 19 Lite ...", a best move, and "Мат в 1 ход: найден". |
| A14 | In "Диагностика", read "WebAssembly SIMD" and "Service worker". | SIMD: "да". Service worker: "работает" (reload the page once if it says "не активен"). |
| A15 | Chrome menu, "Add to Home screen" / "Install app". Install and open it from the home screen. | The app opens without the browser address bar, with its own icon (a small chessboard on a dark tile). "Диагностика" shows "Режим запуска: установленное приложение". |
| A16 | In the installed app, open "Диагностика" and run the engine test once (this caches the engine). Then turn on airplane mode, close the app completely and open it again. | The board loads and moves work without a network. "Сеть: нет". The engine test still passes. |
| A17 | Turn airplane mode off. | Nothing breaks. (When a new version is published later, a banner "Доступна новая версия." with the button "Обновить" appears; tapping it reloads the app.) |
| A18 | Send yourself the preview URL in Telegram and open it there (Telegram's built-in browser uses Android WebView). Open "Диагностика" and run the engine test. | "Android WebView: да" and "Движок работает." This is the early check that Stockfish runs inside a WebView, ahead of the Capacitor APK. |

## B. iPad Pro (M5), Safari

| # | Step | Expected |
| --- | --- | --- |
| B1 | Open the preview URL in Safari, in portrait and in landscape. | The board is centred, square, fully visible, not wider than about 700 px. Nothing is hidden under the status bar or the home indicator. |
| B2 | Repeat A3-A10 (tap move, drag move, illegal moves, flip, undo, promotion). | Same results as on the phone. Dragging a piece does not scroll or bounce the page. |
| B3 | Open "Диагностика" and tap "Запустить тест движка". | "Движок работает." (Stockfish 19 needs iOS/iPadOS 16 or newer.) |
| B4 | Share button, "Add to Home Screen". Open the app from the home screen. | Opens full screen with the chessboard icon. "Режим запуска: установленное приложение". |
| B5 | In the installed app run the engine test once, then turn on airplane mode, close the app and open it again. | The board loads and works offline; the engine test still passes. |
| B6 | In "Диагностика", check "Постоянное хранение". If it says "нет", tap "Запросить постоянное хранение". | Either answer is acceptable at this stage; note which one you got. (It matters from M2, when progress is stored.) |

## C. Windows, Edge or Chrome (quick check)

| # | Step | Expected |
| --- | --- | --- |
| C1 | Open the preview URL. Move pieces with the mouse, by clicking and by dragging. | Works as on the phone. The board is centred and limited in size. |
| C2 | Run the engine test in "Диагностика". | "Движок работает." |

## Known limits of this stage

- There is no training content: the board is a free board where you move both sides.
- The engine is cached the first time it runs, not at install. Offline engine use needs one
  online run first (steps A16 and B5 do this).
- The preview and the future main site are separate apps with separate storage.
