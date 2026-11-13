import { describe, expect, it } from 'vitest';
import { allTraps, getTrap } from '../src/content/traps';
import { hintLevelForErrors, judgeMove, knownMistakes, learnQueue } from '../src/core/learn';
import { commonPrefix, fenAtPly, positionKey, START_FEN } from '../src/core/trap-model';

function trap(id: string) {
  const found = getTrap(id);
  if (!found) throw new Error(`No trap "${id}"`);
  return found;
}

describe('trap content in the app', () => {
  it('loads every verified trap, ordered by stage', () => {
    const traps = allTraps();
    expect(traps.length).toBeGreaterThanOrEqual(32);
    const stages = traps.map((file) => file.stage);
    expect(stages).toEqual([...stages].sort((a, b) => a - b));
    expect(getTrap('no-such-trap')).toBeUndefined();
  });

  it('compiles the main line of the Legal Trap', () => {
    const legal = trap('legal-mate');
    expect(legal.side).toBe('white');
    expect(legal.main.steps.map((step) => step.san).at(-1)).toBe('Nd5#');
    expect(legal.main.steps.at(-1)).toMatchObject({ from: 'c3', to: 'd5', kind: 'mate', mover: 'white' });
    expect(legal.main.steps[8]).toMatchObject({ san: 'Nxe5', kind: 'capture' });
    expect(legal.main.steps[10]).toMatchObject({ san: 'Bxf7+', kind: 'check' });
    expect(fenAtPly(legal.main, 0)).toBe(START_FEN);
    expect(fenAtPly(legal.main, 1)).toBe(legal.main.steps[0]?.fenAfter);
  });

  it('keeps an underpromotion as the expected move', () => {
    const lasker = trap('lasker-trap');
    const promotion = lasker.main.steps.find((step) => step.san.includes('='));
    expect(promotion).toMatchObject({ san: 'fxg1=N+', promotion: 'n' });
  });
});

describe('learnQueue', () => {
  it('starts with the main line from move 1', () => {
    const queue = learnQueue(trap('legal-mate'));
    expect(queue[0]).toMatchObject({ startPly: 0, playerMoves: 7 });
    expect(queue[0]?.line.main).toBe(true);
  });

  it('starts later lines where they leave the earlier ones', () => {
    const legal = trap('legal-mate');
    const queue = learnQueue(legal);
    for (const item of queue.slice(1)) {
      expect(item.startPly).toBeGreaterThan(0);
      expect(item.startPly).toBeGreaterThanOrEqual(commonPrefix(legal.main, item.line));
      expect(item.line.tag).not.toBe('mistake');
    }
  });

  it('skips lines that leave nothing for the player to do', () => {
    // Both "sound" lines of Fool's Mate end with the opponent's move.
    const queue = learnQueue(trap('fools-mate'));
    expect(queue.every((item) => item.playerMoves > 0)).toBe(true);
    expect(queue.some((item) => item.line.tag === 'sound')).toBe(false);
  });

  it('can be played through in every trap by making the expected moves', () => {
    for (const file of allTraps()) {
      const compiled = trap(file.id);
      const queue = learnQueue(compiled);
      expect(queue.length, file.id).toBeGreaterThan(0);
      for (const item of queue) {
        for (const step of item.line.steps.slice(item.startPly)) {
          if (step.mover !== compiled.side) continue;
          const verdict = judgeMove(compiled, item.line, step.ply, step);
          expect(verdict.kind, `${file.id}: ${step.san}`).toBe('correct');
        }
      }
    }
  });
});

describe('judgeMove', () => {
  it('rejects an unrelated move', () => {
    const legal = trap('legal-mate');
    expect(judgeMove(legal, legal.main, 0, { from: 'a2', to: 'a3', promotion: undefined })).toEqual({
      kind: 'wrong',
    });
  });

  it('recognises a mistake described in the trap file', () => {
    const legal = trap('legal-mate');
    const mistakes = knownMistakes(legal);
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]?.step.san).toBe('Nxe5');
    expect(mistakes[0]?.reply?.san).toBe('Nxe5');

    // The line with ...Nc6 and ...Bg4 where 5.h3 is right and 5.Nxe5 loses a piece.
    const line = legal.lines.find((candidate) =>
      candidate.steps.some(
        (step) => step.san === 'h3' && positionKey(step.fenBefore) === positionKey(mistakes[0]!.step.fenBefore),
      ),
    );
    expect(line).toBeDefined();
    const ply = line!.steps.findIndex((step) => step.san === 'h3');
    const verdict = judgeMove(legal, line!, ply, { from: 'f3', to: 'e5', promotion: undefined });
    expect(verdict.kind).toBe('knownMistake');
  });

  it('does not count a move from another line as an error', () => {
    // Scholar's Mate: the main line plays 2.Qh5, another line reaches the mate with 2.Bc4.
    const scholars = trap('scholars-mate');
    expect(scholars.main.steps[2]?.san).toBe('Qh5');
    const verdict = judgeMove(scholars, scholars.main, 2, { from: 'f1', to: 'c4', promotion: undefined });
    expect(verdict.kind).toBe('otherLine');
    // The line with the same moves so far, so a chain or review run can go on along it.
    const follow = verdict.kind === 'otherLine' ? verdict.follow : undefined;
    expect(follow?.steps[2]?.san).toBe('Bc4');
    expect(follow?.main).toBe(false);
  });

  it('wants the right promotion piece', () => {
    const lasker = trap('lasker-trap');
    const step = lasker.main.steps.find((candidate) => candidate.san === 'fxg1=N+')!;
    const base = { from: step.from, to: step.to };
    expect(judgeMove(lasker, lasker.main, step.ply, { ...base, promotion: 'n' }).kind).toBe('correct');
    expect(judgeMove(lasker, lasker.main, step.ply, { ...base, promotion: 'q' }).kind).not.toBe('correct');
  });
});

describe('hintLevelForErrors', () => {
  it('grows with errors and stops at the arrow', () => {
    expect([0, 1, 2, 3, 7].map(hintLevelForErrors)).toEqual([0, 1, 2, 3, 3]);
  });
});
