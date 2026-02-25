import { Container } from 'pixi.js';
import type { Application } from 'pixi.js';
import { GAME_CONFIG } from './GameConfig';
import { InputManager } from './InputManager';
import { RaceMode, RaceState } from './RaceMode';
import { CheckpointManager } from './CheckpointManager';
import { RaceStandings } from './RaceStandings';
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
import { BotVehicle, BOT_COLORS } from '../ai/BotVehicle';
import { BOT_PERSONALITIES } from '../ai/BotDriver';

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
  private raceMode: RaceMode;
  private checkpoints: CheckpointManager;
  private accumulator = 0;

  private camera: Camera;
  private hud: HUD;
  private miniMap: MiniMap;
  private touchControls: TouchControls;
  private uiContainer: Container;

  private currentSurface: SurfaceType = SurfaceType.Road;
  private driftScore = 0;
  private lastRaceState: RaceState = RaceState.TITLE;

  // AI bots
  private bots: BotVehicle[] = [];
  private standings: RaceStandings;
  private playerFinished = false;
  private playerFinishTime: number | null = null;

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

    this.bloom = new BloomFilter();

    // Checkpoint system (added to world before vehicle for layering)
    this.checkpoints = new CheckpointManager(this.bloom);
    this.checkpoints.generateCircuit();

    // Race mode state machine
    this.raceMode = new RaceMode();

    // Race standings tracker
    this.standings = new RaceStandings();

    // Create AI bots
    this.createBots();

    // Add world elements — bots between checkpoints and player for correct layering
    this.world.addChild(this.terrainLayer, this.trackLayer, this.checkpoints.container);
    for (const bot of this.bots) {
      this.world.addChild(bot.container);
    }
    this.world.addChild(this.vehicle.container, this.particleLayer);
    this.app.stage.addChild(this.world);
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

  private createBots(): void {
    for (let i = 0; i < BOT_PERSONALITIES.length; i++) {
      const bot = new BotVehicle(BOT_PERSONALITIES[i], BOT_COLORS[i]);
      this.bots.push(bot);
    }
    this.resetBots();
  }

  private resetBots(): void {
    // Spawn bots in a staggered grid behind and beside the player
    const spawnOffsets = [
      new Vector2(-60, -30),
      new Vector2(-60, 30),
      new Vector2(-120, 0),
    ];

    for (let i = 0; i < this.bots.length; i++) {
      const offset = spawnOffsets[i] ?? new Vector2(-120 - i * 60, 0);
      this.bots[i].reset(offset, 0);
    }
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

    // Update race mode state machine
    this.raceMode.update(dt);

    // Reset vehicle and bots when transitioning to READY state
    if (this.raceMode.state === RaceState.READY && this.lastRaceState !== RaceState.READY) {
      this.vehicle.model.position.set(0, 0);
      this.vehicle.model.velocity.set(0, 0);
      this.vehicle.model.heading = 0;
      this.vehicle.model.yawRate = 0;
      this.checkpoints.reset();
      this.resetBots();
      this.playerFinished = false;
      this.playerFinishTime = null;
    }
    this.lastRaceState = this.raceMode.state;

    this.accumulator = Math.min(
      this.accumulator + dt,
      GAME_CONFIG.physicsStep * GAME_CONFIG.maxSubSteps
    );

    // Get touch input and feed to input manager
    const touchInput = this.touchControls.getInput();
    this.input.setTouchInput(touchInput);

    // Compute leader progress for rubber-banding
    const checkpointList = this.checkpoints.getCheckpoints();
    const totalCheckpoints = this.checkpoints.getTotal();
    let leaderProgress = this.checkpoints.getCurrentIndex();
    for (const bot of this.bots) {
      if (bot.checkpointIndex > leaderProgress) {
        leaderProgress = bot.checkpointIndex;
      }
    }

    while (this.accumulator >= GAME_CONFIG.physicsStep) {
      // Only process vehicle input during racing
      const rawInput = this.input.getInput();
      const input = this.raceMode.inputEnabled
        ? rawInput
        : { throttle: 0, brake: 0, steer: 0, handbrake: 0 };

      this.currentSurface = this.getSurfaceAt(this.vehicle.model.position.x, this.vehicle.model.position.y);
      const friction = getSurfaceFriction(this.currentSurface);
      this.vehicle.update(GAME_CONFIG.physicsStep, input, friction);

      // Update bot physics
      if (this.raceMode.inputEnabled) {
        for (const bot of this.bots) {
          const botSurface = this.getSurfaceAt(bot.model.position.x, bot.model.position.y);
          const botFriction = getSurfaceFriction(botSurface);
          bot.update(GAME_CONFIG.physicsStep, botFriction, checkpointList, leaderProgress);
        }
      }

      this.accumulator -= GAME_CONFIG.physicsStep;

      // Update drift score
      if (this.vehicle.driftPhase === 'Drifting') {
        this.driftScore += GAME_CONFIG.physicsStep * this.vehicle.speed * 0.01;
      } else if (this.vehicle.driftPhase === 'Normal') {
        this.driftScore = 0;
      }
    }

    // Checkpoint detection during racing
    if (this.raceMode.state === RaceState.RACING) {
      const collected = this.checkpoints.update(dt, this.vehicle.model.position);
      if (collected) {
        this.hud.triggerCheckpointFlash();
        if (this.checkpoints.isComplete()) {
          this.playerFinished = true;
          this.playerFinishTime = this.raceMode.raceTime;
          this.raceMode.finish();
        }
      }

      // Bot checkpoint detection
      for (const bot of this.bots) {
        bot.checkCheckpoint(checkpointList, 80);
        if (bot.isFinished(totalCheckpoints) && bot.finishTime === null) {
          bot.finishTime = this.raceMode.raceTime;
        }
      }
    } else {
      // Still update checkpoint visuals (pulsing) even when not racing
      this.checkpoints.update(dt, new Vector2(-99999, -99999));
    }

    // Update race standings
    this.standings.update({
      playerPosition: this.vehicle.model.position,
      playerCheckpointIndex: this.checkpoints.getCurrentIndex(),
      playerFinished: this.playerFinished,
      playerFinishTime: this.playerFinishTime,
      bots: this.bots,
      checkpoints: checkpointList,
    });

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

    // Update Race HUD
    const nextCp = this.checkpoints.getNextCheckpoint();
    let arrowAngle: number | null = null;
    if (nextCp) {
      const dx = nextCp.position.x - this.vehicle.model.position.x;
      const dy = nextCp.position.y - this.vehicle.model.position.y;
      arrowAngle = Math.atan2(dy, dx);
    }

    this.hud.updateRace({
      raceState: this.raceMode.state,
      raceTime: this.raceMode.raceTime,
      formattedTime: this.raceMode.formatTime(this.raceMode.raceTime),
      checkpointCurrent: this.checkpoints.getCurrentIndex(),
      checkpointTotal: this.checkpoints.getTotal(),
      countdownValue: this.raceMode.countdownValue,
      bestTime: this.raceMode.bestTime !== null ? this.raceMode.formatTime(this.raceMode.bestTime) : null,
      arrowAngle,
      playerPosition: this.standings.getPlayerPosition(),
      totalRacers: this.bots.length + 1,
      standings: this.standings.getStandings(),
    }, dt);

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
