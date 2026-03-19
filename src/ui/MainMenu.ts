import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MainMenuCallbacks {
  onQuickRace: () => void;
  onStoryMode: () => void;
  onControls: () => void;
}

interface MenuItem {
  label: string;
  action: () => void;
  container: Container;
  background: Graphics;
  text: Text;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
}

const NEON_CYAN = 0x00ffff;
const NEON_MAGENTA = 0xff00ff;
const DIM_CYAN = 0x337777;
const BG_COLOR = 0x0a0a0a;

export class MainMenu {
  readonly container: Container;

  private bg: Graphics;
  private titleText: Text;
  private subtitleText: Text;
  private items: MenuItem[] = [];
  private selectedIndex = 0;
  private pulseTime = 0;

  private toastText: Text;
  private toastTimer = 0;

  private controlsContainer: Container;
  private controlsBg: Graphics;
  private controlsCard: Graphics;
  private controlsTitle: Text;
  private controlsBody: Text;
  private controlsHintButton: Container;
  private controlsHintBg: Graphics;
  private controlsHint: Text;

  private particleGraphics: Graphics;
  private particles: Particle[] = [];

  private callbacks: MainMenuCallbacks;
  private screenWidth = 0;
  private screenHeight = 0;
  private buttonWidth = 320;
  private buttonHeight = 64;

  private onKeyDown: (e: KeyboardEvent) => void;
  private showingControls = false;

  constructor(callbacks: MainMenuCallbacks) {
    this.callbacks = callbacks;
    this.container = new Container();

    this.bg = new Graphics();
    this.container.addChild(this.bg);

    this.particleGraphics = new Graphics();
    this.container.addChild(this.particleGraphics);

    this.titleText = new Text({
      text: 'NEON DESERT OUTLAW',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 64,
        fontWeight: 'bold',
        fill: NEON_CYAN,
        align: 'center',
        dropShadow: {
          color: NEON_CYAN,
          blur: 24,
          distance: 0,
        },
      }),
    });
    this.titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.titleText);

    this.subtitleText = new Text({
      text: 'A Desert Racing Game',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0x888888,
        align: 'center',
      }),
    });
    this.subtitleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.subtitleText);

    this.createMenuItem('QUICK RACE', () => this.callbacks.onQuickRace());
    this.createMenuItem('STORY MODE', () => this.handleStoryMode());
    this.createMenuItem('CONTROLS', () => this.callbacks.onControls());

    this.toastText = new Text({
      text: 'Coming Soon...',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 24,
        fontWeight: 'bold',
        fill: NEON_MAGENTA,
        dropShadow: {
          color: NEON_MAGENTA,
          blur: 10,
          distance: 0,
        },
      }),
    });
    this.toastText.anchor.set(0.5, 0.5);
    this.toastText.visible = false;
    this.container.addChild(this.toastText);

    this.controlsContainer = new Container();
    this.controlsContainer.visible = false;

    this.controlsBg = new Graphics();
    this.controlsCard = new Graphics();
    this.controlsContainer.addChild(this.controlsBg, this.controlsCard);

    this.controlsTitle = new Text({
      text: 'CONTROLS',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 48,
        fontWeight: 'bold',
        fill: NEON_CYAN,
        dropShadow: {
          color: NEON_CYAN,
          blur: 16,
          distance: 0,
        },
      }),
    });
    this.controlsTitle.anchor.set(0.5, 0.5);
    this.controlsContainer.addChild(this.controlsTitle);

    this.controlsBody = new Text({
      text: [
        'KEYBOARD',
        'WASD / Arrows  Drive',
        'Space          Handbrake',
        'M              Toggle Sound',
        'Enter          Start / Confirm',
        'Esc            Back to Menu',
        '',
        'TOUCH',
        'Left Pad       Steer + Throttle',
        'Brake          Slow / Reverse',
        'Drift          Handbrake slide',
        'Back           Return to Menu',
        'Go             Start / Retry',
      ].join('\n'),
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xcccccc,
        lineHeight: 34,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 460,
      }),
    });
    this.controlsBody.anchor.set(0.5, 0);
    this.controlsContainer.addChild(this.controlsBody);

    this.controlsHintButton = new Container();
    this.controlsHintBg = new Graphics();
    this.controlsHint = new Text({
      text: 'BACK',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 16,
        fontWeight: 'bold',
        fill: NEON_CYAN,
      }),
    });
    this.controlsHint.anchor.set(0.5, 0.5);
    this.controlsHintButton.addChild(this.controlsHintBg, this.controlsHint);
    this.controlsHintBg.eventMode = 'static';
    this.controlsHintBg.cursor = 'pointer';
    this.controlsHintBg.on('pointertap', () => this.hideControls());
    this.controlsContainer.addChild(this.controlsHintButton);

    this.container.addChild(this.controlsContainer);

    this.initParticles();

    this.onKeyDown = (e: KeyboardEvent): void => {
      if (!this.container.visible) return;

      if (this.showingControls) {
        if (e.code === 'Escape' || e.code === 'Enter') {
          this.hideControls();
        }
        return;
      }

      if (this.toastTimer > 0) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
          this.updateSelection();
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
          this.updateSelection();
          break;
        case 'Enter':
          this.items[this.selectedIndex]?.action();
          break;
      }
    };
    window.addEventListener('keydown', this.onKeyDown);

    this.updateSelection();
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private createMenuItem(label: string, action: () => void): void {
    const container = new Container();
    const background = new Graphics();
    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 28,
        fontWeight: 'bold',
        fill: DIM_CYAN,
      }),
    });
    text.anchor.set(0.5, 0.5);

    background.eventMode = 'static';
    background.cursor = 'pointer';

    const idx = this.items.length;
    background.on('pointertap', () => {
      this.selectedIndex = idx;
      this.updateSelection();
      this.items[idx]?.action();
    });

    container.addChild(background, text);
    this.container.addChild(container);
    this.items.push({ label, action, container, background, text });
  }

  private drawMenuButton(item: MenuItem, selected: boolean): void {
    item.background.clear();
    item.background.beginFill(0x08151b, selected ? 0.9 : 0.76);
    item.background.drawRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2,
      this.buttonWidth,
      this.buttonHeight,
      14
    );
    item.background.endFill();
    item.background.lineStyle(2, selected ? NEON_MAGENTA : NEON_CYAN, selected ? 0.9 : 0.38);
    item.background.drawRoundedRect(
      -this.buttonWidth / 2,
      -this.buttonHeight / 2,
      this.buttonWidth,
      this.buttonHeight,
      14
    );

    item.text.style.fill = selected ? NEON_MAGENTA : 0xd8fafa;
    item.text.style.dropShadow = selected
      ? { color: NEON_MAGENTA, blur: 12, distance: 0, alpha: 1, angle: 0 }
      : false;
  }

  private handleStoryMode(): void {
    this.callbacks.onStoryMode();
  }

  showControls(): void {
    this.showingControls = true;
    this.controlsContainer.visible = true;
    this.titleText.visible = false;
    this.subtitleText.visible = false;
    for (const item of this.items) {
      item.container.visible = false;
    }
    this.toastText.visible = false;
    this.layoutControls();
  }

  private hideControls(): void {
    this.showingControls = false;
    this.controlsContainer.visible = false;
    this.titleText.visible = true;
    this.subtitleText.visible = true;
    for (const item of this.items) {
      item.container.visible = true;
    }
  }

  private layoutControls(): void {
    const isPhone = this.screenWidth < 560;
    const cardWidth = Math.min(this.screenWidth - 24, isPhone ? 420 : 560);
    const cardHeight = Math.min(this.screenHeight - 24, isPhone ? 560 : 620);
    const cardX = (this.screenWidth - cardWidth) / 2;
    const cardY = (this.screenHeight - cardHeight) / 2;
    const titleSize = isPhone ? 32 : 48;
    const bodySize = isPhone ? 14 : 20;
    const lineHeight = isPhone ? 22 : 34;
    const hintWidth = Math.min(cardWidth - 36, 180);
    const hintHeight = 48;

    this.controlsBg.clear();
    this.controlsBg.beginFill(BG_COLOR, 0.96);
    this.controlsBg.drawRect(0, 0, this.screenWidth, this.screenHeight);
    this.controlsBg.endFill();

    this.controlsCard.clear();
    this.controlsCard.beginFill(0x08151b, 0.94);
    this.controlsCard.drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 18);
    this.controlsCard.endFill();
    this.controlsCard.lineStyle(2, NEON_CYAN, 0.55);
    this.controlsCard.drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 18);

    this.controlsTitle.style.fontSize = titleSize;
    this.controlsTitle.position.set(this.screenWidth / 2, cardY + 52);

    this.controlsBody.style.fontSize = bodySize;
    this.controlsBody.style.lineHeight = lineHeight;
    this.controlsBody.style.wordWrapWidth = cardWidth - 40;
    this.controlsBody.position.set(this.screenWidth / 2, cardY + 96);

    this.controlsHintBg.clear();
    this.controlsHintBg.beginFill(0x08151b, 1);
    this.controlsHintBg.drawRoundedRect(-hintWidth / 2, -hintHeight / 2, hintWidth, hintHeight, 12);
    this.controlsHintBg.endFill();
    this.controlsHintBg.lineStyle(2, NEON_CYAN, 0.6);
    this.controlsHintBg.drawRoundedRect(-hintWidth / 2, -hintHeight / 2, hintWidth, hintHeight, 12);

    this.controlsHint.style.fontSize = isPhone ? 15 : 16;
    this.controlsHintButton.position.set(this.screenWidth / 2, cardY + cardHeight - 42);
  }

  private initParticles(): void {
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        alpha: 0.1 + Math.random() * 0.3,
      });
    }
  }

  private updateSelection(): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      this.drawMenuButton(item, i === this.selectedIndex);
    }
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;

    this.bg.clear();
    this.bg.beginFill(BG_COLOR);
    this.bg.drawRect(0, 0, width, height);
    this.bg.endFill();

    const cx = width / 2;
    const isPhone = width < 560;
    const titleSize = isPhone
      ? Math.round(this.clamp(width * 0.11, 34, 44))
      : Math.round(this.clamp(width * 0.065, 48, 64));
    const subtitleSize = isPhone ? 16 : Math.round(this.clamp(width * 0.022, 18, 20));

    this.titleText.text = isPhone ? 'NEON DESERT\nOUTLAW' : 'NEON DESERT OUTLAW';
    this.titleText.style.fontSize = titleSize;
    this.subtitleText.style.fontSize = subtitleSize;

    this.titleText.position.set(cx, isPhone ? height * 0.18 : height * 0.22);
    this.subtitleText.position.set(cx, this.titleText.y + (isPhone ? 52 : 58));

    this.buttonWidth = Math.min(width - 32, isPhone ? 320 : 360);
    this.buttonHeight = isPhone ? 58 : 64;
    const itemSpacing = this.buttonHeight + (isPhone ? 14 : 18);
    const menuStartY = isPhone ? height * 0.44 : height * 0.5;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      item.text.style.fontSize = isPhone ? 22 : 28;
      item.container.position.set(cx, menuStartY + i * itemSpacing);
    }
    this.updateSelection();

    this.toastText.style.fontSize = isPhone ? 20 : 24;
    this.toastText.position.set(cx, menuStartY + this.items.length * itemSpacing + 28);

    if (this.showingControls) {
      this.layoutControls();
    }
  }

  update(dt: number): void {
    this.pulseTime += dt;

    const selectedItem = this.items[this.selectedIndex];
    if (selectedItem) {
      const scale = 1 + Math.sin(this.pulseTime * 4) * 0.03;
      selectedItem.container.scale.set(scale, scale);
    }

    for (let i = 0; i < this.items.length; i++) {
      if (i !== this.selectedIndex) {
        this.items[i].container.scale.set(1, 1);
      }
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0.5) {
        this.toastText.alpha = Math.max(0, this.toastTimer / 0.5);
      }
      if (this.toastTimer <= 0) {
        this.toastText.visible = false;
        this.toastTimer = 0;
      }
    }

    this.particleGraphics.clear();
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < 0) p.x = this.screenWidth;
      if (p.x > this.screenWidth) p.x = 0;
      if (p.y < 0) p.y = this.screenHeight;
      if (p.y > this.screenHeight) p.y = 0;

      this.particleGraphics.beginFill(
        NEON_CYAN,
        p.alpha * (0.5 + 0.5 * Math.sin(this.pulseTime * 2 + p.x * 0.01))
      );
      this.particleGraphics.drawCircle(p.x, p.y, 1.5);
      this.particleGraphics.endFill();
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
