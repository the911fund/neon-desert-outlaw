import { Container } from 'pixi.js';
import { Vector2 } from '../utils/Vector2';
import { lerp, clamp } from '../utils/MathUtils';

export interface CameraConfig {
  lookAheadMaxDistance: number; // max pixels to offset based on velocity (default 150)
  lookAheadSpeedThreshold: number; // speed at which look-ahead reaches max (default 250)
  smoothingFactor: number; // lerp factor for camera position (default 0.05)
  minZoom: number; // zoom at max speed (default 0.85)
  maxZoom: number; // zoom at rest (default 1.0)
  zoomSpeedThreshold: number; // speed at which zoom reaches min (default 300)
}

const DEFAULT_CONFIG: CameraConfig = {
  lookAheadMaxDistance: 150,
  lookAheadSpeedThreshold: 250,
  smoothingFactor: 0.05,
  minZoom: 0.85,
  maxZoom: 1.0,
  zoomSpeedThreshold: 300,
};

export class Camera {
  private config: CameraConfig;
  private currentPosition: Vector2 = new Vector2();
  private targetPosition: Vector2 = new Vector2();
  private currentZoom: number = 1.0;
  private targetZoom: number = 1.0;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  constructor(config: Partial<CameraConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentZoom = this.config.maxZoom;
    this.targetZoom = this.config.maxZoom;
  }

  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  update(
    targetX: number,
    targetY: number,
    velocityX: number,
    velocityY: number,
    speed: number
  ): void {
    // Calculate look-ahead offset based on velocity direction
    const lookAheadOffset = this.calculateLookAhead(velocityX, velocityY, speed);

    // Set target position (vehicle position + look-ahead)
    this.targetPosition.set(targetX + lookAheadOffset.x, targetY + lookAheadOffset.y);

    // Calculate target zoom based on speed
    this.targetZoom = this.calculateZoom(speed);

    // Smooth interpolation toward target
    this.currentPosition.x = lerp(this.currentPosition.x, this.targetPosition.x, this.config.smoothingFactor);
    this.currentPosition.y = lerp(this.currentPosition.y, this.targetPosition.y, this.config.smoothingFactor);
    this.currentZoom = lerp(this.currentZoom, this.targetZoom, this.config.smoothingFactor);
  }

  private calculateLookAhead(velocityX: number, velocityY: number, speed: number): Vector2 {
    if (speed < 0.1) {
      return Vector2.zero();
    }

    // Normalize velocity to get direction
    const normalizedX = velocityX / speed;
    const normalizedY = velocityY / speed;

    // Scale look-ahead distance based on speed (0 at rest, max at threshold)
    const speedRatio = clamp(speed / this.config.lookAheadSpeedThreshold, 0, 1);
    const lookAheadDistance = speedRatio * this.config.lookAheadMaxDistance;

    return new Vector2(normalizedX * lookAheadDistance, normalizedY * lookAheadDistance);
  }

  private calculateZoom(speed: number): number {
    // Zoom out as speed increases
    const speedRatio = clamp(speed / this.config.zoomSpeedThreshold, 0, 1);
    return lerp(this.config.maxZoom, this.config.minZoom, speedRatio);
  }

  applyToContainer(worldContainer: Container): void {
    const centerX = this.screenWidth * 0.5;
    const centerY = this.screenHeight * 0.5;

    // Apply zoom
    worldContainer.scale.set(this.currentZoom);

    // Position world so camera position is at screen center
    worldContainer.position.set(
      centerX - this.currentPosition.x * this.currentZoom,
      centerY - this.currentPosition.y * this.currentZoom
    );
  }

  snapTo(x: number, y: number): void {
    this.currentPosition.set(x, y);
    this.targetPosition.set(x, y);
  }

  get position(): Vector2 {
    return this.currentPosition.clone();
  }

  get zoom(): number {
    return this.currentZoom;
  }

  getLookAheadOffset(velocityX: number, velocityY: number, speed: number): Vector2 {
    return this.calculateLookAhead(velocityX, velocityY, speed);
  }

  getZoomForSpeed(speed: number): number {
    return this.calculateZoom(speed);
  }
}
