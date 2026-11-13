# Chess Trainer

Learn chess opening traps and basic tactics in five minutes a day.
A phone-first PWA for beginner-level players. The UI is in Russian.

**Status:** early development. Stage M2: 32 verified opening traps with a View mode and a
Learn mode with hints. Progress is not saved yet. The plan is in [docs/PLAN.md](docs/PLAN.md).

## Stack

TypeScript, Vite, Preact, [chess.js](https://github.com/jhlywa/chess.js),
[chessground](https://github.com/lichess-org/chessground),
[Stockfish.js](https://github.com/nmrugg/stockfish.js) (lite, single-threaded, in a Web Worker),
vite-plugin-pwa. Deployed to GitHub Pages.

## Development

Requires Node.js 24.

```bash
npm ci
npm run dev
```

Other commands: `npm run build`, `npm run typecheck`, `npm test`.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
