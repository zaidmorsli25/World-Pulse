/**
 * Original, synthesized sound effects and ambient music (Web Audio API). No audio files or
 * third-party recordings are used, so there are no licensing concerns.
 */
type Sfx = "click" | "coin" | "correct" | "wrong" | "levelup" | "open" | "close" | "purchase" | "achievement";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  sfxOn = true;
  musicOn = false;
  sfxVolume = 0.6;
  musicVolume = 0.35;

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.apply();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  configure(o: { sfxOn: boolean; musicOn: boolean; sfxVolume: number; musicVolume: number }) {
    Object.assign(this, o);
    this.apply();
    if (this.musicOn && this.ctx) this.startMusic();
    if (!this.musicOn) this.stopMusic();
  }

  private apply() {
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxOn ? this.sfxVolume * 0.5 : 0;
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this.musicVolume * 0.18 : 0;
  }

  private tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.5) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(this.sfxGain!);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  play(name: Sfx) {
    if (!this.sfxOn) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case "click":
        this.tone(660, t, 0.07, "triangle", 0.25);
        break;
      case "open":
        this.tone(440, t, 0.09, "sine", 0.25);
        this.tone(660, t + 0.06, 0.12, "sine", 0.2);
        break;
      case "close":
        this.tone(520, t, 0.08, "sine", 0.18);
        this.tone(390, t + 0.05, 0.1, "sine", 0.15);
        break;
      case "coin":
        this.tone(988, t, 0.09, "square", 0.12);
        this.tone(1319, t + 0.07, 0.25, "square", 0.12);
        break;
      case "purchase":
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, t + i * 0.06, 0.2, "triangle", 0.25));
        break;
      case "correct":
        this.tone(659, t, 0.14, "sine", 0.35);
        this.tone(831, t + 0.09, 0.14, "sine", 0.35);
        this.tone(988, t + 0.18, 0.3, "sine", 0.35);
        break;
      case "wrong":
        this.tone(220, t, 0.18, "triangle", 0.3);
        this.tone(196, t + 0.12, 0.25, "triangle", 0.25);
        break;
      case "achievement":
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * 0.07, 0.35, "triangle", 0.25));
        break;
      case "levelup":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, 0.4, "square", 0.12));
        [1047, 1319, 1568].forEach((f) => this.tone(f, t + 0.5, 0.9, "sine", 0.18));
        break;
    }
  }

  /** Slow, generative strategy-game pad: drifting minor chords through a low-pass filter. */
  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer) return;
    const chords = [
      [146.83, 220, 293.66, 349.23],
      [130.81, 196, 261.63, 329.63],
      [116.54, 174.61, 233.08, 293.66],
      [110, 164.81, 220, 277.18],
    ];
    let i = 0;
    const playChord = () => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.linearRampToValueAtTime(1100, t + 4);
      filter.frequency.linearRampToValueAtTime(450, t + 8);
      filter.connect(this.musicGain);
      for (const f of chords[i % chords.length]) {
        for (const detune of [-6, 6]) {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = "sawtooth";
          o.frequency.value = f;
          o.detune.value = detune;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.06, t + 2.5);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 8.5);
          o.connect(g).connect(filter);
          o.start(t);
          o.stop(t + 9);
        }
      }
      // soft pulse
      for (let k = 0; k < 4; k++) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "sine";
        o.frequency.value = chords[i % chords.length][0] / 2;
        g.gain.setValueAtTime(0.0001, t + k * 2);
        g.gain.exponentialRampToValueAtTime(0.12, t + k * 2 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + k * 2 + 1.2);
        o.connect(g).connect(this.musicGain);
        o.start(t + k * 2);
        o.stop(t + k * 2 + 1.3);
      }
      i++;
    };
    playChord();
    this.musicTimer = setInterval(playChord, 8000);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}

export const sound = new SoundEngine();
