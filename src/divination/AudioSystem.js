/**
 * src/divination/AudioSystem.js — 月下问树 WebAudio 氛围系统（纯合成，无音频素材）
 *
 * docs/03 §10：
 *  - 环境底噪：夜虫、很远的风、草木摩擦
 *  - 三层风：远处低频风 / 中距离树叶摩擦 / 近处树冠沙沙
 *  - 卦叶落地：三片声音略不同
 *  - 爻生成：极低频石头共鸣（非钟声）
 *
 * 浏览器要求用户手势后才能出声，因此由 cast.js 在首次点击时 init()。
 */
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.wind = null;
    this.muted = false;
    this._cricketTimer = null;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch (e) { /* noop */ } }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.85;
    master.connect(ctx.destination);
    this.master = master;

    this.noise = this._brownNoise(ctx, 2.5);
    this._buildWind();
    this._buildCrickets();
    this._buildRustle();

    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) { /* noop */ } }
  }

  _brownNoise(ctx, sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    return buf;
  }

  _loop() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    return s;
  }

  _buildWind() {
    const ctx = this.ctx;
    const far = this._loop();
    const farLp = ctx.createBiquadFilter(); farLp.type = 'lowpass'; farLp.frequency.value = 240; farLp.Q.value = 0.6;
    const farG = ctx.createGain(); farG.gain.value = 0.10;
    far.connect(farLp).connect(farG).connect(this.master);
    far.start();

    const mid = this._loop();
    const midBp = ctx.createBiquadFilter(); midBp.type = 'bandpass'; midBp.frequency.value = 1300; midBp.Q.value = 0.7;
    const midG = ctx.createGain(); midG.gain.value = 0.020;
    mid.connect(midBp).connect(midG).connect(this.master);
    mid.start();

    const near = this._loop();
    const nearHp = ctx.createBiquadFilter(); nearHp.type = 'highpass'; nearHp.frequency.value = 3400;
    const nearG = ctx.createGain(); nearG.gain.value = 0.006;
    near.connect(nearHp).connect(nearG).connect(this.master);
    near.start();

    this.wind = { farG, midG, nearG };
  }

  _buildRustle() {
    const ctx = this.ctx;
    const s = this._loop();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.012;
    s.connect(bp).connect(g).connect(this.master);
    s.start();
    this.rustleG = g;
  }

  _buildCrickets() {
    const ctx = this.ctx;
    const bus = ctx.createGain(); bus.gain.value = 0.6; bus.connect(this.master);
    const chirp = () => {
      if (!this.ctx) return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine';
      const f = 3600 + Math.random() * 1400;
      o.frequency.setValueAtTime(f, t0);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      for (let i = 0; i < 3; i++) {
        const tt = t0 + i * 0.075;
        env.gain.setValueAtTime(0.0001, tt);
        env.gain.linearRampToValueAtTime(0.010, tt + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
      }
      o.connect(env).connect(bus);
      o.start(t0);
      o.stop(t0 + 0.3);
      this._cricketTimer = setTimeout(chirp, 1400 + Math.random() * 3600);
    };
    this._cricketTimer = setTimeout(chirp, 900 + Math.random() * 1800);
  }

  /** 问卦时三层风同时涌起，再缓慢回落 */
  windSwell(peak = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const ramp = (p, v, a, d) => {
      p.cancelScheduledValues(t);
      p.setValueAtTime(p.value, t);
      p.linearRampToValueAtTime(v, t + a);
      p.linearRampToValueAtTime(Math.max(0.0001, v * 0.14), t + a + d);
    };
    ramp(this.wind.farG.gain, 0.10 + 0.17 * peak, 0.5, 2.6);
    ramp(this.wind.midG.gain, 0.020 + 0.05 * peak, 0.6, 2.6);
    ramp(this.wind.nearG.gain, 0.006 + 0.028 * peak, 0.7, 2.4);
    ramp(this.rustleG.gain, 0.012 + 0.03 * peak, 0.5, 2.2);
  }

  /** 卦叶落地：三片声音略不同 */
  leafLand(i = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = 850 + i * 260 + Math.random() * 180;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045 + i * 0.014, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    s.connect(lp).connect(g).connect(this.master);
    s.start(t); s.stop(t + 0.24);
  }

  /** 爻生成：极低频石头共鸣 */
  stoneResonate() {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.linearRampToValueAtTime(0.085, t + 0.035);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    bus.connect(this.master);
    [63, 96, 147].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.012);
      const og = ctx.createGain(); og.gain.value = 0.7 / (i + 1);
      o.connect(og).connect(bus);
      o.start(t); o.stop(t + 1.5);
    });
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170;
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.05, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    s.connect(lp).connect(sg).connect(this.master);
    s.start(t); s.stop(t + 0.36);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.master || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(m ? 0 : 0.85, t + 0.18);
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') { try { this.ctx.suspend(); } catch (e) { /* noop */ } } }
  resume() { if (this.ctx && this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* noop */ } } }

  dispose() {
    if (this._cricketTimer) clearTimeout(this._cricketTimer);
    this._cricketTimer = null;
    if (this.ctx) { try { this.ctx.close(); } catch (e) { /* noop */ } }
    this.ctx = null;
  }
}
