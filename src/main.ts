import { Application } from 'pixi.js';
import { Game } from './game/Game';
import { GameModeManager, GameMode } from './game/GameModeManager';
import { MainMenu } from './ui/MainMenu';

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

    const modeManager = new GameModeManager();

    const menu = new MainMenu({
      onQuickRace: () => modeManager.startQuickRace(),
      onStoryMode: () => modeManager.startStory(),
      onControls: () => modeManager.showControls(),
    });

    app.stage.addChild(menu.container);

    const game = new Game(app, () => {
      // ESC pressed during gameplay — return to menu
      game.stop();
      modeManager.returnToMenu();
    });

    // Respond to mode changes
    modeManager.onChange((mode) => {
      switch (mode) {
        case GameMode.MENU:
          game.stop();
          menu.container.visible = true;
          break;
        case GameMode.PLAYING:
          menu.container.visible = false;
          game.start();
          break;
        case GameMode.STORY:
          menu.container.visible = false;
          game.startStory();
          break;
        case GameMode.CONTROLS:
          menu.showControls();
          break;
      }
    });

    // Initial state: show menu
    menu.container.visible = true;
    menu.resize(window.innerWidth, window.innerHeight);

    // Menu update loop
    app.ticker.add(() => {
      if (menu.container.visible) {
        const dt = app.ticker.deltaMS / 1000;
        menu.update(dt);
      }
    });

    // Handle resize for menu
    window.addEventListener('resize', () => {
      menu.resize(window.innerWidth, window.innerHeight);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize Pixi application', error);
  });
