import { Container, Graphics } from 'pixi.js';
import { ObjectPool } from '../utils/ObjectPool';
import type { SurfaceType } from '../physics/SurfaceTypes';
import { Chunk, CHUNK_SIZE } from './Chunk';
import { ObstacleFactory } from './ObstacleFactory';
import { TerrainGenerator } from './TerrainGenerator';

export interface WorldManagerOptions {
  seed?: number;
  loadRadius?: number;
  unloadRadius?: number;
  renderEnabled?: boolean;
}

export class WorldManager {
  private readonly stage: Container;
  private readonly chunks = new Map<string, Chunk>();
  private readonly loadedChunks = new Map<string, Chunk>();
  private readonly containerPool = new ObjectPool<Container>(() => new Container());
  private readonly graphicsPool = new ObjectPool<Graphics>(() => new Graphics());
  private readonly terrainGenerator: TerrainGenerator;
  private readonly obstacleFactory: ObstacleFactory;
  private readonly loadRadius: number;
  private readonly unloadRadius: number;
  private readonly renderEnabled: boolean;

  constructor(stage: Container, options: WorldManagerOptions = {}) {
    this.stage = stage;
    this.loadRadius = options.loadRadius ?? 2;
    this.unloadRadius = options.unloadRadius ?? this.loadRadius + 1;
    this.renderEnabled = options.renderEnabled ?? true;

    const seed = options.seed ?? 42;
    this.terrainGenerator = new TerrainGenerator(seed);
    this.obstacleFactory = new ObstacleFactory(this.terrainGenerator, seed);
  }

  update(cameraX: number, cameraY: number): void {
    const centerChunkX = Math.floor(cameraX / CHUNK_SIZE);
    const centerChunkY = Math.floor(cameraY / CHUNK_SIZE);

    for (let y = centerChunkY - this.loadRadius; y <= centerChunkY + this.loadRadius; y += 1) {
      for (let x = centerChunkX - this.loadRadius; x <= centerChunkX + this.loadRadius; x += 1) {
        this.loadChunk(x, y);
      }
    }

    for (const [key, chunk] of this.loadedChunks) {
      const dx = Math.abs(chunk.chunkX - centerChunkX);
      const dy = Math.abs(chunk.chunkY - centerChunkY);
      if (dx > this.unloadRadius || dy > this.unloadRadius) {
        this.unloadChunk(key, chunk);
      }
    }
  }

  getSurfaceAt(x: number, y: number): SurfaceType {
    return this.terrainGenerator.getSurfaceType(x, y);
  }

  getLoadedChunkCount(): number {
    return this.loadedChunks.size;
  }

  isChunkLoaded(chunkX: number, chunkY: number): boolean {
    return this.loadedChunks.has(this.getKey(chunkX, chunkY));
  }

  getChunk(chunkX: number, chunkY: number): Chunk | undefined {
    return this.chunks.get(this.getKey(chunkX, chunkY));
  }

  private loadChunk(chunkX: number, chunkY: number): void {
    const key = this.getKey(chunkX, chunkY);
    if (this.loadedChunks.has(key)) {
      return;
    }

    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(chunkX, chunkY, this.terrainGenerator, this.obstacleFactory, this.graphicsPool);
      this.chunks.set(key, chunk);
    }

    chunk.ensureGenerated();

    if (this.renderEnabled) {
      const container = this.containerPool.acquire();
      chunk.attach(container, true);
      this.stage.addChild(container);
    }

    this.loadedChunks.set(key, chunk);
  }

  private unloadChunk(key: string, chunk: Chunk): void {
    const container = chunk.detach();
    if (container) {
      this.stage.removeChild(container);
      this.containerPool.release(container);
    }
    this.loadedChunks.delete(key);
  }

  private getKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }
}
