/**
 * src/utils/canvas-drawer.js
 *
 * H5 版（与原 utils/canvas-drawer.js 几乎一致，去掉 module.exports 改用 ES Module 导出）
 * Canvas 2D 绘制工具：单枚铜钱、三铜钱动画、卦象。
 */

/**
 * setupCanvas(canvas, dpr) — 初始化画布（处理高 DPR）
 */
export function setupCanvas(canvas, dpr) {
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return ctx;
}

/** 单枚铜钱：外圆 + 内方孔 + 上下"字"/"幕" */
export function drawCoin(ctx, cx, cy, r, face, opts) {
  opts = opts || {};
  const color = opts.color || '#a0722d';
  const bg = opts.bg || '#f5e6b8';

  // 外圈
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  // 内方孔
  const innerR = r * 0.28;
  ctx.beginPath();
  ctx.rect(cx - innerR, cy - innerR, innerR * 2, innerR * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // 字
  ctx.fillStyle = color;
  ctx.font = `${r * 0.45}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('字', cx, cy - r * 0.55);
  ctx.fillText(face === '字' ? '幕' : '字', cx, cy + r * 0.55);
}

/** 三铜钱动画：coins=['字'|'幕', x3]，progress ∈ [0,1] 翻转中 */
export function drawCoinTrio(ctx, coins, progress) {
  const r = 40;
  const gap = 30;
  const total = r * 2 * 3 + gap * 2;
  const dpr = ctx._dpr || 1;
  const startX = (ctx.canvas.width / dpr - total) / 2 + r;
  const cy = 90;

  coins.forEach((face, i) => {
    const cx = startX + i * (r * 2 + gap);
    ctx.save();
    if (progress > 0 && progress < 1) {
      // 翻转中段：横向缩放制造翻面感
      const scaleX = Math.cos(progress * Math.PI);
      ctx.translate(cx, cy);
      ctx.scale(scaleX, 1);
      ctx.translate(-cx, -cy);
    }
    drawCoin(ctx, cx, cy, r, face);
    ctx.restore();
  });
}

/**
 * 画一卦：6 爻自上而下
 * lines: 自下而上，lines[0] 是最底爻
 */
export function drawHexagram(ctx, lines, opts) {
  opts = opts || Object.assign({
    lineLen: 160,
    gap: 24,
    x: 60,
    y: 40,
    yangColor: '#1a1a1a',
    yinColor: '#1a1a1a',
    changingColor: '#a8302a'
  }, opts);

  for (let i = 5; i >= 0; i--) {
    const line = lines[i];
    const ly = opts.y + (5 - i) * (opts.lineLen / 4 + opts.gap);
    const cx = opts.x + opts.lineLen / 2;

    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    if (line.yang) {
      ctx.strokeStyle = line.changing ? opts.changingColor : opts.yangColor;
      ctx.beginPath();
      ctx.moveTo(opts.x, ly);
      ctx.lineTo(opts.x + opts.lineLen, ly);
      ctx.stroke();
    } else {
      ctx.strokeStyle = line.changing ? opts.changingColor : opts.yinColor;
      const segLen = opts.lineLen * 0.42;
      const segGap = opts.lineLen * 0.16;
      ctx.beginPath();
      ctx.moveTo(opts.x, ly);
      ctx.lineTo(opts.x + segLen, ly);
      ctx.moveTo(opts.x + segLen + segGap, ly);
      ctx.lineTo(opts.x + opts.lineLen, ly);
      ctx.stroke();
    }

    if (line.changing) {
      ctx.strokeStyle = opts.changingColor;
      ctx.lineWidth = 4;
      const x0 = opts.x + opts.lineLen + 24;
      const s = 14;
      ctx.beginPath();
      ctx.moveTo(x0, ly - s);
      ctx.lineTo(x0 + s, ly + s);
      ctx.moveTo(x0 + s, ly - s);
      ctx.lineTo(x0, ly + s);
      ctx.stroke();
    }
  }
}