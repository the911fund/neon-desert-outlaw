import { describe, it, expect } from 'vitest';
import { BicycleModel } from './BicycleModel';

const surfaceFriction = 0.9;

describe('BicycleModel', () => {
  it('accelerates with throttle', () => {
    const model = new BicycleModel();
    model.update(1 / 60, { throttle: 1, brake: 0, steer: 0, handbrake: 0 }, surfaceFriction);

    expect(model.speed).toBeGreaterThan(0);
  });

  it('steers and updates heading', () => {
    const model = new BicycleModel();
    model.velocity.set(10, 0);
    const headingBefore = model.heading;

    model.update(1 / 60, { throttle: 0, brake: 0, steer: 1, handbrake: 0 }, surfaceFriction);

    expect(model.heading).not.toBe(headingBefore);
    const debug = model.getDebugInfo();
    expect(Math.abs(debug.frontLateralForce)).toBeGreaterThan(0);
  });

  it('brakes to reduce speed', () => {
    const model = new BicycleModel();
    model.velocity.set(20, 0);
    const speedBefore = model.speed;

    model.update(0.1, { throttle: 0, brake: 1, steer: 0, handbrake: 0 }, surfaceFriction);

    expect(model.speed).toBeLessThan(speedBefore);
  });
});
