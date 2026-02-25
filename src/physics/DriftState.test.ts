import { describe, it, expect } from 'vitest';
import { DriftState, DriftPhase } from './DriftState';

describe('DriftState', () => {
  it('transitions from normal to drifting', () => {
    const drift = new DriftState();
    drift.update({
      lateralForce: 1200,
      gripForce: 900,
      steeringAngle: 0.2,
      lateralVelocity: 2,
      dt: 0.016,
    });

    expect(drift.state).toBe(DriftPhase.Drifting);
    expect(drift.frictionMultiplier).toBe(drift.driftFrictionMultiplier);
  });

  it('recovers with counter-steer', () => {
    const drift = new DriftState();
    drift.update({
      lateralForce: 1200,
      gripForce: 900,
      steeringAngle: 0.2,
      lateralVelocity: 2,
      dt: 0.016,
    });

    drift.update({
      lateralForce: 400,
      gripForce: 900,
      steeringAngle: -0.3,
      lateralVelocity: 2,
      dt: 0.016,
    });

    expect(drift.state).toBe(DriftPhase.Recovery);
    expect(drift.frictionMultiplier).toBe(drift.recoveryFrictionMultiplier);

    drift.update({
      lateralForce: 300,
      gripForce: 900,
      steeringAngle: 0,
      lateralVelocity: 0,
      dt: 0.5,
    });

    expect(drift.state).toBe(DriftPhase.Normal);
  });
});
