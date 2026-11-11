import { render } from 'preact';
import { App } from './app';
import { initPwa } from './pwa';
import './styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

render(<App />, root);
initPwa();
