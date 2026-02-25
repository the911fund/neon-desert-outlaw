import { Container, Graphics } from 'pixi.js';
import type { Vector2 } from '../utils/Vector2';
import { clamp, lerp } from '../utils/MathUtils';

export interface HeadlightState {
  position: Vector2;
  heading: number;
  speed: number;
}

export class Headlights {
  readonly container: Container;
  private leftCone: Graphics;
  private rightCone: Graphics;
  private maxSpeed: number;

  private readonly frontOffset = 18;
  private readonly lateralOffset = 8;
  private readonly color = 0xfff1c1;

  constructor(maxSpeed = 60) {
    this.container = new Container();
    this.leftCone = new Graphics();
    this.rightCone = new Graphics();
    this.maxSpeed = maxSpeed;

    this.container.addChild(this.leftCone, this.rightCone);
  }

  update(state: HeadlightState): void {
    const speedRatio = clamp(state.speed / this.maxSpeed, 0, 1);
    const length = lerp(50, 200, speedRatio);
    const width = lerp(28, 46, speedRatio);

    this.container.position.set(state.position.x, state.position.y);
    this.container.rotation = state.heading;

    this.leftCone.position.set(this.frontOffset, -this.lateralOffset);
    this.rightCone.position.set(this.frontOffset, this.lateralOffset);

    this.drawCone(this.leftCone, length, width);
    this.drawCone(this.rightCone, length, width);
  }

  private drawCone(graphics: Graphics, length: number, width: number): void {
    graphics.clear();

    const layers = [
      { alpha: 0.08, scale: 1.2 },
      { alpha: 0.18, scale: 0.85 },
      { alpha: 0.32, scale: 0.55 },
    ];

    layers.forEach((layer) => {
      const layerWidth = width * layer.scale;
      const layerLength = length * layer.scale;

      graphics.beginFill(this.color, layer.alpha);
      graphics.moveTo(0, 0);
      graphics.lineTo(layerLength, -layerWidth * 0.5);
      graphics.lineTo(layerLength, layerWidth * 0.5);
      graphics.lineTo(0, 0);
      graphics.endFill();
    });
  }
}
