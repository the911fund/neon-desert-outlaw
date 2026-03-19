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
import { MusicControls } from '../ui/MusicControls';
import { WorldManager } from '../world/WorldManager';
import { CHUNK_SIZE, TILE_SIZE } from '../world/Chunk';
import type { ObstacleType } from '../world/ObstacleFactory';
import { Headlights } from '../vehicle/Headlights';
import { AudioManager } from '../audio/AudioManager';
import { CollisionSystem } from '../physics/CollisionSystem';
import { Vector2 } from '../utils/Vector2';
import { DriftPhase } from '../physics/DriftState';
import { BotVehicle, BOT_COLORS } from '../ai/BotVehicle';
import { BOT_PERSONALITIES } from '../ai/BotDriver';
import { MissionManager } from '../story/Mission';
import type { StoryState } from '../story/Mission';
import { DialogueBox } from '../story/DialogueBox';
import { STORY_MISSIONS } from '../story/StoryContent';
import { getViewportSize } from '../utils/viewport';

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
  private musicControls: MusicControls;
  private uiContainer: Container;

  private currentSurface: SurfaceType = SurfaceType.Road;
  private driftScore = 0;
  private lastRaceState: RaceState = RaceState.TITLE;

  // AI bots
  private bots: BotVehicle[] = [];
  private standings: RaceStandings;
  private playerFinished = false;
  private playerFinishTime: number | null = null;

  private running = false;
  private onExit: (() => void) | null;
  private onEscKey: (e: KeyboardEvent) => void;

  // Story mode
  private isStoryMode = false;
  private missionManager: MissionManager;
  private dialogue: DialogueBox;
  private lastStoryState: StoryState = 'briefing';
  private storyEnterHandler: (e: KeyboardEvent) => void;
  private readonly startingGrid = [
    new Vector2(-40, 0),
    new Vector2(-95, -34),
    new Vector2(-95, 34),
    new Vector2(-150, 0),
  ];

  constructor(app: Application, onExit?: () => void) {
    this.app = app;
    this.onExit = onExit ?? null;
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
    const initialViewport = getViewportSize();
    this.camera.setScreenSize(initialViewport.width, initialViewport.height);
    this.camera.snapTo(0, 0);

    // Initialize UI components
    this.hud = new HUD();
    this.miniMap = new MiniMap();
    this.touchControls = new TouchControls({
      onEnter: () => {
        if (this.dialogue.isVisible) {
          this.dialogue.advance();
          return;
        }

        this.raceMode.triggerEnter();
        // Also handle story mode retry/finale on mobile
        if (this.isStoryMode && this.missionManager.state === 'failed') {
          this.missionManager.retry();
          this.launchCurrentMission();
        } else if (this.isStoryMode && this.missionManager.state === 'finale') {
          if (this.onExit) this.onExit();
        }
      },
      onBack: () => { if (this.onExit) this.onExit(); },
    });
    this.musicControls = new MusicControls(
      () => {
        this.audio.previousTrack();
        this.syncMusicControls();
      },
      () => {
        this.audio.toggleMusicPlayback();
        this.syncMusicControls();
      },
      () => {
        this.audio.nextTrack();
        this.syncMusicControls();
      },
    );

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
    this.uiContainer.addChild(this.musicControls.container);
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
      window.removeEventListener('touchstart', startAudio);
      window.removeEventListener('pointerdown', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);
    window.addEventListener('touchstart', startAudio);
    window.addEventListener('pointerdown', startAudio);
    this.syncMusicControls();

    // Story mode systems
    this.missionManager = new MissionManager();
    this.dialogue = new DialogueBox();
    this.app.stage.addChild(this.dialogue.container);

    // Story mode: Enter key to retry on failure
    this.storyEnterHandler = (e: KeyboardEvent): void => {
      if (!this.running || !this.isStoryMode) return;
      if (e.code === 'Enter') {
        if (this.missionManager.state === 'failed') {
          this.missionManager.retry();
          this.launchCurrentMission();
        } else if (this.missionManager.state === 'finale') {
          if (this.onExit) this.onExit();
        }
      }
    };
    window.addEventListener('keydown', this.storyEnterHandler);

    // ESC handler for returning to menu
    this.onEscKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape' && this.running && this.onExit) {
        this.onExit();
      }
    };
    window.addEventListener('keydown', this.onEscKey);

    window.addEventListener('resize', this.handleResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    this.handleResize();

    // Initially hidden — call start() to begin gameplay
    this.setVisible(false);
  }

  /** Enter gameplay: reset state, show world, start ticker. */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.resetPlayer(this.startingGrid[0], 0);

    // Reset checkpoints, bots, standings
    this.checkpoints.reset();
    this.checkpoints.generateCircuit();
    this.resetBots(this.startingGrid.slice(1));
    this.playerFinished = false;
    this.playerFinishTime = null;
    this.driftScore = 0;
    this.accumulator = 0;
    this.currentSurface = SurfaceType.Road;

    // Skip TITLE — go straight to READY state
    this.raceMode.state = RaceState.READY;
    this.lastRaceState = RaceState.READY;

    // Snap camera to starting grid
    this.camera.snapTo(this.vehicle.model.position.x, this.vehicle.model.position.y);

    this.setVisible(true);
    this.app.ticker.add(this.update);
    this.handleResize();
  }

  /** Exit gameplay: stop ticker, hide world, reset state. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    this.app.ticker.remove(this.update);
    this.setVisible(false);
    this.dialogue.hide();
    this.hud.hideStoryElements();
    this.hud.showFailed(false);
    this.hud.showFinale(false);
    this.isStoryMode = false;
  }

  /** Enter story mode: initialize missions and start first/saved mission. */
  startStory(): void {
    if (this.running) return;
    this.isStoryMode = true;
    this.running = true;

    this.missionManager.init(STORY_MISSIONS);

    // Hide bots in story mode
    for (const bot of this.bots) {
      bot.container.visible = false;
    }

    this.setVisible(true);
    this.app.ticker.add(this.update);
    this.handleResize();
    const viewport = getViewportSize();
    this.dialogue.resize(viewport.width, viewport.height);

    this.launchCurrentMission();
  }

  private launchCurrentMission(): void {
    const mission = this.missionManager.currentMission;
    if (!mission) return;

    // Reset vehicle
    this.vehicle.model.position.set(0, 0);
    this.vehicle.model.velocity.set(0, 0);
    this.vehicle.model.heading = 0;
    this.vehicle.model.yawRate = 0;
    this.driftScore = 0;
    this.accumulator = 0;
    // For offroad-only missions, start on sand to avoid instant failure
    if (mission.objectives.type === 'offroad_only') {
      this.currentSurface = SurfaceType.Sand;
    } else {
      this.currentSurface = SurfaceType.Road;
    }
    this.camera.snapTo(0, 0);

    // Setup checkpoints for this mission
    this.checkpoints.reset();
    this.checkpoints.generateFromPositions(mission.checkpoints, true);

    // Reset race mode to RACING (skip countdown in story)
    this.raceMode.state = RaceState.RACING;
    this.raceMode.raceTime = 0;
    this.lastRaceState = RaceState.RACING;

    // Hide race overlays, show story HUD
    this.hud.showFailed(false);
    this.hud.showFinale(false);

    // Show chapter title if new chapter
    if (this.missionManager.newChapter) {
      this.hud.showChapterTitle(mission.chapter, mission.chapterTitle);
    }

    // Show briefing dialogue
    this.missionManager.startMission();
    this.lastStoryState = 'briefing';
    this.dialogue.show(mission.briefing, () => {
      // Briefing finished — start playing
      this.missionManager.beginPlaying();
      this.hud.showMissionTitle(mission.title);
    });
  }

  private onMissionComplete(): void {
    const mission = this.missionManager.currentMission;
    if (!mission) return;

    // Show completion dialogue, then advance
    this.dialogue.show(mission.completionDialogue, () => {
      const hasMore = this.missionManager.advance();
      if (hasMore) {
        this.missionManager.startMission();
        this.launchCurrentMission();
      } else {
        // All missions complete — show finale
        this.hud.showFinale(true);
      }
    });
  }

  private setVisible(visible: boolean): void {
    this.world.visible = visible;
    this.lighting.container.visible = visible;
    this.uiContainer.visible = visible;
  }

  private createBots(): void {
    for (let i = 0; i < BOT_PERSONALITIES.length; i++) {
      const bot = new BotVehicle(BOT_PERSONALITIES[i], BOT_COLORS[i]);
      this.bots.push(bot);
    }
    this.resetBots();
  }

  private resetBots(spawnOffsets?: Vector2[]): void {
    const offsets = spawnOffsets ?? [
      new Vector2(-60, -30),
      new Vector2(-60, 30),
      new Vector2(-120, 0),
    ];
    for (let i = 0; i < this.bots.length; i++) {
      const offset = offsets[i] ?? new Vector2(-120 - i * 60, 0);
      this.bots[i].reset(offset, 0);
    }
  }

  private handleResize = (): void => {
    const viewport = getViewportSize();
    this.app.renderer.resize(viewport.width, viewport.height);
    this.camera.setScreenSize(viewport.width, viewport.height);
    this.lighting.resize(this.app.renderer.width, this.app.renderer.height);

    // Reposition UI elements
    this.hud.setPosition(viewport.width, viewport.height);
    this.miniMap.setPosition(viewport.width, viewport.height);
    this.touchControls.setPosition(viewport.width, viewport.height);
    this.musicControls.setPosition(viewport.width, viewport.height);
    this.dialogue.resize(viewport.width, viewport.height);
  };

  private syncMusicControls(): void {
    this.musicControls.setState({
      trackName: this.audio.musicTrackName,
      isPlaying: this.audio.musicPlaying,
    });
  }

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
      this.resetPlayer(this.startingGrid[0], 0);
      this.checkpoints.reset();
      this.resetBots(this.startingGrid.slice(1));
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
      const storyBlocked = this.isStoryMode && (
        this.dialogue.isVisible
        || this.missionManager.state === 'briefing'
        || this.missionManager.state === 'failed'
        || this.missionManager.state === 'finale'
      );
      const input = (this.raceMode.inputEnabled && !storyBlocked)
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
      if (this.vehicle.driftPhase === DriftPhase.Drifting) {
        this.driftScore += GAME_CONFIG.physicsStep * this.vehicle.speed * 0.01;
      } else if (this.vehicle.driftPhase === DriftPhase.Normal) {
        this.driftScore = 0;
      }
    }

    // Checkpoint detection during racing
    if (this.raceMode.state === RaceState.RACING) {
      const collected = this.checkpoints.update(dt, this.vehicle.model.position);
      if (collected) {
        this.hud.triggerCheckpointFlash();
        if (!this.isStoryMode && this.checkpoints.isComplete()) {
          this.playerFinished = true;
          this.playerFinishTime = this.raceMode.raceTime;
          this.raceMode.finish();
        }
      }

      // Bot checkpoint detection (not in story mode)
      if (!this.isStoryMode) {
        for (const bot of this.bots) {
          bot.checkCheckpoint(checkpointList, 80);
          if (bot.isFinished(totalCheckpoints) && bot.finishTime === null) {
            bot.finishTime = this.raceMode.raceTime;
          }
        }
      }

      // Story mode mission objective checking
      if (this.isStoryMode && this.missionManager.state === 'playing') {
        const storyState = this.missionManager.update(
          dt,
          this.checkpoints.isComplete(),
          this.currentSurface
        );
        if (storyState !== this.lastStoryState) {
          this.lastStoryState = storyState;
          if (storyState === 'complete') {
            this.onMissionComplete();
          } else if (storyState === 'failed') {
            this.hud.showFailed(true);
          }
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

    // Bot collision detection
    for (const bot of this.bots) {
      const botCollisions = this.collisions.checkCollisions(
        bot.model.position,
        loadedChunks
      );
      if (botCollisions.length > 0) {
        this.collisions.applyCollisions(
          bot.model.position,
          bot.model.velocity,
          botCollisions
        );
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

    // In story mode: show timer and checkpoints but suppress race overlays/standings
    if (this.isStoryMode) {
      const storyTime = this.missionManager.missionTime;
      this.hud.updateRace({
        raceState: this.missionManager.state === 'playing' ? RaceState.RACING : RaceState.READY,
        raceTime: storyTime,
        formattedTime: this.raceMode.formatTime(storyTime),
        checkpointCurrent: this.checkpoints.getCurrentIndex(),
        checkpointTotal: this.checkpoints.getTotal(),
        countdownValue: 0,
        bestTime: null,
        arrowAngle,
      }, dt);
    } else {
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
    }

    const showMiniMap = this.isStoryMode
      ? this.missionManager.state === 'playing'
      : this.raceMode.state === RaceState.RACING;
    this.miniMap.container.visible = showMiniMap;

    const showEnterButton = this.isStoryMode
      ? this.missionManager.state === 'failed' || this.missionManager.state === 'finale'
      : this.raceMode.state === RaceState.TITLE
        || this.raceMode.state === RaceState.READY
        || this.raceMode.state === RaceState.FINISHED;
    this.touchControls.setActionButtonVisibility(true, showEnterButton);

    // Story mode updates
    if (this.isStoryMode) {
      this.dialogue.update(dt);
      this.hud.updateStory(dt);

      // Update objective text
      if (this.missionManager.state === 'playing') {
        this.hud.updateObjective(this.missionManager.objectiveText);
      } else {
        this.hud.updateObjective('');
      }

      // Disable vehicle input during dialogue or failure/finale
      const storyInputBlocked = this.dialogue.isVisible
        || this.missionManager.state === 'briefing'
        || this.missionManager.state === 'failed'
        || this.missionManager.state === 'finale';

      if (storyInputBlocked) {
        this.vehicle.model.velocity.set(0, 0);
        this.vehicle.model.yawRate = 0;
      }
    }

    // Update audio
    this.audio.update({
      speed: this.vehicle.speed,
      maxSpeed: 60,
      driftPhase: this.vehicle.driftPhase,
      surface: this.currentSurface,
      isBraking: this.input.getInput().brake > 0,
    });
    this.syncMusicControls();

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

  private resetPlayer(position: Vector2, heading: number): void {
    this.vehicle.model.position.copy(position);
    this.vehicle.model.velocity.set(0, 0);
    this.vehicle.model.heading = heading;
    this.vehicle.model.yawRate = 0;
  }
}
