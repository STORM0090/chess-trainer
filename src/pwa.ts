import { registerSW } from 'virtual:pwa-register';

export interface PwaState {
  /** A new version is downloaded and waiting; the user decides when to switch. */
  updateAvailable: boolean;
  /** Everything needed to run offline has been cached (shown once after the first visit). */
  offlineReady: boolean;
}

let state: PwaState = { updateAvailable: false, offlineReady: false };
let activateUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners = new Set<(state: PwaState) => void>();

function setState(patch: Partial<PwaState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

/** Registers the service worker. Call once at startup. */
export function initPwa(): void {
  activateUpdate = registerSW({
    onNeedRefresh: () => setState({ updateAvailable: true }),
    onOfflineReady: () => setState({ offlineReady: true }),
  });
}

export function getPwaState(): PwaState {
  return state;
}

export function subscribePwa(listener: (state: PwaState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Switches to the waiting version and reloads the page. */
export function applyUpdate(): void {
  void activateUpdate?.(true);
}

export function dismissPwaNotice(): void {
  setState({ updateAvailable: false, offlineReady: false });
}
