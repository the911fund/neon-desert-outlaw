export enum GameMode {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  CONTROLS = 'CONTROLS',
  STORY = 'STORY',
}

export type ModeChangeHandler = (mode: GameMode) => void;

export class GameModeManager {
  private _mode: GameMode = GameMode.MENU;
  private listeners: ModeChangeHandler[] = [];

  get mode(): GameMode {
    return this._mode;
  }

  onChange(handler: ModeChangeHandler): void {
    this.listeners.push(handler);
  }

  setMode(mode: GameMode): void {
    if (mode === this._mode) return;
    this._mode = mode;
    for (const handler of this.listeners) {
      handler(mode);
    }
  }

  /** Convenience: transition to PLAYING (quick race). */
  startQuickRace(): void {
    this.setMode(GameMode.PLAYING);
  }

  /** Convenience: transition to STORY mode. */
  startStory(): void {
    this.setMode(GameMode.STORY);
  }

  /** Convenience: show controls overlay. */
  showControls(): void {
    this.setMode(GameMode.CONTROLS);
  }

  /** Convenience: return to main menu. */
  returnToMenu(): void {
    this.setMode(GameMode.MENU);
  }
}
