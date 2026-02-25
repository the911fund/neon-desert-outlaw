import { Application } from 'pixi.js';
import { Game } from './game/Game';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app element');
}

const app = new Application();

app
  .init({
    resizeTo: window,
    backgroundColor: 0x0f0b14,
    antialias: true,
  })
  .then(() => {
    root.appendChild(app.canvas as unknown as Node);
    new Game(app);
  })
  .catch((error) => {
    console.error('Failed to initialize Pixi application', error);
  });
