import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';
import { GAME_CONFIG } from './GameConfig';
import { InputManager } from './InputManager';
import { Vehicle } from '../vehicle/Vehicle';
import { SurfaceType, getSurfaceFriction } from '../physics/SurfaceTypes';
import { WorldManager } from '../world/WorldManager';

export class Game {
  private app: Application;
  private input: InputManager;
  private vehicle: Vehicle;
  private world: Container;
  private terrainLayer: Container;
  private worldManager: WorldManager;
  private accumulator = 0;

  constructor(app: Application) {
    this.app = app;
    this.world = new Container();
    this.terrainLayer = new Container();

    this.vehicle = new Vehicle();
    this.vehicle.model.position.set(0, 0);

    this.worldManager = new WorldManager(this.terrainLayer, { seed: GAME_CONFIG.worldSeed });

    this.world.addChild(this.terrainLayer, this.vehicle.container);
    this.app.stage.addChild(this.world);

    this.input = new InputManager();

    this.app.ticker.add(this.update);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  private handleResize = (): void => {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
  };

  private getSurfaceAt(x: number, y: number): SurfaceType {
    return this.worldManager.getSurfaceAt(x, y);
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

    this.worldManager.update(this.vehicle.model.position.x, this.vehicle.model.position.y);

    const centerX = this.app.renderer.width * 0.5;
    const centerY = this.app.renderer.height * 0.5;
    this.world.position.set(centerX - this.vehicle.model.position.x, centerY - this.vehicle.model.position.y);
  };
}
