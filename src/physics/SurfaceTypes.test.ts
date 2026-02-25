import { describe, it, expect } from 'vitest';
import { SurfaceType, getSurfaceFriction, SurfaceFriction } from './SurfaceTypes';

describe('SurfaceTypes', () => {
  it('returns correct friction coefficients', () => {
    expect(getSurfaceFriction(SurfaceType.Road)).toBeCloseTo(0.9);
    expect(getSurfaceFriction(SurfaceType.Sand)).toBeCloseTo(0.5);
    expect(getSurfaceFriction(SurfaceType.Gravel)).toBeCloseTo(0.65);
  });

  it('matches friction table', () => {
    expect(SurfaceFriction[SurfaceType.Road]).toBe(0.9);
  });
});
