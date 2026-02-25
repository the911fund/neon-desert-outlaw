import type { DialogueLine } from './DialogueBox';
import type { SurfaceType } from '../physics/SurfaceTypes';

export type ObjectiveType =
  | { type: 'reach_checkpoints' }
  | { type: 'timed_delivery'; timeLimit: number }
  | { type: 'offroad_only' };

export interface Mission {
  id: string;
  title: string;
  chapter: number;
  chapterTitle: string;
  briefing: DialogueLine[];
  objectives: ObjectiveType;
  checkpoints: [number, number][];
  completionDialogue: DialogueLine[];
}

export type StoryState =
  | 'briefing'
  | 'countdown'
  | 'playing'
  | 'complete'
  | 'failed'
  | 'finale';

const SAVE_KEY = 'ndo-story-progress';

export class MissionManager {
  private missions: Mission[] = [];
  private currentIndex = 0;
  private _state: StoryState = 'briefing';
  private _missionTime = 0;
  private _failed = false;
  private _touchedRoad = false;
  private lastChapter = 0;

  /** Whether a new chapter just started (checked and cleared each mission start). */
  newChapter = false;

  get state(): StoryState {
    return this._state;
  }

  get missionTime(): number {
    return this._missionTime;
  }

  get failed(): boolean {
    return this._failed;
  }

  get missionIndex(): number {
    return this.currentIndex;
  }

  get totalMissions(): number {
    return this.missions.length;
  }

  get currentMission(): Mission | null {
    return this.missions[this.currentIndex] ?? null;
  }

  get timeRemaining(): number | null {
    const m = this.currentMission;
    if (!m || m.objectives.type !== 'timed_delivery') return null;
    return Math.max(0, m.objectives.timeLimit - this._missionTime);
  }

  get objectiveText(): string {
    const m = this.currentMission;
    if (!m) return '';
    switch (m.objectives.type) {
      case 'reach_checkpoints':
        return 'Reach all checkpoints';
      case 'timed_delivery': {
        const remaining = this.timeRemaining ?? 0;
        const secs = Math.ceil(remaining);
        return `Time remaining: ${secs}s`;
      }
      case 'offroad_only':
        return 'Stay off the road!';
    }
  }

  init(missions: Mission[]): void {
    this.missions = missions;
    this.currentIndex = this.loadProgress();
    this.lastChapter = 0;
  }

  /** Start or restart the current mission. Sets state to 'briefing'. */
  startMission(): void {
    this._state = 'briefing';
    this._missionTime = 0;
    this._failed = false;
    this._touchedRoad = false;

    const m = this.currentMission;
    if (m && m.chapter !== this.lastChapter) {
      this.newChapter = true;
      this.lastChapter = m.chapter;
    } else {
      this.newChapter = false;
    }
  }

  /** Called after briefing dialogue finishes. */
  beginPlaying(): void {
    this._state = 'playing';
    this._missionTime = 0;
    this._touchedRoad = false;
  }

  /** Update each frame while playing. Returns 'complete' or 'failed' if mission ended. */
  update(dt: number, checkpointsComplete: boolean, currentSurface: SurfaceType): StoryState {
    if (this._state !== 'playing') return this._state;

    this._missionTime += dt;

    const m = this.currentMission;
    if (!m) return this._state;

    // Check fail conditions
    if (m.objectives.type === 'timed_delivery') {
      if (this._missionTime >= m.objectives.timeLimit) {
        this._state = 'failed';
        this._failed = true;
        return this._state;
      }
    }

    if (m.objectives.type === 'offroad_only' && currentSurface === 'Road') {
      // Small grace: only fail after accumulating road contact
      this._touchedRoad = true;
      this._state = 'failed';
      this._failed = true;
      return this._state;
    }

    // Check win condition
    if (checkpointsComplete) {
      this._state = 'complete';
      return this._state;
    }

    return this._state;
  }

  /** Advance to the next mission. Returns true if there are more missions. */
  advance(): boolean {
    this.currentIndex++;
    this.saveProgress();
    if (this.currentIndex >= this.missions.length) {
      this._state = 'finale';
      return false;
    }
    return true;
  }

  /** Retry the current mission. */
  retry(): void {
    this.startMission();
  }

  isAllComplete(): boolean {
    return this.currentIndex >= this.missions.length;
  }

  private loadProgress(): number {
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (stored !== null) {
        const idx = parseInt(stored, 10);
        if (!isNaN(idx) && idx >= 0) return idx;
      }
    } catch {
      // ignore
    }
    return 0;
  }

  private saveProgress(): void {
    try {
      localStorage.setItem(SAVE_KEY, this.currentIndex.toString());
    } catch {
      // ignore
    }
  }

  /** Reset story save to beginning. */
  resetProgress(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    this.currentIndex = 0;
    this.lastChapter = 0;
  }
}
