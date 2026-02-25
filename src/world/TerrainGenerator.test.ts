import { describe, expect, it } from 'vitest';
import { SurfaceType } from '../physics/SurfaceTypes';
import { TerrainGenerator } from './TerrainGenerator';
import { CHUNK_SIZE } from './Chunk';

describe('TerrainGenerator', () => {
  it('is deterministic for the same seed', () => {
    const generatorA = new TerrainGenerator(1001);
    const generatorB = new TerrainGenerator(1001);
    const samples = [
      { x: 0, y: 0 },
      { x: 512, y: -384 },
      { x: CHUNK_SIZE + 120, y: 640 },
      { x: -900, y: 200 },
    ];

    for (const sample of samples) {
      expect(generatorA.getSurfaceType(sample.x, sample.y)).toBe(
        generatorB.getSurfaceType(sample.x, sample.y)
      );
    }
  });

  it('keeps the main road continuous across chunk boundaries', () => {
    const generator = new TerrainGenerator(77);
    const leftX = CHUNK_SIZE - 50;
    const rightX = CHUNK_SIZE + 50;

    const leftY = generator.getMainRoadY(leftX);
    const rightY = generator.getMainRoadY(rightX);

    expect(generator.getSurfaceType(leftX, leftY)).toBe(SurfaceType.Road);
    expect(generator.getSurfaceType(rightX, rightY)).toBe(SurfaceType.Road);
    expect(Math.abs(leftY - rightY)).toBeLessThan(220);
  });
});
