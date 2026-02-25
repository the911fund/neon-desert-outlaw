import { Vector2 } from '../utils/Vector2';
import { clamp } from '../utils/MathUtils';
import type { ObstacleInstance } from '../world/ObstacleFactory';
import type { Chunk } from '../world/Chunk';
import { CHUNK_SIZE } from '../world/Chunk';

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionResult {
  hit: boolean;
  obstacle: ObstacleInstance | null;
  overlap: Vector2;
  normal: Vector2;
  depth: number;
  destructible: boolean;
}

export interface CollisionResponse {
  bounceVelocity: Vector2;
  positionCorrection: Vector2;
  speedReduction: number;
  shakeIntensity: number;
  sparkCount: number;
  destroyed: boolean;
}

/** Obstacle collision properties keyed by type. */
const OBSTACLE_COLLISION: Record<string, { restitution: number; speedLoss: number; destructible: boolean; shakeScale: number }> = {
  rock:        { restitution: 0.6, speedLoss: 0.7, destructible: false, shakeScale: 1.0 },
  wreck:       { restitution: 0.4, speedLoss: 0.5, destructible: false, shakeScale: 0.8 },
  deadTree:    { restitution: 0.2, speedLoss: 0.3, destructible: true,  shakeScale: 0.4 },
  cactus:      { restitution: 0.15, speedLoss: 0.2, destructible: true,  shakeScale: 0.3 },
  outpostFuel: { restitution: 0.5, speedLoss: 0.6, destructible: false, shakeScale: 0.9 },
  outpostRest: { restitution: 0.5, speedLoss: 0.6, destructible: false, shakeScale: 0.9 },
};

/** Vehicle AABB half-extents (from VehicleRenderer: 40x20). */
const VEHICLE_HALF_WIDTH = 20;
const VEHICLE_HALF_HEIGHT = 10;

export class CollisionSystem {
  private readonly destroyed = new Set<string>();
  private screenShake = 0;
  private shakeDecay = 8;

  /** Test AABB overlap between two boxes. */
  static aabbOverlap(a: AABB, b: AABB): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /** Compute overlap depth and push-out normal between two AABBs. */
  static aabbCollision(a: AABB, b: AABB): { overlap: Vector2; normal: Vector2; depth: number } | null {
    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

    if (overlapX <= 0 || overlapY <= 0) return null;

    const aCenterX = a.x + a.width * 0.5;
    const aCenterY = a.y + a.height * 0.5;
    const bCenterX = b.x + b.width * 0.5;
    const bCenterY = b.y + b.height * 0.5;

    if (overlapX < overlapY) {
      const sign = aCenterX < bCenterX ? -1 : 1;
      return {
        overlap: new Vector2(overlapX * sign, 0),
        normal: new Vector2(sign, 0),
        depth: overlapX,
      };
    }

    const sign = aCenterY < bCenterY ? -1 : 1;
    return {
      overlap: new Vector2(0, overlapY * sign),
      normal: new Vector2(0, sign),
      depth: overlapY,
    };
  }

  /** Build vehicle AABB from center position. */
  static vehicleAABB(position: Vector2): AABB {
    return {
      x: position.x - VEHICLE_HALF_WIDTH,
      y: position.y - VEHICLE_HALF_HEIGHT,
      width: VEHICLE_HALF_WIDTH * 2,
      height: VEHICLE_HALF_HEIGHT * 2,
    };
  }

  /** Build a unique key for an obstacle to track destruction. */
  private obstacleKey(chunkX: number, chunkY: number, index: number): string {
    return `${chunkX},${chunkY},${index}`;
  }

  /** Check the vehicle against all obstacles in loaded chunks. Returns all collisions. */
  checkCollisions(vehiclePosition: Vector2, chunks: Chunk[]): CollisionResult[] {
    const vehicleBounds = CollisionSystem.vehicleAABB(vehiclePosition);
    const results: CollisionResult[] = [];

    for (const chunk of chunks) {
      const originX = chunk.chunkX * CHUNK_SIZE;
      const originY = chunk.chunkY * CHUNK_SIZE;

      for (let i = 0; i < chunk.obstacles.length; i += 1) {
        const obstacle = chunk.obstacles[i];
        const key = this.obstacleKey(chunk.chunkX, chunk.chunkY, i);

        if (this.destroyed.has(key)) continue;

        // Obstacle bounds are stored in world coordinates
        const obstacleBounds = obstacle.bounds;

        if (!CollisionSystem.aabbOverlap(vehicleBounds, obstacleBounds)) continue;

        const collision = CollisionSystem.aabbCollision(vehicleBounds, obstacleBounds);
        if (!collision) continue;

        const props = OBSTACLE_COLLISION[obstacle.type];
        const destructible = props?.destructible ?? false;

        results.push({
          hit: true,
          obstacle,
          overlap: collision.overlap,
          normal: collision.normal,
          depth: collision.depth,
          destructible,
        });

        // Mark destructible obstacles as destroyed on contact
        if (destructible) {
          this.destroyed.add(key);
        }
      }
    }

    return results;
  }

  /** Compute physics response for a collision. */
  resolveCollision(
    velocity: Vector2,
    collision: CollisionResult
  ): CollisionResponse {
    const props = OBSTACLE_COLLISION[collision.obstacle?.type ?? 'rock'];
    const restitution = props?.restitution ?? 0.5;
    const speedLoss = props?.speedLoss ?? 0.5;
    const shakeScale = props?.shakeScale ?? 1.0;
    const destructible = collision.destructible;

    // Reflect velocity along collision normal
    const velDotNormal = velocity.dot(collision.normal);

    // Only bounce if moving into the obstacle
    let bounceVelocity: Vector2;
    if (velDotNormal < 0) {
      // Reflect: v' = v - (1 + restitution) * (v.n) * n
      const factor = destructible ? 0.1 : (1 + restitution);
      bounceVelocity = new Vector2(
        velocity.x - factor * velDotNormal * collision.normal.x,
        velocity.y - factor * velDotNormal * collision.normal.y
      );
    } else {
      bounceVelocity = velocity.clone();
    }

    // Position correction: push out of overlap
    const positionCorrection = collision.overlap.clone();

    // Speed reduction factor (applied multiplicatively)
    const speed = velocity.magnitude();
    const speedReduction = destructible ? 0.9 : clamp(1 - speedLoss * (collision.depth / 20), 0.1, 1);

    // Screen shake intensity based on impact speed and obstacle type
    const impactSpeed = Math.abs(velDotNormal);
    const shakeIntensity = clamp(impactSpeed * 0.08 * shakeScale, 0, 12);

    // Spark count scales with impact
    const sparkCount = destructible
      ? Math.floor(clamp(impactSpeed * 0.05, 2, 6))
      : Math.floor(clamp(impactSpeed * 0.1, 4, 16));

    return {
      bounceVelocity,
      positionCorrection,
      speedReduction,
      shakeIntensity,
      sparkCount,
      destroyed: destructible,
    };
  }

  /** Apply collision responses to vehicle state. Returns total sparks to emit. */
  applyCollisions(
    position: Vector2,
    velocity: Vector2,
    collisions: CollisionResult[]
  ): { totalSparks: number; collisionPosition: Vector2 | null } {
    let totalSparks = 0;
    let collisionPosition: Vector2 | null = null;

    for (const collision of collisions) {
      const response = this.resolveCollision(velocity, collision);

      // Apply position correction
      position.x += response.positionCorrection.x;
      position.y += response.positionCorrection.y;

      // Apply bounce velocity
      velocity.copy(response.bounceVelocity);

      // Apply speed reduction
      velocity.mulMut(response.speedReduction);

      // Accumulate shake
      this.screenShake = Math.max(this.screenShake, response.shakeIntensity);

      // Accumulate sparks
      totalSparks += response.sparkCount;

      // Use first collision point for spark emission
      if (!collisionPosition && collision.obstacle) {
        const obs = collision.obstacle;
        collisionPosition = new Vector2(
          obs.bounds.x + obs.bounds.width * 0.5,
          obs.bounds.y + obs.bounds.height * 0.5
        );
      }
    }

    return { totalSparks, collisionPosition };
  }

  /** Update screen shake decay. Returns current offset for camera. */
  updateShake(dt: number): Vector2 {
    if (this.screenShake <= 0.01) {
      this.screenShake = 0;
      return Vector2.zero();
    }

    const offsetX = (Math.random() - 0.5) * this.screenShake * 2;
    const offsetY = (Math.random() - 0.5) * this.screenShake * 2;
    this.screenShake *= Math.max(0, 1 - this.shakeDecay * dt);

    return new Vector2(offsetX, offsetY);
  }

  getScreenShake(): number {
    return this.screenShake;
  }

  isDestroyed(chunkX: number, chunkY: number, index: number): boolean {
    return this.destroyed.has(this.obstacleKey(chunkX, chunkY, index));
  }
}
