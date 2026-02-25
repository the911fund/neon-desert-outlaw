import { DriftPhase } from '../physics/DriftState';
import { SurfaceType } from '../physics/SurfaceTypes';
import { clamp, lerp } from '../utils/MathUtils';

export interface AudioState {
  speed: number;
  maxSpeed: number;
  driftPhase: DriftPhase;
  surface: SurfaceType;
  isBraking: boolean;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Engine sound
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain2: GainNode | null = null;

  // Drift screech
  private driftNoiseSource: AudioBufferSourceNode | null = null;
  private driftGain: GainNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Surface hum
  private surfaceOsc: OscillatorNode | null = null;
  private surfaceGain: GainNode | null = null;

  private _muted = true;
  private _volume = 0.5;
  private started = false;

  get muted(): boolean {
    return this._muted;
  }

  get volume(): number {
    return this._volume;
  }

  setVolume(v: number): void {
    this._volume = clamp(v, 0, 1);
    this.applyMasterVolume();
  }

  toggleMute(): void {
    this._muted = !this._muted;
    this.applyMasterVolume();
  }

  private applyMasterVolume(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.applyMasterVolume();

    this.initEngine();
    this.initDrift();
    this.initSurface();
  }

  private initEngine(): void {
    const ctx = this.ctx!;
    const master = this.masterGain!;

    // Primary engine oscillator (sawtooth for harsh engine tone)
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(master);
    this.engineOsc.start();

    // Secondary harmonic (square wave, one octave up)
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 120;
    this.engineGain2 = ctx.createGain();
    this.engineGain2.gain.value = 0;
    this.engineOsc2.connect(this.engineGain2);
    this.engineGain2.connect(master);
    this.engineOsc2.start();
  }

  private initDrift(): void {
    const ctx = this.ctx!;
    const master = this.masterGain!;

    // Create noise buffer for tire screech
    const bufferSize = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.driftFilter = ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.value = 3000;
    this.driftFilter.Q.value = 2;

    this.driftGain = ctx.createGain();
    this.driftGain.gain.value = 0;
    this.driftFilter.connect(this.driftGain);
    this.driftGain.connect(master);

    this.startNoiseSource();
  }

  private startNoiseSource(): void {
    if (!this.ctx || !this.noiseBuffer || !this.driftFilter) return;
    this.driftNoiseSource = this.ctx.createBufferSource();
    this.driftNoiseSource.buffer = this.noiseBuffer;
    this.driftNoiseSource.loop = true;
    this.driftNoiseSource.connect(this.driftFilter);
    this.driftNoiseSource.start();
  }

  private initSurface(): void {
    const ctx = this.ctx!;
    const master = this.masterGain!;

    // Low-frequency hum that changes tone per surface
    this.surfaceOsc = ctx.createOscillator();
    this.surfaceOsc.type = 'sine';
    this.surfaceOsc.frequency.value = 0;
    this.surfaceGain = ctx.createGain();
    this.surfaceGain.gain.value = 0;
    this.surfaceOsc.connect(this.surfaceGain);
    this.surfaceGain.connect(master);
    this.surfaceOsc.start();
  }

  update(state: AudioState): void {
    if (!this.ctx || !this.started) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const speedRatio = clamp(state.speed / state.maxSpeed, 0, 1);

    this.updateEngine(speedRatio);
    this.updateDrift(state.driftPhase, speedRatio);
    this.updateSurface(state.surface, speedRatio);
  }

  private updateEngine(speedRatio: number): void {
    if (!this.engineOsc || !this.engineGain || !this.engineOsc2 || !this.engineGain2) return;

    // Map speed to RPM-like frequency: idle 60Hz → max 220Hz
    const freq = lerp(60, 220, speedRatio);
    this.engineOsc.frequency.value = freq;
    this.engineOsc2.frequency.value = freq * 2;

    // Volume ramps up with speed
    const vol = lerp(0.06, 0.18, speedRatio);
    this.engineGain.gain.value = vol;
    this.engineGain2.gain.value = vol * 0.3;
  }

  private updateDrift(phase: DriftPhase, speedRatio: number): void {
    if (!this.driftGain || !this.driftFilter) return;

    if (phase === DriftPhase.Drifting) {
      // Screech intensity tied to speed
      this.driftGain.gain.value = lerp(0.04, 0.12, speedRatio);
      this.driftFilter.frequency.value = lerp(2000, 4500, speedRatio);
    } else if (phase === DriftPhase.Recovery) {
      // Fade out during recovery
      this.driftGain.gain.value *= 0.92;
    } else {
      this.driftGain.gain.value = 0;
    }
  }

  private updateSurface(surface: SurfaceType, speedRatio: number): void {
    if (!this.surfaceOsc || !this.surfaceGain) return;

    if (speedRatio < 0.05) {
      this.surfaceGain.gain.value = 0;
      return;
    }

    // Different surface tones
    switch (surface) {
      case SurfaceType.Sand:
        this.surfaceOsc.frequency.value = lerp(80, 140, speedRatio);
        this.surfaceGain.gain.value = lerp(0.02, 0.07, speedRatio);
        break;
      case SurfaceType.Road:
        this.surfaceOsc.frequency.value = lerp(100, 200, speedRatio);
        this.surfaceGain.gain.value = lerp(0.01, 0.04, speedRatio);
        break;
      case SurfaceType.Gravel:
        this.surfaceOsc.frequency.value = lerp(90, 170, speedRatio);
        this.surfaceGain.gain.value = lerp(0.015, 0.055, speedRatio);
        break;
    }
  }

  dispose(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.started = false;
  }
}
