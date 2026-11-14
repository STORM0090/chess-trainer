import { beforeAll, describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, backupFileName, makeBackup, parseBackup } from '../src/core/backup';
import { applyChainRun, applyReview, emptyData, emptyProgress, type AppData } from '../src/core/progress';
import { initSchedule } from '../src/core/schedule';

const NOW = new Date(2026, 10, 14, 21, 30).getTime();
const TOMORROW = new Date(2026, 10, 15, 9, 0).getTime();
const CLEAN = { errors: 0, hints: 0 };

beforeAll(initSchedule);

function sample(): AppData {
  let fools = emptyProgress('fools-mate');
  fools = applyChainRun(fools, { kind: 'main', depth: 1, key: 'aaaaaaaa' }, 2, CLEAN, NOW);
  fools = applyChainRun(fools, { kind: 'main', depth: 2, key: 'aaaaaaaa' }, 2, CLEAN, NOW);
  fools = applyChainRun(fools, { kind: 'deviation', depth: 2, key: '0123abcd' }, 2, { errors: 1, hints: 0 }, NOW);
  fools = applyReview(fools, 'good', TOMORROW);
  return {
    traps: { 'fools-mate': fools, 'legal-mate': emptyProgress('legal-mate') },
    games: [{ id: 'g1', trapId: 'fools-mate', at: NOW, outcome: 'declined' }],
    settings: { clockShiftDays: 0 },
  };
}

function fileWith(change: (file: Record<string, any>) => void): string {
  const file = JSON.parse(JSON.stringify(makeBackup(sample(), NOW, '0.4.0')));
  change(file);
  return JSON.stringify(file);
}

describe('progress file', () => {
  it('survives export and import unchanged', () => {
    const data = sample();
    const parsed = parseBackup(JSON.stringify(makeBackup(data, NOW, '0.4.0')));
    expect(parsed).toEqual({
      ok: true,
      data,
      exportedAt: new Date(NOW).toISOString(),
      appVersion: '0.4.0',
    });
    expect(parseBackup(JSON.stringify(makeBackup(emptyData(), NOW, '0.4.0')))).toMatchObject({ ok: true });
  });

  it('is named by the local date', () => {
    expect(backupFileName(NOW)).toBe('chess-trainer-2026-11-14.json');
  });

  it('keeps progress of traps this version does not know', () => {
    const text = fileWith((file) => {
      file.data.traps['future-trap'] = { ...file.data.traps['legal-mate'], id: 'future-trap' };
    });
    const parsed = parseBackup(text);
    expect(parsed.ok && Object.keys(parsed.data.traps)).toContain('future-trap');
  });

  it('reads a file written before the "known" mark existed', () => {
    const text = fileWith((file) => {
      delete file.data.traps['fools-mate'].knownAt;
    });
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.data.traps['fools-mate']?.knownAt).toBeNull();
  });

  it('refuses text that is not a progress file', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, problem: 'notJson' });
    expect(parseBackup('[1, 2]')).toEqual({ ok: false, problem: 'notBackup' });
    expect(parseBackup('{"app":"other","format":1}')).toEqual({ ok: false, problem: 'notBackup' });
  });

  it('refuses a file from a newer version', () => {
    const text = fileWith((file) => {
      file.format = BACKUP_FORMAT + 1;
    });
    expect(parseBackup(text)).toEqual({ ok: false, problem: 'newerFormat' });
  });

  it('refuses a damaged file instead of importing a part of it', () => {
    const damaged: ((file: Record<string, any>) => void)[] = [
      (file) => delete file.data,
      (file) => (file.data.traps = []),
      (file) => (file.data.traps['fools-mate'].chainDepth = -1),
      (file) => (file.data.traps['fools-mate'].chainDepth = '2'),
      (file) => (file.data.traps['fools-mate'].id = 'legal-mate'),
      (file) => (file.data.traps['fools-mate'].knownAt = 'yes'),
      (file) => (file.data.traps['fools-mate'].card.dueAt = 'tomorrow'),
      (file) => delete file.data.traps['fools-mate'].card.stability,
      (file) => (file.data.traps['fools-mate'].lines['0123abcd'].skipped = 'no'),
      (file) => (file.data.traps['fools-mate'].lines['<script>'] = { clean: 0, failed: 0, skipped: false }),
      (file) => (file.data.games[0].outcome = 'won'),
      (file) => (file.data.games[0].trapId = 'Not An Id'),
      (file) => (file.data.settings = { clockShiftDays: 1.5 }),
      (file) => delete file.exportedAt,
    ];
    for (const change of damaged) {
      expect(parseBackup(fileWith(change)), String(change)).toEqual({ ok: false, problem: 'damaged' });
    }
  });
});
