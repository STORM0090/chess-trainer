# QA checklist: M8a, exercises from your own games

Preview URL: https://storm0090.github.io/chess-trainer/preview/m8a/
Debug APK: Actions, "Android debug APK", the latest run on branch `m8a`.

Built in autonomous mode; not checked on a device, and **not tried on a real chess.com
export** (the tests use made-up games; real games are personal data and stay with you).

## Results

| Check | Status | Date | Notes |
| --- | --- | --- | --- |
| Samsung S24 Ultra (section A) | Pending | | |
| Windows (section B) | Pending | | The easiest place to download PGN from chess.com. |

"Ещё", "Диагностика" must show "Версия" 0.9.0 and "Сборка" `m8a @`.

## A. Samsung S24 Ultra

| # | Step | Expected |
| --- | --- | --- |
| A1 | On chess.com open your game archive and download a few games as PGN (one file with several games is fine). | A `.pgn` file in Downloads. Please note where chess.com puts the download button on the phone; the hint in the app describes the desktop site. |
| A2 | In the app: "Ещё", "Мои партии". | "Упражнений пока нет.", a text box and the buttons "Прочитать" and "Выбрать файл". Below: a line that games are analysed on the device and only positions are kept. |
| A3 | "Выбрать файл", choose the PGN file. | "Партий прочитано: N." (20 at most in one go). The app asks under which name you played and shows the name that appears in every game; with one game it shows both names. |
| A4 | Choose your name, press "Найти ошибки". | "Партия 1 из N: просмотрено ваших ходов …" counting up; a game takes roughly 5 to 15 seconds on a desktop, **not measured on the phone**. Then "Партий просмотрено: N. Новых упражнений: K." |
| A5 | Look at the count. | A handful of exercises per ten games is normal: only positions with one clearly best move that you missed are taken, and none where the game was already lost or won anyway. Zero is possible. |
| A6 | Press "Решать". | "Из ваших партий", your side, "Найдите лучший ход." The opponent's move is played first, as in the game; then it is your move. |
| A7 | Solve it (or use hints). | The verdict, "В партии вы сыграли …", "Следующая задача", "Убрать это упражнение". |
| A8 | Check a few solutions with your own eyes. | The move the app wants should be clearly better than what you played. The engine looks only briefly: if a solution looks wrong, please write down the position; "Убрать это упражнение" removes it. |
| A9 | Open "Сегодня", start the session. | Among the first items up to two are "Позиция из вашей партии." A failed one comes back the next day, a solved one later. |
| A10 | Import the same file again. | "Новых упражнений: 0. Уже были в списке: K." |
| A11 | "Ещё", "Данные", "Сохранить файл"; open the file in a text viewer and search for your chess.com name. | Not there. The file has positions (FEN) and moves only. |
| A12 | "Мои партии", "Удалить все упражнения", "Да, удалить все". | "Упражнений пока нет." They are gone from the session too. |
| A13 | Airplane mode on, import a game. | Works offline once the engine was used online (the APK always works offline). |

### What to judge by feel

- Are the exercises positions you recognise as "yes, I should have seen that"?
- Is 20 games at a time enough? Is the waiting bearable on the phone?
- Should the app also keep which opening the position came from (it keeps nothing now)?

## B. Windows

| # | Step | Expected |
| --- | --- | --- |
| B1 | Download a month of games from chess.com as one PGN file and import it. | The first 20 games are read; the rest of the file is ignored without an error. |
| B2 | Paste the text of one game into the box, "Прочитать". | The same flow. |
