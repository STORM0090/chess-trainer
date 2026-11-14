// Backward chain: the player first learns the last move of the main line, then the last two,
// and so on back to move 1. After each depth the opponent's other replies from that part of
// the line are added as "deviation" steps. Pure functions, no UI and no storage.

import { learnQueue } from './learn';
import { commonPrefix, type CompiledLine, type CompiledTrap } from './trap-model';

export interface ChainStep {
  /** `main`: the main line from `startPly`. `deviation`: the opponent leaves the main line. */
  kind: 'main' | 'deviation';
  line: CompiledLine;
  /** The run starts in the position before this ply. */
  startPly: number;
  /**
   * Main step: how many of the player's last moves are played (1 is the final move only).
   * Deviation: the depth it follows.
   */
  depth: number;
  /** Stable name of the line, used in saved progress. */
  key: string;
}

/**
 * A short name for a line that survives reordering of the lines in a trap file.
 * FNV-1a over the moves; a changed line gets a new key and its progress starts again.
 */
export function lineKey(line: CompiledLine): string {
  let hash = 0x811c9dc5;
  for (const step of line.steps) {
    const text = `${step.san} `;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Plies of the player's moves in the main line. */
function playerPlies(trap: CompiledTrap): number[] {
  return trap.main.steps.filter((step) => step.mover === trap.side).map((step) => step.ply);
}

/** Number of depths in the chain: one per player move of the main line. */
export function chainLength(trap: CompiledTrap): number {
  return playerPlies(trap).length;
}

/** Where a main step of the given depth starts. The last depth starts at move 1. */
export function chainStartPly(trap: CompiledTrap, depth: number): number {
  const plies = playerPlies(trap);
  if (depth >= plies.length) return 0;
  return plies[plies.length - Math.max(depth, 1)] ?? 0;
}

/**
 * Number of depths that lie inside the blow (the combination itself), as measured by verify.
 * Depths above it add the quiet setup moves. 0 for a defence.
 */
export function blowDepths(trap: CompiledTrap): number {
  return Math.min(trap.file.verification?.blowMoves ?? 0, chainLength(trap));
}

/**
 * Every step of the chain in the order it is learned: depth 1, depth 2, and so on; after
 * each depth, the lines in which the opponent plays another move inside the part of the main
 * line that this depth added.
 *
 * Only lines that leave the main line by the opponent's move, and still have a move for the
 * player after that, become deviation steps. Lines where the player has a second good move
 * stay in Learn mode.
 */
export function chainSteps(trap: CompiledTrap): ChainStep[] {
  const length = chainLength(trap);
  const deviations = new Map<number, ChainStep[]>();
  for (const item of learnQueue(trap)) {
    const line = item.line;
    if (line.main) continue;
    const leaves = commonPrefix(trap.main, line);
    const first = line.steps[leaves];
    if (!first || first.mover === trap.side) continue;
    let depth = 1;
    while (depth < length && chainStartPly(trap, depth) > leaves) depth++;
    const step: ChainStep = {
      kind: 'deviation',
      line,
      startPly: chainStartPly(trap, depth),
      depth,
      key: lineKey(line),
    };
    const list = deviations.get(depth);
    if (list) list.push(step);
    else deviations.set(depth, [step]);
  }

  const steps: ChainStep[] = [];
  const mainKey = lineKey(trap.main);
  for (let depth = 1; depth <= length; depth++) {
    steps.push({
      kind: 'main',
      line: trap.main,
      startPly: chainStartPly(trap, depth),
      depth,
      key: mainKey,
    });
    steps.push(...(deviations.get(depth) ?? []));
  }
  return steps;
}

/**
 * The line of one review: the main line half of the time, otherwise one of the opponent's
 * deviations. The player always starts at move 1 and does not know which it will be.
 * `random` returns a number in [0, 1), like `Math.random`.
 */
export function reviewLine(trap: CompiledTrap, random: () => number): CompiledLine {
  const others = chainSteps(trap)
    .filter((step) => step.kind === 'deviation')
    .map((step) => step.line);
  if (others.length === 0 || random() < 0.5) return trap.main;
  return others[Math.min(Math.floor(random() * others.length), others.length - 1)] ?? trap.main;
}

/** What the chain needs to know about saved progress. */
export interface ChainState {
  /** Depths of the main line completed without errors and hints. */
  chainDepth: number;
  /** Per deviation line (by `lineKey`). */
  lines: Record<string, { clean: number; skipped: boolean } | undefined>;
}

export function isStepDone(step: ChainStep, state: ChainState): boolean {
  if (step.kind === 'main') return state.chainDepth >= step.depth;
  const stat = state.lines[step.key];
  return stat !== undefined && (stat.clean > 0 || stat.skipped);
}

/** The first step that is not done yet, or `undefined` when the whole chain is finished. */
export function nextChainStep(trap: CompiledTrap, state: ChainState): ChainStep | undefined {
  return chainSteps(trap).find((step) => !isStepDone(step, state));
}

/** Deviation steps that are still open (neither completed nor skipped). */
export function openDeviations(trap: CompiledTrap, state: ChainState): number {
  return chainSteps(trap).filter((step) => step.kind === 'deviation' && !isStepDone(step, state))
    .length;
}
