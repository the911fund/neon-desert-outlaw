import type { Graphics } from 'pixi.js';
import { PoissonDisc } from './PoissonDisc';
import type { PoissonPoint } from './PoissonDisc';
import { TerrainGenerator } from './TerrainGenerator';

export type ObstacleType = 'rock' | 'deadTree' | 'cactus' | 'wreck' | 'outpostFuel' | 'outpostRest';

export interface ObstacleBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ObstacleInstance {
  type: ObstacleType;
  localX: number;
  localY: number;
  rotation: number;
  width: number;
  height: number;
  bounds: ObstacleBounds;
}

interface ObstacleProfile {
  type: ObstacleType;
  width: number;
  height: number;
}

export class ObstacleFactory {
  private readonly terrain: TerrainGenerator;
  private readonly seed: number;

  constructor(terrain: TerrainGenerator, seed: number) {
    this.terrain = terrain;
    this.seed = Math.floor(seed);
  }

  generateObstacles(chunkX: number, chunkY: number, chunkSize: number): ObstacleInstance[] {
    const originX = chunkX * chunkSize;
    const originY = chunkY * chunkSize;
    const bounds = { width: chunkSize, height: chunkSize, minX: 0, minY: 0 };

    const obstacleSeed = this.hashSeed(chunkX, chunkY, 197);
    const obstacleRng = this.createRng(obstacleSeed);
    const points = PoissonDisc.sample(bounds, 120, 28, obstacleRng);

    const obstacles: ObstacleInstance[] = [];
    const roadSettings = this.terrain.getRoadSettings();
    const roadBuffer = roadSettings.roadHalfWidth + roadSettings.gravelWidth * 0.4;

    for (const point of points) {
      const worldX = originX + point.x;
      const worldY = originY + point.y;
      const roadDistance = this.terrain.getRoadDistance(worldX, worldY);

      const nearRoad = roadDistance < roadBuffer;
      const keepChance = nearRoad ? 0.2 : 0.85;
      if (obstacleRng() > keepChance) {
        continue;
      }

      const profile = this.pickObstacleProfile(obstacleRng, roadDistance);
      obstacles.push(
        this.buildObstacle(profile, point, originX, originY, obstacleRng() * Math.PI * 2)
      );
    }

    const outpostSeed = this.hashSeed(chunkX, chunkY, 991);
    const outpostRng = this.createRng(outpostSeed);
    const outpostPoints = PoissonDisc.sample(bounds, 760, 24, outpostRng);
    for (const point of outpostPoints) {
      const worldX = originX + point.x;
      const worldY = originY + point.y;
      const roadDistance = this.terrain.getRoadDistance(worldX, worldY);
      if (roadDistance > roadSettings.roadHalfWidth + roadSettings.gravelWidth + 80) {
        continue;
      }
      if (outpostRng() > 0.55) {
        continue;
      }

      const type: ObstacleType = outpostRng() > 0.5 ? 'outpostFuel' : 'outpostRest';
      const profile: ObstacleProfile = {
        type,
        width: 160,
        height: 90,
      };
      obstacles.push(this.buildObstacle(profile, point, originX, originY, 0));
    }

    return obstacles;
  }

  renderObstacles(graphics: Graphics, obstacles: ObstacleInstance[]): void {
    graphics.clear();

    for (const obstacle of obstacles) {
      const x = obstacle.localX;
      const y = obstacle.localY;

      switch (obstacle.type) {
        case 'rock': {
          graphics.beginFill(0x6b6b6b, 0.95);
          graphics.drawCircle(x, y, obstacle.width * 0.5);
          graphics.endFill();
          break;
        }
        case 'deadTree': {
          graphics.lineStyle(3, 0x7b4b2a, 0.9);
          graphics.moveTo(x, y - obstacle.height * 0.5);
          graphics.lineTo(x, y + obstacle.height * 0.5);
          graphics.lineStyle(0);
          break;
        }
        case 'cactus': {
          graphics.beginFill(0x2fbf4a, 0.95);
          graphics.drawRoundedRect(x - obstacle.width * 0.5, y - obstacle.height * 0.5, obstacle.width, obstacle.height, 3);
          graphics.drawRoundedRect(x - obstacle.width * 0.9, y - obstacle.height * 0.1, obstacle.width * 0.4, obstacle.height * 0.35, 2);
          graphics.endFill();
          break;
        }
        case 'wreck': {
          graphics.beginFill(0xb33b3b, 0.9);
          graphics.drawRect(x - obstacle.width * 0.5, y - obstacle.height * 0.5, obstacle.width, obstacle.height);
          graphics.endFill();
          break;
        }
        case 'outpostFuel': {
          graphics.beginFill(0x2e8bff, 0.95);
          graphics.drawRoundedRect(x - obstacle.width * 0.5, y - obstacle.height * 0.5, obstacle.width, obstacle.height, 6);
          graphics.endFill();
          break;
        }
        case 'outpostRest': {
          graphics.beginFill(0x2ecc71, 0.95);
          graphics.drawRoundedRect(x - obstacle.width * 0.5, y - obstacle.height * 0.5, obstacle.width, obstacle.height, 6);
          graphics.endFill();
          break;
        }
        default:
          break;
      }
    }
  }

  private pickObstacleProfile(rng: () => number, roadDistance: number): ObstacleProfile {
    const roll = rng();
    if (roadDistance < 160) {
      if (roll < 0.5) {
        const size = 16 + rng() * 10;
        return { type: 'rock', width: size, height: size };
      }
      return { type: 'wreck', width: 32 + rng() * 18, height: 20 + rng() * 12 };
    }

    if (roll < 0.35) {
      const size = 14 + rng() * 10;
      return { type: 'rock', width: size, height: size };
    }
    if (roll < 0.6) {
      return { type: 'deadTree', width: 6, height: 32 + rng() * 18 };
    }
    if (roll < 0.8) {
      return { type: 'cactus', width: 12, height: 28 + rng() * 16 };
    }
    return { type: 'wreck', width: 28 + rng() * 16, height: 18 + rng() * 12 };
  }

  private buildObstacle(
    profile: ObstacleProfile,
    point: PoissonPoint,
    originX: number,
    originY: number,
    rotation: number
  ): ObstacleInstance {
    const worldX = originX + point.x;
    const worldY = originY + point.y;
    const bounds: ObstacleBounds = {
      x: worldX - profile.width * 0.5,
      y: worldY - profile.height * 0.5,
      width: profile.width,
      height: profile.height,
    };

    return {
      type: profile.type,
      localX: point.x,
      localY: point.y,
      rotation,
      width: profile.width,
      height: profile.height,
      bounds,
    };
  }

  private createRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private hashSeed(x: number, y: number, salt: number): number {
    let h =
      Math.imul(x | 0, 374761393) ^
      Math.imul(y | 0, 668265263) ^
      Math.imul(this.seed, 1442695041) ^
      salt;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    h ^= h >>> 16;
    return h >>> 0;
  }
}
