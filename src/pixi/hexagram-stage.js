/**
 * src/pixi/hexagram-stage.js — 卦象展示 PIXI 场景
 *
 * 炫酷点：
 *   - 六爻自下而上依次点亮，金光流过的绘制动画
 *   - 阳爻流光渐变 / 阴爻双段发光
 *   - 动爻红色辉光脉动 + 爻变标记
 *   - 逐爻落下时粒子迸发
 */

import * as PIXI from 'pixi.js';

const GOLD = 0xf0c060;
const RED = 0xff5a4e;

function makeGlowTexture(size = 128) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const c = cnv.getContext('2d');
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 236, 180, 1)');
  g.addColorStop(0.3, 'rgba(255, 210, 120, 0.5)');
  g.addColorStop(1, 'rgba(255, 190, 70, 0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  return PIXI.Texture.from(cnv);
}

function makeStreakTexture(w = 128, h = 16) {
  const cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  const c = cnv.getContext('2d');
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,224,150,0)');
  g.addColorStop(0.5, 'rgba(255,240,200,1)');
  g.addColorStop(1, 'rgba(255,224,150,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  return PIXI.Texture.from(cnv);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{yang:boolean, changing:boolean}[]} lines 自下而上 6 爻
 */
export function createHexagramStage(canvas, lines) {
  const app = new PIXI.Application();
  let destroyed = false;

  const state = {
    lineSprites: [],   // 每爻的容器
    particles: [],
    streaks: []
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
  function vh() { return canvas.clientHeight || 300; }

  function buildScene() {
    const glowTex = makeGlowTexture();
    state.glowTex = glowTex;
    state.streakTex = makeStreakTexture();

    const draw = () => {
      // 清空重建
      for (const ls of state.lineSprites) app.stage.removeChild(ls.holder);
      state.lineSprites = [];

      const w = vw(), h = vh();
      const lineLen = Math.min(w * 0.62, 210);
      const lineH = 10;
      const x = (w - lineLen) / 2;
      // 六爻自上而下：上爻在顶部
      const rowGap = (h - 70) / 6;

      for (let i = 5; i >= 0; i--) {
        const line = lines[i];
        const rowIdx = 5 - i;   // 0 = 顶部（上爻）
        const y = 30 + rowIdx * rowGap + rowGap / 2;

        const holder = new PIXI.Container();
        holder.alpha = 0;  // 之后动画点亮

        // 背景辉光
        const glow = new PIXI.Sprite(glowTex);
        glow.anchor.set(0.5);
        glow.scale.set((lineLen + 60) / 128, (lineH * 5) / 128);
        glow.alpha = line.changing ? 0.55 : 0.35;
        glow.tint = line.changing ? RED : 0xffd070;
        glow.x = lineLen / 2;
        glow.y = 0;
        holder.addChild(glow);

        // 爻线本体
        const g = new PIXI.Graphics();
        const color = line.changing ? RED : GOLD;
        if (line.yang) {
          // 阳爻：实线，头部圆角
          g.roundRect(0, -lineH / 2, lineLen, lineH, lineH / 2);
          g.fill({ color, alpha: 0.95 });
        } else {
          // 阴爻：两段 + 中缝
          const seg = lineLen * 0.42;
          const gapW = lineLen * 0.16;
          g.roundRect(0, -lineH / 2, seg, lineH, lineH / 2);
          g.fill({ color, alpha: 0.95 });
          g.roundRect(seg + gapW, -lineH / 2, seg, lineH, lineH / 2);
          g.fill({ color, alpha: 0.95 });
        }
        g.x = 0;
        g.y = 0;
        holder.addChild(g);

        // 流光条（沿爻线扫过）
        const streak = new PIXI.Sprite(state.streakTex);
        streak.anchor.set(0.5, 0.5);
        streak.width = lineLen * 0.5;
        streak.height = lineH * 2.4;
        streak.alpha = 0.9;
        streak.tint = line.changing ? 0xffb0a8 : 0xfff0c8;
        streak.x = 0;
        streak.y = 0;
        holder.addChild(streak);
        state.streaks.push({ s: streak, lineLen, dir: 1 });

        // 动爻标记：右侧 ✕ 符号（朱红）
        if (line.changing) {
          const mk = new PIXI.Graphics();
          const s = 8;
          const mx = lineLen + 26;
          mk.moveTo(mx - s, -s);
          mk.lineTo(mx + s, s);
          mk.moveTo(mx + s, -s);
          mk.lineTo(mx - s, s);
          mk.stroke({ width: 4, color: RED, alpha: 0.95 });
          holder.addChild(mk);
        }

        holder.x = x;
        holder.y = y;
        app.stage.addChild(holder);
        state.lineSprites.push({ holder, glow, changing: line.changing, rowIdx });
      }
    };

    draw();
    state.redraw = draw;
    window.addEventListener('resize', draw);

    // ===== 逐爻点亮动画 =====
    state.lineSprites.forEach((ls, idx) => {
      // 自下而上点亮：底部爻（rowIdx=5）最先
      const fromBottom = 5 - ls.rowIdx;
      const delay = 300 + fromBottom * 240;
      state.lineSprites._anim = state.lineSprites._anim || [];

      setTimeout(() => {
        if (destroyed) return;
        // 弹入
        ls.holder.alpha = 0;
        ls.holder.y += 26;
        let p = 0;
        const tick = () => {
          if (destroyed) return;
          p += 1 / 30;
          const e = 1 - Math.pow(1 - Math.min(p, 1), 3);
          ls.holder.alpha = e;
          ls.holder.y -= 26 / 30;
          if (p < 1) requestAnimationFrame(tick);
          else spawnBurst(ls.holder.x + 100, ls.holder.y, ls.changing);
        };
        requestAnimationFrame(tick);
      }, delay);
    });

    // ===== 常驻动画 =====
    let t = 0;
    app.ticker.add(() => {
      t += 1 / 60;

      // 流光扫动
      for (const st of state.streaks) {
        st.s.x += st.dir * (2.2 + Math.random());
        if (st.s.x > st.lineLen * 1.1) st.s.x = -st.lineLen * 0.1;
      }

      // 动爻辉光脉动
      for (const ls of state.lineSprites) {
        if (ls.changing) {
          ls.glow.alpha = 0.4 + Math.sin(t * 4) * 0.3;
        } else {
          ls.glow.alpha = 0.3 + Math.sin(t * 1.5 + ls.rowIdx) * 0.1;
        }
      }

      // 粒子
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.s.x += p.vx;
        p.s.y += p.vy;
        p.vy += 0.05;
        p.life -= 1 / 60;
        p.s.alpha = Math.max(p.life / p.maxLife, 0);
        if (p.life <= 0) {
          app.stage.removeChild(p.s);
          p.s.destroy();
          state.particles.splice(i, 1);
        }
      }
    });

    function spawnBurst(x, y, isChanging) {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const s = new PIXI.Sprite(glowTex);
        s.anchor.set(0.5);
        s.scale.set(0.015 + Math.random() * 0.04);
        s.tint = isChanging ? RED : GOLD;
        s.x = x + (Math.random() - 0.5) * 60;
        s.y = y;
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const v = 0.8 + Math.random() * 2.2;
        app.stage.addChild(s);
        state.particles.push({
          s,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 0.5 + Math.random() * 0.4,
          maxLife: 0.9
        });
      }
    }
  }

  function destroy() {
    destroyed = true;
    if (state.redraw) window.removeEventListener('resize', state.redraw);
    if (app.renderer) app.destroy(true, { children: true });
  }

  return { app, ready, destroy };
}
