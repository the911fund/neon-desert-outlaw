import type { TouchInput } from '../ui/TouchControls';

export interface VehicleInputState {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: number;
}

export class InputManager {
  private keys = new Set<string>();
  private readonly target: Window;
  private touchInput: TouchInput | null = null;
  private mutePressed = false;
  private onMuteToggle: (() => void) | null = null;

  constructor(target: Window = window) {
    this.target = target;
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
  }

  setMuteToggleHandler(handler: () => void): void {
    this.onMuteToggle = handler;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);

    // M key for mute toggle (fire once per press)
    if (event.code === 'KeyM' && !this.mutePressed) {
      this.mutePressed = true;
      this.onMuteToggle?.();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    if (event.code === 'KeyM') {
      this.mutePressed = false;
    }
  };

  setTouchInput(input: TouchInput): void {
    this.touchInput = input;
  }

  getInput(): VehicleInputState {
    // Get keyboard input
    const keyThrottle = this.isPressed('KeyW') || this.isPressed('ArrowUp') ? 1 : 0;
    const keyBrake = this.isPressed('KeyS') || this.isPressed('ArrowDown') ? 1 : 0;
    const left = this.isPressed('KeyA') || this.isPressed('ArrowLeft');
    const right = this.isPressed('KeyD') || this.isPressed('ArrowRight');
    const keySteer = left === right ? 0 : left ? -1 : 1;
    const keyHandbrake = this.isPressed('Space') ? 1 : 0;

    // Combine with touch input (take max of each)
    if (this.touchInput) {
      return {
        throttle: Math.max(keyThrottle, this.touchInput.throttle),
        brake: Math.max(keyBrake, this.touchInput.brake),
        steer: keySteer !== 0 ? keySteer : this.touchInput.steer,
        handbrake: Math.max(keyHandbrake, this.touchInput.handbrake),
      };
    }

    return {
      throttle: keyThrottle,
      brake: keyBrake,
      steer: keySteer,
      handbrake: keyHandbrake,
    };
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
