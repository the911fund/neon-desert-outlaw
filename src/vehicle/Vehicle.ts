import { Container, Graphics } from 'pixi.js';
import { BicycleModel } from '../physics/BicycleModel';
import type { VehicleInput } from '../physics/BicycleModel';
import { DriftPhase } from '../physics/DriftState';

export class Vehicle {
  readonly model: BicycleModel;
  readonly container: Container;
  private body: Graphics;
  private velocityIndicator: Graphics;

  constructor() {
    this.model = new BicycleModel();
    this.container = new Container();

    this.body = new Graphics();
    this.body.beginFill(0xff3355);
    this.body.drawRoundedRect(-20, -10, 40, 20, 4);
    this.body.endFill();

    const nose = new Graphics();
    nose.beginFill(0xffe66d);
    nose.drawRect(6, -6, 10, 12);
    nose.endFill();

    this.velocityIndicator = new Graphics();

    this.container.addChild(this.velocityIndicator, this.body, nose);
  }

  update(dt: number, input: VehicleInput, surfaceFriction: number): void {
    this.model.update(dt, input, surfaceFriction);
    this.container.position.set(this.model.position.x, this.model.position.y);
    this.container.rotation = this.model.heading;

    this.updateVelocityIndicator();
  }

  private updateVelocityIndicator(): void {
    const velocity = this.model.velocity;
    const speed = velocity.magnitude();
    const angle = velocity.angle();
    const relativeAngle = angle - this.model.heading;

    const length = Math.min(80, Math.max(12, speed * 0.6));

    let color = 0x00f0ff;
    if (this.model.driftState.state === DriftPhase.Drifting) {
      color = 0xff66ff;
    } else if (this.model.driftState.state === DriftPhase.Recovery) {
      color = 0x7ad7ff;
    }

    this.velocityIndicator.clear();
    this.velocityIndicator.lineStyle(2, color, 0.9);
    this.velocityIndicator.moveTo(0, 0);
    this.velocityIndicator.lineTo(length, 0);
    this.velocityIndicator.rotation = relativeAngle;
  }
}
