// Prints facts about the lines of trap files, computed with chess.js from the moves and read
// from the stored verify result. Explanations for the player may state only what is listed
// here (or what a listed source says): nothing is written from memory.
//
// Usage: node scripts/explain-facts.ts <trap id> [<trap id> ...]

import { readFileSync } from 'node:fs';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { parseMovetext, sideOfPly } from '../shared/movetext.ts';
import type { TrapFile } from '../shared/trap-types.ts';

const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};
const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = 'abcdefgh';

const colorName = (color: Color) => (color === 'w' ? 'White' : 'Black');
const other = (color: Color): Color => (color === 'w' ? 'b' : 'w');

function pieceAt(chess: Chess, square: Square): string {
  const piece = chess.get(square);
  return piece ? `${colorName(piece.color)} ${PIECE_NAME[piece.type]} ${square}` : `empty ${square}`;
}

function attackersText(chess: Chess, square: Square, by: Color): string {
  const from = chess.attackers(square, by);
  return from.length === 0 ? 'nobody' : from.map((origin) => pieceAt(chess, origin)).join(', ');
}

function kingSquare(chess: Chess, color: Color): Square {
  for (const row of chess.board()) {
    for (const cell of row) if (cell?.type === 'k' && cell.color === color) return cell.square;
  }
  throw new Error('no king');
}

function neighbours(square: Square): Square[] {
  const file = FILES.indexOf(square[0] ?? '');
  const rank = Number(square[1]);
  const result: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      const f = file + df;
      const r = rank + dr;
      if ((df !== 0 || dr !== 0) && f >= 0 && f < 8 && r >= 1 && r <= 8) {
        result.push(`${FILES[f]}${r}` as Square);
      }
    }
  }
  return result;
}

/** Material of `color` minus material of the other side, in pawns. */
function materialBalance(chess: Chess, color: Color): number {
  let balance = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell) balance += (cell.color === color ? 1 : -1) * PIECE_VALUE[cell.type];
    }
  }
  return balance;
}

/** Why the king in check cannot be saved: every flight square and every way to stop the check. */
function mateFacts(chess: Chess): string[] {
  const loser = chess.turn();
  const winner = other(loser);
  const king = kingSquare(chess, loser);
  const facts: string[] = [];
  const checkers = chess.attackers(king, winner);
  facts.push(`check on the ${colorName(loser)} king ${king} from: ${checkers.map((sq) => pieceAt(chess, sq)).join(', ')}`);
  for (const checker of checkers) {
    facts.push(
      `  the checking piece on ${checker} is attacked by ${colorName(loser)}: ${attackersText(chess, checker, loser)}; ` +
        `defended by ${colorName(winner)}: ${attackersText(chess, checker, winner)}`,
    );
  }
  // Without the king on the board: a queen, rook or bishop that gives the check also covers
  // the squares behind the king on the same line.
  const withoutKing = new Chess(chess.fen());
  withoutKing.remove(king);
  for (const square of neighbours(king)) {
    const occupant = chess.get(square);
    if (occupant?.color === loser) {
      facts.push(`  ${square}: blocked by own ${PIECE_NAME[occupant.type]}`);
    } else {
      facts.push(`  ${square}: covered by ${attackersText(withoutKing, square, winner)}`);
    }
  }
  return facts;
}

/**
 * A piece of the side to move that is attacked and is the only defender of another attacked
 * piece: where can it go and still defend that piece, and who attacks each of those squares?
 */
function guardFacts(chess: Chess): string[] {
  const side = chess.turn();
  const enemy = other(side);
  const facts: string[] = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== side || cell.type === 'k') continue;
      if (chess.attackers(cell.square, enemy).length === 0) continue;
      const defenders = chess.attackers(cell.square, side);
      const guard = defenders[0];
      if (defenders.length !== 1 || !guard) continue;
      if (chess.attackers(guard, enemy).length === 0) continue;
      facts.push(
        `${pieceAt(chess, cell.square)} is attacked and defended only by ${pieceAt(chess, guard)}, which is attacked by ` +
          `${attackersText(chess, guard, enemy)}`,
      );
      const keeps: string[] = [];
      const moves = chess.moves({ square: guard, verbose: true });
      for (const move of moves) {
        const after = new Chess(chess.fen());
        after.move({ from: move.from, to: move.to, promotion: move.promotion });
        if (move.to === cell.square || !after.attackers(cell.square, side).includes(move.to)) continue;
        keeps.push(
          `${move.san} (still defends ${cell.square}; ${move.to} is attacked by ${attackersText(after, move.to, enemy)}` +
            `${after.isCheck() ? '; gives check' : ''})`,
        );
      }
      facts.push(
        `  moves of the ${PIECE_NAME[chess.get(guard)?.type ?? 'q']} from ${guard}: ${moves.length}; ones that keep defending ${cell.square}: ` +
          (keeps.length > 0 ? keeps.join('; ') : 'none'),
      );
    }
  }
  return facts;
}

function lineFacts(trap: TrapFile, index: number): string[] {
  const line = trap.lines[index];
  if (!line) return [];
  const player: Color = trap.side === 'white' ? 'w' : 'b';
  const moves = parseMovetext(line.moves);
  const chess = new Chess();
  const out: string[] = [];
  out.push(`[${index}] ${line.tag}${line.main ? ' (main)' : ''}: ${line.moves}`);

  for (const parsed of moves) {
    const mover: Color = sideOfPly(parsed.ply) === 'white' ? 'w' : 'b';
    const number = `${Math.floor(parsed.ply / 2) + 1}${mover === 'w' ? '.' : '...'}`;
    // The position before a marked mistake or before a move of the player: what is attacked.
    const before = new Chess(chess.fen());
    const move = chess.move(parsed.san);
    const notes: string[] = [];
    if (move.captured) {
      notes.push(
        `captures the ${PIECE_NAME[move.captured]} on ${move.to} (before the move it was attacked by ` +
          `${attackersText(before, move.to, mover)} and defended by ${attackersText(before, move.to, other(mover))})`,
      );
    }
    // Enemy pieces the moved piece attacks from its new square.
    const targets: string[] = [];
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.color !== mover && chess.attackers(cell.square, mover).includes(move.to)) {
          targets.push(`${PIECE_NAME[cell.type]} ${cell.square}`);
        }
      }
    }
    if (targets.length > 0) notes.push(`from ${move.to} it attacks: ${targets.join(', ')}`);
    if (chess.isCheckmate()) notes.push('checkmate');
    else if (chess.isCheck()) {
      // Names the checking piece: a discovered check comes from a piece that did not move.
      const checkers = chess.attackers(kingSquare(chess, other(mover)), mover);
      notes.push(`check from ${checkers.map((square) => pieceAt(chess, square)).join(', ')}`);
    }
    if (move.promotion) notes.push(`promotes to a ${PIECE_NAME[move.promotion]}`);
    // Was the moved piece left where the other side can take it, and is it defended?
    const takers = chess.attackers(move.to, other(mover));
    if (takers.length > 0 && !chess.isCheckmate()) {
      notes.push(
        `on ${move.to} it can be taken by ${takers.map((sq) => pieceAt(chess, sq)).join(', ')}; ` +
          `defended by ${attackersText(chess, move.to, mover)}`,
      );
    }
    if (parsed.mark) notes.push(`marked ${parsed.mark}`);
    // Legal alternatives count, to see how forced a reply to a check is.
    if (before.isCheck()) notes.push(`was in check with ${before.moves().length} legal move(s): ${before.moves().join(' ')}`);
    if (notes.length > 0) out.push(`    ${number}${parsed.san}: ${notes.join('; ')}`);
  }

  if (chess.isCheckmate()) {
    out.push(`  end: checkmate, ${colorName(other(chess.turn()))} wins`);
    out.push(...mateFacts(chess).map((fact) => `  ${fact}`));
  } else {
    out.push(`  end: no mate; ${colorName(chess.turn())} to move${chess.isCheck() ? ' (in check)' : ''}`);
    out.push(`  material, player minus opponent: ${materialBalance(chess, player)} (pawn 1, minor 3, rook 5, queen 9)`);
    // Pieces of each side that the other side attacks in the final position.
    for (const color of [player, other(player)]) {
      const hanging: string[] = [];
      for (const row of chess.board()) {
        for (const cell of row) {
          if (!cell || cell.color !== color || cell.type === 'k') continue;
          const attackers = chess.attackers(cell.square, other(color));
          if (attackers.length === 0) continue;
          const defenders = chess.attackers(cell.square, color);
          hanging.push(
            `${PIECE_NAME[cell.type]} ${cell.square} (attacked by ${attackers.join(',')}; defended by ${defenders.join(',') || 'nobody'})`,
          );
        }
      }
      out.push(`  ${colorName(color)} pieces under attack: ${hanging.join('; ') || 'none'}`);
    }
    out.push(...guardFacts(chess).map((fact) => `  guard: ${fact}`));
  }
  const result = line.result;
  if (result?.cp !== undefined) {
    out.push(`  engine (stored by verify): ${(result.cp / 100).toFixed(2)} for the player, best move ${result.best ?? '?'}`);
  } else if (result?.mate !== undefined) {
    out.push(`  engine (stored by verify): mate in ${result.mate} for the player, best move ${result.best ?? '?'}`);
  }
  return out;
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('Usage: node scripts/explain-facts.ts <trap id> [<trap id> ...]');
  process.exit(1);
}
for (const id of ids) {
  const trap = JSON.parse(readFileSync(`content/traps/${id}.json`, 'utf8')) as TrapFile;
  const engine = trap.verification;
  console.log(`\n# ${id} (${trap.title.en}), the player is ${trap.side}`);
  if (engine) console.log(`engine: ${engine.engine}, ${engine.nodes} nodes`);
  trap.lines.forEach((_, index) => console.log(lineFacts(trap, index).join('\n')));
}
