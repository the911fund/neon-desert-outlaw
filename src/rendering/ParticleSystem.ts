import { Container, Graphics } from 'pixi.js';
import { DriftPhase } from '../physics/DriftState';
import { SurfaceType } from '../physics/SurfaceTypes';
import { clamp, lerp } from '../utils/MathUtils';
import { ObjectPool } from '../utils/ObjectPool';
import { Vector2 } from '../utils/Vector2';
import type { BloomFilter } from './BloomFilter';

type ParticleKind = 'track' | 'dust' | 'spray' | 'spark';

interface Particle {
  kind: ParticleKind;
  sprite: Graphics | null;
  position: Vector2;
  velocity: Vector2;
  lifetime: number;
  age: number;
  rotation: number;
  baseAlpha: number;
  width: number;
  length: number;
  radius: number;
  gravity: number;
}

export interface ParticleContext {
  position: Vector2;
  heading: number;
  velocity: Vector2;
  speed: number;
  driftPhase: DriftPhase;
  driftRatio: number;
  surface: SurfaceType;
}

export interface ParticleSystemOptions {
  random?: () => number;
  enableRendering?: boolean;
  maxSpeed?: number;
  bloom?: BloomFilter;
}

export class ParticleSystem {
  private readonly pool: ObjectPool<Particle>;
  private readonly active: Particle[] = [];
  private readonly container?: Container;
  private readonly random: () => number;
  private readonly enableRendering: boolean;
  private readonly maxSpeed: number;
  private readonly bloom?: BloomFilter;

  private trackAccumulator = 0;
  private dustAccumulator = 0;
  private sprayAccumulator = 0;

  private readonly trackRate = 10;
  private readonly sandDustRate = 18;
  private readonly roadSprayRate = 6;

  private readonly trackColors = [0x00ffff, 0xff00ff, 0xff1493];

  constructor(container?: Container, options: ParticleSystemOptions = {}) {
    this.container = container;
    this.random = options.random ?? Math.random;
    this.enableRendering = options.enableRendering ?? Boolean(container);
    this.maxSpeed = options.maxSpeed ?? 60;
    this.bloom = options.bloom;

    this.pool = new ObjectPool<Particle>(() => this.createParticle(), 0);
  }

  update(dt: number, context?: ParticleContext): void {
    for (let i = 0; i < this.active.length; ) {
      const particle = this.active[i];
      particle.age += dt;

      if (particle.age >= particle.lifetime) {
        this.releaseParticle(particle);
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        continue;
      }

      particle.velocity.y += particle.gravity * dt;
      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;

      const lifeRatio = 1 - particle.age / particle.lifetime;

      if (particle.sprite) {
        particle.sprite.position.set(particle.position.x, particle.position.y);
        particle.sprite.rotation = particle.rotation;
        particle.sprite.alpha = particle.baseAlpha * lifeRatio;
      }

      i += 1;
    }

    if (context) {
      this.emitFromContext(dt, context);
    }
  }

  emitSparks(position: Vector2, count = 12): void {
    for (let i = 0; i < count; i += 1) {
      const angle = this.random() * Math.PI * 2;
      const speed = lerp(160, 320, this.random());
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 40;
      this.spawnParticle({
        kind: 'spark',
        position,
        velocity: new Vector2(vx, vy),
        rotation: angle,
        lifetime: lerp(0.2, 0.5, this.random()),
        baseAlpha: 1,
        width: lerp(2, 4, this.random()),
        length: lerp(6, 12, this.random()),
        radius: 0,
        gravity: 420,
        color: 0xffc14a,
      });
    }
  }

  getActiveCount(): number {
    return this.active.length;
  }

  getActiveCountByKind(kind: ParticleKind): number {
    return this.active.filter((particle) => particle.kind === kind).length;
  }

  getPoolSize(): number {
    return this.pool.size();
  }

  private emitFromContext(dt: number, context: ParticleContext): void {
    const speedRatio = clamp(context.speed / this.maxSpeed, 0, 1);
    const driftIntensity = clamp((context.driftRatio - 0.9) / 0.6, 0, 1);

    if (context.driftPhase === DriftPhase.Drifting) {
      this.trackAccumulator += dt * this.trackRate;
      while (this.trackAccumulator >= 1) {
        this.emitTireTracks(context.position, context.heading, driftIntensity);
        this.trackAccumulator -= 1;
      }
    } else {
      this.trackAccumulator = 0;
    }

    if (context.surface === SurfaceType.Sand) {
      const driftBoost = context.driftPhase === DriftPhase.Drifting ? 1.5 : 1;
      this.dustAccumulator += dt * this.sandDustRate * speedRatio * driftBoost;
      const count = Math.floor(this.dustAccumulator);
      this.dustAccumulator -= count;
      this.emitDust(context, count, speedRatio, 0xc9a377, 0.65);
    } else if (context.surface === SurfaceType.Road && speedRatio > 0.7) {
      const boost = (speedRatio - 0.7) / 0.3;
      this.sprayAccumulator += dt * this.roadSprayRate * boost;
      const count = Math.floor(this.sprayAccumulator);
      this.sprayAccumulator -= count;
      this.emitDust(context, count, speedRatio, 0x9da0a6, 0.35, true);
    } else {
      this.dustAccumulator = 0;
      this.sprayAccumulator = 0;
    }
  }

  private emitTireTracks(position: Vector2, heading: number, driftIntensity: number): void {
    const offset = 10;
    const sideX = Math.cos(heading + Math.PI / 2);
    const sideY = Math.sin(heading + Math.PI / 2);
    const leftX = position.x - sideX * offset;
    const leftY = position.y - sideY * offset;
    const rightX = position.x + sideX * offset;
    const rightY = position.y + sideY * offset;

    const width = lerp(3, 8, driftIntensity);
    const length = lerp(18, 26, driftIntensity);
    const color = this.trackColors[Math.floor(this.random() * this.trackColors.length)];

    this.spawnParticle({
      kind: 'track',
      position: new Vector2(leftX, leftY),
      velocity: Vector2.zero(),
      rotation: heading,
      lifetime: lerp(5, 10, this.random()),
      baseAlpha: 0.85,
      width,
      length,
      radius: 0,
      gravity: 0,
      color,
    });

    this.spawnParticle({
      kind: 'track',
      position: new Vector2(rightX, rightY),
      velocity: Vector2.zero(),
      rotation: heading,
      lifetime: lerp(5, 10, this.random()),
      baseAlpha: 0.85,
      width,
      length,
      radius: 0,
      gravity: 0,
      color,
    });
  }

  private emitDust(
    context: ParticleContext,
    count: number,
    speedRatio: number,
    color: number,
    baseAlpha: number,
    subtle = false
  ): void {
    if (count <= 0) return;

    const heading = context.heading;
    const backX = Math.cos(heading + Math.PI);
    const backY = Math.sin(heading + Math.PI);
    const sideX = Math.cos(heading + Math.PI / 2);
    const sideY = Math.sin(heading + Math.PI / 2);

    for (let i = 0; i < count; i += 1) {
      const spread = (this.random() - 0.5) * 16;
      const spawnX = context.position.x + backX * 18 + sideX * spread;
      const spawnY = context.position.y + backY * 18 + sideY * spread;

      const speed = lerp(30, 80, speedRatio) * (subtle ? 0.6 : 1);
      const lateral = (this.random() - 0.5) * 12;
      const vx = backX * speed + sideX * lateral;
      const vy = backY * speed + sideY * lateral - (subtle ? 6 : 14);

      const radius = lerp(2, subtle ? 3.5 : 5, this.random());
      const lifetime = lerp(0.5, subtle ? 0.8 : 1, this.random());
      const opacity = baseAlpha * lerp(0.35, 1, speedRatio);

      this.spawnParticle({
        kind: subtle ? 'spray' : 'dust',
        position: new Vector2(spawnX, spawnY),
        velocity: new Vector2(vx, vy),
        rotation: 0,
        lifetime,
        baseAlpha: opacity,
        width: 0,
        length: 0,
        radius,
        gravity: subtle ? -10 : -18,
        color,
      });
    }
  }

  private spawnParticle(config: {
    kind: ParticleKind;
    position: Vector2;
    velocity: Vector2;
    rotation: number;
    lifetime: number;
    baseAlpha: number;
    width: number;
    length: number;
    radius: number;
    gravity: number;
    color: number;
  }): void {
    const particle = this.pool.acquire();
    particle.kind = config.kind;
    particle.position.copy(config.position);
    particle.velocity.copy(config.velocity);
    particle.rotation = config.rotation;
    particle.lifetime = config.lifetime;
    particle.age = 0;
    particle.baseAlpha = config.baseAlpha;
    particle.width = config.width;
    particle.length = config.length;
    particle.radius = config.radius;
    particle.gravity = config.gravity;

    if (particle.sprite) {
      particle.sprite.visible = true;
      particle.sprite.filters = null;
      particle.sprite.alpha = config.baseAlpha;
      particle.sprite.position.set(config.position.x, config.position.y);
      particle.sprite.rotation = config.rotation;
      particle.sprite.blendMode =
        config.kind === 'track' || config.kind === 'spark' ? 'add' : 'normal';

      if (this.container && !particle.sprite.parent) {
        this.container.addChild(particle.sprite);
      }

      this.drawParticle(particle, config.color);

      if (config.kind === 'track' && this.bloom) {
        this.bloom.applyTo(particle.sprite, 0.7, 2);
      }
    }

    this.active.push(particle);
  }

  private drawParticle(particle: Particle, color: number): void {
    const sprite = particle.sprite;
    if (!sprite) return;

    sprite.clear();
    if (particle.kind === 'track') {
      sprite.beginFill(color, 1);
      sprite.drawRect(
        -particle.length * 0.5,
        -particle.width * 0.5,
        particle.length,
        particle.width
      );
      sprite.endFill();
      return;
    }

    if (particle.kind === 'spark') {
      sprite.beginFill(color, 1);
      sprite.drawRect(
        -particle.length * 0.5,
        -particle.width * 0.5,
        particle.length,
        particle.width
      );
      sprite.endFill();
      return;
    }

    sprite.beginFill(color, 1);
    sprite.drawCircle(0, 0, particle.radius);
    sprite.endFill();
  }

  private releaseParticle(particle: Particle): void {
    if (particle.sprite && particle.sprite.parent) {
      particle.sprite.parent.removeChild(particle.sprite);
      particle.sprite.visible = false;
    }
    this.pool.release(particle);
  }

  private createParticle(): Particle {
    return {
      kind: 'dust',
      sprite: this.enableRendering ? new Graphics() : null,
      position: new Vector2(),
      velocity: new Vector2(),
      lifetime: 0,
      age: 0,
      rotation: 0,
      baseAlpha: 1,
      width: 0,
      length: 0,
      radius: 0,
      gravity: 0,
    };
  }
}
