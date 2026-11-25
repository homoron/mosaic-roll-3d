// Background soundtrack player («The vale path» by Umbría) with Web Audio API
// underwater/muffled lowpass filtering when entering the workshop (bazaar & kiln).

const TRACK_URL = './musica-umbria.mp3?v=esmaltes-30';

const MOODS = {
  title: { cutoff: 18000, q: 0.7, gain: 0.75 },
  play: { cutoff: 18000, q: 0.7, gain: 0.68 },
  boss: { cutoff: 18000, q: 0.7, gain: 0.78 },
  shop: { cutoff: 520, q: 1.35, gain: 1.05 },
};

export class Music {
  constructor(context, destination = context.destination) {
    this.context = context;
    this.volume = 0.6;
    this.mood = 'title';
    this.running = false;
    this.woundDown = false;
    this.pauseTimer = null;
    this.rampTimer = null;

    this.audio = new Audio(TRACK_URL);
    this.audio.loop = true;
    this.audio.preload = 'auto';

    // Cascaded 24 dB/oct lowpass filters produce a smooth submerged effect in the shop and kiln.
    this.filterA = context.createBiquadFilter();
    this.filterA.type = 'lowpass';
    this.filterA.frequency.value = MOODS.title.cutoff;
    this.filterA.Q.value = MOODS.title.q;

    this.filterB = context.createBiquadFilter();
    this.filterB.type = 'lowpass';
    this.filterB.frequency.value = MOODS.title.cutoff;
    this.filterB.Q.value = 0.7;

    this.moodGain = context.createGain();
    this.moodGain.gain.value = MOODS.title.gain;

    this.master = context.createGain();
    this.master.gain.value = 0;

    this.source = context.createMediaElementSource(this.audio);
    this.source
      .connect(this.filterA)
      .connect(this.filterB)
      .connect(this.moodGain)
      .connect(this.master)
      .connect(destination);
  }

  get paused() {
    return this.audio.paused;
  }

  setMood(mood) {
    if (!MOODS[mood]) return;
    const prevMood = this.mood;
    this.mood = mood;
    const settings = MOODS[mood];
    const now = this.context.currentTime;
    const duration = mood === 'shop' ? 0.9 : 1.15;
    for (const [param, target, exp] of [
      [this.filterA.frequency, settings.cutoff, true],
      [this.filterB.frequency, settings.cutoff, true],
      [this.filterA.Q, settings.q, false],
      [this.moodGain.gain, settings.gain, false],
    ]) {
      const current = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(exp ? Math.max(20, current) : current, now);
      if (prevMood === mood && Math.abs(current - target) < 0.01) {
        param.setValueAtTime(target, now);
      } else if (exp) {
        // Logarithmic ramp so rising from 520 Hz -> 18 kHz sweeps evenly in octaves instead of jumping at t=0.
        param.exponentialRampToValueAtTime(Math.max(20, target), now + duration);
      } else {
        param.linearRampToValueAtTime(target, now + duration);
      }
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.running) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.volume, now, 0.08);
    }
  }

  setPitchLock(preserve) {
    if ('preservesPitch' in this.audio) this.audio.preservesPitch = preserve;
    if ('mozPreservesPitch' in this.audio) this.audio.mozPreservesPitch = preserve;
    if ('webkitPreservesPitch' in this.audio) this.audio.webkitPreservesPitch = preserve;
  }

  clearRamp() {
    clearTimeout(this.rampTimer);
    this.rampTimer = null;
  }

  windDown(duration = 1.9) {
    clearTimeout(this.pauseTimer);
    this.clearRamp();
    if (!this.running && this.audio.paused) return;
    this.running = false;
    this.woundDown = true;
    const now = this.context.currentTime;
    const startRate = this.audio.playbackRate || 1;
    const endRate = 0.22;
    this.setPitchLock(false);

    // Darken tone slightly and fade master gain while turntable speed drops cleanly to a halt.
    for (const filter of [this.filterA, this.filterB]) {
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(Math.max(20, filter.frequency.value), now);
      filter.frequency.exponentialRampToValueAtTime(280, now + duration);
    }
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.setValueAtTime(this.master.gain.value, now + duration * 0.45);
    this.master.gain.linearRampToValueAtTime(0, now + duration);

    const started = performance.now();
    const ms = duration * 1000;
    const step = () => {
      if (!this.woundDown) return;
      const t = Math.min(1, (performance.now() - started) / ms);
      const eased = 1 - Math.pow(1 - t, 1.8);
      this.audio.playbackRate = startRate + (endRate - startRate) * eased;
      if (t < 1) {
        this.rampTimer = setTimeout(step, 30);
      } else {
        this.rampTimer = null;
        if (!this.running) {
          this.audio.pause();
          this.audio.playbackRate = 1;
          this.setPitchLock(true);
        }
      }
    };
    this.rampTimer = setTimeout(step, 30);
  }

  start() {
    clearTimeout(this.pauseTimer);
    this.clearRamp();
    if (this.woundDown) {
      this.woundDown = false;
      this.audio.currentTime = 0;
    }
    this.audio.playbackRate = 1;
    this.setPitchLock(true);
    this.running = true;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.volume, now, 0.45);
    this.setMood(this.mood);
    if (this.audio.paused) {
      this.audio.play().catch(() => {});
    }
  }

  stop() {
    clearTimeout(this.pauseTimer);
    this.clearRamp();
    this.woundDown = false;
    this.audio.playbackRate = 1;
    this.setPitchLock(true);
    if (!this.running && this.audio.paused) return;
    this.running = false;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0, now, 0.25);
    this.pauseTimer = setTimeout(() => {
      if (!this.running && !this.audio.paused) this.audio.pause();
    }, 350);
  }
}
