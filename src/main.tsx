import { render } from 'preact';
import { App } from './app';
import { initSchedule } from './core/schedule';
import { isNativeApp } from './platform/native';
import { startReminders } from './platform/notifications';
import { initPwa } from './pwa';
import { loadStore } from './storage/store';
import './styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

// Saved progress and the review scheduler are needed by the very first screen. The
// scheduler comes first: records of an older build are brought up to date while they are
// read, and a failed puzzle gets its review card there.
await initSchedule();
await loadStore();
render(<App />, root);
if (isNativeApp()) startReminders();
else initPwa();
