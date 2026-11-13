import type { NoiseColor } from '@/lib/audio/noise';
import {
  buildSoundscape,
  createNoiseBuffers,
  type SoundscapeHandle,
  type SoundscapeId,
} from '@/lib/audio/soundscapes';
import { breathTone, strikeBell } from '@/lib/audio/voices';

/** How far music drops while a voice speaks over it: to 30%, about 10 dB down. */
export const MUSIC_DUCK = 0.3;

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
    /** The level it was asked to play at, and whether a voice has it ducked. */
    level: number;
    ducked: boolean;
  } | null = null;

  private volume = 0.7;
  private muted = false;
  private interruptionListeners = new Set<() => void>();

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

    // Nothing in the app suspends the context, so leaving `running` with sound
    // on means something else took it: a call, Siri, or the OS freezing the app.
    ctx.onstatechange = () => {
      if (ctx.state === 'running' || ctx.state === 'closed' || !this.isSounding) return;
      this.interruptionListeners.forEach((listener) => listener());
    };

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

  /** True while a soundscape or music is meant to be audible. */
  get isSounding(): boolean {
    return this.current !== null || this.music !== null;
  }

  /**
   * Seconds on the audio hardware's clock while something is meant to be
   * audible, or null. It only moves when sound is really going out, which is how
   * a frozen app can be told from one whose timers were merely throttled.
   */
  get soundClock(): number | null {
    return this.isSounding && this.ctx ? this.ctx.currentTime : null;
  }

  /** Calls `listener` when sound is cut off from outside. Returns the teardown. */
  onInterrupted(listener: () => void): () => void {
    this.interruptionListeners.add(listener);
    return () => {
      this.interruptionListeners.delete(listener);
    };
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
      this.music = { src, element, gain, pauseTimer: 0, level, ducked: false };
    }

    const { element, gain } = this.music;
    this.music.level = level;
    window.clearTimeout(this.music.pauseTimer);
    void element.play().catch(() => undefined);
    const at = ctx.currentTime;
    const target = this.music.ducked ? level * MUSIC_DUCK : level;
    gain.gain.cancelScheduledValues(at);
    gain.gain.setValueAtTime(gain.gain.value, at);
    gain.gain.linearRampToValueAtTime(target, at + fadeSeconds);
  }

  /**
   * Lowers the music under a voice (`true`) and brings it back (`false`): a
   * quick dip as the voice starts, a slower return once it has finished, the
   * way a radio presenter talks over a record.
   */
  duckMusic(ducked: boolean): void {
    if (!this.music || !this.ctx || this.music.ducked === ducked) return;
    const music = this.music;
    music.ducked = ducked;
    if (music.element.paused) return;
    const at = this.ctx.currentTime;
    const target = ducked ? music.level * MUSIC_DUCK : music.level;
    music.gain.gain.cancelScheduledValues(at);
    music.gain.gain.setValueAtTime(music.gain.gain.value, at);
    music.gain.gain.linearRampToValueAtTime(target, at + (ducked ? 0.35 : 1.2));
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
