import { beforeAll, describe, expect, it } from 'vitest';
import { applyActivity, emptyDay } from '../src/core/daily';
import { startOfNextLocalDay } from '../src/core/days';
import { BACKUP_FORMAT, backupFileName, makeBackup, parseBackup } from '../src/core/backup';
import {
  applyChainRun,
  applyReview,
  defaultSettings,
  emptyData,
  emptyProgress,
  type AppData,
} from '../src/core/progress';
import { initSchedule } from '../src/core/schedule';
import { applyPuzzleStat, emptyTactics } from '../src/core/tactics';

const fixtures = import.meta.glob<string>('./fixtures/*.json', { eager: true, query: '?raw', import: 'default' });
const fixture = (name: string) => fixtures[`./fixtures/${name}`] ?? '';

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
    settings: {
      ...defaultSettings(),
      dailyNorm: 3,
      reminderTime: '07:30',
      lastBackupAt: NOW,
      botLevel: 4,
      botResults: ['loss', 'win', 'draw'],
      shvuChecklist: true,
    },
    puzzles: {
      '0000D': applyPuzzleStat(undefined, '0000D', { errors: 0, hints: 0 }, NOW),
      cfxZa: applyPuzzleStat(undefined, 'cfxZa', { errors: 2, hints: 1 }, NOW),
    },
    days: {
      '2026-11-14': {
        ...applyActivity(applyActivity(emptyDay('2026-11-14'), 'puzzle', true, 1, NOW), 'trapStep', false, 1, NOW),
        newTrap: 'fools-mate',
        session: [
          { kind: 'puzzle', id: '0000D', role: 'warmup', done: true, clean: true },
          { kind: 'trapReview', id: 'fools-mate', done: false, clean: null },
          { kind: 'trapStep', id: 'legal-mate', done: false, clean: null },
          { kind: 'puzzle', id: 'cfxZa', role: 'review', done: false, clean: null },
        ],
      },
    },
    tactics: {
      level: 1,
      test: { at: NOW, results: [true, true, false, true, true, true, false, true, true, false], level: 1 },
      recent: [true, false, true],
      updatedAt: NOW,
    },
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

  it('opens the file the M3 build wrote (format 1): traps and games, nothing else yet', () => {
    const parsed = parseBackup(fixture('backup-format-1.json'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.appVersion).toBe('0.4.0');
    expect(Object.keys(parsed.data.traps)).toEqual(['fools-mate', 'fools-mate-white', 'scholars-mate']);
    expect(parsed.data.traps['fools-mate']).toMatchObject({ chainDepth: 2, reviews: 1 });
    expect(parsed.data.traps['fools-mate']?.masteredAt).not.toBeNull();
    expect(parsed.data.traps['fools-mate-white']?.knownAt).not.toBeNull();
    expect(parsed.data.games).toHaveLength(2);
    expect(parsed.data.puzzles).toEqual({});
    expect(parsed.data.tactics).toEqual(emptyTactics());
    expect(parsed.data.days).toEqual({});
    expect(parsed.data.settings).toEqual(defaultSettings());
  });

  it('opens the file the M4 build wrote (format 2) and gives failed puzzles a review card', () => {
    const parsed = parseBackup(fixture('backup-format-2.json'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.appVersion).toBe('0.5.0');
    expect(Object.keys(parsed.data.traps)).toHaveLength(3);
    expect(parsed.data.tactics).toMatchObject({ level: 1, recent: [true, false, true] });
    expect(parsed.data.tactics.test?.results).toHaveLength(10);
    const { cfxZa, '9j0SG': retried, VJHBV: failed } = parsed.data.puzzles;
    // Solved at once, and failed then solved: nothing to review.
    expect(cfxZa).toMatchObject({ attempts: 1, clean: 1, card: null, dueAt: null });
    expect(retried).toMatchObject({ attempts: 2, clean: 1, lastClean: true, card: null, dueAt: null });
    // Failed last time: due on the day after, as the M4 rule "on another day" had it.
    expect(failed?.card).not.toBeNull();
    expect(failed?.dueAt).toBe(startOfNextLocalDay(failed?.lastAt ?? 0));
    expect(parsed.data.days).toEqual({});
    expect(parsed.data.settings).toEqual(defaultSettings());
  });

  it('reads a file of format 3 (M5): the bot settings start from their defaults', () => {
    const text = fileWith((file) => {
      file.format = 3;
      delete file.data.settings.botLevel;
      delete file.data.settings.botResults;
      delete file.data.settings.shvuChecklist;
    });
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.data.settings).toEqual({
      ...defaultSettings(),
      dailyNorm: 3,
      reminderTime: '07:30',
      lastBackupAt: NOW,
    });
    expect(parsed.ok && Object.keys(parsed.data.days)).toEqual(['2026-11-14']);
  });

  it('writes a file that an import brings back unchanged after an older file was read', () => {
    const old = parseBackup(fixture('backup-format-2.json'));
    if (!old.ok) throw new Error('fixture');
    const again = parseBackup(JSON.stringify(makeBackup(old.data, NOW, '0.6.0')));
    expect(again.ok && again.data).toEqual(old.data);
  });

  it('keeps a level that was never set', () => {
    const text = fileWith((file) => {
      file.data.tactics = emptyTactics();
    });
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.data.tactics).toEqual(emptyTactics());
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
      (file) => delete file.data.puzzles,
      (file) => delete file.data.tactics,
      (file) => (file.data.puzzles['cfxZa'].id = '0000D'),
      (file) => (file.data.puzzles['cfxZa'].clean = 5),
      (file) => (file.data.puzzles['cfxZa'].lastClean = 'no'),
      (file) => (file.data.puzzles['<script>'] = { id: '<script>', attempts: 1, clean: 0, lastAt: 1, lastClean: false }),
      (file) => (file.data.tactics.level = 9),
      (file) => (file.data.tactics.level = '1'),
      (file) => (file.data.tactics.recent = [1, 0]),
      (file) => (file.data.tactics.test.results = 'all'),
      (file) => (file.data.tactics.test.level = -1),
      (file) => (file.data.puzzles['cfxZa'].dueAt = null),
      (file) => (file.data.puzzles['0000D'].dueAt = 5),
      (file) => delete file.data.puzzles['cfxZa'].card,
      (file) => (file.data.puzzles['cfxZa'].card.stability = 'high'),
      (file) => delete file.data.days,
      (file) => (file.data.days['2026-11-14'].date = '2026-11-15'),
      (file) => (file.data.days['2026-02-30'] = { ...file.data.days['2026-11-14'], date: '2026-02-30' }),
      (file) => (file.data.days['2026-11-14'].done = -1),
      (file) => (file.data.days['2026-11-14'].newTrap = 'Not An Id'),
      (file) => (file.data.days['2026-11-14'].session[0].kind = 'game'),
      (file) => (file.data.days['2026-11-14'].session[0].role = 'boss'),
      (file) => (file.data.days['2026-11-14'].session[1].id = '<script>'),
      (file) => (file.data.days['2026-11-14'].session[2].clean = 'yes'),
      (file) => (file.data.days['2026-11-14'].session = 'none'),
      (file) => (file.data.settings.dailyNorm = 2),
      (file) => (file.data.settings.reminderTime = '25:00'),
      (file) => (file.data.settings.lastBackupAt = 'never'),
      (file) => delete file.data.settings.backupSnoozedUntil,
      (file) => (file.data.settings.botLevel = 0),
      (file) => (file.data.settings.botLevel = 99),
      (file) => (file.data.settings.botResults = ['won']),
      (file) => (file.data.settings.botResults = Array(11).fill('win')),
      (file) => (file.data.settings.shvuChecklist = 'on'),
    ];
    for (const change of damaged) {
      expect(parseBackup(fileWith(change)), String(change)).toEqual({ ok: false, problem: 'damaged' });
    }
  });
});
