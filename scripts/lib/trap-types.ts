// Shape of content/traps/*.json. Fields under "written by verify" are owned by scripts/verify.ts;
// everything else is authored by hand.

import type { Side } from './movetext.ts';

/**
 * What a line shows.
 * Trap files: `trap` (the opponent goes wrong and is punished), `decline` (the opponent goes
 * into it and bails out), `sound` (the opponent avoids it), `mistake` (the player goes wrong).
 * Defence files: `hold` (the correct defence), `punish` (the attacker overreaches),
 * `mistake` (the player goes wrong).
 */
export type LineTag = 'trap' | 'decline' | 'sound' | 'mistake' | 'hold' | 'punish';

/**
 * What verify requires at the end of the line, from the player's point of view.
 * `mate`: the final position is checkmate delivered by the player.
 * `win`: engine evaluation at or above the win threshold (or a forced mate).
 * `hold`: evaluation at or above the hold threshold (the defence stands).
 * `loss`: evaluation at or below the loss threshold (shows why a move is a mistake).
 * `eval`: no requirement; the evaluation is only recorded (the honest number).
 */
export type Expect = 'mate' | 'win' | 'hold' | 'loss' | 'eval';

export interface LineResult {
  /** "checkmate": the player mates. "checkmated": the player is mated. */
  end?: 'checkmate' | 'checkmated';
  /** Centipawns for the player. */
  cp?: number;
  /** Forced mate in N; negative when the player is being mated. */
  mate?: number;
  /** Engine's best move in the final position (UCI). */
  best?: string;
  ok: boolean;
  problem?: string;
}

export interface TrapLine {
  tag: LineTag;
  /** Exactly one line per file: the line the app teaches and chains backwards. */
  main?: boolean;
  expect: Expect;
  /** Full move text from move 1. "?" or "??" on an opponent move marks the decisive mistake. */
  moves: string;
  note?: string;
  /** Written by verify. */
  result?: LineResult;
}

export type Reliability = 'solid' | 'risky' | 'dubious';

export interface Verification {
  engine: string;
  nodes: number;
  hashMb: number;
  winCp: number;
  holdCp: number;
  lossCp: number;
  setupMoves: number;
  blowMoves: number;
  firstBlowMove: string;
  /** Lowest evaluation among the lines where the opponent plays correctly. */
  worstCorrectPlayCp: number | null;
  reliability: Reliability | null;
  problems: string[];
}

export interface TrapFile {
  schema: 1;
  id: string;
  kind: 'trap' | 'defence';
  title: { ru: string; en: string };
  side: Side;
  /** "core": the owner's current repertoire. "branch": a second reply. "outside": other openings. */
  repertoire: 'core' | 'branch' | 'outside';
  /** Ladder stage, see content/ROADMAP.md. Data, not code: change it here to move a trap. */
  stage: number;
  /** One sentence: why the trap sits on this stage. */
  stageReason: string;
  idea: { ru: string; en: string };
  sacrifice: 'none' | 'pawn' | 'minor' | 'rook' | 'queen';
  /** Lichess puzzle theme keys the player should have met before. */
  prerequisites: string[];
  lines: TrapLine[];
  sources: { label: string; url: string }[];
  notes?: string;
  /** A draft may fail verification without failing CI. It is listed as unverified. */
  draft?: boolean;
  /** Written by verify. Never set by hand. */
  verified?: boolean;
  /** Written by verify. */
  verification?: Verification;
}

export interface BacklogEntry {
  name: string;
  side: 'white' | 'black' | 'unknown';
  repertoire: 'core' | 'branch' | 'outside';
  note: string;
  sources: { label: string; url: string }[];
}
