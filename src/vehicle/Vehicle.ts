import { Container, Graphics } from 'pixi.js';
import { BicycleModel } from '../physics/BicycleModel';
import type { VehicleInput } from '../physics/BicycleModel';
import { DriftPhase } from '../physics/DriftState';
import { VehicleRenderer, DamageState } from './VehicleRenderer';

export class Vehicle {
  readonly model: BicycleModel;
  readonly container: Container;
  private renderer: VehicleRenderer;
  private velocityIndicator: Graphics;
  private damageState: DamageState = DamageState.Pristine;
  private lastInput: VehicleInput = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };

  constructor() {
    this.model = new BicycleModel();
    this.container = new Container();

    // Create the detailed vehicle renderer
    this.renderer = new VehicleRenderer();

    // Velocity indicator (debug visual)
    this.velocityIndicator = new Graphics();

    this.container.addChild(this.velocityIndicator, this.renderer.container);
  }

  update(dt: number, input: VehicleInput, surfaceFriction: number): void {
    this.lastInput = input;
    this.model.update(dt, input, surfaceFriction);
    this.container.position.set(this.model.position.x, this.model.position.y);
    this.container.rotation = this.model.heading;

    // Update vehicle renderer with current state
    const isBraking = input.brake > 0 || input.handbrake > 0;
    this.renderer.update(
      this.model.steeringAngle,
      isBraking,
      this.model.driftState.state,
      this.damageState
    );

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

  get speed(): number {
    return this.model.speed;
  }

  get driftPhase(): DriftPhase {
    return this.model.driftState.state;
  }

  get engineForce(): number {
    // Normalize engine force for HUD display (0-1 based on throttle and speed)
    const throttleComponent = this.lastInput.throttle;
    const speedRatio = Math.min(this.speed / 50, 1); // Assume max display speed ~180 km/h
    return Math.max(throttleComponent, speedRatio * 0.7);
  }

  setDamageState(state: DamageState): void {
    this.damageState = state;
  }
}
