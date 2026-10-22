import type { NoiseColor } from '@/lib/audio/noise';
import {
  buildSoundscape,
  createNoiseBuffers,
  type SoundscapeHandle,
  type SoundscapeId,
} from '@/lib/audio/soundscapes';
import { breathTone, strikeBell } from '@/lib/audio/voices';

/**
 * Owns the single AudioContext for the app and the graph hanging off it.
 *
 * Everything is created lazily on the first user gesture, because browsers
 * will not let an AudioContext start without one. Soundscapes crossfade
 * rather than cutting, and a compressor sits on the master bus so layered
 * scapes and struck bells can never clip.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buffers: Record<NoiseColor, AudioBuffer> | null = null;
  private current: { id: SoundscapeId; handle: SoundscapeHandle } | null = null;
  private music: {
    src: string;
    element: HTMLAudioElement;
    gain: GainNode;
    pauseTimer: number;
  } | null = null;

  private volume = 0.7;
  private muted = false;

  /** Creates the context and master chain. Safe to call repeatedly. */
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;

    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    // iOS treats Web Audio as "ambient" by default, which the ring/silent
    // switch mutes outright. Declaring playback makes it behave like media.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = 'playback';
      } catch {
        // Older WebKit — nothing to do.
      }
    }

    const ctx = new Ctor();

    // Soft limiting, so a bell landing on a full scape stays clean.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.25;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    // Everything routes through `bus` so one-shots and scapes share the master.
    const bus = ctx.createGain();
    bus.gain.value = 1;

    bus.connect(limiter).connect(master).connect(analyser).connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.bus = bus;
    this.analyser = analyser;
    this.buffers = createNoiseBuffers(ctx);

    return ctx;
  }

  /** Must be called from a user gesture before anything will be audible. */
  async resume(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx) return false;
    // `suspended` before the first gesture, and `interrupted` on iOS after a
    // call, Siri or backgrounding the app — both need resuming.
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    return ctx.state === 'running';
  }

  get isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext,
    );
  }

  get playingId(): SoundscapeId | null {
    return this.current?.id ?? null;
  }

  /** Crossfades to `id`. Calling it with the scape already playing is a no-op. */
  play(id: SoundscapeId): void {
    const ctx = this.ensure();
    if (!ctx || !this.bus || !this.buffers) return;
    if (this.current?.id === id) return;

    this.current?.handle.stop(0.7);
    this.current = { id, handle: buildSoundscape(id, ctx, this.bus, this.buffers) };
  }

  stop(fadeSeconds = 0.8): void {
    this.current?.handle.stop(fadeSeconds);
    this.current = null;
  }

  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, value));
    if (!this.master || !this.ctx) return;
    const at = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(at);
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, at, 0.04);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.setVolume(this.volume);
  }

  /**
   * Rides the master down to silence over `seconds` — used by the sleep timer
   * so a wind-down ends by fading out rather than stopping dead.
   */
  fadeOut(seconds: number): void {
    if (!this.master || !this.ctx) return;
    const at = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(at);
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), at);
    this.master.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  }

  /**
   * Loops a music file under whatever else is playing, faded in to `level`.
   * Routed through the bus so the app's volume and limiter apply to it too,
   * and so its level can be ramped — iOS ignores an audio element's own
   * volume. Calling it again with the same file just brings it back up.
   */
  playMusic(src: string, level = 0.5, fadeSeconds = 3): void {
    const ctx = this.ensure();
    if (!ctx || !this.bus) return;

    if (this.music?.src !== src) {
      this.stopMusic(0.6);
      const element = new Audio(src);
      element.loop = true;
      element.preload = 'auto';
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(element).connect(gain).connect(this.bus);
      this.music = { src, element, gain, pauseTimer: 0 };
    }

    const { element, gain } = this.music;
    window.clearTimeout(this.music.pauseTimer);
    void element.play().catch(() => undefined);
    const at = ctx.currentTime;
    gain.gain.cancelScheduledValues(at);
    gain.gain.setValueAtTime(gain.gain.value, at);
    gain.gain.linearRampToValueAtTime(level, at + fadeSeconds);
  }

  /** Fades the music out and holds its place, for a pause. */
  pauseMusic(fadeSeconds = 0.8): void {
    if (!this.music || !this.ctx) return;
    const music = this.music;
    const at = this.ctx.currentTime;
    music.gain.gain.cancelScheduledValues(at);
    music.gain.gain.setValueAtTime(music.gain.gain.value, at);
    music.gain.gain.linearRampToValueAtTime(0, at + fadeSeconds);
    window.clearTimeout(music.pauseTimer);
    music.pauseTimer = window.setTimeout(() => music.element.pause(), fadeSeconds * 1000 + 50);
  }

  /** Fades the music out and lets it go. */
  stopMusic(fadeSeconds = 2): void {
    if (!this.music || !this.ctx) return;
    const music = this.music;
    this.music = null;
    const at = this.ctx.currentTime;
    music.gain.gain.cancelScheduledValues(at);
    music.gain.gain.setValueAtTime(music.gain.gain.value, at);
    music.gain.gain.linearRampToValueAtTime(0, at + fadeSeconds);
    window.clearTimeout(music.pauseTimer);
    window.setTimeout(() => {
      music.element.pause();
      music.element.removeAttribute('src');
      music.element.load();
      music.gain.disconnect();
    }, fadeSeconds * 1000 + 50);
  }

  /** A single struck bell — session complete, or the end of a wind-down. */
  bell(frequency = 523.25): void {
    const ctx = this.ensure();
    if (!ctx || !this.bus) return;
    strikeBell(ctx, this.bus, { frequency, gain: 0.16, decay: 7 });
  }

  /** The cue tone at the top of an inhale or an exhale. */
  breathCue(direction: 'in' | 'out'): void {
    const ctx = this.ensure();
    if (!ctx || !this.bus) return;
    breathTone(ctx, this.bus, {
      frequency: direction === 'in' ? 528 : 396,
      gain: direction === 'in' ? 0.05 : 0.042,
      duration: direction === 'in' ? 0.9 : 1.1,
    });
  }

  /** Exposed for level metering and for the automated audio checks. */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  dispose(): void {
    this.stop(0.05);
    this.stopMusic(0.05);
    window.setTimeout(() => {
      void this.ctx?.close();
      this.ctx = null;
      this.master = null;
      this.bus = null;
      this.analyser = null;
      this.buffers = null;
    }, 200);
  }
}

/** One engine per document. */
export const audioEngine = new AudioEngine();

// A handle for local debugging and the automated audio checks. Stripped from
// production builds by the NODE_ENV guard.
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as { __serenityAudio?: AudioEngine }).__serenityAudio = audioEngine;
}
