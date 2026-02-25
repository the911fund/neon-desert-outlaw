import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';
import { GAME_CONFIG } from './GameConfig';
import { InputManager } from './InputManager';
import { Vehicle } from '../vehicle/Vehicle';
import { SurfaceType, getSurfaceFriction } from '../physics/SurfaceTypes';
import { Camera } from '../rendering/Camera';
import { LightingSystem } from '../rendering/LightingSystem';
import { ParticleSystem } from '../rendering/ParticleSystem';
import { BloomFilter } from '../rendering/BloomFilter';
import { HUD } from '../ui/HUD';
import { MiniMap } from '../ui/MiniMap';
import type { MiniMapObstacle } from '../ui/MiniMap';
import { TouchControls } from '../ui/TouchControls';
import { WorldManager } from '../world/WorldManager';
import { CHUNK_SIZE, TILE_SIZE } from '../world/Chunk';
import type { ObstacleType } from '../world/ObstacleFactory';
import { Headlights } from '../vehicle/Headlights';
import { AudioManager } from '../audio/AudioManager';
import { CollisionSystem } from '../physics/CollisionSystem';
import { Vector2 } from '../utils/Vector2';

export class Game {
  private app: Application;
  private input: InputManager;
  private vehicle: Vehicle;
  private world: Container;
  private terrainLayer: Container;
  private trackLayer: Container;
  private particleLayer: Container;
  private worldManager: WorldManager;
  private lighting: LightingSystem;
  private particles: ParticleSystem;
  private bloom: BloomFilter;
  private headlights: Headlights;
  private audio: AudioManager;
  private collisions: CollisionSystem;
  private accumulator = 0;

  private camera: Camera;
  private hud: HUD;
  private miniMap: MiniMap;
  private touchControls: TouchControls;
  private uiContainer: Container;

  private currentSurface: SurfaceType = SurfaceType.Road;
  private driftScore = 0;

  constructor(app: Application) {
    this.app = app;
    this.world = new Container();
    this.terrainLayer = new Container();
    this.trackLayer = new Container();
    this.particleLayer = new Container();
    this.uiContainer = new Container();

    this.vehicle = new Vehicle();
    this.vehicle.model.position.set(0, 0);

    this.worldManager = new WorldManager(this.terrainLayer, { seed: GAME_CONFIG.worldSeed });

    // Initialize camera
    this.camera = new Camera();
    this.camera.setScreenSize(window.innerWidth, window.innerHeight);
    this.camera.snapTo(0, 0);

    // Initialize UI components
    this.hud = new HUD();
    this.miniMap = new MiniMap();
    this.touchControls = new TouchControls();

    // Add world elements
    this.world.addChild(this.terrainLayer, this.trackLayer, this.vehicle.container, this.particleLayer);
    this.app.stage.addChild(this.world);

    this.bloom = new BloomFilter();
    this.headlights = new Headlights();
    this.lighting = new LightingSystem(this.app.renderer.width, this.app.renderer.height);
    this.lighting.addLight(this.headlights.container);
    this.bloom.applyTo(this.headlights.container, 0.8, 2);
    this.app.stage.addChild(this.lighting.container);

    this.particles = new ParticleSystem(this.particleLayer, {
      bloom: this.bloom,
      trackContainer: this.trackLayer,
      particleContainer: this.particleLayer,
    });

    // Add UI elements (on top of world and lighting)
    this.uiContainer.addChild(this.hud.container);
    this.uiContainer.addChild(this.miniMap.container);
    this.uiContainer.addChild(this.touchControls.container);
    this.app.stage.addChild(this.uiContainer);

    this.input = new InputManager();
    this.collisions = new CollisionSystem();

    // Initialize audio system
    this.audio = new AudioManager();
    this.input.setMuteToggleHandler(() => this.audio.toggleMute());

    // Start audio on first user interaction (browser autoplay policy)
    const startAudio = (): void => {
      this.audio.start();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);

    this.app.ticker.add(this.update);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  private handleResize = (): void => {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.camera.setScreenSize(window.innerWidth, window.innerHeight);
    this.lighting.resize(this.app.renderer.width, this.app.renderer.height);

    // Reposition UI elements
    this.hud.setPosition(window.innerWidth, window.innerHeight);
    this.miniMap.setPosition(window.innerWidth, window.innerHeight);
    this.touchControls.setPosition(window.innerWidth, window.innerHeight);
  };

  private getSurfaceAt(x: number, y: number): SurfaceType {
    return this.worldManager.getSurfaceAt(x, y);
  }

  private mapObstacleType(type: ObstacleType): MiniMapObstacle['type'] | null {
    switch (type) {
      case 'rock':
        return 'rock';
      case 'deadTree':
      case 'cactus':
        return 'tree';
      case 'wreck':
        return 'wreck';
      case 'outpostFuel':
      case 'outpostRest':
        return 'outpost';
      default:
        return null;
    }
  }

  private collectMiniMapObstacles(): MiniMapObstacle[] {
    const obstacles: MiniMapObstacle[] = [];
    const chunks = this.worldManager.getLoadedChunks();

    for (const chunk of chunks) {
      const originX = chunk.chunkX * CHUNK_SIZE;
      const originY = chunk.chunkY * CHUNK_SIZE;

      for (const obstacle of chunk.obstacles) {
        const mapped = this.mapObstacleType(obstacle.type);
        if (!mapped) continue;

        obstacles.push({
          x: originX + obstacle.localX,
          y: originY + obstacle.localY,
          type: mapped,
        });
      }
    }

    return obstacles;
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

    // Collision detection
    const loadedChunks = this.worldManager.getLoadedChunks();
    const collisionResults = this.collisions.checkCollisions(
      this.vehicle.model.position,
      loadedChunks
    );
    if (collisionResults.length > 0) {
      const { totalSparks, collisionPosition } = this.collisions.applyCollisions(
        this.vehicle.model.position,
        this.vehicle.model.velocity,
        collisionResults
      );
      if (totalSparks > 0 && collisionPosition) {
        this.particles.emitSparks(collisionPosition, totalSparks);
      }
    }

    // Screen shake
    const shake = this.collisions.updateShake(dt);
    
    const velocity = this.vehicle.model.velocity;
    this.camera.update(
      this.vehicle.model.position.x,
      this.vehicle.model.position.y,
      velocity.x,
      velocity.y,
      this.vehicle.speed
    );
    this.camera.applyToContainer(this.world);
    // Apply screen shake offset
    if (shake.x !== 0 || shake.y !== 0) {
      this.world.x += shake.x;
      this.world.y += shake.y;
    }

    const cameraPos = this.camera.position;
    this.worldManager.update(cameraPos.x, cameraPos.y);

    const debugInfo = this.vehicle.model.getDebugInfo();
    this.particles.update(dt, {
      position: this.vehicle.model.position,
      heading: this.vehicle.model.heading,
      velocity: this.vehicle.model.velocity,
      speed: this.vehicle.model.speed,
      driftPhase: this.vehicle.model.driftState.state,
      driftRatio: debugInfo.driftRatio,
      surface: this.currentSurface,
    });

    this.headlights.update({
      position: this.vehicle.model.position,
      heading: this.vehicle.model.heading,
      speed: this.vehicle.model.speed,
    });

    this.lighting.update(dt, this.world.position, this.world.scale.x);

    // Update HUD
    this.hud.update({
      speed: this.vehicle.speed,
      engineForce: this.vehicle.engineForce,
      driftPhase: this.vehicle.driftPhase,
      driftScore: this.driftScore,
      surfaceType: this.currentSurface,
    });

    // Update audio
    this.audio.update({
      speed: this.vehicle.speed,
      maxSpeed: 60,
      driftPhase: this.vehicle.driftPhase,
      surface: this.currentSurface,
      isBraking: this.input.getInput().brake > 0,
    });

    // Update MiniMap
    const chunks = this.worldManager.getLoadedChunks().map(chunk => ({
      x: chunk.chunkX * CHUNK_SIZE,
      y: chunk.chunkY * CHUNK_SIZE,
      surfaceGrid: chunk.terrain,
    }));

    this.miniMap.update({
      vehicleX: this.vehicle.model.position.x,
      vehicleY: this.vehicle.model.position.y,
      vehicleHeading: this.vehicle.model.heading,
      chunks,
      obstacles: this.collectMiniMapObstacles(),
      tileSize: TILE_SIZE,
    });
  };
}
