import { describe, expect, it } from 'vitest';
import { allTraps, getTrap } from '../src/content/traps';
import {
  blowDepths,
  chainLength,
  chainStartPly,
  chainSteps,
  isStepDone,
  lineKey,
  nextChainStep,
  openDeviations,
  reviewLine,
  type ChainState,
} from '../src/core/chain';
import { commonPrefix } from '../src/core/trap-model';

function trap(id: string) {
  const found = getTrap(id);
  if (!found) throw new Error(`No trap "${id}"`);
  return found;
}

const NOTHING: ChainState = { chainDepth: 0, lines: {} };

describe('backward chain of the Legal Trap', () => {
  const legal = trap('legal-mate');
  const steps = chainSteps(legal);
  const main = steps.filter((step) => step.kind === 'main');

  it('has one depth per player move, the last move first', () => {
    expect(chainLength(legal)).toBe(7);
    expect(main.map((step) => step.depth)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // 7.Nd5# is ply 12, 6.Bxf7+ is ply 10, 5.Nxe5 is ply 8, and the last depth is move 1.
    expect(main.map((step) => step.startPly)).toEqual([12, 10, 8, 6, 4, 2, 0]);
    expect(legal.main.steps[chainStartPly(legal, 1)]?.san).toBe('Nd5#');
    expect(legal.main.steps[chainStartPly(legal, 3)]?.san).toBe('Nxe5');
  });

  it('knows how many depths belong to the blow', () => {
    // Nxe5, Bxf7+ and Nd5#.
    expect(blowDepths(legal)).toBe(3);
    expect(blowDepths(trap('scholars-mate-defence'))).toBe(0);
  });

  it('starts with the final move and puts each deviation after the depth it belongs to', () => {
    expect(steps[0]).toMatchObject({ kind: 'main', depth: 1 });
    const seenDepths = new Set<number>();
    for (const step of steps) {
      if (step.kind === 'main') seenDepths.add(step.depth);
      else expect(seenDepths.has(step.depth)).toBe(true);
    }
  });

  it('opens a decline after the depth that starts with the sacrifice', () => {
    // 5.Nxe5 and now Black does not take the queen.
    const decline = steps.find(
      (step) => step.kind === 'deviation' && commonPrefix(legal.main, step.line) === 9,
    );
    expect(decline).toMatchObject({ depth: 3, startPly: 8 });
  });
});

describe('chainSteps for every trap', () => {
  it('builds a chain that can be played', () => {
    for (const file of allTraps()) {
      const compiled = trap(file.id);
      const steps = chainSteps(compiled);
      const length = chainLength(compiled);
      expect(length, file.id).toBeGreaterThan(0);
      expect(steps.filter((step) => step.kind === 'main'), file.id).toHaveLength(length);
      for (const step of steps) {
        const leaves = commonPrefix(compiled.main, step.line);
        if (step.kind === 'main') {
          // Every depth except the last starts with a move of the player.
          if (step.depth < length) {
            expect(step.line.steps[step.startPly]?.mover, file.id).toBe(compiled.side);
          } else {
            expect(step.startPly, file.id).toBe(0);
          }
        } else {
          // The opponent leaves the main line after the start of the run...
          expect(step.startPly, file.id).toBeLessThanOrEqual(leaves);
          expect(step.line.steps[leaves]?.mover, file.id).not.toBe(compiled.side);
          // ...and the player still has something to do.
          const answers = step.line.steps.filter(
            (move) => move.ply > leaves && move.mover === compiled.side,
          );
          expect(answers.length, file.id).toBeGreaterThan(0);
        }
      }
      const keys = new Set(compiled.lines.map(lineKey));
      expect(keys.size, `${file.id}: line keys are unique`).toBe(compiled.lines.length);
    }
  });
});

describe('reviewLine', () => {
  it('picks the main line or one of the deviations, by the random numbers it is given', () => {
    const legal = trap('legal-mate');
    const deviations = chainSteps(legal)
      .filter((step) => step.kind === 'deviation')
      .map((step) => step.line);
    expect(deviations.length).toBeGreaterThan(1);
    const sequence = (...values: number[]) => () => values.shift() ?? 0;
    expect(reviewLine(legal, sequence(0.1)).main).toBe(true);
    expect(reviewLine(legal, sequence(0.9, 0))).toBe(deviations[0]);
    expect(reviewLine(legal, sequence(0.9, 0.9999))).toBe(deviations.at(-1));
  });

  it('is the main line when the trap has no deviation to practise', () => {
    const quiet = allTraps()
      .map((file) => trap(file.id))
      .find((compiled) => chainSteps(compiled).every((step) => step.kind === 'main'));
    if (!quiet) throw new Error('every trap has a deviation');
    expect(reviewLine(quiet, () => 0.99).main).toBe(true);
  });
});

describe('nextChainStep', () => {
  const fools = trap('fools-mate');
  const steps = chainSteps(fools);

  it('walks the steps in order and ends when all are done', () => {
    expect(nextChainStep(fools, NOTHING)).toEqual(steps[0]);
    expect(nextChainStep(fools, { chainDepth: 1, lines: {} })).toMatchObject({ kind: 'main', depth: 2 });

    const afterMain: ChainState = { chainDepth: chainLength(fools), lines: {} };
    const deviation = nextChainStep(fools, afterMain);
    expect(deviation?.kind).toBe('deviation');
    expect(openDeviations(fools, afterMain)).toBeGreaterThan(0);

    const lines: ChainState['lines'] = {};
    for (const step of steps) {
      if (step.kind === 'deviation') lines[step.key] = { clean: 0, skipped: true };
    }
    const finished: ChainState = { chainDepth: chainLength(fools), lines };
    expect(nextChainStep(fools, finished)).toBeUndefined();
    expect(openDeviations(fools, finished)).toBe(0);
  });

  it('counts a deviation as done after a clean run or a skip, not after a failed one', () => {
    const deviation = steps.find((step) => step.kind === 'deviation');
    if (!deviation) throw new Error('fools-mate has no deviation');
    expect(isStepDone(deviation, { chainDepth: 9, lines: {} })).toBe(false);
    expect(isStepDone(deviation, { chainDepth: 9, lines: { [deviation.key]: { clean: 0, skipped: false } } })).toBe(false);
    expect(isStepDone(deviation, { chainDepth: 9, lines: { [deviation.key]: { clean: 1, skipped: false } } })).toBe(true);
    expect(isStepDone(deviation, { chainDepth: 9, lines: { [deviation.key]: { clean: 0, skipped: true } } })).toBe(true);
  });
});
