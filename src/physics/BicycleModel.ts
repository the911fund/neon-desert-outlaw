import { clamp } from '../utils/MathUtils';
import { Vector2 } from '../utils/Vector2';
import { DriftState } from './DriftState';

export interface VehicleInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1
  handbrake: number; // 0..1
}

export interface BicycleDebugInfo {
  longitudinalForce: number;
  lateralForce: number;
  frontLateralForce: number;
  rearLateralForce: number;
  slipAngleFront: number;
  slipAngleRear: number;
  lateralVelocity: number;
  longitudinalVelocity: number;
  driftRatio: number;
}

export class BicycleModel {
  position = new Vector2();
  velocity = new Vector2();
  heading = 0;
  yawRate = 0;
  steeringAngle = 0;

  readonly driftState = new DriftState();

  mass = 900; // kg — lighter = snappier
  wheelBase = 2.4; // meters
  cgToFront = 1.0;
  cgToRear = 1.4;
  cgHeight = 0.45;
  inertia = 900; // lower = faster rotation
  maxSteer = 0.95; // radians — wider steering range
  maxEngineForce = 14000; // N — punchier acceleration
  maxBrakeForce = 15000; // N
  maxHandbrakeForce = 8000; // N
  corneringStiffnessFront = 62000; // more lateral bite for tighter response
  corneringStiffnessRear = 70000;
  rollingResistance = 8.0; // less drag at low speed
  dragCoefficient = 0.35; // less air resistance
  yawDamping = 2.1; // stabilize snap turns without feeling floaty

  private debugInfo: BicycleDebugInfo = {
    longitudinalForce: 0,
    lateralForce: 0,
    frontLateralForce: 0,
    rearLateralForce: 0,
    slipAngleFront: 0,
    slipAngleRear: 0,
    lateralVelocity: 0,
    longitudinalVelocity: 0,
    driftRatio: 0,
  };

  get frontAxle(): Vector2 {
    return this.position.add(Vector2.fromAngle(this.heading, this.cgToFront));
  }

  get rearAxle(): Vector2 {
    return this.position.add(Vector2.fromAngle(this.heading + Math.PI, this.cgToRear));
  }

  update(dt: number, input: VehicleInput, surfaceFriction: number): void {
    const throttle = clamp(input.throttle, 0, 1);
    const brake = clamp(input.brake, 0, 1);
    const steer = clamp(input.steer, -1, 1);
    const handbrake = clamp(input.handbrake, 0, 1);

    this.steeringAngle = steer * this.maxSteer;

    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);

    // Transform velocity to body coordinates (x forward, y right)
    const vLong = cos * this.velocity.x + sin * this.velocity.y;
    const vLat = -sin * this.velocity.x + cos * this.velocity.y;

    const speedForSlip = Math.max(0.5, Math.abs(vLong));
    const alphaF = Math.atan2(vLat + this.cgToFront * this.yawRate, speedForSlip) - this.steeringAngle;
    const alphaR = Math.atan2(vLat - this.cgToRear * this.yawRate, speedForSlip);

    const engineForce = throttle * this.maxEngineForce;
    const brakeForce = brake * this.maxBrakeForce;
    const handbrakeForce = handbrake * this.maxHandbrakeForce;

    const dragForce = this.dragCoefficient * vLong * Math.abs(vLong);
    const rollingForce = this.rollingResistance * vLong;
    const brakeDirection = vLong !== 0 ? Math.sign(vLong) : 1;

    const longitudinalForce = engineForce - (brakeForce + handbrakeForce) * brakeDirection - dragForce - rollingForce;

    const g = 9.81;
    const weight = this.mass * g;
    const accelLong = longitudinalForce / this.mass;
    const weightTransfer = (this.mass * accelLong * this.cgHeight) / this.wheelBase;
    const frontLoad = Math.max(0, weight * (this.cgToRear / this.wheelBase) - weightTransfer);
    const rearLoad = Math.max(0, weight * (this.cgToFront / this.wheelBase) + weightTransfer);

    const driftMultiplier = this.driftState.frictionMultiplier;
    const mu = surfaceFriction * 1.2 * driftMultiplier;
    const rearGripFactor = 1 - handbrake * 0.45;

    const maxFrontLat = mu * frontLoad;
    const maxRearLat = mu * rearLoad * rearGripFactor;

    const rawFyf = -this.corneringStiffnessFront * alphaF;
    const rawFyr = -this.corneringStiffnessRear * alphaR;

    const Fyf = clamp(rawFyf, -maxFrontLat, maxFrontLat);
    const Fyr = clamp(rawFyr, -maxRearLat, maxRearLat);

    const Fxf = -Fyf * Math.sin(this.steeringAngle);
    const FyfBody = Fyf * Math.cos(this.steeringAngle);

    const Fx = longitudinalForce + Fxf;
    const Fy = FyfBody + Fyr;

    const yawMoment = this.cgToFront * FyfBody - this.cgToRear * Fyr;

    const accelBodyX = Fx / this.mass;
    const accelBodyY = Fy / this.mass;

    const accelWorldX = cos * accelBodyX - sin * accelBodyY;
    const accelWorldY = sin * accelBodyX + cos * accelBodyY;

    this.velocity.x += accelWorldX * dt;
    this.velocity.y += accelWorldY * dt;

    // Arcade stability assist: quickly bleed sideways velocity to reduce unwanted slide.
    const postLong = cos * this.velocity.x + sin * this.velocity.y;
    const postLat = -sin * this.velocity.x + cos * this.velocity.y;
    const speedRatio = clamp(Math.abs(postLong) / 45, 0, 1);
    const lateralDamping = 1 - clamp((6 + speedRatio * 7) * dt * surfaceFriction * driftMultiplier, 0, 0.88);
    const stabilizedLat = postLat * lateralDamping;
    this.velocity.x = cos * postLong - sin * stabilizedLat;
    this.velocity.y = sin * postLong + cos * stabilizedLat;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    const yawAcc = yawMoment / this.inertia;
    this.yawRate += yawAcc * dt;
    this.yawRate *= Math.max(0, 1 - this.yawDamping * dt);
    this.heading += this.yawRate * dt;

    const lateralForce = Math.abs(Fy);
    const gripForce = mu * weight;
    this.driftState.update({
      lateralForce,
      gripForce,
      steeringAngle: this.steeringAngle,
      lateralVelocity: vLat,
      dt,
    });

    const driftRatio = gripForce > 0 ? lateralForce / gripForce : 0;

    this.debugInfo = {
      longitudinalForce,
      lateralForce,
      frontLateralForce: Fyf,
      rearLateralForce: Fyr,
      slipAngleFront: alphaF,
      slipAngleRear: alphaR,
      lateralVelocity: vLat,
      longitudinalVelocity: vLong,
      driftRatio,
    };
  }

  getDebugInfo(): BicycleDebugInfo {
    return this.debugInfo;
  }

  get speed(): number {
    return this.velocity.magnitude();
  }
}
