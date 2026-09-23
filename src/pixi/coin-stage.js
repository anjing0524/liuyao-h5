/**
 * src/pixi/coin-stage.js — 摇卦铜钱 PIXI 场景
 *
 * 炫酷点：
 *   - 三枚铜钱 512px 高精度铸币纹理（浮雕字、同心磨痕、方孔内阴影）
 *   - 摇动时铜钱抛起旋转（伪 3D 翻面）
 *   - 落定时金色粒子爆发 + 光环扩散 + 落地震荡
 *   - 底部粒子悬浮
 *
 * 用法：
 *   const stage = createCoinStage(canvas);
 *   stage.setStatic();                     // 静置（背面向上）
 *   await stage.roll(faces);               // faces=['字'|'背' x3]
 *   stage.destroy();
 */

import * as PIXI from 'pixi.js';

const GOLD = 0xf0c060;
const TEX_SIZE = 512;

/** 画一枚铜钱纹理（'字' 正面有字 / '背' 背面纹饰） */
function makeCoinTexture(face) {
  const SIZE = TEX_SIZE;
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = SIZE;
  const c = cnv.getContext('2d');
  const cx = SIZE / 2, cy = SIZE / 2, R = SIZE * 0.47;

  // ---- 币身：古铜金径向渐变 ----
  const body = c.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  body.addColorStop(0, '#ffefc4');
  body.addColorStop(0.4, '#eec26a');
  body.addColorStop(0.75, '#c08a34');
  body.addColorStop(1, '#7d4f16');
  c.beginPath();
  c.arc(cx, cy, R, 0, Math.PI * 2);
  c.fillStyle = body;
  c.fill();

  // ---- 金属质感：同心磨痕 + 高光斑 ----
  c.save();
  c.beginPath();
  c.arc(cx, cy, R * 0.985, 0, Math.PI * 2);
  c.clip();
  for (let i = 0; i < 30; i++) {
    const rr = R * (0.28 + i * 0.024);
    c.beginPath();
    c.arc(cx, cy, rr, 0, Math.PI * 2);
    c.strokeStyle = i % 2 ? 'rgba(255,240,200,0.05)' : 'rgba(90,58,14,0.07)';
    c.lineWidth = 1.4;
    c.stroke();
  }
  const shine = c.createRadialGradient(cx - R * 0.4, cy - R * 0.45, 0, cx - R * 0.4, cy - R * 0.45, R * 0.55);
  shine.addColorStop(0, 'rgba(255,255,240,0.30)');
  shine.addColorStop(1, 'rgba(255,255,240,0)');
  c.fillStyle = shine;
  c.fillRect(0, 0, SIZE, SIZE);
  c.restore();

  // ---- 外缘：粗边 + 内亮环 ----
  c.lineWidth = 11;
  c.strokeStyle = 'rgba(64,38,8,0.92)';
  c.beginPath();
  c.arc(cx, cy, R - 6, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 3;
  c.strokeStyle = 'rgba(255,238,190,0.5)';
  c.beginPath();
  c.arc(cx, cy, R - 18, 0, Math.PI * 2);
  c.stroke();

  // ---- 中央方孔（镂空 + 内斜面光影） ----
  const hole = R * 0.23;
  const hx = cx - hole, hy = cy - hole, hs = hole * 2;
  c.fillStyle = '#0c0904';
  c.fillRect(hx, hy, hs, hs);
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(255,240,200,0.32)';
  c.beginPath();
  c.moveTo(hx, hy + hs); c.lineTo(hx, hy); c.lineTo(hx + hs, hy);
  c.stroke();
  c.strokeStyle = 'rgba(60,36,8,0.8)';
  c.beginPath();
  c.moveTo(hx + hs, hy); c.lineTo(hx + hs, hy + hs); c.lineTo(hx, hy + hs);
  c.stroke();
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(70,42,10,0.9)';
  c.strokeRect(hx - 2, hy - 2, hs + 4, hs + 4);

  // ---- 面内容 ----
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (face === '字') {
    // 正面：右上→右下→左下→左上 读「六爻通宝」
    const chars = ['六', '爻', '通', '宝'];
    const pos = [
      [cx + R * 0.52, cy - R * 0.52],
      [cx + R * 0.52, cy + R * 0.52],
      [cx - R * 0.52, cy + R * 0.52],
      [cx - R * 0.52, cy - R * 0.52],
    ];
    const fs = R * 0.42;
    c.font = `bold ${fs}px "KaiTi", "STKaiti", "AR PL UKai CN", "WenKai", serif`;
    for (let i = 0; i < 4; i++) {
      const [x, y] = pos[i];
      // 铸字浮雕：先亮后暗，两层错位
      c.fillStyle = 'rgba(255,236,190,0.45)';
      c.fillText(chars[i], x + 3, y + 5);
      c.fillStyle = '#452a06';
      c.fillText(chars[i], x, y);
    }
  } else {
    // 背面：左右对称纹饰（满文风曲线）+ 上下圆点
    const ornament = (x, dir) => {
      c.save();
      c.strokeStyle = 'rgba(74,46,8,0.85)';
      c.lineWidth = 9;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, cy - R * 0.40);
      c.quadraticCurveTo(x + dir * R * 0.15, cy - R * 0.08, x, cy + R * 0.12);
      c.quadraticCurveTo(x - dir * R * 0.15, cy + R * 0.32, x + dir * R * 0.05, cy + R * 0.46);
      c.stroke();
      // 尾端圆点
      c.beginPath();
      c.arc(x + dir * R * 0.12, cy - R * 0.48, 9, 0, Math.PI * 2);
      c.fillStyle = 'rgba(74,46,8,0.85)';
      c.fill();
      c.restore();
    };
    ornament(cx - R * 0.5, 1);
    ornament(cx + R * 0.5, -1);
    for (const dy of [-R * 0.66, R * 0.66]) {
      c.beginPath();
      c.arc(cx, cy + dy, 9, 0, Math.PI * 2);
      c.fillStyle = 'rgba(74,46,8,0.85)';
      c.fill();
    }
  }

  return PIXI.Texture.from(cnv);
}

function makeGlowTexture(size = 128) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const c = cnv.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 224, 150, 0.9)');
  g.addColorStop(0.35, 'rgba(255, 200, 100, 0.35)');
  g.addColorStop(1, 'rgba(255, 180, 60, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  return PIXI.Texture.from(cnv);
}

export function createCoinStage(canvas) {
  const app = new PIXI.Application();
  let destroyed = false;

  const state = {
    coins: [],      // { sprite, glow, homeX, homeY, vy, rotV }
    particles: [],  // 落定爆发粒子
    ripples: [],    // 扩散光环
    floatDust: [],  // 底部悬浮粒子
    coinRadius: 42
  };

  const ready = app.init({
    canvas,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    resizeTo: canvas.parentElement || window
  }).then(() => {
    if (destroyed) return;
    buildScene();
    return app;
  });

  function vw() { return canvas.clientWidth || 320; }
  function vh() { return canvas.clientHeight || 220; }

  function buildScene() {
    const texZi = makeCoinTexture('字');
    const texBei = makeCoinTexture('背');
    state.texZi = texZi;
    state.texBei = texBei;
    state.glowTex = makeGlowTexture();

    const layout = () => {
      const w = vw(), h = vh();
      const r = state.coinRadius = Math.min(48, w / 9);
      const gap = r * 0.7;
      const total = r * 6 + gap * 2;
      const startX = (w - total) / 2 + r;
      const cy = h * 0.45;

      // 重建三枚
      for (const c of state.coins) app.stage.removeChild(c.holder);
      state.coins = [];

      for (let i = 0; i < 3; i++) {
        const holder = new PIXI.Container();
        const glow = new PIXI.Sprite(state.glowTex);
        glow.anchor.set(0.5);
        glow.scale.set((r * 2.6) / 128);
        glow.alpha = 0.5;
        const coin = new PIXI.Sprite(texBei);  // 默认背面向上
        coin.anchor.set(0.5);
        coin.scale.set((r * 2) / TEX_SIZE);
        holder.addChild(glow, coin);
        holder.x = startX + i * (r * 2 + gap);
        holder.y = cy;
        app.stage.addChild(holder);
        state.coins.push({ holder, coin, glow, homeX: holder.x, homeY: cy, vy: 0, vx: 0, rotV: 0, spin: 0, squash: 0 });
      }
    };

    layout();
    state.layout = layout;
    window.addEventListener('resize', layout);

    // 底部悬浮星尘
    for (let i = 0; i < 18; i++) {
      const d = new PIXI.Sprite(state.glowTex);
      d.anchor.set(0.5);
      d.scale.set(0.03 + Math.random() * 0.06);
      d.tint = GOLD;
      d.alpha = 0.3 + Math.random() * 0.4;
      d.x = Math.random() * vw();
      d.y = vh() * (0.7 + Math.random() * 0.3);
      app.stage.addChild(d);
      state.floatDust.push({
        d,
        vy: -(0.08 + Math.random() * 0.15),
        phase: Math.random() * Math.PI * 2
      });
    }

    // 主 ticker
    let t = 0;
    app.ticker.add(() => {
      t += 1 / 60;
      const h = vh();

      // 铜钱物理
      for (const c of state.coins) {
        if (c.spin > 0) {
          // 空中翻转
          c.holder.y += c.vy;
          c.holder.x += c.vx;
          c.vy += 0.35;  // 重力
          c.spin -= 1 / 60;
          const spinT = Math.min(c.spin / c.spinDuration, 1);
          // 翻面：横向压缩 + 微倾斜旋转
          c.coin.scale.x = Math.abs(Math.cos(spinT * Math.PI * 3)) * ((state.coinRadius * 2) / TEX_SIZE);
          c.holder.rotation += c.rotV;

          if (c.spin <= 0) {
            // 落定（带压扁回弹）
            c.holder.y = c.homeY;
            c.holder.x = c.homeX;
            c.holder.rotation = 0;
            c.coin.scale.x = (state.coinRadius * 2) / TEX_SIZE;
            c.coin.scale.y = (state.coinRadius * 2) / TEX_SIZE;
            c.squash = 1;
            spawnBurst(c.homeX, c.homeY);
            spawnRipple(c.homeX, c.homeY);
          }
        }
        // 落地压扁回弹
        if (c.squash > 0) {
          c.coin.scale.y = ((state.coinRadius * 2) / TEX_SIZE) * (1 - 0.35 * Math.sin(c.squash * Math.PI));
          c.squash -= 1 / 18;
        }
        // 待机呼吸 + 辉光闪烁
        if (c.spin <= 0 && c.squash <= 0) {
          c.holder.y = c.homeY + Math.sin(t * 2 + c.homeX) * 3;
          c.glow.alpha = 0.4 + Math.sin(t * 3 + c.homeX * 0.05) * 0.2;
        }
      }

      // 爆发粒子
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.s.x += p.vx;
        p.s.y += p.vy;
        p.vy += 0.08;
        p.life -= 1 / 60;
        p.s.alpha = Math.max(p.life / p.maxLife, 0);
        p.s.rotation += p.vr;
        if (p.life <= 0) {
          app.stage.removeChild(p.s);
          p.s.destroy();
          state.particles.splice(i, 1);
        }
      }

      // 扩散光环
      for (let i = state.ripples.length - 1; i >= 0; i--) {
        const rp = state.ripples[i];
        rp.life -= 1 / 60;
        const prog = 1 - rp.life / rp.maxLife;
        rp.g.clear();
        rp.g.circle(rp.x, rp.y, rp.r * prog);
        rp.g.stroke({ width: 3 * (1 - prog), color: GOLD, alpha: 0.8 * (1 - prog) });
        if (rp.life <= 0) {
          app.stage.removeChild(rp.g);
          rp.g.destroy();
          state.ripples.splice(i, 1);
        }
      }

      // 底部星尘上浮
      for (const fd of state.floatDust) {
        fd.d.y += fd.vy;
        fd.d.x += Math.sin(t + fd.phase) * 0.2;
        if (fd.d.y < h * 0.5) {
          fd.d.y = h * 1.05;
          fd.d.x = Math.random() * vw();
        }
      }
    });

    function spawnBurst(x, y) {
      const n = 26;
      for (let i = 0; i < n; i++) {
        const s = new PIXI.Sprite(state.glowTex);
        s.anchor.set(0.5);
        s.scale.set(0.02 + Math.random() * 0.05);
        s.tint = Math.random() > 0.3 ? GOLD : 0xfff2c0;
        s.x = x;
        s.y = y;
        const a = Math.random() * Math.PI * 2;
        const v = 1 + Math.random() * 3.5;
        app.stage.addChild(s);
        state.particles.push({
          s,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 1.5,
          vr: (Math.random() - 0.5) * 0.2,
          life: 0.6 + Math.random() * 0.5,
          maxLife: 1.1
        });
      }
    }

    function spawnRipple(x, y) {
      const g = new PIXI.Graphics();
      app.stage.addChild(g);
      state.ripples.push({ g, x, y, r: 60, life: 0.7, maxLife: 0.7 });
    }
  }

  /** 静置展示（背面向上） */
  function setStatic() {
    for (const c of state.coins) {
      c.coin.texture = state.texBei;
      c.spin = 0;
      c.squash = 0;
      c.holder.rotation = 0;
    }
  }

  /**
   * 摇动动画
   * @param {string[]} faces 最终面 ['字'|'背' x3]
   * @param {number} durationMs
   */
  function roll(faces, durationMs = 1400) {
    return new Promise(resolve => {
      const spinSec = durationMs / 1000;
      state.coins.forEach((c, i) => {
        // 最终面
        const targetTex = faces[i] === '字' ? state.texZi : state.texBei;
        // 抛起
        c.vy = -(3.5 + i * 0.4);
        c.vx = (Math.random() - 0.5) * 0.6;
        c.rotV = (Math.random() - 0.5) * 0.1;
        c.spin = spinSec * (0.75 + i * 0.12);   // 错峰落定
        c.spinDuration = c.spin;
        c.holder.rotation = 0;
        c.holder.y = c.homeY;

        // 在飞行中途换到目标面
        setTimeout(() => {
          c.coin.texture = targetTex;
        }, durationMs * (0.3 + i * 0.15));
      });

      // 全部落定后 resolve
      const maxSpin = Math.max(...state.coins.map(c => c.spin));
      setTimeout(resolve, maxSpin * 1000 + 150);
    });
  }

  function destroy() {
    destroyed = true;
    if (state.layout) window.removeEventListener('resize', state.layout);
    if (app.renderer) {
      app.destroy(true, { children: true });
    }
  }

  return { app, ready, setStatic, roll, destroy };
}
