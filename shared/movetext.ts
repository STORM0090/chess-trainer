// Parsing of PGN-style move text used in content/traps/*.json, for example
// "1.e4 e5 2.Nf3 f6? 3.Nxe5! fxe5?? 4.Qh5+". Pure code: runs in Node scripts and in the app.

export type MoveMark = '!' | '!!' | '?' | '??' | '!?' | '?!';

export interface ParsedMove {
  /** SAN without the annotation mark, for example "Nxe5" or "Qh4#". */
  san: string;
  /** Annotation written after the move, if any. */
  mark: MoveMark | undefined;
  /** 0 for White's first move, 1 for Black's first move, and so on. */
  ply: number;
}

const MARK = /(\?\?|!!|\?!|!\?|\?|!)$/;
const MOVE_NUMBER = /^\d+\.(\.\.)?$/;

/**
 * Splits move text into moves. Move numbers ("3." and "3...") are optional and ignored;
 * the line always starts from the initial position with White's first move.
 */
export function parseMovetext(text: string): ParsedMove[] {
  const moves: ParsedMove[] = [];
  // "3.Nxe5" and "3...fxe5" are split into the number and the move first.
  const tokens = text
    .replace(/(\d+\.(?:\.\.)?)(?=\S)/g, '$1 ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
  for (const token of tokens) {
    if (MOVE_NUMBER.test(token)) continue;
    const mark = MARK.exec(token)?.[1] as MoveMark | undefined;
    const san = mark ? token.slice(0, -mark.length) : token;
    if (san.length === 0) throw new Error(`Empty move in "${text}"`);
    moves.push({ san, mark, ply: moves.length });
  }
  return moves;
}

/** Formats moves back into numbered text: "1.e4 e5 2.Nf3". `fromPly` allows a suffix: "4...g6 5.Nxe5". */
export function formatMoves(moves: ParsedMove[], fromPly = 0, withMarks = true): string {
  const parts: string[] = [];
  for (const move of moves) {
    if (move.ply < fromPly) continue;
    const number = Math.floor(move.ply / 2) + 1;
    const text = move.san + (withMarks && move.mark ? move.mark : '');
    if (move.ply % 2 === 0) parts.push(`${number}.${text}`);
    else if (move.ply === fromPly) parts.push(`${number}...${text}`);
    else parts.push(text);
  }
  return parts.join(' ');
}

export type Side = 'white' | 'black';

export function sideOfPly(ply: number): Side {
  return ply % 2 === 0 ? 'white' : 'black';
}

export interface Shape {
  /** Player moves before the opponent's decisive mistake (the memory load). */
  setupMoves: number;
  /** Player moves from the decisive mistake to the end of the line. */
  blowMoves: number;
  /** How the first move of the blow looks to the player. */
  firstBlowMove: 'mate' | 'check' | 'capture' | 'quiet' | 'none';
  /** Ply of the decisive mistake, or undefined when the line marks none. */
  mistakePly: number | undefined;
}

/**
 * Measures a main line. The decisive mistake is the first opponent move marked "?" or "??"
 * ("?!" does not count). Without such a mark the whole line counts as setup.
 */
export function measureLine(moves: ParsedMove[], player: Side): Shape {
  const mistake = moves.find(
    (move) => sideOfPly(move.ply) !== player && (move.mark === '?' || move.mark === '??'),
  );
  const playerMoves = moves.filter((move) => sideOfPly(move.ply) === player);
  if (!mistake) {
    return { setupMoves: playerMoves.length, blowMoves: 0, firstBlowMove: 'none', mistakePly: undefined };
  }
  const blow = playerMoves.filter((move) => move.ply > mistake.ply);
  const first = blow[0]?.san;
  const firstBlowMove = !first
    ? 'none'
    : first.endsWith('#')
      ? 'mate'
      : first.endsWith('+')
        ? 'check'
        : first.includes('x')
          ? 'capture'
          : 'quiet';
  return {
    setupMoves: playerMoves.length - blow.length,
    blowMoves: blow.length,
    firstBlowMove,
    mistakePly: mistake.ply,
  };
}

/** Index of the first ply where two lines differ (or the shorter length). */
export function divergencePly(a: ParsedMove[], b: ParsedMove[]): number {
  let ply = 0;
  while (ply < a.length && ply < b.length && a[ply]?.san === b[ply]?.san) ply++;
  return ply;
}
