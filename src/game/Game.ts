import { Container, Graphics } from 'pixi.js';
import type { Application } from 'pixi.js';
import { GAME_CONFIG } from './GameConfig';
import { InputManager } from './InputManager';
import { Vehicle } from '../vehicle/Vehicle';
import { SurfaceType, SurfaceColors, getSurfaceFriction } from '../physics/SurfaceTypes';
import { LightingSystem } from '../rendering/LightingSystem';
import { ParticleSystem } from '../rendering/ParticleSystem';
import { BloomFilter } from '../rendering/BloomFilter';
import { Headlights } from '../vehicle/Headlights';

export class Game {
  private app: Application;
  private input: InputManager;
  private vehicle: Vehicle;
  private world: Container;
  private ground: Graphics;
  private particleLayer: Container;
  private lighting: LightingSystem;
  private particles: ParticleSystem;
  private bloom: BloomFilter;
  private headlights: Headlights;
  private accumulator = 0;

  private surfaceGrid: SurfaceType[][] = [];
  private gridStartX = 0;
  private gridStartY = 0;

  constructor(app: Application) {
    this.app = app;
    this.world = new Container();
    this.ground = new Graphics();
    this.particleLayer = new Container();

    this.vehicle = new Vehicle();
    this.vehicle.model.position.set(0, 0);

    this.world.addChild(this.ground, this.particleLayer, this.vehicle.container);
    this.app.stage.addChild(this.world);

    this.input = new InputManager();

    this.generateSurfaceGrid();
    this.drawSurfaceGrid();

    this.bloom = new BloomFilter();
    this.headlights = new Headlights();
    this.lighting = new LightingSystem(this.app.renderer.width, this.app.renderer.height);
    this.lighting.addLight(this.headlights.container);
    this.bloom.applyTo(this.headlights.container, 0.8, 2);
    this.app.stage.addChild(this.lighting.container);

    this.particles = new ParticleSystem(this.particleLayer, { bloom: this.bloom });

    this.app.ticker.add(this.update);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  private handleResize = (): void => {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.lighting.resize(this.app.renderer.width, this.app.renderer.height);
  };

  private generateSurfaceGrid(): void {
    const size = GAME_CONFIG.gridRadius * 2 + 1;
    this.surfaceGrid = [];
    this.gridStartX = -GAME_CONFIG.gridRadius * GAME_CONFIG.tileSize;
    this.gridStartY = -GAME_CONFIG.gridRadius * GAME_CONFIG.tileSize;

    for (let y = 0; y < size; y += 1) {
      const row: SurfaceType[] = [];
      for (let x = 0; x < size; x += 1) {
        const worldY = y - GAME_CONFIG.gridRadius;
        if (Math.abs(worldY) <= 1) {
          row.push(SurfaceType.Road);
          continue;
        }
        const noise = Math.abs(Math.sin((x + 11) * 12.9898 + (y + 7) * 78.233 + GAME_CONFIG.worldSeed));
        if (noise < 0.33) {
          row.push(SurfaceType.Sand);
        } else if (noise < 0.66) {
          row.push(SurfaceType.Gravel);
        } else {
          row.push(SurfaceType.Sand);
        }
      }
      this.surfaceGrid.push(row);
    }
  }

  private drawSurfaceGrid(): void {
    this.ground.clear();
    const size = GAME_CONFIG.gridRadius * 2 + 1;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const tile = this.surfaceGrid[y][x];
        const color = SurfaceColors[tile];
        this.ground.beginFill(color);
        this.ground.drawRect(
          this.gridStartX + x * GAME_CONFIG.tileSize,
          this.gridStartY + y * GAME_CONFIG.tileSize,
          GAME_CONFIG.tileSize,
          GAME_CONFIG.tileSize
        );
        this.ground.endFill();
      }
    }
  }

  private getSurfaceAt(x: number, y: number): SurfaceType {
    const localX = Math.floor((x - this.gridStartX) / GAME_CONFIG.tileSize);
    const localY = Math.floor((y - this.gridStartY) / GAME_CONFIG.tileSize);
    if (
      localX < 0 ||
      localY < 0 ||
      localX >= this.surfaceGrid.length ||
      localY >= this.surfaceGrid.length
    ) {
      return SurfaceType.Sand;
    }
    return this.surfaceGrid[localY][localX];
  }

  private update = (): void => {
    const dt = this.app.ticker.deltaMS / 1000;
    this.accumulator = Math.min(
      this.accumulator + dt,
      GAME_CONFIG.physicsStep * GAME_CONFIG.maxSubSteps
    );

    while (this.accumulator >= GAME_CONFIG.physicsStep) {
      const input = this.input.getInput();
      const surface = this.getSurfaceAt(this.vehicle.model.position.x, this.vehicle.model.position.y);
      const friction = getSurfaceFriction(surface);
      this.vehicle.update(GAME_CONFIG.physicsStep, input, friction);
      this.accumulator -= GAME_CONFIG.physicsStep;
    }

    const surface = this.getSurfaceAt(this.vehicle.model.position.x, this.vehicle.model.position.y);
    const debugInfo = this.vehicle.model.getDebugInfo();
    this.particles.update(dt, {
      position: this.vehicle.model.position,
      heading: this.vehicle.model.heading,
      velocity: this.vehicle.model.velocity,
      speed: this.vehicle.model.speed,
      driftPhase: this.vehicle.model.driftState.state,
      driftRatio: debugInfo.driftRatio,
      surface,
    });

    this.headlights.update({
      position: this.vehicle.model.position,
      heading: this.vehicle.model.heading,
      speed: this.vehicle.model.speed,
    });

    const centerX = this.app.renderer.width * 0.5;
    const centerY = this.app.renderer.height * 0.5;
    this.world.position.set(centerX - this.vehicle.model.position.x, centerY - this.vehicle.model.position.y);

    this.lighting.update(dt, this.world.position);
  };
}
