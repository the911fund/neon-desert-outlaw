import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { DriftPhase } from '../physics/DriftState';
import { SurfaceType } from '../physics/SurfaceTypes';
import { clamp } from '../utils/MathUtils';
import { RaceState } from '../game/RaceMode';
import type { RacerStanding } from '../game/RaceStandings';

export interface HUDState {
  speed: number; // m/s
  engineForce: number; // 0-1 ratio for RPM display
  driftPhase: DriftPhase;
  driftScore: number;
  surfaceType: SurfaceType;
}

export interface RaceHUDState {
  raceState: RaceState;
  raceTime: number;
  formattedTime: string;
  checkpointCurrent: number;
  checkpointTotal: number;
  countdownValue: number;
  bestTime: string | null;
  arrowAngle: number | null;
  playerPosition?: number;
  totalRacers?: number;
  standings?: RacerStanding[];
}

const POSITION_COLORS: Record<number, number> = {
  1: 0xffd700, // gold
  2: 0xc0c0c0, // silver
  3: 0xcd7f32, // bronze
  4: 0x888888, // gray
};

const POSITION_LABELS = ['1st', '2nd', '3rd', '4th'];

export class HUD {
  readonly container: Container;

  private speedContainer: Container;
  private speedText: Text;
  private speedUnit: Text;
  private speedPanel: Graphics;

  private rpmContainer: Container;
  private rpmBar: Graphics;
  private rpmBackground: Graphics;
  private rpmLabel: Text;

  private driftContainer: Container;
  private driftText: Text;
  private driftScoreText: Text;
  private driftGlow: Graphics;

  private surfaceContainer: Container;
  private surfaceIcon: Graphics;
  private surfaceLabel: Text;

  // Race HUD elements
  private raceTimerContainer: Container;
  private raceTimerText: Text;
  private checkpointText: Text;
  private arrowGraphics: Graphics;
  private overlayContainer: Container;
  private overlayBg: Graphics;
  private overlayTitle: Text;
  private overlaySubtitle: Text;
  private overlayBest: Text;
  private countdownText: Text;
  private flashGraphics: Graphics;
  private flashAlpha = 0;
  private soundHintText: Text;
  private soundHintTimer = 4;

  // Position display
  private positionContainer: Container;
  private positionText: Text;
  private positionPanel: Graphics;

  // Standings list
  private standingsContainer: Container;
  private standingsPanel: Graphics;
  private standingsTexts: Text[] = [];

  // Finish standings for overlay
  private overlayStandingsTexts: Text[] = [];

  private readonly neonCyan = 0x00ffff;
  private readonly neonMagenta = 0xff00ff;
  private readonly panelBg = 0x0a0a0a;
  private readonly panelBgAlpha = 0.7;

  constructor() {
    this.container = new Container();

    this.speedContainer = new Container();
    this.speedPanel = new Graphics();
    this.speedText = new Text({ text: '0', style: this.createSpeedStyle() });
    this.speedUnit = new Text({ text: 'KM/H', style: this.createUnitStyle() });
    this.speedUnit.alpha = 0.8;

    this.rpmContainer = new Container();
    this.rpmBackground = new Graphics();
    this.rpmBar = new Graphics();
    this.rpmLabel = new Text({ text: 'RPM', style: this.createLabelStyle() });

    this.driftContainer = new Container();
    this.driftGlow = new Graphics();
    this.driftText = new Text({ text: 'DRIFT', style: this.createDriftStyle() });
    this.driftScoreText = new Text({ text: 'x1.0', style: this.createDriftScoreStyle() });

    this.surfaceContainer = new Container();
    this.surfaceIcon = new Graphics();
    this.surfaceLabel = new Text({ text: 'ROAD', style: this.createLabelStyle() });

    // Race HUD
    this.raceTimerContainer = new Container();
    this.raceTimerText = new Text({ text: '00:00.00', style: this.createTimerStyle() });
    this.checkpointText = new Text({ text: '', style: this.createCheckpointStyle() });
    this.arrowGraphics = new Graphics();
    this.overlayContainer = new Container();
    this.overlayBg = new Graphics();
    this.overlayTitle = new Text({ text: '', style: this.createOverlayTitleStyle() });
    this.overlaySubtitle = new Text({ text: '', style: this.createOverlaySubtitleStyle() });
    this.overlayBest = new Text({ text: '', style: this.createOverlayBestStyle() });
    this.countdownText = new Text({ text: '', style: this.createCountdownStyle() });
    this.flashGraphics = new Graphics();
    this.soundHintText = new Text({ text: 'Press M for sound', style: this.createLabelStyle() });

    // Position display (top right)
    this.positionContainer = new Container();
    this.positionPanel = new Graphics();
    this.positionText = new Text({ text: '1st', style: this.createPositionStyle() });

    // Mini standings
    this.standingsContainer = new Container();
    this.standingsPanel = new Graphics();
    for (let i = 0; i < 4; i++) {
      const text = new Text({ text: '', style: this.createStandingStyle() });
      this.standingsTexts.push(text);
    }

    // Overlay standings for finish screen
    for (let i = 0; i < 4; i++) {
      const text = new Text({ text: '', style: this.createOverlayStandingStyle() });
      text.anchor.set(0.5, 0);
      this.overlayStandingsTexts.push(text);
    }

    this.setupSpeedDisplay();
    this.setupRPMDisplay();
    this.setupDriftDisplay();
    this.setupSurfaceDisplay();
    this.setupRaceHUD();
    this.setupPositionDisplay();
    this.setupStandingsDisplay();

    this.container.addChild(this.speedContainer);
    this.container.addChild(this.rpmContainer);
    this.container.addChild(this.driftContainer);
    this.container.addChild(this.surfaceContainer);
    this.container.addChild(this.raceTimerContainer);
    this.container.addChild(this.arrowGraphics);
    this.container.addChild(this.flashGraphics);
    this.container.addChild(this.positionContainer);
    this.container.addChild(this.standingsContainer);
    this.container.addChild(this.overlayContainer);
    this.container.addChild(this.countdownText);
    this.container.addChild(this.soundHintText);

    // Initially hide drift display
    this.driftContainer.visible = false;
    this.positionContainer.visible = false;
    this.standingsContainer.visible = false;
  }

  private createSpeedStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 48,
      fontWeight: 'bold',
      fill: this.neonCyan,
      dropShadow: {
        color: this.neonCyan,
        blur: 8,
        distance: 0,
      },
    });
  }

  private createUnitStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: this.neonCyan,
    });
  }

  private createLabelStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: 0xaaaaaa,
    });
  }

  private createDriftStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 32,
      fontWeight: 'bold',
      fill: this.neonMagenta,
      dropShadow: {
        color: this.neonMagenta,
        blur: 12,
        distance: 0,
      },
    });
  }

  private createDriftScoreStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0xffffff,
      dropShadow: {
        color: this.neonMagenta,
        blur: 6,
        distance: 0,
      },
    });
  }

  private createPositionStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 42,
      fontWeight: 'bold',
      fill: 0xffd700,
      dropShadow: {
        color: 0xffd700,
        blur: 10,
        distance: 0,
      },
    });
  }

  private createStandingStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 13,
      fill: 0xcccccc,
    });
  }

  private createOverlayStandingStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: 0xcccccc,
    });
  }

  private setupSpeedDisplay(): void {
    // Panel background
    this.speedPanel.beginFill(this.panelBg, this.panelBgAlpha);
    this.speedPanel.drawRoundedRect(0, 0, 140, 80, 8);
    this.speedPanel.endFill();

    // Neon border
    this.speedPanel.lineStyle(2, this.neonCyan, 0.5);
    this.speedPanel.drawRoundedRect(0, 0, 140, 80, 8);

    this.speedText.position.set(10, 10);
    this.speedUnit.position.set(10, 58);

    this.speedContainer.addChild(this.speedPanel);
    this.speedContainer.addChild(this.speedText);
    this.speedContainer.addChild(this.speedUnit);

    // Position top-left
    this.speedContainer.position.set(20, 20);
  }

  private setupRPMDisplay(): void {
    const barWidth = 200;
    const barHeight = 16;

    // Background
    this.rpmBackground.beginFill(this.panelBg, this.panelBgAlpha);
    this.rpmBackground.drawRoundedRect(0, 0, barWidth + 20, barHeight + 30, 6);
    this.rpmBackground.endFill();
    this.rpmBackground.lineStyle(1, this.neonCyan, 0.3);
    this.rpmBackground.drawRoundedRect(0, 0, barWidth + 20, barHeight + 30, 6);

    // RPM bar track
    this.rpmBackground.beginFill(0x222222);
    this.rpmBackground.drawRoundedRect(10, 20, barWidth, barHeight, 4);
    this.rpmBackground.endFill();

    this.rpmLabel.position.set(10, 2);

    this.rpmContainer.addChild(this.rpmBackground);
    this.rpmContainer.addChild(this.rpmBar);
    this.rpmContainer.addChild(this.rpmLabel);

    // Position below speed
    this.rpmContainer.position.set(20, 110);
  }

  private setupDriftDisplay(): void {
    this.driftText.anchor.set(0.5, 0.5);
    this.driftScoreText.anchor.set(0.5, 0.5);

    this.driftScoreText.position.set(0, 35);

    this.driftContainer.addChild(this.driftGlow);
    this.driftContainer.addChild(this.driftText);
    this.driftContainer.addChild(this.driftScoreText);
  }

  private setupSurfaceDisplay(): void {
    // Background panel
    const panel = new Graphics();
    panel.beginFill(this.panelBg, this.panelBgAlpha);
    panel.drawRoundedRect(0, 0, 80, 50, 6);
    panel.endFill();
    panel.lineStyle(1, 0x666666, 0.5);
    panel.drawRoundedRect(0, 0, 80, 50, 6);

    this.surfaceIcon.position.set(15, 15);
    this.surfaceLabel.position.set(35, 18);

    this.surfaceContainer.addChild(panel);
    this.surfaceContainer.addChild(this.surfaceIcon);
    this.surfaceContainer.addChild(this.surfaceLabel);

    // Position top-left, below RPM
    this.surfaceContainer.position.set(20, 160);
  }

  private setupPositionDisplay(): void {
    this.positionPanel.beginFill(this.panelBg, this.panelBgAlpha);
    this.positionPanel.drawRoundedRect(0, 0, 90, 60, 8);
    this.positionPanel.endFill();
    this.positionPanel.lineStyle(2, 0xffd700, 0.5);
    this.positionPanel.drawRoundedRect(0, 0, 90, 60, 8);

    this.positionText.anchor.set(0.5, 0.5);
    this.positionText.position.set(45, 30);

    this.positionContainer.addChild(this.positionPanel);
    this.positionContainer.addChild(this.positionText);
  }

  private setupStandingsDisplay(): void {
    this.standingsContainer.addChild(this.standingsPanel);
    for (const text of this.standingsTexts) {
      this.standingsContainer.addChild(text);
    }
  }

  private drawSurfaceIcon(surfaceType: SurfaceType): void {
    this.surfaceIcon.clear();

    switch (surfaceType) {
      case SurfaceType.Road:
        // Road icon - simple road lines
        this.surfaceIcon.lineStyle(2, 0x444444);
        this.surfaceIcon.moveTo(0, 0);
        this.surfaceIcon.lineTo(0, 20);
        this.surfaceIcon.moveTo(8, 0);
        this.surfaceIcon.lineTo(8, 20);
        this.surfaceIcon.lineStyle(1, 0xffff00);
        this.surfaceIcon.moveTo(4, 2);
        this.surfaceIcon.lineTo(4, 6);
        this.surfaceIcon.moveTo(4, 10);
        this.surfaceIcon.lineTo(4, 14);
        this.surfaceIcon.moveTo(4, 18);
        this.surfaceIcon.lineTo(4, 20);
        break;

      case SurfaceType.Sand:
        // Sand icon - dots/grains
        this.surfaceIcon.beginFill(0xd8b07a);
        for (let i = 0; i < 8; i++) {
          const x = (i % 3) * 5 + 2;
          const y = Math.floor(i / 3) * 5 + 2;
          this.surfaceIcon.drawCircle(x, y, 2);
        }
        this.surfaceIcon.endFill();
        break;

      case SurfaceType.Gravel:
        // Gravel icon - small rocks
        this.surfaceIcon.beginFill(0x8a7f7a);
        this.surfaceIcon.drawPolygon([0, 10, 5, 5, 10, 8, 8, 15, 2, 14]);
        this.surfaceIcon.drawPolygon([12, 5, 18, 3, 20, 10, 15, 12]);
        this.surfaceIcon.endFill();
        break;
    }
  }

  private updateRPMBar(engineForce: number): void {
    const barWidth = 200;
    const barHeight = 16;
    const fillWidth = clamp(engineForce, 0, 1) * barWidth;

    this.rpmBar.clear();

    // Gradient effect from cyan to red at high RPM
    const color = engineForce > 0.8 ? 0xff4444 : engineForce > 0.6 ? 0xffaa00 : this.neonCyan;

    this.rpmBar.beginFill(color, 0.9);
    this.rpmBar.drawRoundedRect(10, 20, fillWidth, barHeight, 4);
    this.rpmBar.endFill();

    // Glow effect
    if (fillWidth > 0) {
      this.rpmBar.beginFill(color, 0.3);
      this.rpmBar.drawRoundedRect(10, 18, fillWidth, barHeight + 4, 4);
      this.rpmBar.endFill();
    }
  }

  private updateDriftDisplay(driftPhase: DriftPhase, driftScore: number): void {
    const isDrifting = driftPhase === DriftPhase.Drifting || driftPhase === DriftPhase.Recovery;
    this.driftContainer.visible = isDrifting;

    if (isDrifting) {
      const multiplier = Math.max(1, driftScore).toFixed(1);
      this.driftScoreText.text = `x${multiplier}`;

      // Pulsing glow effect
      this.driftGlow.clear();
      const pulseAlpha = 0.2 + Math.sin(Date.now() / 100) * 0.1;
      this.driftGlow.beginFill(this.neonMagenta, pulseAlpha);
      this.driftGlow.drawCircle(0, 20, 60);
      this.driftGlow.endFill();
    }
  }

  private createTimerStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 32,
      fontWeight: 'bold',
      fill: 0xffffff,
      dropShadow: {
        color: this.neonCyan,
        blur: 6,
        distance: 0,
      },
    });
  }

  private createCheckpointStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: this.neonCyan,
    });
  }

  private createOverlayTitleStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 56,
      fontWeight: 'bold',
      fill: this.neonCyan,
      dropShadow: {
        color: this.neonCyan,
        blur: 16,
        distance: 0,
      },
    });
  }

  private createOverlaySubtitleStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fill: 0xcccccc,
    });
  }

  private createOverlayBestStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: this.neonMagenta,
    });
  }

  private createCountdownStyle(): TextStyle {
    return new TextStyle({
      fontFamily: 'monospace',
      fontSize: 96,
      fontWeight: 'bold',
      fill: 0xffffff,
      dropShadow: {
        color: this.neonMagenta,
        blur: 20,
        distance: 0,
      },
    });
  }

  private setupRaceHUD(): void {
    // Timer panel (top center)
    const timerPanel = new Graphics();
    timerPanel.beginFill(this.panelBg, this.panelBgAlpha);
    timerPanel.drawRoundedRect(-100, -5, 200, 70, 8);
    timerPanel.endFill();
    timerPanel.lineStyle(2, this.neonCyan, 0.4);
    timerPanel.drawRoundedRect(-100, -5, 200, 70, 8);

    this.raceTimerText.anchor.set(0.5, 0);
    this.raceTimerText.position.set(0, 0);
    this.checkpointText.anchor.set(0.5, 0);
    this.checkpointText.position.set(0, 38);

    this.raceTimerContainer.addChild(timerPanel);
    this.raceTimerContainer.addChild(this.raceTimerText);
    this.raceTimerContainer.addChild(this.checkpointText);
    this.raceTimerContainer.visible = false;

    // Overlay (title/finish screens)
    this.overlayTitle.anchor.set(0.5, 0.5);
    this.overlaySubtitle.anchor.set(0.5, 0.5);
    this.overlayBest.anchor.set(0.5, 0.5);

    this.overlayContainer.addChild(this.overlayBg);
    this.overlayContainer.addChild(this.overlayTitle);
    this.overlayContainer.addChild(this.overlaySubtitle);
    this.overlayContainer.addChild(this.overlayBest);
    for (const text of this.overlayStandingsTexts) {
      this.overlayContainer.addChild(text);
    }
    this.overlayContainer.visible = false;

    // Countdown
    this.countdownText.anchor.set(0.5, 0.5);
    this.countdownText.visible = false;

    // Sound hint
    this.soundHintText.alpha = 0.6;
  }

  private updatePositionDisplay(position: number): void {
    const label = POSITION_LABELS[position - 1] ?? `${position}th`;
    const color = POSITION_COLORS[position] ?? 0x888888;
    this.positionText.text = label;
    this.positionText.style.fill = color;

    // Redraw panel border with position color
    this.positionPanel.clear();
    this.positionPanel.beginFill(this.panelBg, this.panelBgAlpha);
    this.positionPanel.drawRoundedRect(0, 0, 90, 60, 8);
    this.positionPanel.endFill();
    this.positionPanel.lineStyle(2, color, 0.6);
    this.positionPanel.drawRoundedRect(0, 0, 90, 60, 8);
  }

  private updateStandingsList(standings: RacerStanding[]): void {
    const panelWidth = 140;
    const rowHeight = 20;
    const panelHeight = standings.length * rowHeight + 10;

    this.standingsPanel.clear();
    this.standingsPanel.beginFill(this.panelBg, 0.6);
    this.standingsPanel.drawRoundedRect(0, 0, panelWidth, panelHeight, 6);
    this.standingsPanel.endFill();

    for (let i = 0; i < this.standingsTexts.length; i++) {
      if (i < standings.length) {
        const s = standings[i];
        const posLabel = POSITION_LABELS[i] ?? `${i + 1}th`;
        const cpLabel = s.finished ? 'FIN' : `${s.checkpointIndex}/${standings.length > 0 ? '10' : '0'}`;
        this.standingsTexts[i].text = `${posLabel} ${s.name.padEnd(7)} ${cpLabel}`;
        this.standingsTexts[i].style.fill = s.color;
        this.standingsTexts[i].position.set(8, 5 + i * rowHeight);
        this.standingsTexts[i].visible = true;
      } else {
        this.standingsTexts[i].visible = false;
      }
    }
  }

  updateRace(state: RaceHUDState, dt: number): void {
    // Sound hint fade
    if (this.soundHintTimer > 0) {
      this.soundHintTimer -= dt;
      this.soundHintText.visible = true;
      if (this.soundHintTimer < 1) {
        this.soundHintText.alpha = Math.max(0, this.soundHintTimer) * 0.6;
      }
    } else {
      this.soundHintText.visible = false;
    }

    // Checkpoint flash effect
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);
      this.flashGraphics.clear();
      this.flashGraphics.beginFill(this.neonCyan, this.flashAlpha * 0.3);
      this.flashGraphics.drawRect(0, 0, 2000, 2000);
      this.flashGraphics.endFill();
      this.flashGraphics.visible = true;
    } else {
      this.flashGraphics.visible = false;
    }

    const showTimer = state.raceState === RaceState.RACING || state.raceState === RaceState.FINISHED;
    this.raceTimerContainer.visible = showTimer;

    if (showTimer) {
      this.raceTimerText.text = state.formattedTime;
      this.checkpointText.text = `Checkpoint ${state.checkpointCurrent}/${state.checkpointTotal}`;
    }

    // Direction arrow
    this.arrowGraphics.visible = state.raceState === RaceState.RACING && state.arrowAngle !== null;
    if (state.arrowAngle !== null && state.raceState === RaceState.RACING) {
      this.drawDirectionArrow(state.arrowAngle);
    }

    // Countdown
    this.countdownText.visible = state.raceState === RaceState.COUNTDOWN;
    if (state.raceState === RaceState.COUNTDOWN) {
      this.countdownText.text = state.countdownValue > 0 ? state.countdownValue.toString() : 'GO!';
    }

    // Position display and standings
    const showPosition = state.raceState === RaceState.RACING || state.raceState === RaceState.FINISHED;
    this.positionContainer.visible = showPosition;
    this.standingsContainer.visible = showPosition;

    if (showPosition && state.playerPosition !== undefined) {
      this.updatePositionDisplay(state.playerPosition);
    }
    if (showPosition && state.standings) {
      this.updateStandingsList(state.standings);
    }

    // Overlay screens
    const showOverlay = state.raceState === RaceState.TITLE
      || state.raceState === RaceState.READY
      || state.raceState === RaceState.FINISHED;
    this.overlayContainer.visible = showOverlay;

    if (showOverlay) {
      this.drawOverlay(state);
    }
  }

  private drawOverlay(state: RaceHUDState): void {
    this.overlayBg.clear();
    this.overlayBg.beginFill(0x000000, 0.6);
    this.overlayBg.drawRect(-1000, -500, 2000, 1000);
    this.overlayBg.endFill();

    // Hide overlay standings by default
    for (const text of this.overlayStandingsTexts) {
      text.visible = false;
    }

    switch (state.raceState) {
      case RaceState.TITLE:
        this.overlayTitle.text = 'NEON DESERT OUTLAW';
        this.overlayTitle.position.set(0, -40);
        this.overlaySubtitle.text = 'Press ENTER to race';
        this.overlaySubtitle.position.set(0, 30);
        if (state.bestTime) {
          this.overlayBest.text = `Best: ${state.bestTime}`;
          this.overlayBest.position.set(0, 70);
          this.overlayBest.visible = true;
        } else {
          this.overlayBest.visible = false;
        }
        break;

      case RaceState.READY:
        this.overlayTitle.text = 'READY';
        this.overlayTitle.position.set(0, -40);
        this.overlaySubtitle.text = 'Press ENTER to start';
        this.overlaySubtitle.position.set(0, 30);
        if (state.bestTime) {
          this.overlayBest.text = `Best: ${state.bestTime}`;
          this.overlayBest.position.set(0, 70);
          this.overlayBest.visible = true;
        } else {
          this.overlayBest.visible = false;
        }
        break;

      case RaceState.FINISHED: {
        const posLabel = state.playerPosition !== undefined
          ? (POSITION_LABELS[state.playerPosition - 1] ?? `${state.playerPosition}th`)
          : '';
        this.overlayTitle.text = `${posLabel} — ${state.formattedTime}`;
        this.overlayTitle.position.set(0, -60);
        this.overlaySubtitle.text = 'Press ENTER to restart';
        this.overlaySubtitle.position.set(0, 10);
        if (state.bestTime) {
          this.overlayBest.text = `Best: ${state.bestTime}`;
          this.overlayBest.position.set(0, 45);
          this.overlayBest.visible = true;
        } else {
          this.overlayBest.visible = false;
        }

        // Show final standings
        if (state.standings) {
          for (let i = 0; i < this.overlayStandingsTexts.length && i < state.standings.length; i++) {
            const s = state.standings[i];
            const pos = POSITION_LABELS[i] ?? `${i + 1}th`;
            this.overlayStandingsTexts[i].text = `${pos}  ${s.name}`;
            this.overlayStandingsTexts[i].style.fill = s.color;
            this.overlayStandingsTexts[i].position.set(0, 75 + i * 28);
            this.overlayStandingsTexts[i].visible = true;
          }
        }
        break;
      }

      default:
        break;
    }
  }

  private drawDirectionArrow(angle: number): void {
    this.arrowGraphics.clear();

    // Arrow is drawn at a fixed screen position, rotated to point at next checkpoint
    const size = 16;
    this.arrowGraphics.beginFill(this.neonMagenta, 0.9);
    this.arrowGraphics.moveTo(size, 0);
    this.arrowGraphics.lineTo(-size * 0.5, -size * 0.6);
    this.arrowGraphics.lineTo(-size * 0.3, 0);
    this.arrowGraphics.lineTo(-size * 0.5, size * 0.6);
    this.arrowGraphics.closePath();
    this.arrowGraphics.endFill();

    this.arrowGraphics.rotation = angle;
  }

  triggerCheckpointFlash(): void {
    this.flashAlpha = 1;
  }

  update(state: HUDState): void {
    // Speed in km/h (assuming input is m/s)
    const speedKmh = Math.round(state.speed * 3.6);
    this.speedText.text = speedKmh.toString();

    // RPM bar
    this.updateRPMBar(state.engineForce);

    // Drift display
    this.updateDriftDisplay(state.driftPhase, state.driftScore);

    // Surface indicator
    this.surfaceLabel.text = state.surfaceType.toUpperCase();
    this.drawSurfaceIcon(state.surfaceType);
  }

  setPosition(screenWidth: number, screenHeight: number): void {
    // Drift display at bottom center
    this.driftContainer.position.set(screenWidth / 2, screenHeight - 100);

    // Race timer at top center
    this.raceTimerContainer.position.set(screenWidth / 2, 15);

    // Direction arrow below timer
    this.arrowGraphics.position.set(screenWidth / 2, 100);

    // Overlay at center
    this.overlayContainer.position.set(screenWidth / 2, screenHeight / 2);

    // Countdown at center
    this.countdownText.position.set(screenWidth / 2, screenHeight / 2);

    // Sound hint at bottom
    this.soundHintText.position.set(screenWidth / 2 - 70, screenHeight - 30);

    // Position display (top right, left of minimap)
    this.positionContainer.position.set(screenWidth - 280, 20);

    // Standings below position
    this.standingsContainer.position.set(screenWidth - 280, 90);
  }
}
