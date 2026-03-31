import type { VehicleInput } from '../physics/BicycleModel';
import type { Checkpoint } from '../game/CheckpointManager';
import { Vector2 } from '../utils/Vector2';
import { clamp } from '../utils/MathUtils';

export interface BotPersonality {
  name: string;
  /** Base top-speed multiplier (0.85–1.0). Lower = slower overall. */
  speedFactor: number;
  /** How far ahead (in world units) the bot looks for turns. */
  lookAhead: number;
  /** Steering aggressiveness — higher = sharper corrections. */
  steerGain: number;
  /** Threshold angle (rad) above which the bot brakes into a turn. */
  brakeAngleThreshold: number;
}

export const BOT_PERSONALITIES: BotPersonality[] = [
  { name: 'Viper',  speedFactor: 0.97, lookAhead: 220, steerGain: 2.8, brakeAngleThreshold: 0.55 },
  { name: 'Shadow', speedFactor: 0.93, lookAhead: 260, steerGain: 2.4, brakeAngleThreshold: 0.45 },
  { name: 'Blaze',  speedFactor: 0.99, lookAhead: 180, steerGain: 3.2, brakeAngleThreshold: 0.65 },
];

export class BotDriver {
  readonly personality: BotPersonality;
  currentCheckpointIndex = 0;

  /** Difficulty multiplier applied to speed and rubber-banding. */
  private speedMultiplier = 1.0;
  private rubberBandMultiplier = 1.0;

  /** Accumulated random wander offset — makes bots imperfect. */
  private wanderOffset = 0;
  private wanderTimer = 0;

  constructor(personality: BotPersonality) {
    this.personality = personality;
  }

  /** Apply difficulty scaling to this bot driver. */
  setDifficulty(speedMultiplier: number, rubberBandMultiplier: number): void {
    this.speedMultiplier = speedMultiplier;
    this.rubberBandMultiplier = rubberBandMultiplier;
  }

  /**
   * Produce vehicle input to drive toward the next checkpoint.
   * @param position  Current bot world position
   * @param heading   Current bot heading (radians)
   * @param speed     Current bot speed (m/s)
   * @param checkpoints  Full checkpoint list
   * @param leaderProgress  Leader's checkpoint index (for rubber-banding)
   * @param ownProgress     This bot's checkpoint index
   */
  computeInput(
    position: Vector2,
    heading: number,
    speed: number,
    checkpoints: Checkpoint[],
    leaderProgress: number,
    ownProgress: number,
  ): VehicleInput {
    if (checkpoints.length === 0) {
      return { throttle: 0, brake: 0, steer: 0, handbrake: 0 };
    }

    // Target the current checkpoint
    const targetIdx = Math.min(this.currentCheckpointIndex, checkpoints.length - 1);
    const target = checkpoints[targetIdx].position;

    // Add wander to make bots imperfect
    this.wanderTimer -= 1 / 60;
    if (this.wanderTimer <= 0) {
      this.wanderOffset = (Math.random() - 0.5) * 40;
      this.wanderTimer = 0.5 + Math.random() * 1.5;
    }

    const toTarget = target.sub(position);
    const distToTarget = toTarget.magnitude();

    // Look-ahead blending: if close to current checkpoint, start steering toward next
    let aimPoint = target;
    if (distToTarget < this.personality.lookAhead && targetIdx + 1 < checkpoints.length) {
      const nextTarget = checkpoints[targetIdx + 1].position;
      const blend = 1 - distToTarget / this.personality.lookAhead;
      aimPoint = target.lerp(nextTarget, blend * 0.4);
    }

    // Apply wander offset perpendicular to aim direction
    const aimDir = aimPoint.sub(position);
    const aimAngle = Math.atan2(aimDir.y, aimDir.x);
    const perpX = -Math.sin(aimAngle) * this.wanderOffset;
    const perpY = Math.cos(aimAngle) * this.wanderOffset;
    const wanderedAim = new Vector2(aimPoint.x + perpX, aimPoint.y + perpY);

    // Steering
    const toWandered = wanderedAim.sub(position);
    const desiredAngle = Math.atan2(toWandered.y, toWandered.x);
    let angleDiff = desiredAngle - heading;

    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const steer = clamp(angleDiff * this.personality.steerGain, -1, 1);

    // Throttle & brake
    const absAngle = Math.abs(angleDiff);
    let throttle: number;
    let brake: number;

    if (absAngle > this.personality.brakeAngleThreshold && speed > 8) {
      // Sharp turn coming — brake
      throttle = 0.2;
      brake = clamp((absAngle - this.personality.brakeAngleThreshold) * 2, 0, 0.8);
    } else {
      throttle = 1.0;
      brake = 0;
    }

    // Rubber-banding (scaled by difficulty)
    const progressDiff = leaderProgress - ownProgress;
    let rubberBand = 1.0;
    if (progressDiff > 1) {
      // Behind the leader — boost
      rubberBand = 1.0 + Math.min(progressDiff * 0.06 * this.rubberBandMultiplier, 0.25 * this.rubberBandMultiplier);
    } else if (progressDiff < -1) {
      // Ahead of everyone — slow down slightly
      rubberBand = 1.0 - Math.min(Math.abs(progressDiff) * 0.04, 0.15);
    }

    throttle *= this.personality.speedFactor * this.speedMultiplier * rubberBand;
    throttle = clamp(throttle, 0, 1);

    return { throttle, brake, steer, handbrake: 0 };
  }

  /** Check if bot reached the current checkpoint. Returns true if collected. */
  checkCheckpoint(position: Vector2, checkpoints: Checkpoint[], collectionRadius: number): boolean {
    if (this.currentCheckpointIndex >= checkpoints.length) return false;

    const cp = checkpoints[this.currentCheckpointIndex];
    const dx = position.x - cp.position.x;
    const dy = position.y - cp.position.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < collectionRadius * collectionRadius) {
      this.currentCheckpointIndex++;
      return true;
    }
    return false;
  }

  isFinished(totalCheckpoints: number): boolean {
    return this.currentCheckpointIndex >= totalCheckpoints;
  }

  reset(): void {
    this.currentCheckpointIndex = 0;
    this.wanderOffset = 0;
    this.wanderTimer = 0;
  }
}
