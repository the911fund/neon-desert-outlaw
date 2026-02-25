import { describe, expect, it } from 'vitest';
import { Container } from 'pixi.js';
import { WorldManager } from './WorldManager';
import { CHUNK_SIZE } from './Chunk';

describe('WorldManager', () => {
  it('loads and unloads chunks around the camera', () => {
    const stage = new Container();
    const world = new WorldManager(stage, { seed: 5, loadRadius: 1, unloadRadius: 1, renderEnabled: false });

    world.update(0, 0);
    expect(world.getLoadedChunkCount()).toBe(9);
    expect(world.isChunkLoaded(0, 0)).toBe(true);

    world.update(CHUNK_SIZE * 4, 0);
    expect(world.isChunkLoaded(0, 0)).toBe(false);
    expect(world.isChunkLoaded(4, 0)).toBe(true);
  });

  it('caches chunk data between unloads', () => {
    const stage = new Container();
    const world = new WorldManager(stage, { seed: 9, loadRadius: 1, unloadRadius: 1, renderEnabled: false });

    world.update(0, 0);
    const chunk = world.getChunk(0, 0);
    expect(chunk).toBeDefined();

    world.update(CHUNK_SIZE * 3, CHUNK_SIZE * 3);
    world.update(0, 0);
    const reloaded = world.getChunk(0, 0);
    expect(reloaded).toBe(chunk);
  });
});
