import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MusicControlsState {
  trackName: string;
  isPlaying: boolean;
  sfxMuted: boolean;
  sfxVolume: number;
  musicVolume: number;
}

interface ControlButton {
  container: Container;
  background: Graphics;
  label: Text;
  onTap: () => void;
}

interface VolumeSlider {
  container: Container;
  track: Graphics;
  fill: Graphics;
  handle: Graphics;
  labelText: Text;
  valueText: Text;
  value: number;
  onChange: (v: number) => void;
  width: number;
}

export class MusicControls {
  readonly container: Container;

  private panel: Graphics;
  private titleText: Text;
  private trackText: Text;
  private playPauseText: Text;
  private readonly buttons: ControlButton[] = [];
  private sfxMuteButton: ControlButton;
  private sfxSlider: VolumeSlider;
  private musicSlider: VolumeSlider;
  private width = 300;
  private height = 200;
  private buttonHeight = 30;
  private compactMode = false;

  constructor(
    onPrev: () => void,
    onPlayPause: () => void,
    onNext: () => void,
    onSfxMuteToggle: () => void,
    onSfxVolumeChange: (v: number) => void,
    onMusicVolumeChange: (v: number) => void,
  ) {
    this.container = new Container();
    this.panel = new Graphics();
    this.titleText = new Text({
      text: 'AUDIO',
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

    // SFX mute toggle button
    this.sfxMuteButton = this.createButton('SFX: ON', onSfxMuteToggle);

    // Volume sliders
    this.sfxSlider = this.createSlider('SFX', 0.3, onSfxVolumeChange);
    this.musicSlider = this.createSlider('MUSIC', 0.5, onMusicVolumeChange);

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

  private createSlider(label: string, initialValue: number, onChange: (v: number) => void): VolumeSlider {
    const container = new Container();
    const track = new Graphics();
    const fill = new Graphics();
    const handle = new Graphics();
    const labelText = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fontWeight: 'bold',
        fill: 0xaaaaaa,
      }),
    });
    const valueText = new Text({
      text: Math.round(initialValue * 100).toString(),
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x00ffff,
      }),
    });

    container.addChild(track, fill, handle, labelText, valueText);
    this.container.addChild(container);

    // Make track interactive for dragging
    track.eventMode = 'static';
    track.cursor = 'pointer';
    handle.eventMode = 'static';
    handle.cursor = 'pointer';

    const slider: VolumeSlider = {
      container,
      track,
      fill,
      handle,
      labelText,
      valueText,
      value: initialValue,
      onChange,
      width: 160,
    };

    const updateFromPointer = (e: { getLocalPosition: (obj: Container) => { x: number } }): void => {
      const local = e.getLocalPosition(container);
      const labelWidth = 50;
      const valueWidth = 30;
      const sliderLeft = labelWidth;
      const sliderWidth = slider.width - labelWidth - valueWidth;
      const ratio = Math.max(0, Math.min(1, (local.x - sliderLeft) / sliderWidth));
      slider.value = ratio;
      slider.onChange(ratio);
      this.drawSlider(slider);
    };

    let dragging = false;
    track.on('pointerdown', (e) => {
      dragging = true;
      updateFromPointer(e);
    });
    handle.on('pointerdown', (e) => {
      dragging = true;
      updateFromPointer(e);
    });

    const onMove = (e: { getLocalPosition: (obj: Container) => { x: number } }): void => {
      if (dragging) updateFromPointer(e);
    };
    const onUp = (): void => {
      dragging = false;
    };

    track.on('pointermove', onMove);
    track.on('pointerup', onUp);
    track.on('pointerupoutside', onUp);
    handle.on('pointermove', onMove);
    handle.on('pointerup', onUp);
    handle.on('pointerupoutside', onUp);

    return slider;
  }

  private drawSlider(slider: VolumeSlider): void {
    const labelWidth = 50;
    const valueWidth = 30;
    const sliderWidth = slider.width - labelWidth - valueWidth;
    const barHeight = 8;
    const barY = 4;

    slider.labelText.position.set(0, 0);
    slider.valueText.text = Math.round(slider.value * 100).toString();
    slider.valueText.position.set(slider.width - valueWidth, 0);

    // Track background
    slider.track.clear();
    slider.track.beginFill(0x222233, 0.9);
    slider.track.drawRoundedRect(labelWidth, barY, sliderWidth, barHeight, 4);
    slider.track.endFill();

    // Filled portion
    const fillWidth = sliderWidth * slider.value;
    slider.fill.clear();
    if (fillWidth > 0) {
      slider.fill.beginFill(0x00ffff, 0.8);
      slider.fill.drawRoundedRect(labelWidth, barY, fillWidth, barHeight, 4);
      slider.fill.endFill();
    }

    // Handle
    const handleX = labelWidth + fillWidth;
    const handleSize = 12;
    slider.handle.clear();
    slider.handle.beginFill(0x00ffff, 1);
    slider.handle.drawCircle(handleX, barY + barHeight / 2, handleSize / 2);
    slider.handle.endFill();
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
    this.playPauseText.position.set(14, this.compactMode ? 48 : 44);

    // Track control buttons
    if (this.compactMode) {
      const btnY = 62;
      this.drawButton(this.buttons[0], 14, btnY, 48);
      this.drawButton(this.buttons[1], 70, btnY, 100);
      this.drawButton(this.buttons[2], 178, btnY, 48);
    } else {
      const btnY = 58;
      this.drawButton(this.buttons[0], 16, btnY, 36);
      this.drawButton(this.buttons[1], 60, btnY, 112);
      this.drawButton(this.buttons[2], 180, btnY, 36);
    }

    // SFX mute button
    const sfxBtnY = this.compactMode ? 112 : 94;
    this.drawButton(this.sfxMuteButton, 16, sfxBtnY, this.compactMode ? 80 : 68);

    // Volume sliders
    const sliderWidth = this.width - 28;
    this.sfxSlider.width = sliderWidth;
    this.musicSlider.width = sliderWidth;

    const sfxSliderY = this.compactMode ? 140 : 128;
    const musicSliderY = sfxSliderY + 20;
    this.sfxSlider.container.position.set(14, sfxSliderY);
    this.musicSlider.container.position.set(14, musicSliderY);

    this.drawSlider(this.sfxSlider);
    this.drawSlider(this.musicSlider);
  }

  setPosition(screenWidth: number, screenHeight: number): void {
    this.compactMode = screenWidth < 768;

    if (this.compactMode) {
      this.width = Math.min(240, screenWidth - 32);
      this.height = 178;
      this.buttonHeight = 44;
      this.layout();
      this.container.position.set(14, Math.round(18 + 208 * Math.min(screenWidth / 430, 1)));
    } else {
      this.width = 300;
      this.height = 168;
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
    this.sfxMuteButton.label.text = state.sfxMuted ? 'SFX: OFF' : 'SFX: ON';
    this.sfxSlider.value = state.sfxVolume;
    this.musicSlider.value = state.musicVolume;
    this.drawSlider(this.sfxSlider);
    this.drawSlider(this.musicSlider);
  }
}
