/** Parsers for the subset of the UCI protocol the app uses. Pure functions, no engine needed. */

export type UciScore = { type: 'cp'; value: number } | { type: 'mate'; value: number };

export interface UciInfo {
  depth?: number;
  nodes?: number;
  /** Nodes per second. */
  nps?: number;
  /** Search time in milliseconds. */
  time?: number;
  multipv?: number;
  score?: UciScore;
  /** Principal variation as UCI moves ("e2e4"). */
  pv?: string[];
}

export interface UciBestMove {
  /** UCI move, or undefined when the engine answers "(none)" (no legal moves). */
  bestMove: string | undefined;
  ponder?: string;
}

const NUMERIC_FIELDS = ['depth', 'nodes', 'nps', 'time', 'multipv'] as const;

/** Parses an "info ..." line. Returns undefined for other lines and for "info string ...". */
export function parseInfo(line: string): UciInfo | undefined {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'info' || tokens[1] === 'string') return undefined;

  const info: UciInfo = {};
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const numeric = NUMERIC_FIELDS.find((field) => field === token);
    if (numeric) {
      const value = Number(tokens[i + 1]);
      if (Number.isFinite(value)) info[numeric] = value;
      i++;
    } else if (token === 'score') {
      const type = tokens[i + 1];
      const value = Number(tokens[i + 2]);
      if ((type === 'cp' || type === 'mate') && Number.isFinite(value)) info.score = { type, value };
      i += 2;
    } else if (token === 'pv') {
      info.pv = tokens.slice(i + 1);
      break;
    }
  }
  return info;
}

/** Parses a "bestmove ..." line. Returns undefined for other lines. */
export function parseBestMove(line: string): UciBestMove | undefined {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'bestmove') return undefined;
  const move = tokens[1];
  const result: UciBestMove = { bestMove: move && move !== '(none)' ? move : undefined };
  if (tokens[2] === 'ponder' && tokens[3]) result.ponder = tokens[3];
  return result;
}

/** Extracts the engine name from an "id name ..." line. */
export function parseIdName(line: string): string | undefined {
  const match = /^id name (.+)$/.exec(line.trim());
  return match?.[1];
}
