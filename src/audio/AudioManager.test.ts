import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from './AudioManager';

describe('AudioManager', () => {
  let audio: AudioManager;

  beforeEach(() => {
    audio = new AudioManager();
  });

  describe('mute toggle', () => {
    it('starts unmuted', () => {
      expect(audio.muted).toBe(false);
    });

    it('toggles mute on', () => {
      audio.toggleMute();
      expect(audio.muted).toBe(true);
    });

    it('toggles mute off after double toggle', () => {
      audio.toggleMute();
      audio.toggleMute();
      expect(audio.muted).toBe(false);
    });
  });

  describe('volume control', () => {
    it('defaults to 0.5', () => {
      expect(audio.volume).toBe(0.5);
    });

    it('sets volume within bounds', () => {
      audio.setVolume(0.8);
      expect(audio.volume).toBe(0.8);
    });

    it('clamps volume to 0', () => {
      audio.setVolume(-1);
      expect(audio.volume).toBe(0);
    });

    it('clamps volume to 1', () => {
      audio.setVolume(5);
      expect(audio.volume).toBe(1);
    });
  });

  describe('state transitions', () => {
    it('mute state persists through volume changes', () => {
      audio.toggleMute();
      audio.setVolume(0.9);
      expect(audio.muted).toBe(true);
      expect(audio.volume).toBe(0.9);
    });

    it('volume persists through mute toggles', () => {
      audio.setVolume(0.3);
      audio.toggleMute();
      audio.toggleMute();
      expect(audio.volume).toBe(0.3);
    });
  });
});
