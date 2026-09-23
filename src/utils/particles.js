/**
 * src/utils/particles.js — 粒子与涟漪工厂（统一封装）
 *
 * 提供 createBurst / createTrail / createRipple / createFloatDust / createWhisperFog
 * 五大类效果，统一使用 PIXI v8 ParticleContainer 批量绘制（移动端友好）。
 */

import * as PIXI from 'pixi.js';

/**
 * @typedef {Object} ParticleSystem
 * @property {PIXI.Container} container 放置粒子精灵的容器（已 add 到 stage）
 * @property {(opts)=>void} burst       绽放粒子爆发
 * @property {(opts)=>void} trail       拖尾
 * @property {(opts)=>void} ripple      涟漪
 * @property {(opts)=>void} floatDust   飘浮金粉
 * @property {()=>void}     update      每帧更新（必须在主 ticker 调一次）
 */

/**
 * 创建粒子系统。
 * @param {PIXI.Application} app
 * @param {{
 *   glowGold: PIXI.Texture,
 *   glowJade: PIXI.Texture,
 *   glowMoon: PIXI.Texture,
 *   glowCrimson: PIXI.Texture,
 *   glowPurple: PIXI.Texture,
 *   petalGold: PIXI.Texture,
 *   petalJade: PIXI.Texture,
 *   petalCrimson: PIXI.Texture,
 *   goldDust: PIXI.Texture
 * }} texSet 预先准备好的纹理集
 */
export function createParticleSystem(app, texSet) {
  const container = new PIXI.Container();
  app.stage.addChild(container);

  // ParticleContainer 不能加滤镜，且不能 scale 单独设置，所以这里用普通 Container + 数量控制
  // 静态（金粉/萤火）金粉
  const dustContainer = new PIXI.Container();
  app.stage.addChildAt(dustContainer, 0);
  // 涟漪（Graphics）置于最高
  const rippleTop = new PIXI.Container();
  app.stage.addChild(rippleTop);

  /** 活粒子 */
  const burstSprites = [];   // 粒子（pixi Sprite）
  const trails = [];         // 拖尾组
  const ripples = [];        // 涟漪
  const dust = [];           // 飘浮金粉
  const whisperFogs = [];    // 远景雾气

  /* 颜色键 → 纹理 */
  const colorTex = {
    gold:    texSet.glowGold,
    jade:    texSet.glowJade,
    moon:    texSet.glowMoon,
    crimson: texSet.glowCrimson,
    purple:  texSet.glowPurple,
  };

  /* ============== 1. 粒子爆发 ============== */
  function burst({
    x, y, color = 'gold', count = 30, speed = 3,
    lifeMin = 0.5, lifeMax = 1.0, gravity = 0.06,
    spread = Math.PI*2, scatter = 0, scaleMin = 0.04, scaleMax = 0.10,
    petalMode = false, petalTex = null,
  } = {}) {
    const tex = petalMode ? petalTex : colorTex[color] || colorTex.gold;
    for (let i = 0; i < count; i++) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5);
      s.x = x + (Math.random()-0.5) * scatter;
      s.y = y + (Math.random()-0.5) * scatter;
      const sc = scaleMin + Math.random()*(scaleMax - scaleMin);
      s.scale.set(sc);
      s.alpha = 0.9;
      s.blendMode = 'add';
      s.rotation = Math.random() * Math.PI*2;
      container.addChild(s);

      const a = Math.random()*spread - spread/2 + (Math.random()-0.5) * 0.4;
      const v = speed * (0.6 + Math.random()*0.6);
      burstSprites.push({
        s, vx: Math.cos(a)*v, vy: Math.sin(a)*v - speed*0.3,
        life: lifeMin + Math.random()*(lifeMax-lifeMin),
        maxLife: lifeMax, gravity,
        rotV: (Math.random()-0.5)*4,
        scaleBase: sc,
      });
    }
  }

  /* ============== 2. 拖尾 ==============
   * 创建一段会跟随目标移动的拖尾精灵串
   */
  function trail(target, color = 'gold', len = 12, lifeMs = 600) {
    const tex = colorTex[color] || colorTex.gold;
    const sprites = [];
    for (let i = 0; i < len; i++) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5);
      s.scale.set(0.06);
      s.alpha = 0;
      s.blendMode = 'add';
      container.addChild(s);
      sprites.push({ s, x: target.x, y: target.y, born: 0 });
    }
    trails.push({ target, sprites, len, color, lifeMs, age: 0 });
    return () => trails.shift(); // 返回 destroy 函数
  }

  /* ============== 3. 涟漪 ============== */
  function ripple({ x, y, color = 'gold', r0 = 30, r1 = 90, life = 0.9, width = 2.2 }) {
    const colorHex = {
      gold: 0xf0c060, jade: 0x69d2b8, moon: 0xc8d8ff,
      crimson: 0xff5a4e, purple: 0xa06acb,
    }[color] || 0xf0c060;
    const g = new PIXI.Graphics();
    rippleTop.addChild(g);
    ripples.push({ g, x, y, r0, r1, life, age: 0, width, color: colorHex });
  }

  /* ============== 4. 飘浮金粉 ==============
   * 摇树阶段持续生成金粉/冷光尘
   */
  function floatDust({ count = 26, scope = {}, area = 'right' } = {}) {
    const tex = texSet.goldDust;
    const w = (scope.w || app.renderer.width / app.renderer.resolution);
    const h = (scope.h || app.renderer.height / app.renderer.resolution);
    for (let i = 0; i < count; i++) {
      const s = new PIXI.Sprite(tex);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      // 分布：在画面中右上方/树周
      const baseX = area === 'left' ? w*(0.15 + Math.random()*0.3)
                                 : area === 'right' ? w*(0.55 + Math.random()*0.42)
                                                     : w * Math.random();
      const baseY = h*(0.10 + Math.random()*0.55);
      s.x = baseX; s.y = baseY;
      const sc = 0.5 + Math.random()*0.9;
      s.scale.set(sc*0.06);
      s.alpha = 0.5 + Math.random()*0.4;
      dustContainer.addChild(s);

      const ph = Math.random()*Math.PI*2;
      const r = 8 + Math.random()*16;
      const vy = -(0.18 + Math.random()*0.32);
      dust.push({
        s, baseX, baseY, sc, ph, r,
        vy: vy,
        vx: (Math.random()-0.5)*0.15,
        twinkle: 1 + Math.random()*2.5,
        twinklePh: Math.random()*Math.PI*2,
      });
    }
  }

  /* ============== 5. 远景雾气（模糊、半透椭圆） ============== */
  function whisperFog(yPct = 0.78, alpha = 0.18, wMul = 1.0, color = 0xa4b3d8) {
    const w = app.renderer.width / app.renderer.resolution;
    const h = app.renderer.height / app.renderer.resolution;
    const g = new PIXI.Graphics();
    g.blendMode = 'screen';
    const ww = w * wMul;
    const cy = h * yPct;
    for (let i = 0; i < 5; i++) {
      const wwL = ww * (0.6 + i*0.08);
      const rg = new PIXI.Graphics();
      const rg_inner = wwL * 0.5;
      const rg_outer = wwL * 1.0;
      // 用 Canvas API 直接绘到 Graphics 太贵，改用一个 sprite
      const cnv = document.createElement('canvas');
      cnv.width = ww*2; cnv.height = 180;
      const ctx = cnv.getContext('2d');
      const grd = ctx.createRadialGradient(ww, 90, 0, ww, 90, wwL);
      const colHex = color.toString(16).padStart(6, '0');
      grd.addColorStop(0, `rgba(${(color>>16)&255}, ${(color>>8)&255}, ${color&255}, ${alpha*(0.9-i*0.12)})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, ww*2, 180);
      const tex = PIXI.Texture.from(cnv);
      const fog = new PIXI.Sprite(tex);
      fog.anchor.set(0.5, 0.5);
      fog.x = ww/2;
      fog.y = 90;
      fog.blendMode = 'screen';
      const cont = new PIXI.Container();
      cont.addChild(fog);
      cont.x = w/2 - ww/2;
      cont.y = cy - 60;
      whisperFogs.push({ container: cont, ph: Math.random()*Math.PI*2, baseY: cy - 60 });
      // 用 rippleTop 后一档
      app.stage.addChildAt(cont, 1);
    }
  }

  /* ====== 每帧更新 ====== */
  function update(dt) {
    const deltaSec = dt / 60;   // app.ticker.deltaMS / (1000/60)

    // burstSprites
    for (let i = burstSprites.length - 1; i >= 0; i--) {
      const p = burstSprites[i];
      p.s.x += p.vx;
      p.s.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.985;
      p.life -= deltaSec;
      const prog = Math.max(p.life / p.maxLife, 0);
      p.s.alpha = prog;
      p.s.scale.set(p.scaleBase * (0.4 + prog * 0.9));
      p.s.rotation += p.rotV * deltaSec * 0.4;
      if (p.life <= 0) {
        container.removeChild(p.s);
        p.s.destroy();
        burstSprites.splice(i, 1);
      }
    }

    // trails: 每帧将上一帧 target 位置记录，平滑跟随
    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i];
      t.age += deltaSec;
      // 先移动所有 sprite 向下"补位"
      for (let j = t.sprites.length - 1; j > 0; j--) {
        t.sprites[j].x = t.sprites[j-1].x;
        t.sprites[j].y = t.sprites[j-1].y;
        t.sprites[j].born = t.sprites[j-1].born + deltaSec;
      }
      t.sprites[0].x = t.target.x;
      t.sprites[0].y = t.target.y;
      t.sprites[0].born = 0;

      for (let j = 0; j < t.sprites.length; j++) {
        const sp = t.sprites[j];
        const fade = Math.max(0, 1 - sp.born / (t.lifeMs/1000));
        sp.s.alpha = fade * 0.45 * Math.max(0, 1 - j / t.sprites.length);
        sp.s.scale.set(0.06 * Math.max(0, 1 - j / t.sprites.length));
      }

      if (t.age > t.lifeMs/1000 + 0.2) {
        for (const sp of t.sprites) {
          container.removeChild(sp.s);
          sp.s.destroy();
        }
        trails.splice(i, 1);
      }
    }

    // ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += deltaSec;
      const prog = r.age / r.life;
      r.g.clear();
      if (prog < 1) {
        // 内外双圈
        const radius = r.r0 + (r.r1 - r.r0) * prog;
        const alpha = (1 - prog) * 0.85;
        r.g.ellipse(r.x, r.y, radius, radius*0.32);
        r.g.stroke({ width: r.width * (1 - prog*0.6), color: r.color, alpha });
        // 内圈
        r.g.ellipse(r.x, r.y, radius*0.65, radius*0.22);
        r.g.stroke({ width: r.width * 0.6, color: r.color, alpha: alpha * 0.6 });
      } else {
        rippleTop.removeChild(r.g);
        r.g.destroy();
        ripples.splice(i, 1);
      }
    }

    // 飘浮金粉（一直存在）
    for (const d of dust) {
      d.s.y += d.vy;
      d.s.x += d.vx + Math.sin(d.ph) * 0.06;
      d.ph += 0.04;
      d.baseY += d.vy;
      // 上下飘移
      d.s.y = d.baseY + Math.sin(d.ph * 1.3) * d.r;
      // 闪烁
      d.s.alpha = (0.4 + 0.5 * Math.abs(Math.sin(d.twinklePh)));
      d.twinklePh += d.twinkle * 0.04;

      // 越界回收：从底部重置到顶部
      const h = app.renderer.height / app.renderer.resolution;
      if (d.s.y < -10) {
        d.s.y = h + 10;
        d.s.x = w_h()*Math.random();
      }
    }
    function w_h() { return app.renderer.width / app.renderer.resolution; }

    // 远景雾气：水平漂移 + 透明度起伏
    for (const f of whisperFogs) {
      f.ph += 0.012;
      f.container.x = (f.container.parent ? f.container.parent.width/2 - f.container.width/2 : f.container.x) + Math.sin(f.ph) * 8;
      f.container.alpha = 0.85 + Math.sin(f.ph * 1.7) * 0.15;
    }
  }

  return {
    container,
    burst,
    trail,
    ripple,
    floatDust,
    whisperFog,
    update,
    setNightFogColor(c) {
      // 重置雾色（不实现 hot swap，留接口）
    },
  };
}
