import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MusicControlsState {
  trackName: string;
  isPlaying: boolean;
}

interface ButtonDef {
  label: string;
  x: number;
  width: number;
  onTap: () => void;
}

export class MusicControls {
  readonly container: Container;

  private panel: Graphics;
  private titleText: Text;
  private trackText: Text;
  private playPauseText: Text;
  private readonly buttons: Graphics[] = [];
  private width = 300;
  private height = 88;

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

    const defs: ButtonDef[] = [
      { label: '<', x: 16, width: 26, onTap: onPrev },
      { label: '|| / >', x: 50, width: 62, onTap: onPlayPause },
      { label: '>', x: 120, width: 26, onTap: onNext },
    ];

    for (const def of defs) {
      this.buttons.push(this.createButton(def));
    }

    this.layout();
  }

  private createButton(def: ButtonDef): Graphics {
    const g = new Graphics();
    g.roundRect(0, 0, def.width, 24, 6);
    g.fill({ color: 0x112233, alpha: 0.92 });
    g.stroke({ color: 0x00ffff, width: 1, alpha: 0.8 });
    g.position.set(def.x, 52);
    g.eventMode = 'static';
    g.cursor = 'pointer';
    g.on('pointertap', def.onTap);

    const label = new Text({
      text: def.label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0x00ffff,
      }),
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(def.width / 2, 12);
    g.addChild(label);

    this.container.addChild(g);
    return g;
  }

  private layout(): void {
    this.panel.clear();
    this.panel.roundRect(0, 0, this.width, this.height, 8);
    this.panel.fill({ color: 0x090d18, alpha: 0.85 });
    this.panel.stroke({ color: 0x00ffff, width: 1, alpha: 0.6 });

    this.titleText.position.set(16, 8);
    this.trackText.position.set(16, 26);
    this.playPauseText.position.set(164, 58);
  }

  setPosition(screenWidth: number): void {
    this.container.position.set(screenWidth - this.width - 16, 12);
  }

  setState(state: MusicControlsState): void {
    this.trackText.text = `Track: ${state.trackName}`;
    this.playPauseText.text = state.isPlaying ? 'Playing' : 'Paused';
  }
}
