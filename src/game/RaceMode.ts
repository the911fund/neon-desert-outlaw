export enum RaceState {
  TITLE = 'TITLE',
  READY = 'READY',
  COUNTDOWN = 'COUNTDOWN',
  RACING = 'RACING',
  FINISHED = 'FINISHED',
}

const BEST_TIME_KEY = 'ndo-best-time';

export class RaceMode {
  state: RaceState = RaceState.TITLE;
  raceTime = 0;
  countdownTimer = 0;
  countdownValue = 3;
  bestTime: number | null = null;
  private enterPressed = false;
  private enterWasDown = false;

  constructor() {
    this.loadBestTime();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Enter') {
      this.enterPressed = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Enter') {
      this.enterPressed = false;
    }
  };

  /** Returns true on the frame Enter is newly pressed (edge detection). */
  private consumeEnter(): boolean {
    const pressed = this.enterPressed && !this.enterWasDown;
    this.enterWasDown = this.enterPressed;
    return pressed;
  }

  update(dt: number): void {
    const enterJustPressed = this.consumeEnter();

    switch (this.state) {
      case RaceState.TITLE:
        if (enterJustPressed) {
          this.state = RaceState.READY;
        }
        break;

      case RaceState.READY:
        if (enterJustPressed) {
          this.state = RaceState.COUNTDOWN;
          this.countdownTimer = 3;
          this.countdownValue = 3;
          this.raceTime = 0;
        }
        break;

      case RaceState.COUNTDOWN:
        this.countdownTimer -= dt;
        this.countdownValue = Math.ceil(this.countdownTimer);
        if (this.countdownTimer <= 0) {
          this.state = RaceState.RACING;
          this.countdownValue = 0;
        }
        break;

      case RaceState.RACING:
        this.raceTime += dt;
        break;

      case RaceState.FINISHED:
        if (enterJustPressed) {
          this.state = RaceState.READY;
        }
        break;
    }
  }

  finish(): void {
    if (this.state !== RaceState.RACING) return;
    this.state = RaceState.FINISHED;

    if (this.bestTime === null || this.raceTime < this.bestTime) {
      this.bestTime = this.raceTime;
      this.saveBestTime();
    }
  }

  /** Whether vehicle input should be active. */
  get inputEnabled(): boolean {
    return this.state === RaceState.RACING;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  private loadBestTime(): void {
    try {
      const stored = localStorage.getItem(BEST_TIME_KEY);
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed > 0) {
          this.bestTime = parsed;
        }
      }
    } catch {
      // localStorage may not be available
    }
  }

  private saveBestTime(): void {
    try {
      if (this.bestTime !== null) {
        localStorage.setItem(BEST_TIME_KEY, this.bestTime.toString());
      }
    } catch {
      // localStorage may not be available
    }
  }
}
