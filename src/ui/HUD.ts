import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { DriftPhase } from '../physics/DriftState';
import { SurfaceType } from '../physics/SurfaceTypes';
import { clamp } from '../utils/MathUtils';

export interface HUDState {
  speed: number; // m/s
  engineForce: number; // 0-1 ratio for RPM display
  driftPhase: DriftPhase;
  driftScore: number;
  surfaceType: SurfaceType;
}

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

    this.setupSpeedDisplay();
    this.setupRPMDisplay();
    this.setupDriftDisplay();
    this.setupSurfaceDisplay();

    this.container.addChild(this.speedContainer);
    this.container.addChild(this.rpmContainer);
    this.container.addChild(this.driftContainer);
    this.container.addChild(this.surfaceContainer);

    // Initially hide drift display
    this.driftContainer.visible = false;
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
  }
}
