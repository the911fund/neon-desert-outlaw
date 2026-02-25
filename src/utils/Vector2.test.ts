import { describe, it, expect } from 'vitest';
import { Vector2 } from './Vector2';

describe('Vector2', () => {
  it('supports basic arithmetic', () => {
    const a = new Vector2(3, 4);
    const b = new Vector2(1, -2);

    expect(a.add(b)).toEqual(new Vector2(4, 2));
    expect(a.sub(b)).toEqual(new Vector2(2, 6));
    expect(a.mul(2)).toEqual(new Vector2(6, 8));
    expect(a.dot(b)).toBe(-5);
    expect(a.cross(b)).toBe(-10);
  });

  it('normalizes and reports magnitude', () => {
    const v = new Vector2(3, 4);
    expect(v.magnitude()).toBeCloseTo(5);
    const n = v.normalize();
    expect(n.magnitude()).toBeCloseTo(1);
  });

  it('rotates and measures angle', () => {
    const v = new Vector2(1, 0).rotate(Math.PI / 2);
    expect(v.x).toBeCloseTo(0, 4);
    expect(v.y).toBeCloseTo(1, 4);

    const angle = new Vector2(0, 1).angle();
    expect(angle).toBeCloseTo(Math.PI / 2, 4);
  });

  it('lerps between vectors', () => {
    const start = new Vector2(0, 0);
    const end = new Vector2(10, 10);
    const mid = start.lerp(end, 0.5);
    expect(mid).toEqual(new Vector2(5, 5));
  });
});
