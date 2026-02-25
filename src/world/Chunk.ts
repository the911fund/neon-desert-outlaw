import { Container, Graphics } from 'pixi.js';
import type { ObjectPool } from '../utils/ObjectPool';
import { SurfaceType } from '../physics/SurfaceTypes';
import type { ObstacleInstance } from './ObstacleFactory';
import { ObstacleFactory } from './ObstacleFactory';
import { TerrainGenerator } from './TerrainGenerator';

export const CHUNK_SIZE = 2048;
export const TILE_SIZE = 64;
export const TILES_PER_CHUNK = CHUNK_SIZE / TILE_SIZE;

const TERRAIN_COLORS: Record<SurfaceType, number> = {
  [SurfaceType.Road]: 0x333333,
  [SurfaceType.Sand]: 0xc2a66b,
  [SurfaceType.Gravel]: 0x8b7d6b,
};

export class Chunk {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly key: string;

  terrain: SurfaceType[][] = [];
  obstacles: ObstacleInstance[] = [];

  private readonly terrainGenerator: TerrainGenerator;
  private readonly obstacleFactory: ObstacleFactory;
  private readonly graphicsPool: ObjectPool<Graphics>;
  private generated = false;
  private container: Container | null = null;
  private terrainGraphics: Graphics | null = null;
  private obstacleGraphics: Graphics | null = null;

  constructor(
    chunkX: number,
    chunkY: number,
    terrainGenerator: TerrainGenerator,
    obstacleFactory: ObstacleFactory,
    graphicsPool: ObjectPool<Graphics>
  ) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.key = `${chunkX},${chunkY}`;
    this.terrainGenerator = terrainGenerator;
    this.obstacleFactory = obstacleFactory;
    this.graphicsPool = graphicsPool;
  }

  ensureGenerated(): void {
    if (this.generated) {
      return;
    }

    this.terrain = [];
    for (let y = 0; y < TILES_PER_CHUNK; y += 1) {
      const row: SurfaceType[] = [];
      for (let x = 0; x < TILES_PER_CHUNK; x += 1) {
        const worldX = this.chunkX * CHUNK_SIZE + (x + 0.5) * TILE_SIZE;
        const worldY = this.chunkY * CHUNK_SIZE + (y + 0.5) * TILE_SIZE;
        row.push(this.terrainGenerator.getSurfaceType(worldX, worldY));
      }
      this.terrain.push(row);
    }

    this.obstacles = this.obstacleFactory.generateObstacles(this.chunkX, this.chunkY, CHUNK_SIZE);
    this.generated = true;
  }

  attach(container: Container, renderEnabled: boolean): void {
    this.container = container;
    this.container.position.set(this.chunkX * CHUNK_SIZE, this.chunkY * CHUNK_SIZE);
    this.container.removeChildren();

    if (renderEnabled) {
      this.render();
    }
  }

  detach(): Container | null {
    if (!this.container) {
      return null;
    }
    this.releaseGraphics();
    const container = this.container;
    container.removeChildren();
    this.container = null;
    return container;
  }

  private render(): void {
    if (!this.container) {
      return;
    }

    this.terrainGraphics = this.graphicsPool.acquire();
    this.terrainGraphics.clear();

    for (let y = 0; y < TILES_PER_CHUNK; y += 1) {
      for (let x = 0; x < TILES_PER_CHUNK; x += 1) {
        const surface = this.terrain[y][x];
        const color = TERRAIN_COLORS[surface];
        this.terrainGraphics.beginFill(color);
        this.terrainGraphics.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        this.terrainGraphics.endFill();
      }
    }

    this.obstacleGraphics = this.graphicsPool.acquire();
    this.obstacleFactory.renderObstacles(this.obstacleGraphics, this.obstacles);

    this.container.addChild(this.terrainGraphics, this.obstacleGraphics);
  }

  private releaseGraphics(): void {
    if (this.terrainGraphics) {
      this.terrainGraphics.removeFromParent();
      this.terrainGraphics.clear();
      this.graphicsPool.release(this.terrainGraphics);
      this.terrainGraphics = null;
    }
    if (this.obstacleGraphics) {
      this.obstacleGraphics.removeFromParent();
      this.obstacleGraphics.clear();
      this.graphicsPool.release(this.obstacleGraphics);
      this.obstacleGraphics = null;
    }
  }
}
