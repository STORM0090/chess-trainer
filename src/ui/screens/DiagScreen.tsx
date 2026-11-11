import { useEffect, useState } from 'preact/hooks';
import { engineScriptUrl } from '../../engine/engine-files';
import { UciEngine } from '../../engine/uci-client';
import { t } from '../../i18n';

/** White mates in one with Ra8#. Used to check that the engine actually calculates. */
const MATE_IN_ONE_FEN = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
const MATE_IN_ONE_MOVE = 'a1a8';

/** Smallest module that uses a SIMD instruction (from the wasm-feature-detect project). */
const SIMD_PROBE = new Uint8Array([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
  253, 98, 11,
]);

type Row = [label: string, value: string];

interface StorageInfo {
  persisted: boolean | undefined;
  usage: string;
}

type EngineReport =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'failed'; error: string }
  | {
      status: 'passed' | 'failed';
      name: string;
      loadMs: number;
      searchMs: number;
      depth: number | undefined;
      knps: number | undefined;
      bestMove: string | undefined;
      mateFound: boolean;
    };

const yesNo = (value: boolean | undefined): string =>
  value === undefined ? t.diag.unknown : value ? t.diag.yes : t.diag.no;

function megabytes(bytes: number | undefined): string {
  return bytes === undefined ? '?' : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function appRows(): Row[] {
  const commit = import.meta.env.VITE_COMMIT;
  const branch = import.meta.env.VITE_BRANCH;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari reports an installed app through this non-standard flag.
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const serviceWorker = !('serviceWorker' in navigator)
    ? t.diag.swUnsupported
    : navigator.serviceWorker.controller
      ? t.diag.swActive
      : t.diag.swInactive;
  return [
    [t.diag.version, __APP_VERSION__],
    [t.diag.build, commit ? `${branch ?? '?'} @ ${commit}` : t.diag.localBuild],
    [t.diag.displayMode, standalone ? t.diag.displayStandalone : t.diag.displayBrowser],
    [t.diag.serviceWorker, serviceWorker],
    [t.diag.online, navigator.onLine ? t.diag.onlineYes : t.diag.onlineNo],
  ];
}

function deviceRows(): Row[] {
  const wasm = typeof WebAssembly === 'object';
  return [
    [t.diag.userAgent, navigator.userAgent],
    // Android WebView adds "; wv)" to its user agent.
    [t.diag.webView, yesNo(/; wv\)/.test(navigator.userAgent))],
    [
      t.diag.screen,
      `${window.innerWidth}×${window.innerHeight}, DPR ${window.devicePixelRatio.toFixed(2)}`,
    ],
    [t.diag.wasm, yesNo(wasm)],
    [t.diag.wasmSimd, yesNo(wasm && WebAssembly.validate(SIMD_PROBE))],
    [t.diag.crossOriginIsolated, yesNo(window.crossOriginIsolated)],
    [t.diag.indexedDb, yesNo('indexedDB' in window)],
  ];
}

async function readStorage(): Promise<StorageInfo> {
  if (!navigator.storage) return { persisted: undefined, usage: t.diag.unknown };
  const [persisted, estimate] = await Promise.all([
    navigator.storage.persisted?.(),
    navigator.storage.estimate?.(),
  ]);
  return {
    persisted,
    usage: estimate ? `${megabytes(estimate.usage)} / ${megabytes(estimate.quota)}` : t.diag.unknown,
  };
}

function storageRows(storage: StorageInfo | undefined): Row[] {
  if (!storage) return [];
  return [
    [t.diag.persisted, yesNo(storage.persisted)],
    [t.diag.usage, storage.usage],
  ];
}

async function runEngineTest(): Promise<EngineReport> {
  const started = performance.now();
  let engine: UciEngine | undefined;
  try {
    engine = new UciEngine(engineScriptUrl());
    const name = await engine.init();
    const loadMs = Math.round(performance.now() - started);

    const searchStarted = performance.now();
    const search = await engine.go(undefined, { depth: 12 });
    const searchMs = Math.round(performance.now() - searchStarted);

    const mate = await engine.go(MATE_IN_ONE_FEN, { depth: 6 });
    const mateFound = mate.bestMove === MATE_IN_ONE_MOVE && mate.info?.score?.type === 'mate';

    return {
      status: search.bestMove && mateFound ? 'passed' : 'failed',
      name,
      loadMs,
      searchMs,
      depth: search.info?.depth,
      knps: search.info?.nps === undefined ? undefined : Math.round(search.info.nps / 1000),
      bestMove: search.bestMove,
      mateFound,
    };
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
  } finally {
    engine?.terminate();
  }
}

function engineRows(report: EngineReport): Row[] {
  if (report.status === 'idle' || report.status === 'running') return [];
  if ('error' in report) return [[t.diag.engineError, report.error]];
  return [
    [t.diag.engineName, report.name],
    [t.diag.engineLoad, `${report.loadMs} ${t.diag.ms}`],
    [
      t.diag.engineSearch,
      `${report.searchMs} ${t.diag.ms}, ${t.diag.depth} ${report.depth ?? '?'}, ` +
        `${report.knps ?? '?'} ${t.diag.knps}, ${t.diag.bestMove} ${report.bestMove ?? '?'}`,
    ],
    [t.diag.engineMate, report.mateFound ? t.diag.engineMateFound : t.diag.engineMateMissed],
  ];
}

function engineVerdict(report: EngineReport): string {
  switch (report.status) {
    case 'idle':
      return t.diag.engineIdle;
    case 'running':
      return t.diag.engineRunning;
    case 'passed':
      return t.diag.enginePassed;
    case 'failed':
      return t.diag.engineFailed;
  }
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section class="diag-section">
      <h2>{title}</h2>
      <dl class="diag-rows">
        {rows.map(([label, value]) => (
          <div key={label} class="diag-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Device and engine self-check. Its text report can be copied and sent to the developer. */
export function DiagScreen() {
  const [storage, setStorage] = useState<StorageInfo>();
  const [engine, setEngine] = useState<EngineReport>({ status: 'idle' });
  const [copyStatus, setCopyStatus] = useState<string>();

  useEffect(() => {
    void readStorage().then(setStorage);
  }, []);

  const sections: [string, Row[]][] = [
    [t.diag.sectionApp, appRows()],
    [t.diag.sectionDevice, deviceRows()],
    [t.diag.sectionStorage, storageRows(storage)],
    [t.diag.sectionEngine, [[t.diag.engineResult, engineVerdict(engine)], ...engineRows(engine)]],
  ];

  const report = sections
    .map(([title, rows]) =>
      [`== ${title}`, ...rows.map(([label, value]) => `${label}: ${value}`)].join('\n'),
    )
    .join('\n\n');

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus(t.diag.copied);
    } catch {
      setCopyStatus(t.diag.copyFailed);
    }
  };

  const requestPersist = async () => {
    await navigator.storage?.persist?.();
    setStorage(await readStorage());
  };

  const [appSection, deviceSection, storageSection] = sections;

  return (
    <div class="screen diag-screen">
      <h1 class="screen-title">{t.diag.title}</h1>
      <p class="hint">{t.diag.intro}</p>

      <section class="diag-section">
        <h2>{t.diag.sectionEngine}</h2>
        <p
          class={`verdict ${engine.status === 'passed' ? 'verdict-ok' : ''} ${
            engine.status === 'failed' ? 'verdict-bad' : ''
          }`}
          role="status"
        >
          {engineVerdict(engine)}
        </p>
        <dl class="diag-rows">
          {engineRows(engine).map(([label, value]) => (
            <div key={label} class="diag-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          class="button button-primary button-wide"
          disabled={engine.status === 'running'}
          onClick={async () => {
            setEngine({ status: 'running' });
            setEngine(await runEngineTest());
          }}
        >
          {t.diag.runEngine}
        </button>
      </section>

      {appSection && <Section title={appSection[0]} rows={appSection[1]} />}
      {deviceSection && <Section title={deviceSection[0]} rows={deviceSection[1]} />}
      {storageSection && <Section title={storageSection[0]} rows={storageSection[1]} />}
      {storage?.persisted === false && (
        <button type="button" class="button button-wide" onClick={requestPersist}>
          {t.diag.requestPersist}
        </button>
      )}

      <section class="diag-section">
        <h2>{t.diag.report}</h2>
        <button type="button" class="button button-wide" onClick={copyReport}>
          {t.diag.copyReport}
        </button>
        {copyStatus && (
          <p class="hint" role="status">
            {copyStatus}
          </p>
        )}
        <pre class="report">{report}</pre>
      </section>
    </div>
  );
}
