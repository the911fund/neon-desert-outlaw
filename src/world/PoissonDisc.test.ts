import { describe, expect, it } from 'vitest';
import { PoissonDisc } from './PoissonDisc';

const createRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe('PoissonDisc', () => {
  it('enforces minimum distance between points', () => {
    const rng = createRng(1337);
    const points = PoissonDisc.sample({ width: 300, height: 300 }, 28, 30, rng);

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const distance = Math.hypot(dx, dy);
        expect(distance).toBeGreaterThanOrEqual(27.5);
      }
    }
  });

  it('covers the bounds with points', () => {
    const rng = createRng(42);
    const points = PoissonDisc.sample({ width: 240, height: 240 }, 22, 28, rng);

    expect(points.length).toBeGreaterThan(15);

    const quadrants = [false, false, false, false];
    for (const point of points) {
      const xIndex = point.x < 120 ? 0 : 1;
      const yIndex = point.y < 120 ? 0 : 1;
      quadrants[xIndex + yIndex * 2] = true;
    }

    for (const hasPoint of quadrants) {
      expect(hasPoint).toBe(true);
    }
  });
});
