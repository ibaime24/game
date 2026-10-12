// WebAudio synthesis: sound effects and generative music. No assets.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicMode = 'none';
    this.volume = { master: 0.8, sfx: 0.9, music: 0.45 };
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.volume.master;
    this.master.connect(c.destination);
    this.sfx = c.createGain();
    this.sfx.gain.value = this.volume.sfx;
    this.sfx.connect(this.master);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.volume.music;
    this.reverb = c.createConvolver();
    this.reverb.buffer = this._impulse(3.2, 2.2);
    const revGain = c.createGain();
    revGain.gain.value = 0.9;
    this.reverb.connect(revGain);
    revGain.connect(this.master);
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.sfxVerb = c.createGain();
    this.sfxVerb.gain.value = 0.25;
    this.sfxVerb.connect(this.reverb);
    this.noiseBuf = this._noise(2);
    this._scheduler();
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setVolumes(v) {
    Object.assign(this.volume, v);
    if (!this.ctx) return;
    this.master.gain.value = this.volume.master;
    this.sfx.gain.value = this.volume.sfx;
    this.musicBus.gain.value = this.volume.music;
  }

  _impulse(seconds, decay) {
    const c = this.ctx, len = c.sampleRate * seconds;
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _noise(seconds) {
    const c = this.ctx, len = c.sampleRate * seconds;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------- primitive voices
  _env(gainNode, t, a, peak, d, end = 0.0001) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.exponentialRampToValueAtTime(end, t + a + d);
  }

  _noiseHit({ t, dur = 0.2, freq = 1000, q = 1, type = 'bandpass', vol = 0.5, sweepTo = null, attack = 0.005, out = this.sfx, verb = 0 }) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    this._env(g, t, attack, vol, dur);
    src.connect(f); f.connect(g); g.connect(out);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.sfxVerb); }
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + attack + 0.05);
  }

  _tone({ t, freq, dur = 0.3, type = 'sine', vol = 0.3, attack = 0.005, slideTo = null, out = this.sfx, detune = 0, verb = 0 }) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain();
    this._env(g, t, attack, vol, dur);
    o.connect(g); g.connect(out);
    if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v); v.connect(this.sfxVerb); }
    o.start(t); o.stop(t + attack + dur + 0.05);
  }

  play(name, vol = 1) {
    if (!this.ctx || vol <= 0.01) return;
    const t = this.ctx.currentTime + 0.005;
    const v = vol;
    const r = Math.random;
    switch (name) {
      case 'swing': this._noiseHit({ t, dur: 0.18, freq: 900 + r() * 400, sweepTo: 300, q: 2, vol: 0.35 * v, attack: 0.03 }); break;
      case 'swingHeavy': this._noiseHit({ t, dur: 0.3, freq: 600, sweepTo: 180, q: 2, vol: 0.5 * v, attack: 0.05 }); break;
      case 'hit':
        this._noiseHit({ t, dur: 0.12, freq: 400, type: 'lowpass', vol: 0.8 * v });
        this._tone({ t, freq: 140, slideTo: 60, dur: 0.15, vol: 0.5 * v });
        break;
      case 'hitMetal':
        this._noiseHit({ t, dur: 0.25, freq: 3200, q: 6, vol: 0.4 * v, verb: 0.4 });
        this._tone({ t, freq: 1800 + r() * 300, dur: 0.4, type: 'triangle', vol: 0.15 * v, verb: 0.5 });
        this._tone({ t, freq: 2650, dur: 0.3, type: 'sine', vol: 0.08 * v });
        break;
      case 'block':
        this._noiseHit({ t, dur: 0.15, freq: 2000, q: 3, vol: 0.5 * v });
        this._tone({ t, freq: 900, dur: 0.25, type: 'square', vol: 0.06 * v, verb: 0.3 });
        break;
      case 'bowDraw': this._noiseHit({ t, dur: 0.5, freq: 300, sweepTo: 800, q: 8, vol: 0.12 * v, attack: 0.2 }); break;
      case 'bowShoot':
        this._tone({ t, freq: 220, slideTo: 90, dur: 0.12, type: 'triangle', vol: 0.4 * v });
        this._noiseHit({ t, dur: 0.15, freq: 2000, sweepTo: 600, q: 1, vol: 0.25 * v });
        break;
      case 'arrowHit': this._noiseHit({ t, dur: 0.08, freq: 1200, q: 2, vol: 0.4 * v }); this._tone({ t, freq: 300, slideTo: 150, dur: 0.08, vol: 0.2 * v }); break;
      case 'fireCast':
        this._noiseHit({ t, dur: 0.6, freq: 300, sweepTo: 1600, type: 'lowpass', vol: 0.5 * v, attack: 0.08 });
        this._tone({ t, freq: 110, slideTo: 220, dur: 0.5, type: 'sawtooth', vol: 0.06 * v });
        break;
      case 'explode':
        this._noiseHit({ t, dur: 0.9, freq: 1200, sweepTo: 80, type: 'lowpass', vol: 0.9 * v, verb: 0.5 });
        this._tone({ t, freq: 90, slideTo: 30, dur: 0.6, vol: 0.6 * v });
        break;
      case 'shockCast':
        for (let i = 0; i < 6; i++) this._tone({ t: t + i * 0.03, freq: 800 + r() * 2000, dur: 0.05, type: 'square', vol: 0.06 * v });
        this._noiseHit({ t, dur: 0.3, freq: 5000, q: 1, type: 'highpass', vol: 0.3 * v });
        break;
      case 'frostCast': this._noiseHit({ t, dur: 0.5, freq: 6000, sweepTo: 2000, q: 4, vol: 0.3 * v, verb: 0.5 }); this._tone({ t, freq: 1600, dur: 0.6, type: 'sine', vol: 0.08 * v, verb: 0.6 }); break;
      case 'heal':
        [0, 4, 7, 12].forEach((n, i) => this._tone({ t: t + i * 0.07, freq: NOTE(72 + n), dur: 0.8, type: 'sine', vol: 0.12 * v, verb: 0.8 }));
        break;
      case 'conjure':
        this._tone({ t, freq: 80, slideTo: 40, dur: 1.2, type: 'sawtooth', vol: 0.12 * v, verb: 0.8 });
        this._noiseHit({ t, dur: 1.0, freq: 200, sweepTo: 2000, q: 6, vol: 0.2 * v, verb: 0.8, attack: 0.3 });
        break;
      case 'spellGeneric':
        this._tone({ t, freq: 600, slideTo: 1200, dur: 0.35, type: 'triangle', vol: 0.12 * v, verb: 0.7 });
        this._noiseHit({ t, dur: 0.4, freq: 3000, q: 3, vol: 0.12 * v });
        break;
      case 'spellFail': this._tone({ t, freq: 200, slideTo: 90, dur: 0.3, type: 'square', vol: 0.1 * v }); break;
      case 'step': this._noiseHit({ t, dur: 0.07, freq: 300 + r() * 250, type: 'lowpass', vol: 0.18 * v }); break;
      case 'stepSnow': this._noiseHit({ t, dur: 0.11, freq: 2200 + r() * 800, sweepTo: 900, q: 0.8, vol: 0.16 * v, attack: 0.012 }); this._noiseHit({ t: t + 0.02, dur: 0.06, freq: 500, type: 'lowpass', vol: 0.1 * v }); break;
      case 'stepStone': this._noiseHit({ t, dur: 0.05, freq: 1400 + r() * 400, q: 1.5, vol: 0.14 * v }); this._tone({ t, freq: 120, dur: 0.04, vol: 0.08 * v }); break;
      case 'land': this._noiseHit({ t, dur: 0.15, freq: 250, type: 'lowpass', vol: 0.45 * v }); break;
      case 'torch': this._noiseHit({ t, dur: 0.55, freq: 380, sweepTo: 1100, q: 0.7, vol: 0.35 * v, attack: 0.06 }); this._noiseHit({ t: t + 0.05, dur: 0.3, freq: 2600, q: 2, vol: 0.08 * v }); break;
      case 'douse': this._noiseHit({ t, dur: 0.45, freq: 3200, sweepTo: 900, q: 0.9, vol: 0.22 * v, attack: 0.01 }); break;
      case 'splash': this._noiseHit({ t, dur: 0.4, freq: 1200, sweepTo: 400, q: 0.7, vol: 0.4 * v }); break;
      case 'pickup': this._tone({ t, freq: 520, dur: 0.08, type: 'triangle', vol: 0.18 * v }); this._noiseHit({ t, dur: 0.06, freq: 2500, q: 2, vol: 0.12 * v }); break;
      case 'gold': [0, 0.06, 0.11].forEach((d) => this._tone({ t: t + d, freq: 2400 + r() * 1200, dur: 0.12, type: 'sine', vol: 0.1 * v })); break;
      case 'door':
        this._noiseHit({ t, dur: 0.5, freq: 400, sweepTo: 200, q: 6, vol: 0.3 * v, attack: 0.1 });
        this._tone({ t: t + 0.45, freq: 70, dur: 0.15, vol: 0.4 * v });
        break;
      case 'chest': this._noiseHit({ t, dur: 0.3, freq: 600, sweepTo: 300, q: 4, vol: 0.3 * v }); this._tone({ t: t + 0.25, freq: 120, dur: 0.1, vol: 0.2 * v }); break;
      case 'lockClick': this._tone({ t, freq: 3000, dur: 0.03, type: 'square', vol: 0.12 * v }); break;
      case 'lockSet': this._tone({ t, freq: 1800, dur: 0.06, type: 'square', vol: 0.15 * v }); this._noiseHit({ t, dur: 0.05, freq: 4000, q: 3, vol: 0.2 * v }); break;
      case 'lockBreak': this._noiseHit({ t, dur: 0.12, freq: 5000, q: 8, vol: 0.4 * v }); this._tone({ t, freq: 2500, slideTo: 1200, dur: 0.1, type: 'square', vol: 0.1 * v }); break;
      case 'unlock': this._tone({ t, freq: 900, dur: 0.06, type: 'square', vol: 0.12 * v }); this._tone({ t: t + 0.08, freq: 1300, dur: 0.1, type: 'square', vol: 0.12 * v }); break;
      case 'drink': for (let i = 0; i < 3; i++) this._noiseHit({ t: t + i * 0.16, dur: 0.1, freq: 500, q: 8, vol: 0.25 * v }); break;
      case 'eat': for (let i = 0; i < 3; i++) this._noiseHit({ t: t + i * 0.13, dur: 0.07, freq: 1500, q: 1, vol: 0.2 * v }); break;
      case 'ui': this._tone({ t, freq: 880, dur: 0.05, type: 'triangle', vol: 0.06 * v }); break;
      case 'uiOpen': this._noiseHit({ t, dur: 0.25, freq: 1800, sweepTo: 600, q: 1, vol: 0.12 * v, attack: 0.04 }); break;
      case 'skillUp':
        [67, 71, 74, 79].forEach((n, i) => this._tone({ t: t + i * 0.09, freq: NOTE(n), dur: 0.9, type: 'triangle', vol: 0.09 * v, verb: 0.8 }));
        break;
      case 'levelUp':
        [55, 62, 67, 71, 74, 79].forEach((n, i) => this._tone({ t: t + i * 0.12, freq: NOTE(n), dur: 1.8, type: 'sawtooth', vol: 0.05 * v, verb: 1 }));
        [43, 50].forEach((n) => this._tone({ t, freq: NOTE(n), dur: 2.4, type: 'sine', vol: 0.2 * v, verb: 0.8 }));
        break;
      case 'quest':
        [60, 64, 67, 72].forEach((n, i) => this._tone({ t: t + i * 0.18, freq: NOTE(n), dur: 1.4, type: 'triangle', vol: 0.08 * v, verb: 1 }));
        break;
      case 'discover':
        [62, 69, 74].forEach((n, i) => this._tone({ t: t + i * 0.25, freq: NOTE(n), dur: 2.2, type: 'sine', vol: 0.12 * v, verb: 1 }));
        break;
      case 'hurt': this._tone({ t, freq: 220 + r() * 40, slideTo: 140, dur: 0.18, type: 'sawtooth', vol: 0.12 * v }); this._noiseHit({ t, dur: 0.12, freq: 800, q: 1, vol: 0.2 * v }); break;
      case 'die': this._tone({ t, freq: 200, slideTo: 60, dur: 0.8, type: 'sawtooth', vol: 0.15 * v }); break;
      case 'growl': this._noiseHit({ t, dur: 0.6, freq: 180, q: 3, vol: 0.5 * v, attack: 0.1 }); this._tone({ t, freq: 70, slideTo: 90, dur: 0.6, type: 'sawtooth', vol: 0.1 * v }); break;
      case 'roar': this._noiseHit({ t, dur: 1.0, freq: 300, sweepTo: 120, q: 2, vol: 0.6 * v, attack: 0.15, verb: 0.5 }); this._tone({ t, freq: 55, slideTo: 45, dur: 1, type: 'sawtooth', vol: 0.18 * v }); break;
      case 'rattle': for (let i = 0; i < 6; i++) this._noiseHit({ t: t + i * 0.05 + r() * 0.02, dur: 0.03, freq: 2500 + r() * 2000, q: 5, vol: 0.2 * v }); break;
      case 'crab': for (let i = 0; i < 4; i++) this._noiseHit({ t: t + i * 0.07, dur: 0.03, freq: 3500, q: 6, vol: 0.2 * v }); break;
      case 'grunt': this._tone({ t, freq: 140 + r() * 40, slideTo: 100, dur: 0.15, type: 'sawtooth', vol: 0.1 * v }); break;
      case 'portal':
        this._tone({ t, freq: 50, slideTo: 40, dur: 3, type: 'sawtooth', vol: 0.2 * v, verb: 1, attack: 0.5 });
        this._noiseHit({ t, dur: 3, freq: 200, sweepTo: 1200, q: 3, vol: 0.4 * v, attack: 0.8, verb: 1 });
        break;
      case 'gateClose':
        this._noiseHit({ t, dur: 4, freq: 3000, sweepTo: 60, type: 'lowpass', vol: 1 * v, attack: 0.2, verb: 1 });
        this._tone({ t, freq: 40, dur: 4, type: 'sawtooth', vol: 0.3 * v, verb: 1 });
        break;
      case 'crime':
        [64, 63].forEach((n, i) => this._tone({ t: t + i * 0.2, freq: NOTE(n), dur: 0.4, type: 'square', vol: 0.06 * v }));
        break;
      case 'lute': {
        // a plucked phrase: arpeggio and a little run
        const notes = [64, 67, 71, 76, 74, 71, 72, 69];
        notes.forEach((n, i) => {
          this._tone({ t: t + i * 0.16, freq: NOTE(n), dur: 0.5, type: 'triangle', vol: 0.12 * v, attack: 0.003, verb: 0.3 });
          this._tone({ t: t + i * 0.16, freq: NOTE(n + 12), dur: 0.2, type: 'sine', vol: 0.03 * v, attack: 0.002 });
        });
        break;
      }
      case 'luteBad': {
        // the same phrase, slightly out of tune, ending on a wrong note
        [64, 67, 71, 76, 75, 70, 71, 66].forEach((n, i) => this._tone({ t: t + i * 0.18, freq: NOTE(n) * (1 + (r() - 0.5) * 0.03), dur: 0.5, type: 'triangle', vol: 0.12 * v, attack: 0.003, verb: 0.3 }));
        this._tone({ t: t + 1.5, freq: NOTE(61), dur: 0.8, type: 'sawtooth', vol: 0.04 * v });
        break;
      }
      case 'nirnroot':
        // the eerie chime of a nirnroot
        [88, 95, 91, 100].forEach((n, i) => this._tone({ t: t + i * 0.09, freq: NOTE(n), dur: 1.6, type: 'sine', vol: 0.05 * v, verb: 0.9, attack: 0.02 }));
        break;
      case 'thunder':
        this._noiseHit({ t, dur: 3.5, freq: 260, sweepTo: 40, type: 'lowpass', vol: 1.2 * v, attack: 0.08, verb: 0.8 });
        this._noiseHit({ t: t + 0.3, dur: 2.2, freq: 140, type: 'lowpass', vol: 0.8 * v, attack: 0.3, verb: 0.6 });
        break;
      case 'chime':
        [84, 88, 91].forEach((n, i) => this._tone({ t: t + i * 0.12, freq: NOTE(n), dur: 1.2, type: 'sine', vol: 0.07 * v, verb: 0.8 }));
        break;
      case 'meow': {
        const f = 650 + r() * 250;
        this._tone({ t, freq: f * 0.8, slideTo: f * 1.25, dur: 0.16, type: 'triangle', vol: 0.11 * v, attack: 0.03 });
        this._tone({ t: t + 0.15, freq: f * 1.25, slideTo: f * 0.7, dur: 0.32, type: 'triangle', vol: 0.1 * v });
        break;
      }
      case 'purr': for (let i = 0; i < 14; i++) this._noiseHit({ t: t + i * 0.05, dur: 0.05, freq: 140, type: 'lowpass', vol: 0.22 * v * (i % 2 ? 0.6 : 1), attack: 0.01 }); break;
      case 'shipBell': [0, 0.55].forEach((d) => { this._tone({ t: t + d, freq: 523, dur: 2.4, type: 'sine', vol: 0.16 * v, verb: 0.9 }); this._tone({ t: t + d, freq: 1318, dur: 1.4, type: 'sine', vol: 0.05 * v, verb: 0.9 }); }); break;
    }
  }

  /** Continuous rain hiss (0 = off). Indoors pass a muffled level. */
  setRain(level, muffled = false) {
    if (!this.ctx) return;
    if (!this.rain) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfx);
      src.start();
      this.rain = { g, lp };
    }
    const now = this.ctx.currentTime;
    this.rain.g.gain.setTargetAtTime(level * 0.16, now, 0.8);
    this.rain.lp.frequency.setTargetAtTime(muffled ? 700 : 5000, now, 0.5);
  }

  // ---------- music
  setMusic(mode) {
    if (mode === this.musicMode) return;
    this.musicMode = mode;
    this.nextChordAt = 0; // change immediately
  }

  _scheduler() {
    const c = this.ctx;
    this.nextChordAt = 0;
    this.chordIndex = 0;
    this.beat = 0;
    const PROG = {
      explore: { root: 50, chords: [[0, 7, 12, 16], [5, 12, 17, 21], [-3, 4, 9, 12], [2, 9, 14, 17], [0, 7, 12, 16], [-5, 2, 7, 11], [5, 9, 12, 17], [7, 11, 14, 19]], len: 4.8, scale: [0, 2, 4, 7, 9, 12, 14, 16, 19] },
      night: { root: 45, chords: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [-7, 0, 5, 8]], len: 6.4, scale: [0, 3, 5, 7, 10, 12, 15] },
      dungeon: { root: 38, chords: [[0, 7, 13], [0, 6, 12], [-1, 6, 11], [0, 7, 15]], len: 7, scale: [0, 1, 3, 6, 7] },
      combat: { root: 45, chords: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [-5, 2, 7, 10]], len: 2.4, scale: [0, 3, 5, 7, 10, 12] },
      oblivion: { root: 36, chords: [[0, 6, 13], [1, 7, 12], [0, 3, 6, 11], [-1, 5, 10]], len: 4.0, scale: [0, 1, 6, 7, 11] },
      title: { root: 45, chords: [[0, 7, 12, 16, 19], [-3, 4, 9, 12, 16], [5, 12, 17, 21], [7, 14, 19, 23]], len: 5.2, scale: [0, 2, 4, 7, 9, 12, 16] },
    };
    const tick = () => {
      if (!this.ctx) return;
      const now = c.currentTime;
      const P = PROG[this.musicMode];
      if (P && now + 0.2 >= this.nextChordAt) {
        const t = Math.max(now + 0.05, this.nextChordAt);
        const chord = P.chords[this.chordIndex % P.chords.length];
        this.chordIndex++;
        const len = P.len;
        // pad
        chord.forEach((n, i) => this._pad(t, NOTE(P.root + n), len * 1.15, this.musicMode === 'combat' ? 0.03 : 0.035, i));
        // bass
        this._padBass(t, NOTE(P.root + chord[0] - 12), len, this.musicMode === 'combat' ? 0.09 : 0.06);
        // melody
        if (this.musicMode !== 'combat') {
          const notes = 1 + Math.floor(Math.random() * 3);
          for (let k = 0; k < notes; k++) {
            if (Math.random() < 0.65) {
              const n = P.scale[Math.floor(Math.random() * P.scale.length)];
              this._lead(t + (k * len) / notes + Math.random() * 0.2, NOTE(P.root + 12 + n), len / notes * 1.4, this.musicMode === 'title' ? 0.05 : 0.035);
            }
          }
        } else {
          // war drums
          const beats = 8;
          for (let k = 0; k < beats; k++) {
            const bt = t + (k * len) / beats;
            if (k % 2 === 0 || Math.random() < 0.3) this._drum(bt, k % 4 === 0 ? 1 : 0.6);
          }
          if (Math.random() < 0.7) {
            const n = P.scale[Math.floor(Math.random() * P.scale.length)];
            this._brass(t + len / 2, NOTE(P.root + 12 + n), len / 2);
          }
        }
        this.nextChordAt = t + len;
      }
      setTimeout(tick, 100);
    };
    tick();
  }

  _pad(t, f, dur, vol, i) {
    const c = this.ctx;
    const g = c.createGain();
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 900 + i * 200; filt.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(vol * 0.8, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    filt.connect(g); g.connect(this.musicBus);
    for (const det of [-8, 7]) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(filt); o.start(t); o.stop(t + dur + 0.1);
    }
  }

  _padBass(t, f, dur, vol) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + dur + 0.1);
  }

  _lead(t, f, dur, vol) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const lfo = c.createOscillator(); lfo.frequency.value = 5;
    const lg = c.createGain(); lg.gain.value = f * 0.006;
    lfo.connect(lg); lg.connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.musicBus);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }

  _brass(t, f, dur) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.setValueAtTime(400, t); filt.frequency.linearRampToValueAtTime(1800, t + 0.15); filt.frequency.linearRampToValueAtTime(700, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(filt); filt.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + dur + 0.1);
  }

  _drum(t, vol) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.6);
    this._noiseHit({ t, dur: 0.15, freq: 200, type: 'lowpass', vol: 0.15 * vol, out: this.musicBus });
  }
}
