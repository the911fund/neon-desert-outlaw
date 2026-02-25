import { Container, Graphics } from 'pixi.js';
import { DriftPhase } from '../physics/DriftState';

export enum DamageState {
  Pristine = 'Pristine',
  Scratched = 'Scratched',
  Damaged = 'Damaged',
  Wrecked = 'Wrecked',
}

export interface VehicleRenderState {
  steeringAngle: number;
  isBraking: boolean;
  driftPhase: DriftPhase;
  damageState: DamageState;
}

export class VehicleRenderer {
  readonly container: Container;
  private body: Graphics;
  private roof: Graphics;
  private spoiler: Graphics;
  private frontLeftWheel: Graphics;
  private frontRightWheel: Graphics;
  private rearLeftWheel: Graphics;
  private rearRightWheel: Graphics;
  private brakeLights: Graphics;
  private underglow: Graphics;
  private accentStripes: Graphics;
  private scratchOverlay: Graphics;

  // Dimensions (roughly 40x20 base, scalable)
  private readonly length = 40;
  private readonly width = 20;
  private readonly bodyColor: number;
  private readonly roofColor = 0x0d0d0d; // darker roof/window
  private readonly accentColor: number;
  private readonly underglowColor: number;
  private readonly wheelColor = 0x2a2a2a;
  private readonly brakeLightColor = 0xff2020;

  private state: VehicleRenderState = {
    steeringAngle: 0,
    isBraking: false,
    driftPhase: DriftPhase.Normal,
    damageState: DamageState.Pristine,
  };

  constructor(bodyColor = 0x1a1a1a, accentColor = 0x00ffff) {
    this.bodyColor = bodyColor;
    this.accentColor = accentColor;
    this.underglowColor = accentColor;
    this.container = new Container();

    // Create layers from bottom to top
    this.underglow = new Graphics();
    this.body = new Graphics();
    this.roof = new Graphics();
    this.spoiler = new Graphics();
    this.accentStripes = new Graphics();
    this.scratchOverlay = new Graphics();
    this.brakeLights = new Graphics();

    // Wheels
    this.frontLeftWheel = new Graphics();
    this.frontRightWheel = new Graphics();
    this.rearLeftWheel = new Graphics();
    this.rearRightWheel = new Graphics();

    // Add to container in order
    this.container.addChild(this.underglow);
    this.container.addChild(this.rearLeftWheel);
    this.container.addChild(this.rearRightWheel);
    this.container.addChild(this.frontLeftWheel);
    this.container.addChild(this.frontRightWheel);
    this.container.addChild(this.body);
    this.container.addChild(this.roof);
    this.container.addChild(this.spoiler);
    this.container.addChild(this.accentStripes);
    this.container.addChild(this.scratchOverlay);
    this.container.addChild(this.brakeLights);

    this.drawStaticElements();
    this.updateDynamicElements();
  }

  private drawStaticElements(): void {
    this.drawBody();
    this.drawRoof();
    this.drawSpoiler();
    this.drawAccentStripes();
    this.drawWheels();
  }

  private drawBody(): void {
    this.body.clear();

    // Porsche 911 top-down shape: wide rear, tapered front
    // Using bezier curves for the iconic rounded shape
    const halfLength = this.length / 2;
    const halfWidth = this.width / 2;

    // Main body outline (rounded 911 shape)
    this.body.beginFill(this.bodyColor);

    // Start from rear center, draw clockwise
    this.body.moveTo(-halfLength, 0);

    // Rear curve (wide haunches)
    this.body.bezierCurveTo(
      -halfLength, halfWidth * 0.9,
      -halfLength * 0.7, halfWidth,
      -halfLength * 0.3, halfWidth
    );

    // Right side (tapers toward front)
    this.body.bezierCurveTo(
      halfLength * 0.2, halfWidth,
      halfLength * 0.5, halfWidth * 0.7,
      halfLength, halfWidth * 0.4
    );

    // Front curve (narrow nose)
    this.body.bezierCurveTo(
      halfLength * 1.1, 0,
      halfLength * 1.1, 0,
      halfLength, -halfWidth * 0.4
    );

    // Left side
    this.body.bezierCurveTo(
      halfLength * 0.5, -halfWidth * 0.7,
      halfLength * 0.2, -halfWidth,
      -halfLength * 0.3, -halfWidth
    );

    // Back to rear
    this.body.bezierCurveTo(
      -halfLength * 0.7, -halfWidth,
      -halfLength, -halfWidth * 0.9,
      -halfLength, 0
    );

    this.body.endFill();

    // Wheel wells (indentations)
    this.body.beginFill(0x101010);
    // Front right well
    this.body.drawEllipse(halfLength * 0.55, halfWidth * 0.6, 5, 4);
    // Front left well
    this.body.drawEllipse(halfLength * 0.55, -halfWidth * 0.6, 5, 4);
    // Rear right well
    this.body.drawEllipse(-halfLength * 0.45, halfWidth * 0.7, 6, 5);
    // Rear left well
    this.body.drawEllipse(-halfLength * 0.45, -halfWidth * 0.7, 6, 5);
    this.body.endFill();
  }

  private drawRoof(): void {
    this.roof.clear();

    // Darker roof/window area - characteristic 911 sloping roofline
    const halfLength = this.length / 2;

    this.roof.beginFill(this.roofColor);

    // Roof shape (centered, smaller than body)
    this.roof.moveTo(-halfLength * 0.2, 0);
    this.roof.bezierCurveTo(
      -halfLength * 0.2, this.width * 0.25,
      0, this.width * 0.28,
      halfLength * 0.3, this.width * 0.15
    );
    this.roof.bezierCurveTo(
      halfLength * 0.45, 0,
      halfLength * 0.45, 0,
      halfLength * 0.3, -this.width * 0.15
    );
    this.roof.bezierCurveTo(
      0, -this.width * 0.28,
      -halfLength * 0.2, -this.width * 0.25,
      -halfLength * 0.2, 0
    );

    this.roof.endFill();
  }

  private drawSpoiler(): void {
    this.spoiler.clear();

    const halfLength = this.length / 2;
    const halfWidth = this.width / 2;

    // Rear spoiler (raised wing at back)
    this.spoiler.beginFill(this.bodyColor);
    this.spoiler.lineStyle(1, 0x333333);
    this.spoiler.drawRoundedRect(-halfLength - 2, -halfWidth * 0.5, 4, this.width * 0.5, 1);
    this.spoiler.endFill();

    // Spoiler supports
    this.spoiler.beginFill(0x333333);
    this.spoiler.drawRect(-halfLength - 1, -halfWidth * 0.3, 2, 2);
    this.spoiler.drawRect(-halfLength - 1, halfWidth * 0.15, 2, 2);
    this.spoiler.endFill();
  }

  private drawAccentStripes(): void {
    this.accentStripes.clear();

    const halfLength = this.length / 2;

    // Neon accent stripes along the sides
    this.accentStripes.lineStyle(1.5, this.accentColor, 0.9);

    // Right side stripe
    this.accentStripes.moveTo(-halfLength * 0.4, this.width * 0.45);
    this.accentStripes.bezierCurveTo(
      halfLength * 0.2, this.width * 0.48,
      halfLength * 0.5, this.width * 0.35,
      halfLength * 0.8, this.width * 0.25
    );

    // Left side stripe
    this.accentStripes.moveTo(-halfLength * 0.4, -this.width * 0.45);
    this.accentStripes.bezierCurveTo(
      halfLength * 0.2, -this.width * 0.48,
      halfLength * 0.5, -this.width * 0.35,
      halfLength * 0.8, -this.width * 0.25
    );

    // Front accent line
    this.accentStripes.lineStyle(1, this.accentColor, 0.7);
    this.accentStripes.moveTo(halfLength * 0.85, this.width * 0.15);
    this.accentStripes.lineTo(halfLength * 0.85, -this.width * 0.15);
  }

  private drawWheels(): void {
    const wheelWidth = 6;
    const wheelHeight = 3;
    const halfLength = this.length / 2;
    const halfWidth = this.width / 2;

    // Draw each wheel
    [this.frontLeftWheel, this.frontRightWheel, this.rearLeftWheel, this.rearRightWheel].forEach(wheel => {
      wheel.clear();
      wheel.beginFill(this.wheelColor);
      wheel.drawRoundedRect(-wheelWidth / 2, -wheelHeight / 2, wheelWidth, wheelHeight, 1);
      wheel.endFill();
      // Rim detail
      wheel.beginFill(0x444444);
      wheel.drawCircle(0, 0, 1);
      wheel.endFill();
    });

    // Position wheels
    this.frontLeftWheel.position.set(halfLength * 0.55, -halfWidth * 0.75);
    this.frontRightWheel.position.set(halfLength * 0.55, halfWidth * 0.75);
    this.rearLeftWheel.position.set(-halfLength * 0.45, -halfWidth * 0.85);
    this.rearRightWheel.position.set(-halfLength * 0.45, halfWidth * 0.85);
  }

  private updateDynamicElements(): void {
    this.updateWheelRotation();
    this.updateBrakeLights();
    this.updateUnderglow();
    this.updateDamageOverlay();
  }

  private updateWheelRotation(): void {
    // Front wheels turn with steering
    this.frontLeftWheel.rotation = this.state.steeringAngle;
    this.frontRightWheel.rotation = this.state.steeringAngle;
  }

  private updateBrakeLights(): void {
    this.brakeLights.clear();

    const halfLength = this.length / 2;
    const halfWidth = this.width / 2;

    if (this.state.isBraking) {
      // Bright brake lights
      this.brakeLights.beginFill(this.brakeLightColor, 1);
      this.brakeLights.drawRoundedRect(-halfLength - 1, -halfWidth * 0.35, 3, 4, 1);
      this.brakeLights.drawRoundedRect(-halfLength - 1, halfWidth * 0.2, 3, 4, 1);
      this.brakeLights.endFill();

      // Glow effect
      this.brakeLights.beginFill(this.brakeLightColor, 0.3);
      this.brakeLights.drawCircle(-halfLength - 1, -halfWidth * 0.2, 6);
      this.brakeLights.drawCircle(-halfLength - 1, halfWidth * 0.35, 6);
      this.brakeLights.endFill();
    } else {
      // Dim tail lights (always visible)
      this.brakeLights.beginFill(0x660000, 0.8);
      this.brakeLights.drawRoundedRect(-halfLength - 1, -halfWidth * 0.35, 3, 4, 1);
      this.brakeLights.drawRoundedRect(-halfLength - 1, halfWidth * 0.2, 3, 4, 1);
      this.brakeLights.endFill();
    }
  }

  private updateUnderglow(): void {
    this.underglow.clear();

    const halfLength = this.length / 2;
    const halfWidth = this.width / 2;

    // Subtle neon underglow - changes based on drift state
    let glowColor = this.underglowColor;
    let glowAlpha = 0.15;

    if (this.state.driftPhase === DriftPhase.Drifting) {
      glowColor = 0xff00ff; // Magenta during drift
      glowAlpha = 0.35;
    } else if (this.state.driftPhase === DriftPhase.Recovery) {
      glowColor = 0x7ad7ff; // Light blue during recovery
      glowAlpha = 0.25;
    }

    // Outer glow
    this.underglow.beginFill(glowColor, glowAlpha * 0.5);
    this.underglow.drawEllipse(0, 0, halfLength + 8, halfWidth + 6);
    this.underglow.endFill();

    // Inner glow
    this.underglow.beginFill(glowColor, glowAlpha);
    this.underglow.drawEllipse(0, 0, halfLength + 4, halfWidth + 3);
    this.underglow.endFill();
  }

  private updateDamageOverlay(): void {
    this.scratchOverlay.clear();

    const halfLength = this.length / 2;
    const halfWidth = this.width / 2;

    switch (this.state.damageState) {
      case DamageState.Scratched:
        // Offset scratch lines
        this.scratchOverlay.lineStyle(1, 0x555555, 0.6);
        this.scratchOverlay.moveTo(-halfLength * 0.3, halfWidth * 0.3);
        this.scratchOverlay.lineTo(halfLength * 0.1, halfWidth * 0.4);
        this.scratchOverlay.moveTo(halfLength * 0.2, -halfWidth * 0.2);
        this.scratchOverlay.lineTo(halfLength * 0.5, -halfWidth * 0.35);
        break;

      case DamageState.Damaged:
        // More scratches + dents
        this.scratchOverlay.lineStyle(1.5, 0x444444, 0.7);
        this.scratchOverlay.moveTo(-halfLength * 0.5, halfWidth * 0.2);
        this.scratchOverlay.lineTo(-halfLength * 0.1, halfWidth * 0.5);
        this.scratchOverlay.moveTo(halfLength * 0.1, -halfWidth * 0.3);
        this.scratchOverlay.lineTo(halfLength * 0.6, -halfWidth * 0.45);
        this.scratchOverlay.moveTo(-halfLength * 0.2, -halfWidth * 0.1);
        this.scratchOverlay.lineTo(halfLength * 0.3, -halfWidth * 0.15);
        // Missing part visual (hood dent)
        this.scratchOverlay.beginFill(0x0a0a0a, 0.5);
        this.scratchOverlay.drawEllipse(halfLength * 0.4, 0, 4, 3);
        this.scratchOverlay.endFill();
        break;

      case DamageState.Wrecked:
        // Heavy damage
        this.scratchOverlay.lineStyle(2, 0x333333, 0.8);
        for (let i = 0; i < 6; i++) {
          const startX = (Math.random() - 0.5) * this.length * 0.8;
          const startY = (Math.random() - 0.5) * this.width * 0.8;
          const endX = startX + (Math.random() - 0.5) * 15;
          const endY = startY + (Math.random() - 0.5) * 8;
          this.scratchOverlay.moveTo(startX, startY);
          this.scratchOverlay.lineTo(endX, endY);
        }
        // Missing parts
        this.scratchOverlay.beginFill(0x080808, 0.7);
        this.scratchOverlay.drawEllipse(halfLength * 0.5, halfWidth * 0.3, 5, 4);
        this.scratchOverlay.drawEllipse(-halfLength * 0.3, -halfWidth * 0.4, 4, 3);
        this.scratchOverlay.endFill();
        break;
    }
  }

  update(steeringAngle: number, isBraking: boolean, driftPhase: DriftPhase, damageState: DamageState = DamageState.Pristine): void {
    const stateChanged =
      this.state.steeringAngle !== steeringAngle ||
      this.state.isBraking !== isBraking ||
      this.state.driftPhase !== driftPhase ||
      this.state.damageState !== damageState;

    if (stateChanged) {
      this.state = { steeringAngle, isBraking, driftPhase, damageState };
      this.updateDynamicElements();
    }
  }
}
