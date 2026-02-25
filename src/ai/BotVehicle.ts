import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BicycleModel } from '../physics/BicycleModel';
import type { VehicleInput } from '../physics/BicycleModel';
import { DriftPhase } from '../physics/DriftState';
import { VehicleRenderer, DamageState } from '../vehicle/VehicleRenderer';
import { BotDriver } from './BotDriver';
import type { BotPersonality } from './BotDriver';
import type { Checkpoint } from '../game/CheckpointManager';
import { Vector2 } from '../utils/Vector2';

export interface BotColor {
  body: number;
  accent: number;
  name: string;
}

export const BOT_COLORS: BotColor[] = [
  { body: 0x663300, accent: 0xff8800, name: 'orange' },
  { body: 0x666600, accent: 0xffff00, name: 'yellow' },
  { body: 0x006633, accent: 0x00ff66, name: 'green' },
  { body: 0x330066, accent: 0xaa44ff, name: 'purple' },
];

export class BotVehicle {
  readonly model: BicycleModel;
  readonly container: Container;
  readonly driver: BotDriver;
  readonly name: string;
  readonly accentColor: number;

  private renderer: VehicleRenderer;
  private nameTag: Text;
  private nameTagBg: Graphics;
  private lastInput: VehicleInput = { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
  finishTime: number | null = null;

  constructor(personality: BotPersonality, color: BotColor) {
    this.model = new BicycleModel();
    this.container = new Container();
    this.driver = new BotDriver(personality);
    this.name = personality.name;
    this.accentColor = color.accent;

    this.renderer = new VehicleRenderer(color.body, color.accent);
    this.container.addChild(this.renderer.container);

    // Name tag above car
    this.nameTagBg = new Graphics();
    this.nameTag = new Text({
      text: this.name,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fontWeight: 'bold',
        fill: color.accent,
      }),
    });
    this.nameTag.anchor.set(0.5, 1);
    this.nameTag.position.set(0, -22);

    this.nameTagBg.position.set(0, -22);
    this.container.addChild(this.nameTagBg);
    this.container.addChild(this.nameTag);
  }

  update(dt: number, surfaceFriction: number, checkpoints: Checkpoint[], leaderProgress: number): void {
    const input = this.driver.computeInput(
      this.model.position,
      this.model.heading,
      this.model.speed,
      checkpoints,
      leaderProgress,
      this.driver.currentCheckpointIndex,
    );

    this.lastInput = input;
    this.model.update(dt, input, surfaceFriction);

    this.container.position.set(this.model.position.x, this.model.position.y);
    this.container.rotation = this.model.heading;

    const isBraking = input.brake > 0;
    this.renderer.update(
      this.model.steeringAngle,
      isBraking,
      this.model.driftState.state,
      DamageState.Pristine,
    );

    // Update name tag background
    this.nameTagBg.clear();
    const tw = this.nameTag.width;
    this.nameTagBg.beginFill(0x000000, 0.5);
    this.nameTagBg.drawRoundedRect(-tw / 2 - 4, -14, tw + 8, 16, 3);
    this.nameTagBg.endFill();
  }

  /** Check if bot collected a checkpoint. Returns true on collection. */
  checkCheckpoint(checkpoints: Checkpoint[], collectionRadius: number): boolean {
    return this.driver.checkCheckpoint(this.model.position, checkpoints, collectionRadius);
  }

  get speed(): number {
    return this.model.speed;
  }

  get driftPhase(): DriftPhase {
    return this.model.driftState.state;
  }

  get checkpointIndex(): number {
    return this.driver.currentCheckpointIndex;
  }

  isFinished(totalCheckpoints: number): boolean {
    return this.driver.isFinished(totalCheckpoints);
  }

  /** Distance squared to the next checkpoint (for standings tiebreaker). */
  distanceToNextCheckpoint(checkpoints: Checkpoint[]): number {
    const idx = Math.min(this.driver.currentCheckpointIndex, checkpoints.length - 1);
    if (this.driver.currentCheckpointIndex >= checkpoints.length) return 0;
    const cp = checkpoints[idx].position;
    return this.model.position.sub(cp).magnitudeSq();
  }

  reset(spawnPosition: Vector2, heading: number): void {
    this.model.position.copy(spawnPosition);
    this.model.velocity.set(0, 0);
    this.model.heading = heading;
    this.model.yawRate = 0;
    this.driver.reset();
    this.finishTime = null;
    this.container.position.set(spawnPosition.x, spawnPosition.y);
    this.container.rotation = heading;
  }
}
