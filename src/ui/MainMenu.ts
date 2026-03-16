import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MainMenuCallbacks {
  onQuickRace: () => void;
  onStoryMode: () => void;
  onControls: () => void;
}

interface MenuItem {
  label: string;
  action: () => void;
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

  // "Coming Soon" toast
  private toastText: Text;
  private toastTimer = 0;

  // Controls overlay
  private controlsContainer: Container;
  private controlsBg: Graphics;
  private controlsTitle: Text;
  private controlsBody: Text;
  private controlsHint: Text;

  // Animated particles
  private particleGraphics: Graphics;
  private particles: Particle[] = [];

  private callbacks: MainMenuCallbacks;
  private screenWidth = 0;
  private screenHeight = 0;

  // Keyboard state
  private onKeyDown: (e: KeyboardEvent) => void;
  private showingControls = false;

  constructor(callbacks: MainMenuCallbacks) {
    this.callbacks = callbacks;
    this.container = new Container();

    // Background
    this.bg = new Graphics();
    this.container.addChild(this.bg);

    // Particle layer
    this.particleGraphics = new Graphics();
    this.container.addChild(this.particleGraphics);

    // Title
    this.titleText = new Text({
      text: 'NEON DESERT OUTLAW',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 64,
        fontWeight: 'bold',
        fill: NEON_CYAN,
        dropShadow: {
          color: NEON_CYAN,
          blur: 24,
          distance: 0,
        },
      }),
    });
    this.titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.titleText);

    // Subtitle
    this.subtitleText = new Text({
      text: 'A Desert Racing Game',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0x888888,
      }),
    });
    this.subtitleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.subtitleText);

    // Menu items
    this.createMenuItem('QUICK RACE', () => this.callbacks.onQuickRace());
    this.createMenuItem('STORY MODE', () => this.handleStoryMode());
    this.createMenuItem('CONTROLS', () => this.callbacks.onControls());

    // Toast text for "Coming Soon"
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

    // Controls overlay (rendered within the menu container)
    this.controlsContainer = new Container();
    this.controlsContainer.visible = false;

    this.controlsBg = new Graphics();
    this.controlsContainer.addChild(this.controlsBg);

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
        'WASD / Arrow Keys .... Drive',
        'Space ................ Handbrake',
        'M .................... Toggle Sound',
        'Enter ................ Start Race',
        'ESC .................. Back to Menu',
      ].join('\n'),
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xcccccc,
        lineHeight: 34,
      }),
    });
    this.controlsBody.anchor.set(0.5, 0.5);
    this.controlsContainer.addChild(this.controlsBody);

    this.controlsHint = new Text({
      text: 'Press ESC or ENTER to go back',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 16,
        fill: DIM_CYAN,
      }),
    });
    this.controlsHint.anchor.set(0.5, 0.5);
    this.controlsContainer.addChild(this.controlsHint);

    this.container.addChild(this.controlsContainer);

    // Init particles
    this.initParticles();

    // Keyboard listener
    this.onKeyDown = (e: KeyboardEvent): void => {
      if (!this.container.visible) return;

      if (this.showingControls) {
        if (e.code === 'Escape' || e.code === 'Enter') {
          this.hideControls();
        }
        return;
      }

      // Toast is showing — ignore input
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
          this.items[this.selectedIndex].action();
          break;
      }
    };
    window.addEventListener('keydown', this.onKeyDown);

    this.updateSelection();
  }

  private createMenuItem(label: string, action: () => void): void {
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
    text.eventMode = 'static';
    text.cursor = 'pointer';
    const idx = this.items.length;
    text.on('pointerdown', () => {
      this.selectedIndex = idx;
      this.updateSelection();
      this.items[idx].action();
    });
    this.container.addChild(text);

    this.items.push({ label, action, text });
  }

  private handleStoryMode(): void {
    this.callbacks.onStoryMode();
  }

  showControls(): void {
    this.showingControls = true;
    this.controlsContainer.visible = true;
    // Hide menu items behind controls
    this.titleText.visible = false;
    this.subtitleText.visible = false;
    for (const item of this.items) {
      item.text.visible = false;
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
      item.text.visible = true;
    }
  }

  private layoutControls(): void {
    const cx = this.screenWidth / 2;
    const cy = this.screenHeight / 2;

    this.controlsBg.clear();
    this.controlsBg.beginFill(BG_COLOR, 0.95);
    this.controlsBg.drawRect(0, 0, this.screenWidth, this.screenHeight);
    this.controlsBg.endFill();

    this.controlsTitle.position.set(cx, cy - 160);
    this.controlsBody.position.set(cx, cy + 10);
    this.controlsHint.position.set(cx, cy + 180);
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
      const selected = i === this.selectedIndex;
      item.text.style.fill = selected ? NEON_MAGENTA : DIM_CYAN;
      item.text.style.dropShadow = selected
        ? { color: NEON_MAGENTA, blur: 12, distance: 0, alpha: 1, angle: 0 }
        : false;
    }
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;

    // Draw background
    this.bg.clear();
    this.bg.beginFill(BG_COLOR);
    this.bg.drawRect(0, 0, width, height);
    this.bg.endFill();

    const cx = width / 2;

    // Responsive scale factor for mobile (reference: 1024px width)
    const scale = Math.min(1, width / 1024);
    const mobileScale = Math.max(0.5, scale);

    // Scale title for mobile
    this.titleText.style.fontSize = Math.round(64 * mobileScale);
    this.subtitleText.style.fontSize = Math.round(20 * mobileScale);

    // Scale menu items
    for (const item of this.items) {
      item.text.style.fontSize = Math.round(28 * mobileScale);
    }

    // Title position
    this.titleText.position.set(cx, height * 0.22);
    const subtitleGap = 55 * mobileScale;
    this.subtitleText.position.set(cx, height * 0.22 + subtitleGap);

    // Menu items
    const menuStartY = height * 0.50;
    const itemSpacing = Math.round(55 * mobileScale);
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].text.position.set(cx, menuStartY + i * itemSpacing);
    }

    // Toast
    this.toastText.style.fontSize = Math.round(24 * mobileScale);
    this.toastText.position.set(cx, menuStartY + this.items.length * itemSpacing + 40);

    if (this.showingControls) {
      this.layoutControls();
    }
  }

  update(dt: number): void {
    this.pulseTime += dt;

    // Pulse animation on selected item
    const selectedItem = this.items[this.selectedIndex];
    if (selectedItem) {
      const scale = 1 + Math.sin(this.pulseTime * 4) * 0.04;
      selectedItem.text.scale.set(scale, scale);
    }

    // Reset non-selected items scale
    for (let i = 0; i < this.items.length; i++) {
      if (i !== this.selectedIndex) {
        this.items[i].text.scale.set(1, 1);
      }
    }

    // Toast timer
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

    // Animate particles
    this.particleGraphics.clear();
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wrap around screen
      if (p.x < 0) p.x = this.screenWidth;
      if (p.x > this.screenWidth) p.x = 0;
      if (p.y < 0) p.y = this.screenHeight;
      if (p.y > this.screenHeight) p.y = 0;

      this.particleGraphics.beginFill(NEON_CYAN, p.alpha * (0.5 + 0.5 * Math.sin(this.pulseTime * 2 + p.x * 0.01)));
      this.particleGraphics.drawCircle(p.x, p.y, 1.5);
      this.particleGraphics.endFill();
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
