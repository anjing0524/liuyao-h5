/**
 * src/divination/DivinationLeaf.js — 卦叶实体 v2（docs/04 §8/§9）
 *
 * 独立 Sprite；运动 = 贝塞尔主轨迹 + sin 横摆 + 噪声 + 角速度。
 * 翻面 = scaleX 压缩 → 侧面贴图 → 换面 → 反向展开，避免硬切。
 */
import { Sprite, Assets } from 'pixi.js';

const TEX = { front: 'leafFront', back: 'leafBack', side: 'leafSide' };

export class DivinationLeaf extends Sprite {
  constructor(texKey = 'leafFront') {
    super(Assets.get(texKey));
    this.anchor.set(0.5);
    this.size = 0.5;
    this.state = 'hidden';
    this.reset();
  }

  /** 三片叶的性格：第一片快、旋转少；第二片横漂；第三片最慢、翻转最多 */
  static PERSONAS = [
    { spin: 1.9, sway: 0.55, speed: 1.30, drift: 34, dur: 1.30, wobble: 16 },
    { spin: 3.4, sway: 1.35, speed: 1.00, drift: 150, dur: 1.55, wobble: 30 },
    { spin: 6.4, sway: 1.05, speed: 0.80, drift: 76, dur: 1.95, wobble: 22 },
  ];

  reset() {
    this.visible = false;
    this.alpha = 0;
    this.rotation = 0;
    this.scale.set(this.size);
    this.landed = false;
    this.t = 0;
    this._settle = 0;
    this.onLand = null;
  }

  launch(x0, y0, x1, y1, persona, face, delay) {
    this.reset();
    this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1;
    this.p = persona; this.face = face;
    this.delay = delay / 1000;
    this.dur = persona.dur;
    // 主轨迹控制点：向横漂方向偏、并抬高形成弧线
    this.cx = (x0 + x1) / 2 + persona.drift;
    this.cy = (y0 + y1) / 2 - 150;
    this.spinSign = persona.drift > 0 ? 1 : -1;
    this.state = 'falling';
  }

  update(dt) {
    // 落地后的轻微压弹（越接近结束越回到基准）
    if (this.state === 'landed') {
      if (this._settle > 0) {
        this._settle = Math.max(0, this._settle - dt * 3.2);
        const s = this._settle;
        this.scale.set(this.size * (1 + 0.22 * s), this.size * (1 - 0.28 * s));
      }
      return;
    }
    if (this.state !== 'falling') return;
    if (this.delay > 0) { this.delay -= dt; return; }
    this.visible = true;
    this.alpha = Math.min(1, this.alpha + dt * 4);
    this.t = Math.min(1, this.t + dt / this.dur);
    const t = this.t;
    const mt = 1 - t;

    let x = mt * mt * this.x0 + 2 * mt * t * this.cx + t * t * this.x1;
    let y = mt * mt * this.y0 + 2 * mt * t * this.cy + t * t * this.y1;
    // 横向摆动 + 轻微纵向噪声，越接近落地越收敛
    const settle = 1 - t * t;
    x += Math.sin(t * 6.4 * this.p.sway) * this.p.wobble * settle;
    y += Math.sin(t * 9.1 * this.p.sway + 1.2) * (this.p.wobble * 0.4) * settle;

    this.x = x;
    this.y = y;
    this.rotation = Math.sin(t * 3.1) * 0.5 + t * this.p.spin * this.spinSign;
    this.updateFlip(t);
    if (t >= 1) this.land();
  }

  /** scaleX 压缩 + 侧面贴图模拟 3D 翻面 */
  updateFlip(t) {
    const flips = Math.max(1, Math.round(this.p.spin / 2));
    const phase = t * flips * Math.PI;
    const cos = Math.cos(phase);
    const edge = Math.abs(cos);
    this.scale.x = this.size * Math.max(0.06, edge);
    let want;
    if (edge < 0.28) want = TEX.side;
    else want = cos >= 0 ? TEX.front : TEX.back;
    if (this.textureKey !== want) {
      this.texture = Assets.get(want);
      this.textureKey = want;
    }
  }

  land() {
    this.landed = true;
    this.state = 'landed';
    const key = this.face === 'front' ? TEX.front : TEX.back;
    this.texture = Assets.get(key);
    this.textureKey = key;
    this.scale.set(this.size);
    this._settle = 1;
    this.rotation = (Math.random() - 0.5) * 1.7 + (this.face === 'front' ? 0.35 : -0.35);
    if (this.onLand) this.onLand();
  }
}
