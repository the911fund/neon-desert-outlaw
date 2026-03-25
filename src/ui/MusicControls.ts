import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MusicControlsState {
  trackName: string;
  isPlaying: boolean;
}

interface ControlButton {
  container: Container;
  background: Graphics;
  label: Text;
  onTap: () => void;
}

export class MusicControls {
  readonly container: Container;

  private panel: Graphics;
  private titleText: Text;
  private trackText: Text;
  private playPauseText: Text;
  private readonly buttons: ControlButton[] = [];
  private width = 300;
  private height = 88;
  private buttonHeight = 30;
  private compactMode = false;

  constructor(onPrev: () => void, onPlayPause: () => void, onNext: () => void) {
    this.container = new Container();
    this.panel = new Graphics();
    this.titleText = new Text({
      text: 'MUSIC',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 'bold',
        fill: 0x00ffff,
      }),
    });
    this.trackText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 13,
        fill: 0xffffff,
      }),
    });
    this.playPauseText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xff66ff,
      }),
    });

    this.container.addChild(this.panel, this.titleText, this.trackText, this.playPauseText);

    const defs = [
      { label: '<', onTap: onPrev },
      { label: 'PLAY / PAUSE', onTap: onPlayPause },
      { label: '>', onTap: onNext },
    ];

    for (const def of defs) {
      this.buttons.push(this.createButton(def.label, def.onTap));
    }

    this.layout();
  }

  private createButton(label: string, onTap: () => void): ControlButton {
    const container = new Container();
    const background = new Graphics();
    const text = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 'bold',
        fill: 0x00ffff,
      }),
    });
    text.anchor.set(0.5, 0.5);

    background.eventMode = 'static';
    background.cursor = 'pointer';
    background.on('pointertap', onTap);

    container.addChild(background, text);
    this.container.addChild(container);

    return { container, background, label: text, onTap };
  }

  private drawButton(button: ControlButton, x: number, y: number, width: number): void {
    button.container.position.set(x, y);
    button.background.clear();
    button.background.beginFill(0x112233, 0.94);
    button.background.drawRoundedRect(0, 0, width, this.buttonHeight, 10);
    button.background.endFill();
    button.background.lineStyle(2, 0x00ffff, 0.75);
    button.background.drawRoundedRect(0, 0, width, this.buttonHeight, 10);
    button.label.style.fontSize = this.compactMode ? 12 : 11;
    button.label.position.set(width / 2, this.buttonHeight / 2);
  }

  private layout(): void {
    this.panel.clear();
    this.panel.beginFill(0x090d18, 0.88);
    this.panel.drawRoundedRect(0, 0, this.width, this.height, 10);
    this.panel.endFill();
    this.panel.lineStyle(1.5, 0x00ffff, 0.6);
    this.panel.drawRoundedRect(0, 0, this.width, this.height, 10);

    this.titleText.style.fontSize = this.compactMode ? 13 : 12;
    this.trackText.style.fontSize = this.compactMode ? 14 : 13;
    this.playPauseText.style.fontSize = this.compactMode ? 12 : 11;
    this.trackText.style.wordWrap = true;
    this.trackText.style.wordWrapWidth = this.width - 24;

    this.titleText.position.set(14, 8);
    this.trackText.position.set(14, 26);
    this.playPauseText.position.set(14, this.compactMode ? 48 : 58);

    if (this.compactMode) {
      this.drawButton(this.buttons[0], 14, 68, 48);
      this.drawButton(this.buttons[1], 70, 68, 100);
      this.drawButton(this.buttons[2], 178, 68, 48);
    } else {
      this.drawButton(this.buttons[0], 16, 52, 36);
      this.drawButton(this.buttons[1], 60, 52, 112);
      this.drawButton(this.buttons[2], 180, 52, 36);
    }
  }

  setPosition(screenWidth: number, screenHeight: number): void {
    this.compactMode = screenWidth < 768;

    if (this.compactMode) {
      this.width = Math.min(240, screenWidth - 32);
      this.height = 118;
      this.buttonHeight = 44;
      this.layout();
      this.container.position.set(14, Math.round(18 + 208 * Math.min(screenWidth / 430, 1)));
    } else {
      this.width = 300;
      this.height = 88;
      this.buttonHeight = 30;
      this.layout();
      // Position below the minimap (200px size + padding) to avoid overlap
      this.container.position.set(screenWidth - this.width - 12, 228);
    }

    if (this.compactMode && this.container.y + this.height > screenHeight - 220) {
      this.container.y = Math.max(14, screenHeight - this.height - 220);
    }
  }

  setState(state: MusicControlsState): void {
    this.trackText.text = `Track: ${state.trackName}`;
    this.playPauseText.text = state.isPlaying ? 'Playing' : 'Paused';
  }
}
