import { describe, it, expect } from 'vitest';
import { ParticleSystem } from './ParticleSystem';
import { DriftPhase } from '../physics/DriftState';
import { SurfaceType } from '../physics/SurfaceTypes';
import { Vector2 } from '../utils/Vector2';

describe('ParticleSystem', () => {
  it('emits particles based on surface and drift state', () => {
    const system = new ParticleSystem(undefined, {
      enableRendering: false,
      random: () => 0,
      maxSpeed: 60,
    });

    system.update(1, {
      position: new Vector2(0, 0),
      heading: 0,
      velocity: new Vector2(60, 0),
      speed: 60,
      driftPhase: DriftPhase.Drifting,
      driftRatio: 1.6,
      surface: SurfaceType.Sand,
    });

    expect(system.getActiveCountByKind('track')).toBe(20);
    expect(system.getActiveCountByKind('dust')).toBe(27);
    expect(system.getActiveCount()).toBe(47);
  });

  it('recycles particles after lifetime expiry', () => {
    const system = new ParticleSystem(undefined, {
      enableRendering: false,
      random: () => 0,
    });

    system.emitSparks(new Vector2(0, 0), 6);

    expect(system.getActiveCount()).toBe(6);

    system.update(1);

    expect(system.getActiveCount()).toBe(0);
    expect(system.getPoolSize()).toBe(6);
  });
});
