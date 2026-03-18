import { Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { clamp } from '../utils/MathUtils';

export interface TouchInput {
  throttle: number; // 0-1
  brake: number; // 0-1
  steer: number; // -1 to 1
  handbrake: number; // 0-1
}

export interface TouchActionCallbacks {
  onEnter?: () => void;
  onBack?: () => void;
}

export class TouchControls {
  readonly container: Container;

  private joystickContainer: Container;
  private joystickBase: Graphics;
  private joystickKnob: Graphics;

  private brakeButton: Graphics;
  private handbrakeButton: Graphics;

  // Action buttons for mobile navigation
  private backButton: Container;
  private enterButton: Container;

  private readonly joystickRadius = 60;
  private readonly knobRadius = 25;
  private readonly buttonRadius = 40;
  private readonly actionButtonWidth = 70;
  private readonly actionButtonHeight = 36;
  private readonly neonCyan = 0x00ffff;
  private readonly neonMagenta = 0xff00ff;
  private readonly neonRed = 0xff4444;
  private readonly neonGreen = 0x44ff44;

  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickOffset = { x: 0, y: 0 };

  private brakeActive = false;
  private handbrakeActive = false;

  private isTouchDevice = false;
  private _visible = false;
  private callbacks: TouchActionCallbacks = {};

  constructor(callbacks?: TouchActionCallbacks) {
    this.container = new Container();
    if (callbacks) this.callbacks = callbacks;

    // Detect touch capability
    this.isTouchDevice = this.detectTouchDevice();

    this.joystickContainer = new Container();
    this.joystickBase = new Graphics();
    this.joystickKnob = new Graphics();

    this.brakeButton = new Graphics();
    this.handbrakeButton = new Graphics();

    // Action buttons
    this.backButton = this.createActionButton('✕ BACK', this.neonRed, () => this.callbacks.onBack?.());
    this.enterButton = this.createActionButton('▶ GO', this.neonGreen, () => this.callbacks.onEnter?.());

    this.setupJoystick();
    this.setupButtons();

    this.container.addChild(this.joystickContainer);
    this.container.addChild(this.brakeButton);
    this.container.addChild(this.handbrakeButton);
    this.container.addChild(this.backButton);
    this.container.addChild(this.enterButton);

    // Initially hide if not touch device
    this.container.visible = this.isTouchDevice;
    this._visible = this.isTouchDevice;

    if (this.isTouchDevice) {
      this.setupEventListeners();
    }
  }

  setCallbacks(callbacks: TouchActionCallbacks): void {
    this.callbacks = callbacks;
  }

  private detectTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0
    );
  }

  private createActionButton(label: string, color: number, onTap: () => void): Container {
    const btn = new Container();
    const bg = new Graphics();
    bg.beginFill(0x1a1a1a, 0.7);
    bg.drawRoundedRect(-this.actionButtonWidth / 2, -this.actionButtonHeight / 2,
      this.actionButtonWidth, this.actionButtonHeight, 8);
    bg.endFill();
    bg.lineStyle(2, color, 0.7);
    bg.drawRoundedRect(-this.actionButtonWidth / 2, -this.actionButtonHeight / 2,
      this.actionButtonWidth, this.actionButtonHeight, 8);
    btn.addChild(bg);

    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        fill: color,
      }),
    });
    text.anchor.set(0.5, 0.5);
    btn.addChild(text);

    bg.eventMode = 'static';
    bg.cursor = 'pointer';
    bg.on('pointerdown', () => onTap());

    return btn;
  }

  private setupJoystick(): void {
    // Joystick base (outer circle)
    this.joystickBase.beginFill(0x1a1a1a, 0.6);
    this.joystickBase.drawCircle(0, 0, this.joystickRadius);
    this.joystickBase.endFill();

    this.joystickBase.lineStyle(2, this.neonCyan, 0.4);
    this.joystickBase.drawCircle(0, 0, this.joystickRadius);

    // Direction indicators
    this.joystickBase.lineStyle(1, this.neonCyan, 0.3);
    // Up arrow
    this.joystickBase.moveTo(0, -this.joystickRadius + 15);
    this.joystickBase.lineTo(-5, -this.joystickRadius + 22);
    this.joystickBase.moveTo(0, -this.joystickRadius + 15);
    this.joystickBase.lineTo(5, -this.joystickRadius + 22);
    // Down arrow
    this.joystickBase.moveTo(0, this.joystickRadius - 15);
    this.joystickBase.lineTo(-5, this.joystickRadius - 22);
    this.joystickBase.moveTo(0, this.joystickRadius - 15);
    this.joystickBase.lineTo(5, this.joystickRadius - 22);

    // Joystick knob
    this.joystickKnob.beginFill(this.neonCyan, 0.3);
    this.joystickKnob.drawCircle(0, 0, this.knobRadius);
    this.joystickKnob.endFill();

    this.joystickKnob.lineStyle(2, this.neonCyan, 0.8);
    this.joystickKnob.drawCircle(0, 0, this.knobRadius);

    // Inner knob highlight
    this.joystickKnob.beginFill(this.neonCyan, 0.5);
    this.joystickKnob.drawCircle(0, 0, this.knobRadius * 0.4);
    this.joystickKnob.endFill();

    this.joystickContainer.addChild(this.joystickBase);
    this.joystickContainer.addChild(this.joystickKnob);

    // Make interactive
    this.joystickBase.eventMode = 'static';
    this.joystickBase.cursor = 'pointer';
  }

  private setupButtons(): void {
    // Brake button (red)
    this.drawButton(this.brakeButton, this.neonRed, 'B', false);

    // Handbrake button (magenta)
    this.drawButton(this.handbrakeButton, this.neonMagenta, 'H', false);

    // Make interactive
    this.brakeButton.eventMode = 'static';
    this.brakeButton.cursor = 'pointer';
    this.handbrakeButton.eventMode = 'static';
    this.handbrakeButton.cursor = 'pointer';
  }

  private drawButton(graphics: Graphics, color: number, _label: string, active: boolean): void {
    graphics.clear();

    const alpha = active ? 0.7 : 0.4;
    const borderAlpha = active ? 1.0 : 0.5;

    // Button background
    graphics.beginFill(0x1a1a1a, 0.6);
    graphics.drawCircle(0, 0, this.buttonRadius);
    graphics.endFill();

    // Colored fill when active
    if (active) {
      graphics.beginFill(color, 0.3);
      graphics.drawCircle(0, 0, this.buttonRadius - 4);
      graphics.endFill();
    }

    // Border
    graphics.lineStyle(3, color, borderAlpha);
    graphics.drawCircle(0, 0, this.buttonRadius);

    // Inner ring
    graphics.lineStyle(1, color, alpha * 0.5);
    graphics.drawCircle(0, 0, this.buttonRadius * 0.6);
  }

  private setupEventListeners(): void {
    // Joystick events
    this.joystickBase.on('pointerdown', this.onJoystickDown.bind(this));
    this.joystickBase.on('pointermove', this.onJoystickMove.bind(this));
    this.joystickBase.on('pointerup', this.onJoystickUp.bind(this));
    this.joystickBase.on('pointerupoutside', this.onJoystickUp.bind(this));

    // Brake button events
    this.brakeButton.on('pointerdown', this.onBrakeDown.bind(this));
    this.brakeButton.on('pointerup', this.onBrakeUp.bind(this));
    this.brakeButton.on('pointerupoutside', this.onBrakeUp.bind(this));

    // Handbrake button events
    this.handbrakeButton.on('pointerdown', this.onHandbrakeDown.bind(this));
    this.handbrakeButton.on('pointerup', this.onHandbrakeUp.bind(this));
    this.handbrakeButton.on('pointerupoutside', this.onHandbrakeUp.bind(this));
  }

  private onJoystickDown(event: FederatedPointerEvent): void {
    this.joystickActive = true;
    this.joystickTouchId = event.pointerId;
    this.updateJoystickPosition(event);
  }

  private onJoystickMove(event: FederatedPointerEvent): void {
    if (!this.joystickActive || event.pointerId !== this.joystickTouchId) return;
    this.updateJoystickPosition(event);
  }

  private onJoystickUp(event: FederatedPointerEvent): void {
    if (event.pointerId !== this.joystickTouchId) return;
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickOffset = { x: 0, y: 0 };
    this.joystickKnob.position.set(0, 0);
  }

  private updateJoystickPosition(event: FederatedPointerEvent): void {
    const localPos = this.joystickContainer.toLocal(event.global);

    // Clamp to joystick radius
    const distance = Math.sqrt(localPos.x * localPos.x + localPos.y * localPos.y);
    const maxDistance = this.joystickRadius - this.knobRadius * 0.5;

    if (distance > maxDistance) {
      const scale = maxDistance / distance;
      localPos.x *= scale;
      localPos.y *= scale;
    }

    this.joystickKnob.position.set(localPos.x, localPos.y);

    // Normalize to -1 to 1
    this.joystickOffset = {
      x: localPos.x / maxDistance,
      y: localPos.y / maxDistance,
    };
  }

  private onBrakeDown(): void {
    this.brakeActive = true;
    this.drawButton(this.brakeButton, this.neonRed, 'B', true);
  }

  private onBrakeUp(): void {
    this.brakeActive = false;
    this.drawButton(this.brakeButton, this.neonRed, 'B', false);
  }

  private onHandbrakeDown(): void {
    this.handbrakeActive = true;
    this.drawButton(this.handbrakeButton, this.neonMagenta, 'H', true);
  }

  private onHandbrakeUp(): void {
    this.handbrakeActive = false;
    this.drawButton(this.handbrakeButton, this.neonMagenta, 'H', false);
  }

  getInput(): TouchInput {
    if (!this.joystickActive && !this.brakeActive && !this.handbrakeActive) {
      return { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
    }

    // Joystick Y axis: up = throttle, down = brake (additional to button)
    const throttle = clamp(-this.joystickOffset.y, 0, 1);
    const joystickBrake = clamp(this.joystickOffset.y, 0, 1);

    // Joystick X axis: steering
    const steer = clamp(this.joystickOffset.x, -1, 1);

    return {
      throttle,
      brake: Math.max(joystickBrake, this.brakeActive ? 1 : 0),
      steer,
      handbrake: this.handbrakeActive ? 1 : 0,
    };
  }

  /** Show or hide the action buttons (BACK / GO). */
  showActionButtons(show: boolean): void {
    this.backButton.visible = show && this.isTouchDevice;
    this.enterButton.visible = show && this.isTouchDevice;
  }

  setPosition(screenWidth: number, screenHeight: number): void {
    // Joystick on left side, near bottom
    this.joystickContainer.position.set(
      this.joystickRadius + 30,
      screenHeight - this.joystickRadius - 80
    );

    // Buttons on right side, stacked vertically
    this.brakeButton.position.set(
      screenWidth - this.buttonRadius - 30,
      screenHeight - this.buttonRadius - 80
    );

    this.handbrakeButton.position.set(
      screenWidth - this.buttonRadius - 30,
      screenHeight - this.buttonRadius * 3 - 100
    );

    // Action buttons: top corners
    this.backButton.position.set(50, 30);
    this.enterButton.position.set(screenWidth - 50, 30);
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    this._visible = value;
    this.container.visible = value && this.isTouchDevice;
  }

  get isTouch(): boolean {
    return this.isTouchDevice;
  }
}
