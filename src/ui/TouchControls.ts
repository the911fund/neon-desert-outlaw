import {
  Circle,
  Container,
  Graphics,
  RoundedRectangle,
  Text,
  TextStyle,
} from 'pixi.js';
import type { FederatedPointerEvent } from 'pixi.js';
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

interface ActionButtonRefs {
  container: Container;
  background: Graphics;
  label: Text;
}

interface ControlButtonRefs {
  container: Container;
  background: Graphics;
  label: Text;
}

export class TouchControls {
  readonly container: Container;

  private joystickContainer: Container;
  private joystickBase: Graphics;
  private joystickKnob: Graphics;
  private joystickHint: Text;

  private gasButton: ControlButtonRefs;
  private brakeButton: ControlButtonRefs;
  private handbrakeButton: ControlButtonRefs;

  private backButton: ActionButtonRefs;
  private enterButton: ActionButtonRefs;

  private joystickBaseRadius = 70;
  private joystickKnobRadius = 30;
  private buttonRadius = 46;
  private actionButtonWidth = 100;
  private actionButtonHeight = 48;
  private controlPadding = 18;
  private bottomPadding = 24;
  private screenWidth = 0;
  private screenHeight = 0;
  private joystickCenter = { x: 0, y: 0 };

  private readonly neonCyan = 0x00ffff;
  private readonly neonMagenta = 0xff00ff;
  private readonly neonRed = 0xff4444;
  private readonly neonGreen = 0x44ff44;

  private joystickTouchId: number | null = null;
  private joystickOffset = { x: 0, y: 0 };
  private gasTouchId: number | null = null;
  private brakeTouchId: number | null = null;
  private handbrakeTouchId: number | null = null;

  private isTouchDevice = false;
  private _visible = false;
  private backButtonVisible = true;
  private enterButtonVisible = true;
  private callbacks: TouchActionCallbacks = {};

  constructor(callbacks?: TouchActionCallbacks) {
    this.container = new Container();
    if (callbacks) this.callbacks = callbacks;

    this.isTouchDevice = this.detectTouchDevice();

    this.joystickContainer = new Container();
    this.joystickBase = new Graphics();
    this.joystickKnob = new Graphics();
    this.joystickHint = new Text({
      text: 'STEER',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        fill: this.neonCyan,
      }),
    });
    this.joystickHint.anchor.set(0.5, 0.5);

    this.gasButton = this.createControlButton('GAS', this.neonGreen);
    this.brakeButton = this.createControlButton('BRAKE', this.neonRed);
    this.handbrakeButton = this.createControlButton('DRIFT', this.neonMagenta);

    this.backButton = this.createActionButton('BACK', this.neonRed, () => this.callbacks.onBack?.());
    this.enterButton = this.createActionButton('GO', this.neonGreen, () => this.callbacks.onEnter?.());

    this.joystickContainer.addChild(this.joystickBase, this.joystickKnob, this.joystickHint);
    this.container.addChild(
      this.joystickContainer,
      this.gasButton.container,
      this.brakeButton.container,
      this.handbrakeButton.container,
      this.backButton.container,
      this.enterButton.container
    );

    this.redrawJoystick();
    this.redrawControlButton(this.gasButton, this.neonGreen, false);
    this.redrawControlButton(this.brakeButton, this.neonRed, false);
    this.redrawControlButton(this.handbrakeButton, this.neonMagenta, false);
    this.redrawActionButton(this.backButton, this.neonRed);
    this.redrawActionButton(this.enterButton, this.neonGreen);

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

  private createControlButton(label: string, color: number): ControlButtonRefs {
    const container = new Container();
    const background = new Graphics();
    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: 'bold',
        fill: color,
        align: 'center',
      }),
    });
    text.anchor.set(0.5, 0.5);

    container.addChild(background, text);
    return { container, background, label: text };
  }

  private createActionButton(label: string, color: number, onTap: () => void): ActionButtonRefs {
    const container = new Container();
    const background = new Graphics();
    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: 'bold',
        fill: color,
      }),
    });
    text.anchor.set(0.5, 0.5);

    background.eventMode = 'static';
    background.cursor = 'pointer';
    background.on('pointertap', () => onTap());

    container.addChild(background, text);
    return { container, background, label: text };
  }

  private redrawJoystick(): void {
    this.joystickBase.clear();
    this.joystickBase.beginFill(0x09141b, 0.78);
    this.joystickBase.drawCircle(0, 0, this.joystickBaseRadius);
    this.joystickBase.endFill();
    this.joystickBase.beginFill(this.neonCyan, 0.08);
    this.joystickBase.drawCircle(0, 0, this.joystickBaseRadius - 6);
    this.joystickBase.endFill();
    this.joystickBase.lineStyle(3, this.neonCyan, 0.55);
    this.joystickBase.drawCircle(0, 0, this.joystickBaseRadius);
    this.joystickBase.lineStyle(1, this.neonCyan, 0.22);
    this.joystickBase.drawCircle(0, 0, this.joystickBaseRadius * 0.7);
    this.joystickBase.moveTo(-this.joystickBaseRadius * 0.55, 0);
    this.joystickBase.lineTo(this.joystickBaseRadius * 0.55, 0);
    this.joystickBase.moveTo(0, -this.joystickBaseRadius * 0.55);
    this.joystickBase.lineTo(0, this.joystickBaseRadius * 0.55);
    this.joystickBase.hitArea = new Circle(0, 0, this.joystickBaseRadius + 16);

    this.joystickKnob.clear();
    this.joystickKnob.beginFill(this.neonCyan, 0.28);
    this.joystickKnob.drawCircle(0, 0, this.joystickKnobRadius);
    this.joystickKnob.endFill();
    this.joystickKnob.beginFill(this.neonCyan, 0.55);
    this.joystickKnob.drawCircle(0, 0, this.joystickKnobRadius * 0.42);
    this.joystickKnob.endFill();
    this.joystickKnob.lineStyle(3, this.neonCyan, 0.9);
    this.joystickKnob.drawCircle(0, 0, this.joystickKnobRadius);

    this.joystickHint.style.fontSize = Math.max(12, Math.round(this.joystickBaseRadius * 0.24));
    this.joystickHint.position.set(0, this.joystickBaseRadius + 18);
  }

  private redrawControlButton(button: ControlButtonRefs, color: number, active: boolean): void {
    const alpha = active ? 0.92 : 0.5;

    button.background.clear();
    button.background.beginFill(0x120d14, 0.82);
    button.background.drawCircle(0, 0, this.buttonRadius);
    button.background.endFill();

    if (active) {
      button.background.beginFill(color, 0.22);
      button.background.drawCircle(0, 0, this.buttonRadius - 6);
      button.background.endFill();
    }

    button.background.lineStyle(3, color, alpha);
    button.background.drawCircle(0, 0, this.buttonRadius);
    button.background.lineStyle(1, color, 0.35);
    button.background.drawCircle(0, 0, this.buttonRadius * 0.68);

    button.label.style.fontSize = Math.max(13, Math.round(this.buttonRadius * 0.34));
    button.container.hitArea = new Circle(0, 0, this.buttonRadius + 14);
  }

  private redrawActionButton(button: ActionButtonRefs, color: number): void {
    const radius = Math.min(16, Math.round(this.actionButtonHeight * 0.3));

    button.background.clear();
    button.background.beginFill(0x090d18, 0.9);
    button.background.drawRoundedRect(
      -this.actionButtonWidth / 2,
      -this.actionButtonHeight / 2,
      this.actionButtonWidth,
      this.actionButtonHeight,
      radius
    );
    button.background.endFill();
    button.background.lineStyle(2, color, 0.7);
    button.background.drawRoundedRect(
      -this.actionButtonWidth / 2,
      -this.actionButtonHeight / 2,
      this.actionButtonWidth,
      this.actionButtonHeight,
      radius
    );
    button.background.hitArea = new RoundedRectangle(
      -this.actionButtonWidth / 2,
      -this.actionButtonHeight / 2,
      this.actionButtonWidth,
      this.actionButtonHeight,
      radius
    );

    button.label.style.fontSize = Math.max(15, Math.round(this.actionButtonHeight * 0.34));
  }

  private setupEventListeners(): void {
    this.joystickBase.eventMode = 'static';
    this.joystickBase.cursor = 'pointer';
    this.joystickBase.on('pointerdown', this.onJoystickDown);

    this.gasButton.container.eventMode = 'static';
    this.gasButton.container.cursor = 'pointer';
    this.gasButton.container.on('pointerdown', this.onGasDown);

    this.brakeButton.container.eventMode = 'static';
    this.brakeButton.container.cursor = 'pointer';
    this.brakeButton.container.on('pointerdown', this.onBrakeDown);

    this.handbrakeButton.container.eventMode = 'static';
    this.handbrakeButton.container.cursor = 'pointer';
    this.handbrakeButton.container.on('pointerdown', this.onHandbrakeDown);

    window.addEventListener('pointermove', this.onGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onGlobalPointerEnd, { passive: false });
    window.addEventListener('pointercancel', this.onGlobalPointerEnd, { passive: false });
  }

  private onJoystickDown = (event: FederatedPointerEvent): void => {
    if (this.joystickTouchId !== null && this.joystickTouchId !== event.pointerId) {
      return;
    }

    this.joystickTouchId = event.pointerId;
    this.updateJoystickFromScreenPoint(event.global.x, event.global.y);
    event.stopPropagation();
  };

  private onGasDown = (event: FederatedPointerEvent): void => {
    if (this.gasTouchId !== null && this.gasTouchId !== event.pointerId) {
      return;
    }

    this.gasTouchId = event.pointerId;
    this.redrawControlButton(this.gasButton, this.neonGreen, true);
    event.stopPropagation();
  };

  private onBrakeDown = (event: FederatedPointerEvent): void => {
    if (this.brakeTouchId !== null && this.brakeTouchId !== event.pointerId) {
      return;
    }

    this.brakeTouchId = event.pointerId;
    this.redrawControlButton(this.brakeButton, this.neonRed, true);
    event.stopPropagation();
  };

  private onHandbrakeDown = (event: FederatedPointerEvent): void => {
    if (this.handbrakeTouchId !== null && this.handbrakeTouchId !== event.pointerId) {
      return;
    }

    this.handbrakeTouchId = event.pointerId;
    this.redrawControlButton(this.handbrakeButton, this.neonMagenta, true);
    event.stopPropagation();
  };

  private onGlobalPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickTouchId) {
      return;
    }

    this.updateJoystickFromScreenPoint(event.clientX, event.clientY);
    event.preventDefault();
  };

  private onGlobalPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.joystickTouchId) {
      this.resetJoystick();
    }

    if (event.pointerId === this.gasTouchId) {
      this.gasTouchId = null;
      this.redrawControlButton(this.gasButton, this.neonGreen, false);
    }

    if (event.pointerId === this.brakeTouchId) {
      this.brakeTouchId = null;
      this.redrawControlButton(this.brakeButton, this.neonRed, false);
    }

    if (event.pointerId === this.handbrakeTouchId) {
      this.handbrakeTouchId = null;
      this.redrawControlButton(this.handbrakeButton, this.neonMagenta, false);
    }
  };

  private updateJoystickFromScreenPoint(x: number, y: number): void {
    const localX = x - this.joystickCenter.x;
    const localY = y - this.joystickCenter.y;
    const distance = Math.sqrt(localX * localX + localY * localY);
    const maxDistance = this.joystickBaseRadius - this.joystickKnobRadius * 0.45;

    let knobX = localX;
    let knobY = localY;
    if (distance > maxDistance && distance > 0) {
      const scale = maxDistance / distance;
      knobX *= scale;
      knobY *= scale;
    }

    this.joystickKnob.position.set(knobX, knobY);
    this.joystickOffset = {
      x: knobX / maxDistance,
      y: knobY / maxDistance,
    };
  }

  private resetJoystick(): void {
    this.joystickTouchId = null;
    this.joystickOffset = { x: 0, y: 0 };
    this.joystickKnob.position.set(0, 0);
  }

  private applyDeadzone(value: number, deadzone: number): number {
    const magnitude = Math.abs(value);
    if (magnitude <= deadzone) {
      return 0;
    }

    const normalized = (magnitude - deadzone) / (1 - deadzone);
    return Math.sign(value) * clamp(normalized, 0, 1);
  }

  private updateMetrics(screenWidth: number, screenHeight: number): void {
    const shortSide = Math.min(screenWidth, screenHeight);
    const portraitScale = clamp(shortSide / 390, 0.92, 1.12);
    const compactScale = screenWidth > screenHeight ? 0.9 : 1;
    const controlScale = portraitScale * compactScale;

    this.joystickBaseRadius = Math.round(70 * controlScale);
    this.joystickKnobRadius = Math.round(30 * controlScale);
    this.buttonRadius = Math.round(46 * controlScale);
    this.actionButtonWidth = Math.max(88, Math.round(104 * controlScale));
    this.actionButtonHeight = Math.max(44, Math.round(48 * controlScale));
    this.controlPadding = Math.round(clamp(shortSide * 0.05, 16, 28));
    this.bottomPadding = Math.round(clamp(screenHeight * 0.035, 20, 34));
  }

  getInput(): TouchInput {
    const steer = this.applyDeadzone(this.joystickOffset.x, 0.12);

    return {
      throttle: this.gasTouchId !== null ? 1 : 0,
      brake: this.brakeTouchId !== null ? 1 : 0,
      steer,
      handbrake: this.handbrakeTouchId !== null ? 1 : 0,
    };
  }

  showActionButtons(show: boolean): void {
    this.setActionButtonVisibility(show, show);
  }

  setActionButtonVisibility(backVisible: boolean, enterVisible: boolean): void {
    this.backButtonVisible = backVisible;
    this.enterButtonVisible = enterVisible;
    this.backButton.container.visible = backVisible && this.isTouchDevice;
    this.enterButton.container.visible = enterVisible && this.isTouchDevice;
  }

  setPosition(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.updateMetrics(screenWidth, screenHeight);

    this.redrawJoystick();
    this.redrawControlButton(this.gasButton, this.neonGreen, this.gasTouchId !== null);
    this.redrawControlButton(this.brakeButton, this.neonRed, this.brakeTouchId !== null);
    this.redrawControlButton(this.handbrakeButton, this.neonMagenta, this.handbrakeTouchId !== null);
    this.redrawActionButton(this.backButton, this.neonRed);
    this.redrawActionButton(this.enterButton, this.neonGreen);

    const isMobile = screenWidth < 768;
    const controlColumnGap = Math.round(this.buttonRadius * 2.25);

    this.joystickCenter = {
      x: this.controlPadding + this.joystickBaseRadius,
      y: screenHeight - this.bottomPadding - this.joystickBaseRadius,
    };
    this.joystickContainer.position.set(this.joystickCenter.x, this.joystickCenter.y);

    // Right side: GAS (big, bottom), BRAKE (above), DRIFT (top)
    const gasX = screenWidth - this.controlPadding - this.buttonRadius;
    const gasY = screenHeight - this.bottomPadding - this.buttonRadius;
    this.gasButton.container.position.set(gasX, gasY);

    const brakeX = gasX - controlColumnGap; // left of gas
    const brakeY = gasY;
    this.brakeButton.container.position.set(brakeX, brakeY);

    this.handbrakeButton.container.position.set(gasX, gasY - controlColumnGap);

    if (isMobile) {
      this.backButton.container.position.set(
        this.joystickCenter.x,
        this.joystickCenter.y - this.joystickBaseRadius - this.actionButtonHeight * 0.8
      );
      this.enterButton.container.position.set(
        gasX,
        gasY - controlColumnGap * 2 - this.actionButtonHeight * 0.2
      );
    } else {
      const topY = this.controlPadding + this.actionButtonHeight / 2;
      this.backButton.container.position.set(this.controlPadding + this.actionButtonWidth / 2, topY);
      this.enterButton.container.position.set(screenWidth - this.controlPadding - this.actionButtonWidth / 2, topY);
    }

    this.backButton.container.visible = this.backButtonVisible && this.isTouchDevice;
    this.enterButton.container.visible = this.enterButtonVisible && this.isTouchDevice;
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
