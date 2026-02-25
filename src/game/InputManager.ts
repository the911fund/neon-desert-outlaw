export class InputManager {
  private keys = new Set<string>();
  private readonly target: Window;

  constructor(target: Window = window) {
    this.target = target;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  getInput() {
    const throttle = this.isPressed('KeyW') || this.isPressed('ArrowUp') ? 1 : 0;
    const brake = this.isPressed('KeyS') || this.isPressed('ArrowDown') ? 1 : 0;
    const left = this.isPressed('KeyA') || this.isPressed('ArrowLeft');
    const right = this.isPressed('KeyD') || this.isPressed('ArrowRight');
    const steer = left === right ? 0 : left ? -1 : 1;
    const handbrake = this.isPressed('Space') ? 1 : 0;

    return { throttle, brake, steer, handbrake };
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.keys.clear();
  }

  private isPressed(code: string): boolean {
    return this.keys.has(code);
  }
}
