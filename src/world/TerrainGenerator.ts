import { lerp } from '../utils/MathUtils';
import { SurfaceType } from '../physics/SurfaceTypes';

export class TerrainGenerator {
  readonly seed: number;

  private readonly roadHalfWidth = 70;
  private readonly gravelWidth = 120;
  private readonly mainAmplitude = 380;
  private readonly mainFrequency = 1 / 2800;
  private readonly branchSpacing = 2200;
  private readonly branchOffset = 420;
  private readonly branchLengthBase = 2600;
  private readonly branchLengthVar = 1600;
  private readonly branchAmplitude = 180;
  private readonly branchFrequency = 1 / 1700;

  constructor(seed: number) {
    this.seed = Math.floor(seed);
  }

  getSurfaceType(x: number, y: number): SurfaceType {
    const distance = this.getRoadDistance(x, y);
    const edgeNoise = this.fractalNoise2D(x * 0.0022, y * 0.0022, 913) * 8;
    const roadWidth = Math.max(48, this.roadHalfWidth + edgeNoise);
    const gravelWidth = Math.max(60, this.gravelWidth + edgeNoise * 1.4);

    if (distance <= roadWidth) {
      return SurfaceType.Road;
    }

    if (distance <= roadWidth + gravelWidth) {
      return SurfaceType.Gravel;
    }

    return SurfaceType.Sand;
  }

  getRoadDistance(x: number, y: number): number {
    const mainDistance = Math.abs(y - this.getMainRoadY(x));
    const branchDistance = this.getBranchDistance(x, y);
    return Math.min(mainDistance, branchDistance);
  }

  getMainRoadY(x: number): number {
    const base = this.noise1D(x * this.mainFrequency, 173);
    const secondary = this.noise1D(x * this.mainFrequency * 2.2, 941) * 0.35;
    const curve = Math.sin((x + this.seed) * 0.00035) * 0.2;
    return (base + secondary + curve) * this.mainAmplitude;
  }

  getRoadSettings(): { roadHalfWidth: number; gravelWidth: number } {
    return {
      roadHalfWidth: this.roadHalfWidth,
      gravelWidth: this.gravelWidth,
    };
  }

  private getBranchDistance(x: number, y: number): number {
    const spacing = this.branchSpacing;
    const baseIndex = Math.round(x / spacing);
    let minDistance = Number.POSITIVE_INFINITY;

    for (let i = baseIndex - 1; i <= baseIndex + 1; i += 1) {
      const offset = this.noise1D(i * 0.87, 411) * this.branchOffset;
      const x0 = i * spacing + offset;
      const y0 = this.getMainRoadY(x0);
      const direction = this.noise1D(i * 1.3, 29) >= 0 ? 1 : -1;
      const length =
        this.branchLengthBase +
        (this.noise1D(i * 1.9, 701) * 0.5 + 0.5) * this.branchLengthVar;

      const t = (y - y0) * direction;
      if (t < 0 || t > length) {
        continue;
      }

      const wiggle = this.noise1D(y * this.branchFrequency + i * 11.13, 977) * this.branchAmplitude;
      const xLine = x0 + wiggle;
      const distance = Math.abs(x - xLine);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  private noise1D(x: number, seedOffset: number): number {
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const t = this.fade(x - x0);

    const v0 = this.hashToUnit(this.hashInt(x0, seedOffset));
    const v1 = this.hashToUnit(this.hashInt(x1, seedOffset));

    return lerp(v0, v1, t) * 2 - 1;
  }

  private noise2D(x: number, y: number, seedOffset: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const sx = this.fade(x - x0);
    const sy = this.fade(y - y0);

    const n00 = this.hashToUnit(this.hash2D(x0, y0, seedOffset));
    const n10 = this.hashToUnit(this.hash2D(x1, y0, seedOffset));
    const n01 = this.hashToUnit(this.hash2D(x0, y1, seedOffset));
    const n11 = this.hashToUnit(this.hash2D(x1, y1, seedOffset));

    const ix0 = lerp(n00, n10, sx);
    const ix1 = lerp(n01, n11, sx);
    const value = lerp(ix0, ix1, sy);

    return value * 2 - 1;
  }

  private fractalNoise2D(x: number, y: number, seedOffset: number): number {
    let amplitude = 1;
    let frequency = 1;
    let value = 0;
    let total = 0;

    for (let i = 0; i < 3; i += 1) {
      value += this.noise2D(x * frequency, y * frequency, seedOffset + i * 23) * amplitude;
      total += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / total;
  }

  private fade(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private hash2D(x: number, y: number, seedOffset: number): number {
    const h =
      Math.imul(x | 0, 374761393) ^
      Math.imul(y | 0, 668265263) ^
      Math.imul(this.seed, 1442695041) ^
      seedOffset;
    return this.scramble(h);
  }

  private hashInt(x: number, seedOffset: number): number {
    const h = Math.imul(x | 0, 0x27d4eb2d) ^ (this.seed + seedOffset);
    return this.scramble(h);
  }

  private scramble(x: number): number {
    let h = x | 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    h ^= h >>> 16;
    return h >>> 0;
  }

  private hashToUnit(hash: number): number {
    return hash / 4294967296;
  }
}
