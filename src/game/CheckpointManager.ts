import { Container, Graphics } from 'pixi.js';
import { Vector2 } from '../utils/Vector2';
import { BloomFilter } from '../rendering/BloomFilter';

export interface Checkpoint {
  position: Vector2;
  collected: boolean;
  index: number;
}

export class CheckpointManager {
  readonly container: Container;
  private checkpoints: Checkpoint[] = [];
  private currentIndex = 0;
  private graphics: Graphics[] = [];
  private bloom: BloomFilter;
  private time = 0;

  private readonly collectionRadius = 100;
  private readonly gateRadius = 45;
  private readonly neonCyan = 0x00ffff;
  private readonly neonMagenta = 0xff00ff;

  constructor(bloom: BloomFilter) {
    this.container = new Container();
    this.bloom = bloom;
  }

  generateCircuit(): void {
    const waypoints: [number, number][] = [
      [400, 0],       // 1: right on road
      [1000, -60],    // 2: further right on road
      [1800, -120],   // 3: far right curve
      [2200, -400],   // 4: off-road into desert (north)
      [1800, -800],   // 5: deep desert
      [1000, -900],   // 6: far north
      [200, -700],    // 7: heading back west
      [-400, -400],   // 8: southwest of start
      [-600, 0],      // 9: west on road
      [-200, 200],    // 10: loop back to start area
    ];
    this.generateFromPositions(waypoints, true);
  }

  generateFromPositions(waypoints: [number, number][], shuffle = false): void {
    // Optionally randomize checkpoint order (Fisher-Yates shuffle)
    if (shuffle) {
      waypoints = [...waypoints];
      for (let i = waypoints.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [waypoints[i], waypoints[j]] = [waypoints[j], waypoints[i]];
      }
    }

    // Clear previous
    this.container.removeChildren();
    this.graphics = [];
    this.checkpoints = [];
    this.currentIndex = 0;

    for (let i = 0; i < waypoints.length; i++) {
      const [x, y] = waypoints[i];
      const checkpoint: Checkpoint = {
        position: new Vector2(x, y),
        collected: false,
        index: i,
      };
      this.checkpoints.push(checkpoint);

      const gfx = new Graphics();
      this.drawCheckpoint(gfx, checkpoint, false);
      gfx.position.set(x, y);
      this.bloom.applyTo(gfx, 0.6, 2);
      this.container.addChild(gfx);
      this.graphics.push(gfx);
    }
  }

  update(dt: number, vehiclePosition: Vector2): boolean {
    this.time += dt;

    if (this.currentIndex >= this.checkpoints.length) return false;

    const cp = this.checkpoints[this.currentIndex];
    const dx = vehiclePosition.x - cp.position.x;
    const dy = vehiclePosition.y - cp.position.y;
    const distSq = dx * dx + dy * dy;

    let collected = false;
    if (distSq < this.collectionRadius * this.collectionRadius) {
      cp.collected = true;
      this.currentIndex++;
      collected = true;
    }

    // Redraw all checkpoints to update pulsing and collected state
    for (let i = 0; i < this.checkpoints.length; i++) {
      const checkpoint = this.checkpoints[i];
      const isNext = i === this.currentIndex;
      this.drawCheckpoint(this.graphics[i], checkpoint, isNext);
      this.graphics[i].visible = !checkpoint.collected;
    }

    return collected;
  }

  private drawCheckpoint(gfx: Graphics, checkpoint: Checkpoint, isNext: boolean): void {
    gfx.clear();

    if (checkpoint.collected) return;

    const pulse = Math.sin(this.time * 3) * 0.3 + 0.7;
    const color = isNext ? this.neonMagenta : this.neonCyan;
    const radius = this.gateRadius;
    const flagHeight = radius + 28;

    // Outer ring (glow)
    gfx.beginFill(color, 0.1 * pulse);
    gfx.drawCircle(0, 0, radius + 12);
    gfx.endFill();

    // Main ring
    gfx.lineStyle(3, color, 0.8 * pulse);
    gfx.drawCircle(0, 0, radius);

    // Inner ring
    gfx.lineStyle(2, color, 0.4 * pulse);
    gfx.drawCircle(0, 0, radius * 0.6);

    // Center dot
    gfx.beginFill(color, 0.6 * pulse);
    gfx.drawCircle(0, 0, 4);
    gfx.endFill();

    // Pole marker to make checkpoints readable at distance.
    gfx.lineStyle(3, color, 0.9);
    gfx.moveTo(0, radius + 8);
    gfx.lineTo(0, -flagHeight);

    // Flag marker near top of pole.
    const flagW = 22 + pulse * 6;
    const flagH = 12;
    const flagY = -flagHeight + 6;
    const isFinish = checkpoint.index === this.checkpoints.length - 1;
    const flagColor = isFinish ? 0xffffff : color;
    gfx.beginFill(flagColor, 0.95);
    gfx.drawPolygon([
      0, flagY,
      flagW, flagY + 2,
      flagW - 5, flagY + flagH,
      0, flagY + flagH - 2,
    ]);
    gfx.endFill();

    if (isFinish) {
      gfx.beginFill(0x222222, 0.9);
      gfx.drawRect(6, flagY + 2, 6, 4);
      gfx.drawRect(14, flagY + 8, 6, 4);
      gfx.endFill();
    }
  }

  getNextCheckpoint(): Checkpoint | null {
    if (this.currentIndex >= this.checkpoints.length) return null;
    return this.checkpoints[this.currentIndex];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getTotal(): number {
    return this.checkpoints.length;
  }

  isComplete(): boolean {
    return this.currentIndex >= this.checkpoints.length;
  }

  reset(): void {
    this.currentIndex = 0;
    this.time = 0;
    for (const cp of this.checkpoints) {
      cp.collected = false;
    }
    for (const gfx of this.graphics) {
      gfx.visible = true;
    }
  }

  getCheckpoints(): Checkpoint[] {
    return this.checkpoints;
  }
}
