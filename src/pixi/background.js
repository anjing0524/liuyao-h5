/**
 * src/pixi/background.js — 全屏炫酷背景
 *
 * 深空星野 + 缓慢旋转的巨型太极环 + 流动星尘 + 两侧阴阳气旋。
 * 挂在 body 下、#app 之上，作为全局氛围层，不拦截交互。
 */

import * as PIXI from 'pixi.js';

let app = null;
let resizeHandler = null;

/* ---------- 太极图形 ---------- */
function buildTaiji(size, colorA, colorB) {
  const g = new PIXI.Container();
  const r = size / 2;
  const c = new PIXI.Graphics();

  // 外环
  c.circle(0, 0, r);
  c.stroke({ width: size * 0.03, color: colorA, alpha: 0.9 });

  // 阳鱼（右半 + 上小圆）
  c.circle(0, 0, r * 0.98);
  c.arc(0, 0, r * 0.98, -Math.PI / 2, Math.PI / 2);
  c.fill({ color: colorA, alpha: 0.18 });

  c.circle(0, -r / 2, r / 2);
  c.fill({ color: colorA, alpha: 0.30 });
  c.circle(0, r / 2, r / 2);
  c.fill({ color: colorB, alpha: 0.10 });

  // 鱼眼
  c.circle(0, -r / 2, r * 0.12);
  c.fill({ color: colorB, alpha: 0.9 });
  c.circle(0, r / 2, r * 0.12);
  c.fill({ color: colorA, alpha: 0.9 });

  // 中间 S 分界线
  c.moveTo(0, -r);
  c.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2);
  c.moveTo(0, r);
  c.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2);
  c.stroke({ width: size * 0.012, color: colorA, alpha: 0.8 });

  g.addChild(c);
  return g;
}

/* ---------- 六十四卦环绕刻度环 ---------- */
function buildGuaRing(radius, color) {
  const g = new PIXI.Graphics();
  // 64 段刻度，每 8 段一组亮一点（对应八卦方位）
  for (let i = 0; i < 64; i++) {
    const isMajor = i % 8 === 0;
    const a = (i / 64) * Math.PI * 2;
    const inner = radius * (isMajor ? 0.92 : 0.95);
    const outer = radius;
    g.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    g.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    g.stroke({ width: isMajor ? 3 : 1.5, color, alpha: isMajor ? 0.6 : 0.25 });
  }
  // 内外细环
  g.circle(0, 0, radius);
  g.stroke({ width: 1, color, alpha: 0.35 });
  g.circle(0, 0, radius * 0.86);
  g.stroke({ width: 1, color, alpha: 0.2 });
  return g;
}

/* ---------- 生成星尘纹理 ---------- */
function makeStarTexture(renderer, size = 64) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const c = cnv.getContext('2d');
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255, 245, 214, 1)');
  grd.addColorStop(0.3, 'rgba(255, 214, 130, 0.55)');
  grd.addColorStop(1, 'rgba(255, 190, 80, 0)');
  c.fillStyle = grd;
  c.fillRect(0, 0, size, size);
  return PIXI.Texture.from(cnv);
}

/** 启动全局背景，返回 PIXI.Application */
export function startBackground() {
  if (app) return app;

  const canvasHost = document.getElementById('bg-canvas');
  if (!canvasHost) return null;

  app = new PIXI.Application();
  app.init({
    canvas: canvasHost,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    resizeTo: window
  }).then(() => {
    buildScene();
  });

  return app;
}

function buildScene() {
  const W = () => app.renderer.width / app.renderer.resolution;
  const H = () => app.renderer.height / app.renderer.resolution;

  // ===== 底层径向深空渐变 =====
  const bgG = new PIXI.Graphics();
  const drawBg = () => {
    bgG.clear();
    const w = W(), h = H();
    // 用多个同心透明圆模拟径向渐变
    for (let i = 12; i >= 0; i--) {
      const t = i / 12;
      bgG.circle(w / 2, h * 0.42, Math.max(w, h) * (0.75 - t * 0.7));
      const alpha = 0.05 + (1 - t) * 0.05;
      bgG.fill({ color: t < 0.15 ? 0x2a1f3d : 0x070a14, alpha: 0.08 });
    }
    // 底部朱砂雾
    bgG.circle(w / 2, h * 1.05, Math.max(w, h) * 0.5);
    bgG.fill({ color: 0x54121c, alpha: 0.10 });
  };
  drawBg();
  app.stage.addChild(bgG);

  // ===== 星野 =====
  const starTex = makeStarTexture(app.renderer);
  const stars = new PIXI.Container();
  app.stage.addChild(stars);
  const starData = [];
  const STAR_COUNT = 130;
  for (let i = 0; i < STAR_COUNT; i++) {
    const s = new PIXI.Sprite(starTex);
    const scale = 0.03 + Math.random() * 0.10;
    s.anchor.set(0.5);
    s.scale.set(scale);
    s.alpha = 0.25 + Math.random() * 0.7;
    s.x = Math.random() * W();
    s.y = Math.random() * H();
    stars.addChild(s);
    starData.push({
      s,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.04,
      twinkleSpeed: 0.008 + Math.random() * 0.03,
      twinklePhase: Math.random() * Math.PI * 2
    });
  }

  // ===== 太极 + 卦环（居中缓慢旋转） =====
  const cosm = new PIXI.Container();
  cosm.alpha = 0.75;
  app.stage.addChild(cosm);

  const GOLD = 0xd9a441;
  const JADE = 0x69d2b8;

  const taiji = buildTaiji(210, GOLD, 0x1a1030);
  cosm.addChild(taiji);

  const ring1 = buildGuaRing(160, GOLD);
  cosm.addChild(ring1);
  const ring2 = buildGuaRing(210, JADE);
  ring2.alpha = 0.5;
  cosm.addChild(ring2);

  const ring3 = new PIXI.Graphics();
  ring3.circle(0, 0, 255);
  ring3.stroke({ width: 1, color: GOLD, alpha: 0.15 });
  ring3.circle(0, 0, 270);
  ring3.stroke({ width: 1, color: JADE, alpha: 0.10 });
  cosm.addChild(ring3);

  // 太极外发光
  const glowTex = makeStarTexture(app.renderer, 256);
  const cosmGlow = new PIXI.Sprite(glowTex);
  cosmGlow.anchor.set(0.5);
  cosmGlow.scale.set(3.0);
  cosmGlow.alpha = 0.18;
  cosmGlow.tint = 0xd9a441;
  cosm.addChildAt(cosmGlow, 0);

  // ===== 流动星尘带（八卦气旋） =====
  const dust = new PIXI.Container();
  app.stage.addChild(dust);
  const dustParts = [];
  for (let i = 0; i < 60; i++) {
    const d = new PIXI.Sprite(starTex);
    d.anchor.set(0.5);
    d.scale.set(0.02 + Math.random() * 0.05);
    d.tint = Math.random() > 0.5 ? GOLD : JADE;
    d.alpha = 0.4 + Math.random() * 0.4;
    dust.addChild(d);
    dustParts.push({
      d,
      angle: Math.random() * Math.PI * 2,
      radius: 200 + Math.random() * 320,
      speed: (0.001 + Math.random() * 0.004) * (Math.random() > 0.5 ? 1 : -1),
      wobble: Math.random() * Math.PI * 2
    });
  }

  // ===== 布局 =====
  const layout = () => {
    cosm.x = W() / 2;
    cosm.y = H() * 0.38;
  };
  layout();

  // ===== 呼吸 + 旋转动画 =====
  let t = 0;
  app.ticker.add(() => {
    t += 1 / 60;
    const w = W(), h = H();

    // 星野漂移 + 闪烁
    for (const sd of starData) {
      sd.s.x += sd.vx;
      sd.s.y += sd.vy;
      if (sd.s.x < -20) sd.s.x = w + 20;
      if (sd.s.x > w + 20) sd.s.x = -20;
      if (sd.s.y < -20) sd.s.y = h + 20;
      if (sd.s.y > h + 20) sd.s.y = -20;
      sd.s.alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3 * sd.twinkleSpeed / 0.01 + sd.twinklePhase));
    }

    // 太极旋转（慢）
    taiji.rotation += 0.0012;
    ring1.rotation -= 0.0009;
    ring2.rotation += 0.0005;
    ring3.rotation -= 0.0003;

    // 呼吸
    const breathe = 1 + Math.sin(t * 0.6) * 0.03;
    cosm.scale.set(breathe);
    cosmGlow.alpha = 0.22 + Math.sin(t * 0.8) * 0.08;

    // 气旋
    for (const p of dustParts) {
      p.angle += p.speed;
      p.wobble += 0.02;
      const r = p.radius + Math.sin(p.wobble) * 30;
      p.d.x = cosm.x + Math.cos(p.angle) * r;
      p.d.y = cosm.y + Math.sin(p.angle) * r * 0.75;  // 椭圆轨道
      p.d.alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(p.wobble * 2));
    }
  });

  resizeHandler = () => {
    drawBg();
    layout();
  };
  window.addEventListener('resize', resizeHandler);
}

export function stopBackground() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (app) {
    app.destroy(true, { children: true });
    app = null;
  }
}
