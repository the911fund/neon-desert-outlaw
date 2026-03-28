import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from './AudioManager';

describe('AudioManager', () => {
  let audio: AudioManager;

  beforeEach(() => {
    audio = new AudioManager();
  });

  describe('SFX mute toggle', () => {
    it('starts unmuted', () => {
      expect(audio.sfxMuted).toBe(false);
    });

    it('toggles SFX mute on', () => {
      audio.toggleSfxMute();
      expect(audio.sfxMuted).toBe(true);
    });

    it('toggles SFX mute back off after double toggle', () => {
      audio.toggleSfxMute();
      audio.toggleSfxMute();
      expect(audio.sfxMuted).toBe(false);
    });

    it('returns new mute state from toggleSfxMute', () => {
      expect(audio.toggleSfxMute()).toBe(true);
      expect(audio.toggleSfxMute()).toBe(false);
    });
  });

  describe('legacy mute toggle (backwards compat)', () => {
    it('starts unmuted', () => {
      expect(audio.muted).toBe(false);
    });

    it('toggles mute on', () => {
      audio.toggleMute();
      expect(audio.muted).toBe(true);
    });

    it('toggles mute back off after double toggle', () => {
      audio.toggleMute();
      audio.toggleMute();
      expect(audio.muted).toBe(false);
    });
  });

  describe('SFX volume control', () => {
    it('defaults to 0.3', () => {
      expect(audio.sfxVolume).toBe(0.3);
    });

    it('sets SFX volume within bounds', () => {
      audio.setSfxVolume(0.8);
      expect(audio.sfxVolume).toBe(0.8);
    });

    it('clamps SFX volume to 0', () => {
      audio.setSfxVolume(-1);
      expect(audio.sfxVolume).toBe(0);
    });

    it('clamps SFX volume to 1', () => {
      audio.setSfxVolume(5);
      expect(audio.sfxVolume).toBe(1);
    });
  });

  describe('music volume control', () => {
    it('defaults to 0.5', () => {
      expect(audio.musicVolume).toBe(0.5);
    });

    it('sets music volume within bounds', () => {
      audio.setMusicVolume(0.7);
      expect(audio.musicVolume).toBe(0.7);
    });

    it('clamps music volume to 0', () => {
      audio.setMusicVolume(-1);
      expect(audio.musicVolume).toBe(0);
    });

    it('clamps music volume to 1', () => {
      audio.setMusicVolume(5);
      expect(audio.musicVolume).toBe(1);
    });
  });

  describe('legacy volume control', () => {
    it('defaults to 0.7 (master)', () => {
      expect(audio.volume).toBeCloseTo(0.7);
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
    it('sfx mute state persists through volume changes', () => {
      audio.toggleSfxMute();
      audio.setSfxVolume(0.9);
      expect(audio.sfxMuted).toBe(true);
      expect(audio.sfxVolume).toBe(0.9);
    });

    it('sfx volume persists through mute toggles', () => {
      audio.setSfxVolume(0.4);
      audio.toggleSfxMute();
      audio.toggleSfxMute();
      expect(audio.sfxVolume).toBeCloseTo(0.4);
    });

    it('music volume is independent of SFX volume', () => {
      audio.setSfxVolume(0.1);
      audio.setMusicVolume(0.9);
      expect(audio.sfxVolume).toBeCloseTo(0.1);
      expect(audio.musicVolume).toBeCloseTo(0.9);
    });
  });

  describe('music playlist', () => {
    it('exposes tracks and wraps track selection', () => {
      const tracks = audio.getMusicTracks();
      expect(tracks.length).toBeGreaterThanOrEqual(3);

      audio.setTrack(-1);
      expect(audio.musicTrackIndex).toBe(tracks.length - 1);

      audio.nextTrack();
      expect(audio.musicTrackIndex).toBe(0);
    });

    it('toggles music playback state', () => {
      const playingBefore = audio.musicPlaying;
      const playingAfter = audio.toggleMusicPlayback();
      expect(playingAfter).toBe(!playingBefore);
      expect(audio.musicPlaying).toBe(!playingBefore);
    });

    it('has exactly 3 unique music tracks', () => {
      const tracks = audio.getMusicTracks();
      expect(tracks.length).toBe(3);
      const ids = new Set(tracks.map(t => t.id));
      expect(ids.size).toBe(3);
    });
  });
});
