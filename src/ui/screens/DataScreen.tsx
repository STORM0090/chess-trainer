import { useRef, useState } from 'preact/hooks';
import { backupFileName, makeBackup, parseBackup, type BackupProblem } from '../../core/backup';
import { trapStatus, type AppData } from '../../core/progress';
import { TOP_LEVEL } from '../../../shared/puzzle-types.ts';
import { fmt, t } from '../../i18n';
import { routeHref } from '../../router';
import { TEST_CLOCK } from '../../build-info';
import { replaceData, setClockShift, updateSettings, useStore } from '../../storage/store';
import { isNativeApp, saveTextFile } from '../../platform/native';

const DATE_AND_TIME = new Intl.DateTimeFormat('ru', { dateStyle: 'long', timeStyle: 'short' });

function withProgress(data: AppData): number {
  return Object.values(data.traps).filter((trap) => trapStatus(trap) !== 'new').length;
}

function puzzleSummary(data: AppData): string {
  const { level } = data.tactics;
  return fmt(t.data.puzzleSummary, {
    solved: Object.values(data.puzzles).filter((puzzle) => puzzle.clean > 0).length,
    level: level === null ? t.data.noLevel : `${level + 1} / ${TOP_LEVEL + 1}`,
  });
}

type ImportState =
  | { step: 'idle' }
  | { step: 'problem'; problem: BackupProblem }
  | { step: 'found'; data: AppData; exportedAt: string }
  | { step: 'done' }
  | { step: 'failed' };

/** Export and import of the progress file, and the test clock. */
export function DataScreen() {
  const { data } = useStore();
  const [exported, setExported] = useState<string>();
  const [incoming, setIncoming] = useState<ImportState>({ step: 'idle' });
  const fileInput = useRef<HTMLInputElement>(null);
  const shift = data.settings.clockShiftDays;

  const exportFile = async () => {
    // The real time, not the test clock: the file says when it was actually made.
    const now = Date.now();
    const name = backupFileName(now);
    // The file itself already says that it was saved now.
    const saved = { ...data, settings: { ...data.settings, lastBackupAt: now, backupSnoozedUntil: null } };
    const done = await saveTextFile(name, JSON.stringify(makeBackup(saved, now, __APP_VERSION__), null, 2), 'application/json');
    if (!done) return;
    updateSettings({ lastBackupAt: now, backupSnoozedUntil: null });
    setExported(name);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    setIncoming(
      parsed.ok
        ? { step: 'found', data: parsed.data, exportedAt: parsed.exportedAt }
        : { step: 'problem', problem: parsed.problem },
    );
    // The same file can be chosen again after a failed try.
    if (fileInput.current) fileInput.current.value = '';
  };

  const confirmImport = async (found: AppData) => {
    setIncoming({ step: (await replaceData(found)) ? 'done' : 'failed' });
  };

  const exportedDate = (iso: string): string => {
    const time = Date.parse(iso);
    return Number.isNaN(time) ? iso : DATE_AND_TIME.format(time);
  };

  return (
    <div class="screen list-screen data-screen">
      <h1 class="screen-title">{t.data.title}</h1>
      <p class="hint">{t.data.intro}</p>

      <section class="panel">
        <h2 class="panel-title">{t.data.summaryTitle}</h2>
        <p>
          {fmt(t.data.summary, {
            traps: withProgress(data),
            mastered: Object.values(data.traps).filter((trap) => trapStatus(trap) === 'mastered').length,
            games: data.games.length,
          })}
        </p>
        <p>{puzzleSummary(data)}</p>
      </section>

      <section class="panel">
        <h2 class="panel-title">{t.data.exportTitle}</h2>
        <p class="hint-text">{t.data.exportHelp}</p>
        <button type="button" class="button button-primary" onClick={() => void exportFile()}>
          {t.data.exportButton}
        </button>
        {exported && (
          <p class="verdict verdict-ok" role="status">
            {fmt(isNativeApp() ? t.data.shared : t.data.exported, { name: exported })}
          </p>
        )}
      </section>

      <section class="panel">
        <h2 class="panel-title">{t.data.importTitle}</h2>
        <p class="hint-text">{t.data.importHelp}</p>
        <input
          ref={fileInput}
          class="visually-hidden"
          type="file"
          // In the installed app the system picker greys out files whose type is not listed,
          // and a file that came through a messenger is often typed as plain text or as
          // "unknown". The content is checked after reading anyway.
          accept={isNativeApp() ? undefined : 'application/json,.json'}
          aria-label={t.data.importButton}
          onChange={(event) => void readFile(event.currentTarget.files?.[0])}
        />
        <button type="button" class="button" onClick={() => fileInput.current?.click()}>
          {t.data.importButton}
        </button>
        <div aria-live="polite">
          {incoming.step === 'problem' && <p class="verdict verdict-bad">{t.data.problem[incoming.problem]}</p>}
          {incoming.step === 'done' && <p class="verdict verdict-ok">{t.data.imported}</p>}
          {incoming.step === 'failed' && <p class="verdict verdict-bad">{t.data.importFailed}</p>}
          {incoming.step === 'found' && (
            <>
              <p>
                {fmt(t.data.importFound, {
                  date: exportedDate(incoming.exportedAt),
                  traps: withProgress(incoming.data),
                  games: incoming.data.games.length,
                })}{' '}
                {puzzleSummary(incoming.data)}
              </p>
              <div class="panel-actions">
                <button type="button" class="button button-primary" onClick={() => void confirmImport(incoming.data)}>
                  {t.data.importConfirm}
                </button>
                <button type="button" class="button" onClick={() => setIncoming({ step: 'idle' })}>
                  {t.data.importCancel}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {TEST_CLOCK && (
        <section class="panel">
          <h2 class="panel-title">{t.data.testTitle}</h2>
          <p class="hint-text">{t.data.testHelp}</p>
          <p class={shift > 0 ? 'verdict' : undefined} role="status">
            {shift > 0 ? fmt(t.data.clock, { n: shift }) : t.data.clockNormal}
          </p>
          <div class="panel-actions">
            <button type="button" class="button" onClick={() => setClockShift(shift + 1)}>
              {t.data.clockForward}
            </button>
            <button type="button" class="button" disabled={shift === 0} onClick={() => setClockShift(0)}>
              {t.data.clockReset}
            </button>
          </div>
        </section>
      )}

      <a class="button button-quiet" href={routeHref({ name: 'more' })}>
        {t.more.back}
      </a>
    </div>
  );
}
