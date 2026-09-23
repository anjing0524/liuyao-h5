/**
 * src/utils/textures.js — 程序化纹理工厂
 *
 * 用 Canvas 2D 在运行时绘制所有 PIXI 需要的贴图。
 * 全部为「玄穹·月华秋韵」主题：
 *   - 5 种东方秋叶（金杏 / 银杏 / 枫 / 柳 / 桂）
 *   - 2 色面（亮=阳金面 / 暗=阴翠面）
 *   - 月晕辉光、金粉流光、地面古纹罗盘
 *
 * 优点：
 *   1) 0 依赖、0 资源请求、即开即用
 *   2) 可程序化调出无数变体（色彩/方向/色相微扰）
 *   3) 分辨率可控（移动端走 128，PC 走 160）
 */

import * as PIXI from 'pixi.js';

/* ========== 调色板 ========== */
export const PALETTE = {
  // 暖系（金·阳）
  goldA:  '#fff2c0',
  goldB:  '#ffd373',
  goldC:  '#e0a23a',
  goldD:  '#8d5e1a',

  amberA: '#ffe1a8',
  amberB: '#f0a050',
  amberC: '#b05828',

  persimA:'#ffd1a8',
  persimB:'#f0643a',
  persimC:'#a82814',

  // 冷系（翠·阴）
  jadeA:  '#c4f5d8',
  jadeB:  '#69d2b8',
  jadeC:  '#2f8068',
  jadeD:  '#163a2a',

  purpleA:'#e9c8ff',
  purpleB:'#a06acb',
  purpleC:'#5c2e7a',

  // 中性
  ink:    '#0a0c16',
  bone:   '#f4eedb',
  moon:   '#dde8ff',
  mist:   '#a4b3d8',

  // 警示
  crimson:'#ff5a4e',
};

/* ========== 工具：柔边径向（用于粒子辉光） ========== */
export function radialGlow(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/* ========== 工具：2D 噪点（增加材质的呼吸感） ========== */
function speckle(ctx, w, h, n, alphaRange = [0.06, 0.18]) {
  const [a, b] = alphaRange;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a0 = a + Math.random() * (b - a);
    ctx.fillStyle = `rgba(255,255,255,${a0.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

/* ========== 叶形路径（5 种） ==========
 * 每个叶形用 (ctx, size, anchor) 把叶子画进 [0,size]² 的画布
 * 中心点 (size/2, size/2)，长轴朝下。
 */
function pathGinkgo(ctx, s) {
  // 银杏：扇形带浅裂
  ctx.beginPath();
  ctx.moveTo(s/2, s*0.92);
  ctx.bezierCurveTo(s*0.10, s*0.78, s*0.06, s*0.42, s/2, s*0.10);
  ctx.bezierCurveTo(s*0.94, s*0.42, s*0.90, s*0.78, s/2, s*0.92);
  ctx.closePath();
}
function pathMaple(ctx, s) {
  // 枫叶：5 裂
  ctx.beginPath();
  const cx = s/2, cy = s*0.55;
  ctx.moveTo(cx, s*0.94);
  // 左下大裂
  ctx.bezierCurveTo(cx-s*0.30, s*0.80, cx-s*0.42, s*0.55, cx-s*0.10, s*0.42);
  ctx.bezierCurveTo(cx-s*0.30, s*0.36, cx-s*0.32, s*0.18, cx-s*0.04, s*0.16);
  ctx.bezierCurveTo(cx-s*0.04, s*0.04, cx+s*0.04, s*0.04, cx+s*0.04, s*0.16);
  ctx.bezierCurveTo(cx+s*0.32, s*0.18, cx+s*0.30, s*0.36, cx+s*0.10, s*0.42);
  ctx.bezierCurveTo(cx+s*0.42, s*0.55, cx+s*0.30, s*0.80, cx, s*0.94);
  ctx.closePath();
}
function pathApricot(ctx, s) {
  // 椭圆带尖
  ctx.beginPath();
  ctx.moveTo(s/2, s*0.08);
  ctx.bezierCurveTo(s*0.18, s*0.22, s*0.14, s*0.82, s/2, s*0.94);
  ctx.bezierCurveTo(s*0.86, s*0.82, s*0.82, s*0.22, s/2, s*0.08);
  ctx.closePath();
}
function pathWillow(ctx, s) {
  // 柳叶：细长
  ctx.beginPath();
  ctx.moveTo(s/2, s*0.05);
  ctx.bezierCurveTo(s*0.36, s*0.25, s*0.36, s*0.85, s/2, s*0.96);
  ctx.bezierCurveTo(s*0.64, s*0.85, s*0.64, s*0.25, s/2, s*0.05);
  ctx.closePath();
}
function pathBay(ctx, s) {
  // 桂叶：椭圆带柄
  ctx.beginPath();
  ctx.moveTo(s*0.5, s*0.12);
  ctx.bezierCurveTo(s*0.22, s*0.26, s*0.18, s*0.80, s*0.5, s*0.92);
  ctx.bezierCurveTo(s*0.82, s*0.80, s*0.78, s*0.26, s*0.5, s*0.12);
  ctx.closePath();
}

const LEAF_PATHS = [pathGinkgo, pathMaple, pathApricot, pathWillow, pathBay];
export const LEAF_KINDS = ['ginkgo', 'maple', 'apricot', 'willow', 'bay'];

/* 亮面（阳）配色：[topMid, botMid] 由 kind 决定 */
const BRIGHT_PALETTES = {
  ginkgo:  ['#fff2b6', '#f7c64a', '#a86418'],   // 金杏
  maple:   ['#ffdc9a', '#ef6c3a', '#7c1a14'],   // 朱柿红枫
  apricot: ['#ffe1a8', '#f0a050', '#7a3a12'],   // 琥珀
  willow:  ['#fff0c0', '#e8b958', '#704410'],   // 蜜金
  bay:     ['#fff7d8', '#f6d878', '#9a7418'],   // 月桂
};
/* 暗面（阴）配色：统一偏冷翠，加点紫调 */
const DARK_PALETTES = {
  ginkgo:  ['#a4e2c4', '#3c9072', '#163a2a'],
  maple:   ['#caa6d8', '#7a4ea0', '#3a1f50'],
  apricot: ['#b8d8b0', '#4e8c5a', '#163826'],
  willow:  ['#a8d4c2', '#4d8c75', '#163530'],
  bay:     ['#b0cfd8', '#4c7090', '#162e3a'],
};

/**
 * 生成一片秋叶的 PIXI.Texture
 * @param {'bright'|'dark'} face 阴阳面
 * @param {number} kindIdx 0..4
 * @param {number} size 像素尺寸
 * @param {number} hueShift 微调色相（-30..30）
 */
export function makeLeafTexture(face, kindIdx, size = 128, hueShift = 0) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');

  const kind = LEAF_KINDS[kindIdx];
  const pathFn = LEAF_PATHS[kindIdx];
  const palette = (face === 'bright' ? BRIGHT_PALETTES : DARK_PALETTES)[kind];

  // 主渐变（沿短轴）
  const g = ctx.createLinearGradient(size/2, 4, size/2, size - 4);
  g.addColorStop(0, palette[0]);
  g.addColorStop(0.5, palette[1]);
  g.addColorStop(1, palette[2]);

  pathFn(ctx, size);
  ctx.fillStyle = g;
  ctx.fill();

  // 重新描边路径用于内层效果
  pathFn(ctx, size);
  ctx.save();
  ctx.clip();

  // 高光（左上）
  const hl = ctx.createRadialGradient(size*0.36, size*0.34, 1, size*0.36, size*0.34, size*0.42);
  hl.addColorStop(0, face === 'bright' ? 'rgba(255,255,230,0.55)' : 'rgba(200,230,210,0.18)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, size, size);

  // 主叶脉（中央）
  const veinColor = face === 'bright' ? 'rgba(90,50,10,0.55)' : 'rgba(220,255,235,0.32)';
  ctx.strokeStyle = veinColor;
  ctx.lineWidth = Math.max(1.2, size/70);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size/2, size*0.08);
  ctx.lineTo(size/2, size*0.94);
  ctx.stroke();

  // 侧叶脉（不同形态不同密度）
  const veinCount = kind === 'maple' ? 4 : (kind === 'willow' ? 6 : 5);
  ctx.lineWidth = Math.max(0.7, size/120);
  for (let i = 1; i < veinCount; i++) {
    const t = i / (veinCount + 1);
    const yy = size*0.16 + t * size*0.72;
    const amp = (kind === 'willow' ? 14 : 22) * (size/128);
    ctx.beginPath();
    ctx.moveTo(size/2, yy);
    ctx.quadraticCurveTo(size/2 - amp*0.7, yy + 4, size/2 - amp, yy + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size/2, yy);
    ctx.quadraticCurveTo(size/2 + amp*0.7, yy + 4, size/2 + amp, yy + 14);
    ctx.stroke();
  }

  // 叶柄
  ctx.strokeStyle = face === 'bright' ? 'rgba(70,40,8,0.85)' : 'rgba(20,40,30,0.8)';
  ctx.lineWidth = Math.max(0.9, size/120);
  ctx.beginPath();
  ctx.moveTo(size/2, size*0.93);
  ctx.lineTo(size/2, size*0.98);
  ctx.stroke();

  // 噪点
  speckle(ctx, size, size, kind === 'willow' ? 90 : 160, [0.04, face === 'bright' ? 0.18 : 0.12]);

  // 描边外线
  ctx.restore();
  pathFn(ctx, size);
  ctx.strokeStyle = face === 'bright' ? 'rgba(85,55,12,0.85)' : 'rgba(12,30,22,0.85)';
  ctx.lineWidth = Math.max(1.0, size/100);
  ctx.stroke();

  // 微弱边缘高亮（让叶缘泛金光）
  if (face === 'bright') {
    ctx.save();
    pathFn(ctx, size);
    ctx.clip();
    const edge = ctx.createRadialGradient(size/2, size/2, size*0.35, size/2, size/2, size*0.5);
    edge.addColorStop(0, 'rgba(255,200,80,0)');
    edge.addColorStop(1, 'rgba(255,210,100,0.35)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  return PIXI.Texture.from(cnv);
}

/* ========== 通用辉光圆（阳/阴/银/红/紫 五种色） ========== */
export function makeGlowTexture(colorKey = 'gold', size = 128) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');

  const map = {
    gold:   ['rgba(255,234,160,0.95)', 'rgba(255,200,100,0.40)', 'rgba(255,180,60,0)'],
    jade:   ['rgba(190,255,220,0.95)', 'rgba(120,230,180,0.40)', 'rgba(80,200,140,0)'],
    moon:   ['rgba(230,240,255,0.95)', 'rgba(180,200,235,0.40)', 'rgba(120,150,200,0)'],
    crimson:['rgba(255,180,170,0.95)', 'rgba(255,100,90,0.45)',  'rgba(200,30,30,0)'],
    purple: ['rgba(220,180,255,0.95)', 'rgba(170,110,220,0.40)', 'rgba(110,60,160,0)'],
  };
  const stops = map[colorKey] || map.gold;
  radialGlow(ctx, size/2, size/2, size/2, [
    [0, stops[0]],
    [0.35, stops[1]],
    [1, stops[2]],
  ]);
  // 中心高亮小核
  const core = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size*0.12);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  return PIXI.Texture.from(cnv);
}

/* ========== 月晕圆盘（用于天空氛围） ========== */
export function makeMoonHaloTexture(size = 256) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');

  // 外层柔光
  radialGlow(ctx, size/2, size/2, size/2, [
    [0,    'rgba(230,240,255,0.55)'],
    [0.25, 'rgba(200,220,250,0.30)'],
    [0.55, 'rgba(150,180,230,0.10)'],
    [1,    'rgba(100,130,180,0)'],
  ]);
  // 月亮本体（小圆）
  const moon = ctx.createRadialGradient(size*0.5, size*0.46, size*0.04, size*0.5, size*0.46, size*0.18);
  moon.addColorStop(0,   'rgba(255,255,245,1)');
  moon.addColorStop(0.6, 'rgba(245,235,210,0.85)');
  moon.addColorStop(1,   'rgba(220,200,170,0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, size, size);

  return PIXI.Texture.from(cnv);
}

/* ========== 地面古纹（罗盘 + 河图） ==========
 * 透明背景；使用时叠 alpha 即可
 */
export function makeGroundPatternTexture(w, h) {
  const cnv = document.createElement('canvas');
  cnv.width = w;
  cnv.height = h;
  const ctx = cnv.getContext('2d');

  const cx = w/2, cy = h*0.85;
  // 多层同心罗盘
  const radii = [Math.min(w*0.42, 220), Math.min(w*0.36, 188), Math.min(w*0.30, 156), Math.min(w*0.24, 124)];
  radii.forEach((r, i) => {
    ctx.strokeStyle = `rgba(220, 200, 150, ${(0.18 - i*0.04).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r*0.22, 0, 0, Math.PI*2);
    ctx.stroke();
  });

  // 罗盘八向辐条
  ctx.strokeStyle = 'rgba(240,210,150,0.20)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * radii[3], cy + Math.sin(a) * radii[3]*0.22);
    ctx.lineTo(cx + Math.cos(a) * radii[0], cy + Math.sin(a) * radii[0]*0.22);
    ctx.stroke();
  }

  // 河图点数（1-2-3-4-5-6-7-8-9-10 简化版）
  const dots = [
    { r: 6, x: cx - radii[0]*0.5, y: cy - 4 },
    { r: 6, x: cx - radii[0]*0.5 + 12, y: cy - 4 },
    { r: 5, x: cx - radii[0]*0.3, y: cy - 16 },
    { r: 5, x: cx + radii[0]*0.5 - 12, y: cy - 4 },
    { r: 5, x: cx + radii[0]*0.5, y: cy - 4 },
    { r: 7, x: cx + radii[0]*0.2, y: cy - 22 },
    { r: 5, x: cx + radii[0]*0.5 + 12, y: cy - 4 },
    { r: 4, x: cx + radii[0]*0.5 + 26, y: cy - 4 },
    { r: 4, x: cx - radii[0]*0.5 - 14, y: cy + 6 },
    { r: 4, x: cx - radii[0]*0.5 - 4, y: cy + 6 },
  ];
  dots.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(245,220,160,0.32)';
    ctx.fill();
  });

  // 微弱横向水波纹
  ctx.strokeStyle = 'rgba(170,190,220,0.10)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 4; i++) {
    const yy = cy + i * 6;
    ctx.beginPath();
    for (let x = 0; x < w; x += 4) {
      const yyy = yy + Math.sin(x*0.025 + i*0.7) * 1.6;
      if (x === 0) ctx.moveTo(x, yyy);
      else ctx.lineTo(x, yyy);
    }
    ctx.stroke();
  }

  return PIXI.Texture.from(cnv);
}

/* ========== 月光斜射纹理（用于树冠微光） ========== */
export function makeMoonRaysTexture(w = 320, h = 300) {
  const cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  const ctx = cnv.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(220,230,255,0.18)');
  g.addColorStop(0.4, 'rgba(200,210,240,0.04)');
  g.addColorStop(1, 'rgba(180,200,240,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 月光带条纹
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x0 = w * (0.3 + i*0.18);
    const band = ctx.createLinearGradient(x0, 0, x0 + 80, h);
    band.addColorStop(0, 'rgba(220,230,255,0)');
    band.addColorStop(0.5, 'rgba(220,230,255,0.08)');
    band.addColorStop(1, 'rgba(220,230,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(x0, 0, 80, h);
  }
  ctx.globalCompositeOperation = 'source-over';

  return PIXI.Texture.from(cnv);
}

/* ========== 一片古纹六瓣光花（触地粒子用） ========== */
export function makePetalTexture(size = 96, color = 'gold') {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');
  const cx = size/2, cy = size/2;

  // 六瓣
  const petalColors = {
    gold:    'rgba(255,200,100,',
    jade:    'rgba(150,230,180,',
    crimson: 'rgba(255,150,130,',
    purple:  'rgba(200,160,240,',
    moon:    'rgba(220,230,255,',
  };
  const c = petalColors[color] || petalColors.gold;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * size*0.16;
    const py = cy + Math.sin(a) * size*0.16;
    const rg = ctx.createRadialGradient(px, py, 0, px, py, size*0.34);
    rg.addColorStop(0, c + '0.85)');
    rg.addColorStop(0.6, c + '0.18)');
    rg.addColorStop(1, c + '0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(px, py, size*0.18, size*0.32, a, 0, Math.PI*2);
    ctx.fill();
  }
  // 中心核
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size*0.18);
  core.addColorStop(0, 'rgba(255,255,240,0.95)');
  core.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  return PIXI.Texture.from(cnv);
}

/* ========== 拖尾柔色（瀑布式叶尾） ========== */
export function makeTrailTexture(size = 64, color = 'gold') {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext('2d');
  const map = {
    gold:   'rgba(255,210,120,',
    jade:   'rgba(150,230,180,',
    crimson:'rgba(255,150,130,',
    purple: 'rgba(200,160,240,',
    moon:   'rgba(220,230,255,',
  };
  const c = map[color] || map.gold;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0, c + '0.85)');
  g.addColorStop(1, c + '0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return PIXI.Texture.from(cnv);
}

/* ========== 升级版树皮（细皮纹） ========== */
export function makeTrunkTexture(w = 64, h = 320) {
  const cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  const ctx = cnv.getContext('2d');

  // 主色
  const base = ctx.createLinearGradient(0, 0, w, 0);
  base.addColorStop(0,    '#1a0e06');
  base.addColorStop(0.18, '#3a2516');
  base.addColorStop(0.42, '#5a3a20');
  base.addColorStop(0.72, '#3d2814');
  base.addColorStop(1,    '#16090a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // 皮纹横线
  ctx.strokeStyle = 'rgba(20,8,4,0.7)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 32; i++) {
    const y = Math.random() * h;
    const lw = 0.5 + Math.random() * 1.4;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(0, y);
    // 锯齿状裂痕
    for (let x = 0; x < w; x += 6) {
      ctx.lineTo(x, y + (Math.random()-0.5)*1.6);
    }
    ctx.stroke();
  }
  // 结疤/节
  for (let i = 0; i < 5; i++) {
    const x = 4 + Math.random()*(w-8);
    const y = Math.random()*h;
    const rr = 1.5 + Math.random()*2.8;
    const ring = ctx.createRadialGradient(x, y, 0, x, y, rr*2.5);
    ring.addColorStop(0,    'rgba(80,55,30,0.9)');
    ring.addColorStop(0.5,  'rgba(40,22,10,0.4)');
    ring.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.ellipse(x, y, rr*2.5, rr*1.4, 0, 0, Math.PI*2);
    ctx.fill();
  }
  // 弱高光（月光从一侧）
  const sh = ctx.createLinearGradient(0, 0, w, 0);
  sh.addColorStop(0,   'rgba(150,170,210,0)');
  sh.addColorStop(0.6, 'rgba(180,200,230,0.12)');
  sh.addColorStop(1,   'rgba(180,200,230,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  return PIXI.Texture.from(cnv);
}

/* ========== 金粉流光（萤火虫升级版） ========== */
export function makeGoldDustTexture(size = 96) {
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext('2d');
  const cx = size/2, cy = size/2;

  // 外光晕
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size/2);
  g.addColorStop(0,    'rgba(255,225,150,0.55)');
  g.addColorStop(0.35, 'rgba(255,190,100,0.18)');
  g.addColorStop(1,    'rgba(220,160,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // 星形核心（四角）
  ctx.save();
  ctx.translate(cx, cy);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size*0.12);
  grad.addColorStop(0,   'rgba(255,250,235,1)');
  grad.addColorStop(0.5, 'rgba(255,220,150,0.6)');
  grad.addColorStop(1,   'rgba(255,200,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-cx, -cy, size, size);
  // 十字光芒
  ctx.globalCompositeOperation = 'lighter';
  const ray = ctx.createLinearGradient(-size/2, 0, size/2, 0);
  ray.addColorStop(0,   'rgba(255,230,160,0)');
  ray.addColorStop(0.5, 'rgba(255,230,160,0.85)');
  ray.addColorStop(1,   'rgba(255,230,160,0)');
  ctx.fillStyle = ray;
  ctx.fillRect(-size/2, -1, size, 2.2);
  const ray2 = ctx.createLinearGradient(0, -size/2, 0, size/2);
  ray2.addColorStop(0,   'rgba(255,230,160,0)');
  ray2.addColorStop(0.5, 'rgba(255,230,160,0.65)');
  ray2.addColorStop(1,   'rgba(255,230,160,0)');
  ctx.fillStyle = ray2;
  ctx.fillRect(-1, -size/2, 2.2, size);
  ctx.restore();

  return PIXI.Texture.from(cnv);
}

/* ========== 树整体剪影纹理（让树干与树叶天然合一） ========== */

/**
 * 绘制单棵"水墨秋树"剪影纹理。返回 Canvas（调用方自行 Texture.from）。
 * 树干、分枝、叶簇全部在同一个 Canvas 中按剪影路径连绘，避免渲染时
 * "树枝浮在叶片上"的视觉脱节。
 *
 * @param {number} w 纹理宽（px）
 * @param {number} h 纹理高（px）
 * @param {object} opts
 *   - baseY: 地面基线（相对 h），默认 0.94
 *   - 其它参数控制树的形态、配色、叶簇位置
 * @returns {HTMLCanvasElement}
 */
export function makeTreeSilhouetteCanvas(w, h, opts = {}) {
  const baseY = opts.baseY ?? Math.round(h * 0.94);
  const trunkColor = opts.trunkColor ?? '#3a2412';
  const trunkEdge  = opts.trunkEdge  ?? '#1a0e06';
  const leafCore   = opts.leafCore   ?? '#f0c060';
  const leafEdge   = opts.leafEdge   ?? '#7a3a14';
  const mistColor  = opts.mistColor  ?? '#dde6ff';
  const seed       = (opts.seed != null) ? opts.seed : (Math.random() * 1e9) | 0;
  const rand = mulberry32(seed);

  const cnv = document.createElement('canvas');
  cnv.width = Math.max(2, w | 0);
  cnv.height = Math.max(2, h | 0);
  const ctx = cnv.getContext('2d');

  // —— 1) 远景月雾（极淡） ——
  const fog = ctx.createLinearGradient(0, baseY - h * 0.55, 0, baseY);
  fog.addColorStop(0,   'rgba(220,228,255,0.00)');
  fog.addColorStop(0.6, 'rgba(180,190,220,0.18)');
  fog.addColorStop(1,   'rgba(80,90,120,0.28)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, baseY - h * 0.55, w, h * 0.6);

  // —— 2) 主树干 + 分枝（一个剪影路径里连绘） ——
  const cx = w * 0.5;
  const trunkTop = baseY - h * (0.55 + rand() * 0.05);
  const trunkBase = baseY;
  const trunkHW = Math.max(2.5, w * 0.018);
  const trunkHT = Math.max(2.5, w * 0.012);

  ctx.fillStyle = trunkColor;
  ctx.strokeStyle = trunkEdge;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 树干（用梯形 + 顶部分杈）
  ctx.beginPath();
  ctx.moveTo(cx - trunkHW * 1.2, trunkBase);
  ctx.bezierCurveTo(
    cx - trunkHW,         trunkBase - (trunkBase - trunkTop) * 0.55,
    cx - trunkHW * 0.85,  trunkTop + 6,
    cx - trunkHW * 0.15,  trunkTop + 2
  );
  ctx.lineTo(cx + trunkHW * 0.15, trunkTop + 2);
  ctx.bezierCurveTo(
    cx + trunkHW * 0.85,  trunkTop + 6,
    cx + trunkHW,         trunkBase - (trunkBase - trunkTop) * 0.55,
    cx + trunkHW * 1.2,   trunkBase
  );
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(1, trunkHT);
  ctx.stroke();

  // —— 3) 大枝（左右各 2～3 根，向外上扬） ——
  const branchDefs = [];
  const sideCount = 5;
  for (let i = 0; i < sideCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const yT = 0.18 + (i / sideCount) * 0.55 + rand() * 0.04;
    const len = h * (0.18 + rand() * 0.12);
    const ang = -Math.PI / 2 + side * (0.55 + rand() * 0.45);
    const sx = cx + side * trunkHW * 0.7;
    const sy = trunkBase - (trunkBase - trunkTop) * yT;
    branchDefs.push({ sx, sy, len, ang, side });
  }
  // 顶部直立枝
  branchDefs.push({
    sx: cx, sy: trunkTop + 2,
    len: h * (0.14 + rand() * 0.05),
    ang: -Math.PI / 2 + (rand() - 0.5) * 0.25,
    side: 0,
  });

  ctx.lineCap = 'round';
  branchDefs.forEach(b => {
    const ex = b.sx + Math.cos(b.ang) * b.len;
    const ey = b.sy + Math.sin(b.ang) * b.len;
    const w1 = Math.max(1.2, w * 0.012 * (1 - b.len / h));
    ctx.lineWidth = w1;
    ctx.strokeStyle = trunkColor;
    ctx.beginPath();
    ctx.moveTo(b.sx, b.sy);
    ctx.quadraticCurveTo(
      b.sx + Math.cos(b.ang) * b.len * 0.55,
      b.sy + Math.sin(b.ang) * b.len * 0.55 - 4,
      ex, ey
    );
    ctx.stroke();
    // 暗描
    ctx.lineWidth = Math.max(0.8, w1 * 0.45);
    ctx.strokeStyle = trunkEdge;
    ctx.beginPath();
    ctx.moveTo(b.sx, b.sy);
    ctx.quadraticCurveTo(
      b.sx + Math.cos(b.ang) * b.len * 0.55,
      b.sy + Math.sin(b.ang) * b.len * 0.55 - 4,
      ex, ey
    );
    ctx.stroke();
  });

  // —— 4) 顶端冠丛（金色叶簇，从末梢向外溢） ——
  // 用若干圆点 + 渐变叠加，营造水墨晕散感
  const leaves = [];
  branchDefs.forEach(b => {
    const ex = b.sx + Math.cos(b.ang) * b.len;
    const ey = b.sy + Math.sin(b.ang) * b.len;
    const cluster = 14 + Math.floor(rand() * 8);
    for (let k = 0; k < cluster; k++) {
      const t = rand();
      const cxL = ex + (rand() - 0.5) * w * 0.10;
      const cyL = ey + (rand() - 0.5) * h * 0.07 - rand() * 8;
      const r   = 3 + rand() * 7;
      leaves.push({ x: cxL, y: cyL, r, hot: rand() < 0.35 });
    }
  });
  // 顶部冠心补一团
  const topCx = cx;
  const topCy = trunkTop + 2;
  for (let k = 0; k < 26; k++) {
    leaves.push({
      x: topCx + (rand() - 0.5) * w * 0.32,
      y: topCy - rand() * h * 0.10,
      r: 3 + rand() * 9,
      hot: rand() < 0.4,
    });
  }

  // 先铺一层冷色暗底（雾气里的剪影）
  ctx.globalCompositeOperation = 'source-over';
  leaves.forEach(l => {
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0,   'rgba(40,28,16,0.55)');
    g.addColorStop(0.6, 'rgba(60,40,20,0.25)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // 再叠金叶层（add 混合）
  ctx.globalCompositeOperation = 'lighter';
  leaves.forEach(l => {
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    if (l.hot) {
      g.addColorStop(0,   'rgba(255,238,180,0.95)');
      g.addColorStop(0.4, 'rgba(240,192,96,0.55)');
      g.addColorStop(1,   'rgba(122,58,20,0)');
    } else {
      g.addColorStop(0,   'rgba(224,162,58,0.85)');
      g.addColorStop(0.6, 'rgba(176,88,40,0.35)');
      g.addColorStop(1,   'rgba(122,58,20,0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';

  // —— 5) 几片下落中的碎叶（点缀空气感） ——
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const fx = cx + (rand() - 0.5) * w * 0.7;
    const fy = trunkBase - h * (0.10 + rand() * 0.55);
    const fr = 2 + rand() * 3;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * 2.2);
    g.addColorStop(0, 'rgba(255,220,150,0.7)');
    g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // —— 6) 地面暗影（柔椭圆） ——
  const shG = ctx.createRadialGradient(cx, baseY + 2, 0, cx, baseY + 2, w * 0.30);
  shG.addColorStop(0,   'rgba(0,0,0,0.55)');
  shG.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = shG;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 2, w * 0.30, h * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  return cnv;
}

/* 简易可复现 PRNG（Mulberry32），用于纹理变体 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ========== 一整圈极简树形轮廓（现代化 UI 风格） ========== */
/**
 * 单个柔顺封闭路径 + 垂直渐变 + 月光高光，构成一个统一的「树冠」剪影。
 * 不绘制单片树叶，仅有一圈干净的轮廓 + 内层配色。
 * @param {number} w 画布宽度（建议与树所在容器同宽）
 * @param {number} h 画布高度
 * @param {object} opts
 *   - top:    顶部深色（默认 #5a2a10）
 *   - mid:    中部主色（默认 #c87a28）
 *   - bot:    底部亮色（默认 #f4cc70）
 *   - edge:    描边颜色（默认 #2a1408）
 *   - hl:     月光高光色（默认 #ffe6b0）
 *   - seed:   形状变体种子
 */
export function makeCanopySilhouetteCanvas(w, h, opts = {}) {
  const top  = opts.top  ?? '#5a2a10';
  const mid  = opts.mid  ?? '#c87a28';
  const bot  = opts.bot  ?? '#f4cc70';
  const edge = opts.edge ?? '#2a1408';
  const hl   = opts.hl   ?? '#ffe6b0';
  const seed = (opts.seed != null) ? opts.seed : 19937;
  const rand = mulberry32(seed);

  const cnv = document.createElement('canvas');
  cnv.width  = Math.max(2, w | 0);
  cnv.height = Math.max(2, h | 0);
  const ctx = cnv.getContext('2d');

  // 锚点：环绕圆心做轻微扰动，构成干净的有机轮廓
  const N = 10;
  const pts = [];
  const cx = w * 0.5;
  const cy = h * 0.46;
  const baseR = Math.min(w, h) * 0.42;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI * 0.5;
    const flatY = 0.82;            // 上下略压扁
    const wob = 1 + 0.06 * Math.sin(i * 2.3 + seed * 0.001);
    pts.push({
      x: cx + Math.cos(a) * baseR * wob,
      y: cy + Math.sin(a) * baseR * flatY * wob,
    });
  }

  // Catmull-Rom → 三次贝塞尔，闭合曲线
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    if (i === 0) ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.closePath();

  // 垂直渐变（顶深 → 中暖 → 底亮）
  const grad = ctx.createLinearGradient(0, cy - baseR, 0, cy + baseR);
  grad.addColorStop(0,    top);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1,    bot);
  ctx.fillStyle = grad;
  ctx.fill();

  // 干净描边（极细，呼应现代 UI）
  ctx.lineWidth   = Math.max(1, w * 0.006);
  ctx.strokeStyle = edge;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // 月光侧高光（右上方向，半径柔光，add 混合）
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createRadialGradient(
    cx + baseR * 0.55, cy - baseR * 0.25, 0,
    cx + baseR * 0.55, cy - baseR * 0.25, baseR * 0.9
  );
  hg.addColorStop(0,    'rgba(255,230,176,0.55)');
  hg.addColorStop(0.55, 'rgba(255,230,176,0.18)');
  hg.addColorStop(1,    'rgba(255,230,176,0)');
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.restore();

  // 底部暗影（贴近树干的衔接处稍暗，给冠下一点景深）
  ctx.save();
  const sg = ctx.createLinearGradient(0, cy + baseR * 0.35, 0, cy + baseR);
  sg.addColorStop(0, 'rgba(20,10,4,0.0)');
  sg.addColorStop(1, 'rgba(20,10,4,0.55)');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.restore();

  return cnv;
}

