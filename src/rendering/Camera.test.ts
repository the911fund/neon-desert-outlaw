import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from './Camera';

describe('Camera', () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera({
      lookAheadMaxDistance: 150,
      lookAheadSpeedThreshold: 250,
      smoothingFactor: 0.05,
      minZoom: 0.85,
      maxZoom: 1.0,
      zoomSpeedThreshold: 300,
    });
    camera.setScreenSize(800, 600);
  });

  describe('look-ahead offset', () => {
    it('returns zero offset at rest (speed = 0)', () => {
      const offset = camera.getLookAheadOffset(0, 0, 0);
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('returns zero offset at very low speed', () => {
      const offset = camera.getLookAheadOffset(0.01, 0, 0.01);
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('scales look-ahead with speed', () => {
      // At half threshold speed, should be roughly half max distance
      const halfSpeed = 125;
      const offset1 = camera.getLookAheadOffset(halfSpeed, 0, halfSpeed);

      // At full threshold speed, should be at max distance
      const fullSpeed = 250;
      const offset2 = camera.getLookAheadOffset(fullSpeed, 0, fullSpeed);

      // Offset should increase with speed
      expect(Math.abs(offset2.x)).toBeGreaterThan(Math.abs(offset1.x));

      // At half speed, should be approximately half max distance
      expect(offset1.x).toBeCloseTo(75, 0); // 150 * 0.5 = 75

      // At full speed, should be at max distance
      expect(offset2.x).toBeCloseTo(150, 0);
    });

    it('clamps look-ahead at max speed threshold', () => {
      // Above threshold should still be capped at max
      const offset = camera.getLookAheadOffset(500, 0, 500);
      expect(offset.x).toBeCloseTo(150, 0);
    });

    it('respects velocity direction', () => {
      const speed = 250;

      // Moving right
      const rightOffset = camera.getLookAheadOffset(speed, 0, speed);
      expect(rightOffset.x).toBeGreaterThan(0);
      expect(rightOffset.y).toBeCloseTo(0, 5);

      // Moving up
      const upOffset = camera.getLookAheadOffset(0, -speed, speed);
      expect(upOffset.x).toBeCloseTo(0, 5);
      expect(upOffset.y).toBeLessThan(0);

      // Moving diagonally
      const diagSpeed = speed / Math.sqrt(2);
      const diagOffset = camera.getLookAheadOffset(diagSpeed, diagSpeed, speed);
      expect(diagOffset.x).toBeGreaterThan(0);
      expect(diagOffset.y).toBeGreaterThan(0);
    });
  });

  describe('zoom', () => {
    it('returns maxZoom at rest', () => {
      const zoom = camera.getZoomForSpeed(0);
      expect(zoom).toBe(1.0);
    });

    it('returns minZoom at max speed', () => {
      const zoom = camera.getZoomForSpeed(300);
      expect(zoom).toBe(0.85);
    });

    it('interpolates zoom based on speed', () => {
      // At half threshold speed
      const halfZoom = camera.getZoomForSpeed(150);
      expect(halfZoom).toBeCloseTo(0.925, 2); // lerp(1.0, 0.85, 0.5) = 0.925

      // At quarter threshold speed
      const quarterZoom = camera.getZoomForSpeed(75);
      expect(quarterZoom).toBeCloseTo(0.9625, 2); // lerp(1.0, 0.85, 0.25) = 0.9625
    });

    it('clamps zoom at speeds above threshold', () => {
      const zoom = camera.getZoomForSpeed(600);
      expect(zoom).toBe(0.85);
    });
  });

  describe('smooth interpolation', () => {
    it('converges toward target over multiple updates', () => {
      camera.snapTo(0, 0);

      // Target position far away
      const targetX = 100;
      const targetY = 50;

      // Run multiple updates
      let prevDistance = Infinity;
      for (let i = 0; i < 200; i++) {
        camera.update(targetX, targetY, 0, 0, 0);

        const pos = camera.position;
        const distance = Math.sqrt(
          Math.pow(pos.x - targetX, 2) + Math.pow(pos.y - targetY, 2)
        );

        // Distance should decrease each update (convergence)
        expect(distance).toBeLessThan(prevDistance);
        prevDistance = distance;
      }

      // After many updates, should be very close to target (within 1 unit)
      const finalPos = camera.position;
      expect(Math.abs(finalPos.x - targetX)).toBeLessThan(1);
      expect(Math.abs(finalPos.y - targetY)).toBeLessThan(1);
    });

    it('zoom converges smoothly', () => {
      camera.snapTo(0, 0);

      // Start at rest (zoom = 1.0)
      camera.update(0, 0, 0, 0, 0);
      expect(camera.zoom).toBeCloseTo(1.0, 2);

      // Accelerate to high speed
      let prevZoom = camera.zoom;
      for (let i = 0; i < 50; i++) {
        camera.update(0, 0, 300, 0, 300);

        // Zoom should decrease smoothly toward minZoom
        expect(camera.zoom).toBeLessThanOrEqual(prevZoom + 0.001); // Allow small float errors
        prevZoom = camera.zoom;
      }

      // After many updates at high speed, should approach minZoom
      expect(camera.zoom).toBeCloseTo(0.85, 1);
    });

    it('maintains smooth position when velocity changes', () => {
      camera.snapTo(0, 0);

      // Update with constant target
      for (let i = 0; i < 20; i++) {
        camera.update(100, 100, 0, 0, 0);
      }
      const pos1 = camera.position.clone();

      // Single update shouldn't cause huge jump
      camera.update(100, 100, 200, 0, 200);
      const pos2 = camera.position;

      const jump = Math.sqrt(
        Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
      );

      // Jump should be small due to smoothing
      expect(jump).toBeLessThan(20);
    });
  });

  describe('snapTo', () => {
    it('immediately sets position without interpolation', () => {
      camera.update(0, 0, 0, 0, 0);

      camera.snapTo(500, 300);

      const pos = camera.position;
      expect(pos.x).toBe(500);
      expect(pos.y).toBe(300);
    });
  });
});
