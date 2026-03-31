/** Difficulty presets that scale AI bot competitiveness. */
export enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
}

export interface DifficultyConfig {
  label: string;
  /** Multiplier applied to bot speedFactor (higher = faster bots). */
  botSpeedMultiplier: number;
  /** Multiplier applied to rubber-band boost when behind leader. */
  rubberBandMultiplier: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.EASY]: {
    label: 'Easy',
    botSpeedMultiplier: 0.82,
    rubberBandMultiplier: 0.5,
  },
  [Difficulty.NORMAL]: {
    label: 'Normal',
    botSpeedMultiplier: 1.0,
    rubberBandMultiplier: 1.0,
  },
  [Difficulty.HARD]: {
    label: 'Hard',
    botSpeedMultiplier: 1.12,
    rubberBandMultiplier: 1.5,
  },
};
