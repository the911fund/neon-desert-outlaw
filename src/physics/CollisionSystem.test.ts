import { describe, it, expect } from 'vitest';
import { CollisionSystem } from './CollisionSystem';
import { Vector2 } from '../utils/Vector2';

describe('CollisionSystem', () => {
  describe('AABB overlap', () => {
    it('detects overlapping boxes', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 5, y: 5, width: 10, height: 10 };
      expect(CollisionSystem.aabbOverlap(a, b)).toBe(true);
    });

    it('rejects non-overlapping boxes', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 20, y: 20, width: 10, height: 10 };
      expect(CollisionSystem.aabbOverlap(a, b)).toBe(false);
    });

    it('rejects edge-touching boxes', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 10, y: 0, width: 10, height: 10 };
      expect(CollisionSystem.aabbOverlap(a, b)).toBe(false);
    });
  });

  describe('AABB collision resolution', () => {
    it('computes minimum push-out along shortest axis', () => {
      const a = { x: 0, y: 0, width: 10, height: 10 };
      const b = { x: 8, y: 2, width: 10, height: 10 };
      const result = CollisionSystem.aabbCollision(a, b);
      expect(result).not.toBeNull();
      expect(result!.depth).toBe(2); // x overlap = 2, y overlap = 8
      expect(result!.normal.x).toBe(-1); // push left
    });

    it('returns null for non-overlapping', () => {
      const a = { x: 0, y: 0, width: 5, height: 5 };
      const b = { x: 10, y: 10, width: 5, height: 5 };
      expect(CollisionSystem.aabbCollision(a, b)).toBeNull();
    });
  });

  describe('collision response', () => {
    it('bounces velocity off solid obstacle', () => {
      const system = new CollisionSystem();
      const velocity = new Vector2(50, 0);
      const response = system.resolveCollision(velocity, {
        hit: true,
        obstacle: { type: 'rock', localX: 0, localY: 0, rotation: 0, width: 20, height: 20, bounds: { x: -10, y: -10, width: 20, height: 20 } },
        overlap: new Vector2(3, 0),
        normal: new Vector2(-1, 0),
        depth: 3,
        destructible: false,
      });
      expect(response.bounceVelocity.x).toBeLessThan(0); // bounced back
      expect(response.speedReduction).toBeLessThan(1);
      expect(response.shakeIntensity).toBeGreaterThan(0);
    });

    it('applies minimal bounce for destructible obstacles', () => {
      const system = new CollisionSystem();
      const velocity = new Vector2(-30, 0);
      const response = system.resolveCollision(velocity, {
        hit: true,
        obstacle: { type: 'cactus', localX: 0, localY: 0, rotation: 0, width: 10, height: 10, bounds: { x: -5, y: -5, width: 10, height: 10 } },
        overlap: new Vector2(-2, 0),
        normal: new Vector2(-1, 0),
        depth: 2,
        destructible: true,
      });
      expect(response.destroyed).toBe(true);
      expect(response.speedReduction).toBe(0.9); // minimal slowdown
    });
  });
});
