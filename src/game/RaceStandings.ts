import type { Checkpoint } from './CheckpointManager';
import type { BotVehicle } from '../ai/BotVehicle';
import type { Vector2 } from '../utils/Vector2';

export interface RacerStanding {
  name: string;
  position: number; // 1-based
  checkpointIndex: number;
  finished: boolean;
  finishTime: number | null;
  color: number;
}

export interface StandingsInput {
  playerPosition: Vector2;
  playerCheckpointIndex: number;
  playerFinished: boolean;
  playerFinishTime: number | null;
  bots: BotVehicle[];
  checkpoints: Checkpoint[];
}

export class RaceStandings {
  private standings: RacerStanding[] = [];

  update(input: StandingsInput): void {
    const { playerPosition, playerCheckpointIndex, playerFinished, playerFinishTime, bots, checkpoints } = input;

    // Build racer entries
    const racers: {
      name: string;
      checkpointIndex: number;
      distSqToNext: number;
      finished: boolean;
      finishTime: number | null;
      color: number;
    }[] = [];

    // Player entry
    let playerDistSq = 0;
    if (playerCheckpointIndex < checkpoints.length) {
      const cp = checkpoints[playerCheckpointIndex].position;
      const dx = playerPosition.x - cp.x;
      const dy = playerPosition.y - cp.y;
      playerDistSq = dx * dx + dy * dy;
    }

    racers.push({
      name: 'You',
      checkpointIndex: playerCheckpointIndex,
      distSqToNext: playerDistSq,
      finished: playerFinished,
      finishTime: playerFinishTime,
      color: 0x00ffff,
    });

    // Bot entries
    for (const bot of bots) {
      racers.push({
        name: bot.name,
        checkpointIndex: bot.checkpointIndex,
        distSqToNext: bot.distanceToNextCheckpoint(checkpoints),
        finished: bot.isFinished(checkpoints.length),
        finishTime: bot.finishTime,
        color: bot.accentColor,
      });
    }

    // Sort: finished racers first (by finish time), then by checkpoint index desc, then by distance to next asc
    racers.sort((a, b) => {
      // Finished racers come first
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) {
        return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
      }
      // More checkpoints = better position
      if (a.checkpointIndex !== b.checkpointIndex) {
        return b.checkpointIndex - a.checkpointIndex;
      }
      // Closer to next checkpoint = better
      return a.distSqToNext - b.distSqToNext;
    });

    this.standings = racers.map((r, i) => ({
      name: r.name,
      position: i + 1,
      checkpointIndex: r.checkpointIndex,
      finished: r.finished,
      finishTime: r.finishTime,
      color: r.color,
    }));
  }

  getStandings(): RacerStanding[] {
    return this.standings;
  }

  getPlayerPosition(): number {
    const player = this.standings.find(s => s.name === 'You');
    return player ? player.position : 1;
  }

  getPlayerStanding(): RacerStanding | undefined {
    return this.standings.find(s => s.name === 'You');
  }
}
