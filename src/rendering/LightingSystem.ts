import { Container, Graphics } from 'pixi.js';
import { lerp } from '../utils/MathUtils';

interface AmbientState {
  color: number;
  alpha: number;
}

export class LightingSystem {
  readonly container: Container;
  private readonly darkness: Graphics;
  private readonly lights: Container;
  private time = 0;
  private width = 0;
  private height = 0;
  private lastAmbient: AmbientState = { color: 0x000000, alpha: 0 };

  private readonly cycleDuration = 90;

  constructor(width: number, height: number) {
    this.container = new Container();
    this.darkness = new Graphics();
    this.lights = new Container();
    this.lights.blendMode = 'add';

    this.container.addChild(this.darkness, this.lights);
    this.resize(width, height);
  }

  addLight(light: Container): void {
    this.lights.addChild(light);
  }

  removeLight(light: Container): void {
    this.lights.removeChild(light);
  }

  update(dt: number, worldOffset?: { x: number; y: number }): void {
    this.time += dt;
    const ambient = this.sampleAmbient();
    if (
      ambient.alpha !== this.lastAmbient.alpha ||
      ambient.color !== this.lastAmbient.color
    ) {
      this.lastAmbient = ambient;
      this.redrawDarkness();
    }

    if (worldOffset) {
      this.lights.position.set(worldOffset.x, worldOffset.y);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.redrawDarkness();
  }

  private redrawDarkness(): void {
    this.darkness.clear();

    if (this.lastAmbient.alpha <= 0.001) {
      this.darkness.visible = false;
      return;
    }

    this.darkness.visible = true;
    this.darkness.beginFill(this.lastAmbient.color, this.lastAmbient.alpha);
    this.darkness.drawRect(0, 0, this.width, this.height);
    this.darkness.endFill();
  }

  private sampleAmbient(): AmbientState {
    const phase = (this.time % this.cycleDuration) / this.cycleDuration;
    const day: AmbientState = { color: 0x000000, alpha: 0 };
    const dusk: AmbientState = { color: 0xff8c3a, alpha: 0.3 };
    const night: AmbientState = { color: 0x0b0d1e, alpha: 0.7 };

    if (phase < 0.4) {
      return day;
    }
    if (phase < 0.55) {
      return this.lerpAmbient(day, dusk, (phase - 0.4) / 0.15);
    }
    if (phase < 0.7) {
      return this.lerpAmbient(dusk, night, (phase - 0.55) / 0.15);
    }
    if (phase < 0.85) {
      return night;
    }
    return this.lerpAmbient(night, day, (phase - 0.85) / 0.15);
  }

  private lerpAmbient(a: AmbientState, b: AmbientState, t: number): AmbientState {
    return {
      color: this.lerpColor(a.color, b.color, t),
      alpha: lerp(a.alpha, b.alpha, t),
    };
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;

    const rr = Math.round(lerp(ar, br, t));
    const rg = Math.round(lerp(ag, bg, t));
    const rb = Math.round(lerp(ab, bb, t));

    return (rr << 16) | (rg << 8) | rb;
  }
}
