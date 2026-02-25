import { Container, Graphics } from 'pixi.js';
import type { Application } from 'pixi.js';
import { GAME_CONFIG } from './GameConfig';
import { InputManager } from './InputManager';
import { Vehicle } from '../vehicle/Vehicle';
import { SurfaceType, SurfaceColors, getSurfaceFriction } from '../physics/SurfaceTypes';
import { Camera } from '../rendering/Camera';
import { HUD } from '../ui/HUD';
import { MiniMap } from '../ui/MiniMap';
import { TouchControls } from '../ui/TouchControls';

export class Game {
  private app: Application;
  private input: InputManager;
  private vehicle: Vehicle;
  private world: Container;
  private ground: Graphics;
  private accumulator = 0;

  private camera: Camera;
  private hud: HUD;
  private miniMap: MiniMap;
  private touchControls: TouchControls;
  private uiContainer: Container;

  private surfaceGrid: SurfaceType[][] = [];
  private gridStartX = 0;
  private gridStartY = 0;
  private currentSurface: SurfaceType = SurfaceType.Road;
  private driftScore = 0;

  constructor(app: Application) {
    this.app = app;
    this.world = new Container();
    this.ground = new Graphics();
    this.uiContainer = new Container();

    this.vehicle = new Vehicle();
    this.vehicle.model.position.set(0, 0);

    // Initialize camera
    this.camera = new Camera();
    this.camera.setScreenSize(window.innerWidth, window.innerHeight);
    this.camera.snapTo(0, 0);

    // Initialize UI components
    this.hud = new HUD();
    this.miniMap = new MiniMap();
    this.touchControls = new TouchControls();

    // Add world elements
    this.world.addChild(this.ground, this.vehicle.container);
    this.app.stage.addChild(this.world);

    // Add UI elements (on top of world)
    this.uiContainer.addChild(this.hud.container);
    this.uiContainer.addChild(this.miniMap.container);
    this.uiContainer.addChild(this.touchControls.container);
    this.app.stage.addChild(this.uiContainer);

    this.input = new InputManager();

    this.generateSurfaceGrid();
    this.drawSurfaceGrid();

    this.app.ticker.add(this.update);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  private handleResize = (): void => {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.camera.setScreenSize(window.innerWidth, window.innerHeight);

    // Reposition UI elements
    this.hud.setPosition(window.innerWidth, window.innerHeight);
    this.miniMap.setPosition(window.innerWidth, window.innerHeight);
    this.touchControls.setPosition(window.innerWidth, window.innerHeight);
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

    // Get touch input and feed to input manager
    const touchInput = this.touchControls.getInput();
    this.input.setTouchInput(touchInput);

    while (this.accumulator >= GAME_CONFIG.physicsStep) {
      const input = this.input.getInput();
      this.currentSurface = this.getSurfaceAt(this.vehicle.model.position.x, this.vehicle.model.position.y);
      const friction = getSurfaceFriction(this.currentSurface);
      this.vehicle.update(GAME_CONFIG.physicsStep, input, friction);
      this.accumulator -= GAME_CONFIG.physicsStep;

      // Update drift score
      if (this.vehicle.driftPhase === 'Drifting') {
        this.driftScore += GAME_CONFIG.physicsStep * this.vehicle.speed * 0.01;
      } else if (this.vehicle.driftPhase === 'Normal') {
        this.driftScore = 0;
      }
    }

    // Update camera with look-ahead
    const velocity = this.vehicle.model.velocity;
    this.camera.update(
      this.vehicle.model.position.x,
      this.vehicle.model.position.y,
      velocity.x,
      velocity.y,
      this.vehicle.speed
    );

    // Apply camera transform to world
    this.camera.applyToContainer(this.world);

    // Update HUD
    this.hud.update({
      speed: this.vehicle.speed,
      engineForce: this.vehicle.engineForce,
      driftPhase: this.vehicle.driftPhase,
      driftScore: this.driftScore,
      surfaceType: this.currentSurface,
    });

    // Update MiniMap
    this.miniMap.update({
      vehicleX: this.vehicle.model.position.x,
      vehicleY: this.vehicle.model.position.y,
      vehicleHeading: this.vehicle.model.heading,
      chunks: [{
        x: this.gridStartX,
        y: this.gridStartY,
        surfaceGrid: this.surfaceGrid,
      }],
      obstacles: [],
      tileSize: GAME_CONFIG.tileSize,
    });
  };
}
