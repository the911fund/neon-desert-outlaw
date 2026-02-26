export enum DriftPhase {
  Normal = 'Normal',
  Drifting = 'Drifting',
  Recovery = 'Recovery',
}

export interface DriftUpdateParams {
  lateralForce: number;
  gripForce: number;
  steeringAngle: number;
  lateralVelocity: number;
  dt: number;
}

export class DriftState {
  state: DriftPhase = DriftPhase.Normal;
  private recoveryTimer = 0;

  readonly driftThreshold = 1.22;
  readonly recoveryThreshold = 0.78;
  readonly recoveryDuration = 0.28;

  readonly driftFrictionMultiplier = 0.84;
  readonly recoveryFrictionMultiplier = 0.93;

  update(params: DriftUpdateParams): DriftPhase {
    const ratio = params.gripForce > 0 ? Math.abs(params.lateralForce) / params.gripForce : 0;
    const counterSteer =
      Math.abs(params.steeringAngle) > 0.05 &&
      Math.sign(params.steeringAngle) === -Math.sign(params.lateralVelocity || 0);

    if (this.state === DriftPhase.Normal) {
      if (ratio > this.driftThreshold) {
        this.state = DriftPhase.Drifting;
      }
      return this.state;
    }

    if (this.state === DriftPhase.Drifting) {
      if (ratio < this.recoveryThreshold && counterSteer) {
        this.state = DriftPhase.Recovery;
        this.recoveryTimer = this.recoveryDuration;
      }
      return this.state;
    }

    if (this.state === DriftPhase.Recovery) {
      this.recoveryTimer = Math.max(0, this.recoveryTimer - params.dt);
      if (ratio > this.driftThreshold) {
        this.state = DriftPhase.Drifting;
        return this.state;
      }
      if (this.recoveryTimer === 0 && ratio < this.recoveryThreshold * 0.9) {
        this.state = DriftPhase.Normal;
      }
      return this.state;
    }

    return this.state;
  }

  get frictionMultiplier(): number {
    if (this.state === DriftPhase.Drifting) return this.driftFrictionMultiplier;
    if (this.state === DriftPhase.Recovery) return this.recoveryFrictionMultiplier;
    return 1;
  }
}
