import { render } from 'preact';
import { App } from './app';
import { initSchedule } from './core/schedule';
import { initPwa } from './pwa';
import { loadStore } from './storage/store';
import './styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

// Saved progress and the review scheduler are needed by the very first screen.
await Promise.all([loadStore(), initSchedule()]);
render(<App />, root);
initPwa();
