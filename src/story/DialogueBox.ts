import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface DialogueLine {
  speaker: string;
  text: string;
}

const NEON_CYAN = 0x00ffff;
const PANEL_BG = 0x0a0a0a;
const PANEL_ALPHA = 0.85;
const TYPEWRITER_SPEED = 40; // characters per second
const PANEL_HEIGHT = 120;
const PANEL_MARGIN = 20;

export class DialogueBox {
  readonly container: Container;

  private bg: Graphics;
  private speakerText: Text;
  private bodyText: Text;

  private lines: DialogueLine[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private charTimer = 0;
  private typing = false;
  private finished = false;

  private screenWidth = 800;
  private screenHeight = 600;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onComplete: (() => void) | null = null;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.bg = new Graphics();
    this.container.addChild(this.bg);

    this.speakerText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: 'bold',
        fill: NEON_CYAN,
        dropShadow: {
          color: NEON_CYAN,
          blur: 8,
          distance: 0,
        },
      }),
    });
    this.container.addChild(this.speakerText);

    this.bodyText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 16,
        fill: 0xdddddd,
        wordWrap: true,
        wordWrapWidth: 700,
        lineHeight: 24,
      }),
    });
    this.container.addChild(this.bodyText);

    this.onKeyDown = (e: KeyboardEvent): void => {
      if (!this.container.visible) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.advance();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  show(lines: DialogueLine[], onComplete: () => void): void {
    if (lines.length === 0) {
      onComplete();
      return;
    }
    this.lines = lines;
    this.lineIndex = 0;
    this.charIndex = 0;
    this.charTimer = 0;
    this.typing = true;
    this.finished = false;
    this.onComplete = onComplete;
    this.container.visible = true;
    this.showCurrentLine();
  }

  hide(): void {
    this.container.visible = false;
    this.lines = [];
    this.onComplete = null;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  update(dt: number): void {
    if (!this.container.visible || !this.typing) return;

    const line = this.lines[this.lineIndex];
    if (!line) return;

    this.charTimer += dt * TYPEWRITER_SPEED;
    const newChars = Math.floor(this.charTimer);
    if (newChars > 0) {
      this.charIndex = Math.min(this.charIndex + newChars, line.text.length);
      this.charTimer -= newChars;
      this.bodyText.text = line.text.substring(0, this.charIndex);

      if (this.charIndex >= line.text.length) {
        this.typing = false;
      }
    }
  }

  private advance(): void {
    if (this.finished) return;

    if (this.typing) {
      // Skip typewriter — show full text
      const line = this.lines[this.lineIndex];
      if (line) {
        this.charIndex = line.text.length;
        this.bodyText.text = line.text;
        this.typing = false;
      }
      return;
    }

    // Move to next line
    this.lineIndex++;
    if (this.lineIndex >= this.lines.length) {
      this.finished = true;
      this.container.visible = false;
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }

    this.charIndex = 0;
    this.charTimer = 0;
    this.typing = true;
    this.showCurrentLine();
  }

  private showCurrentLine(): void {
    const line = this.lines[this.lineIndex];
    if (!line) return;
    this.speakerText.text = line.speaker;
    this.bodyText.text = '';
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;

    this.bodyText.style.wordWrapWidth = width - PANEL_MARGIN * 4;
    this.layout();
  }

  private layout(): void {
    const panelY = this.screenHeight - PANEL_HEIGHT - PANEL_MARGIN;

    this.bg.clear();
    // Dark background
    this.bg.beginFill(PANEL_BG, PANEL_ALPHA);
    this.bg.drawRoundedRect(PANEL_MARGIN, panelY, this.screenWidth - PANEL_MARGIN * 2, PANEL_HEIGHT, 8);
    this.bg.endFill();
    // Cyan neon border
    this.bg.lineStyle(2, NEON_CYAN, 0.7);
    this.bg.drawRoundedRect(PANEL_MARGIN, panelY, this.screenWidth - PANEL_MARGIN * 2, PANEL_HEIGHT, 8);

    this.speakerText.position.set(PANEL_MARGIN + 16, panelY + 12);
    this.bodyText.position.set(PANEL_MARGIN + 16, panelY + 38);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
