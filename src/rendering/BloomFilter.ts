import { BlurFilter } from 'pixi.js';
import type { Container } from 'pixi.js';

export class BloomFilter {
  private readonly cache = new WeakMap<Container, BlurFilter>();
  private readonly baseBlur: number;

  constructor(baseBlur = 8) {
    this.baseBlur = baseBlur;
  }

  applyTo(target: Container, intensity = 1, extraBlur = 0): void {
    const blur = this.cache.get(target) ?? new BlurFilter();
    blur.blur = this.baseBlur * Math.max(0, intensity) + extraBlur;
    blur.quality = 2;

    this.cache.set(target, blur);
    target.filters = [blur];
    target.blendMode = 'add';
  }

  clear(target: Container): void {
    target.filters = null;
    target.blendMode = 'normal';
    this.cache.delete(target);
  }
}
