/**
 * src/pages/result.js — 结果页（PIXI 炫酷版 · 紧凑布局）
 *
 * 从 cast 页跳转过来，读取暂存的 6 爻 → 调 wasm.installOnly() → 渲染。
 * 所有六爻计算（装卦/纳甲/世应/六亲/六神/吉凶速断）均在 Rust(wasm) 层完成，
 * 本文件只负责展示。
 *
 * 页面结构（自上而下，无滚动条为设计目标）：
 *   卦名 → 吉凶速断 → 卦象（PIXI 发光爻线）→ 干支一行
 *   → 装卦纳甲（折叠）→ 再起一卦
 */

import { installOnly } from '../utils/wasm-loader.js';
import { get, set as setStorage, KEY_CAST_HISTORY, remove } from '../utils/storage.js';
import { createHexagramStage } from '../pixi/hexagram-stage.js';

const LABELS = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

const SYMBOL_YANG = '━━━━━';   // 阳爻（实线）
const SYMBOL_YIN = '━　━';    // 阴爻（断线）

export async function mountResult() {
  const page = document.getElementById('page-result');
  const $name = page.querySelector('#result-hex-name');
  const $subtitle = page.querySelector('#result-hex-subtitle');
  const $qInline = page.querySelector('#result-q-inline');
  const $qText = page.querySelector('#result-q-text');
  const $hexCanvas = page.querySelector('#hex-canvas');
  const $installedCard = page.querySelector('#result-installed-card');
  const $linesTable = page.querySelector('#result-lines-table');
  const $guaMeta = page.querySelector('#result-gua-meta');
  const $gzInline = page.querySelector('#result-gz-inline');
  const $changedBox = page.querySelector('#result-changed-box');
  const $changedLabel = page.querySelector('#result-changed-label');
  const $changedSymbols = page.querySelector('#result-changed-symbols');
  const $verdictCard = page.querySelector('#result-verdict-card');
  const $verdictBadge = page.querySelector('#result-verdict-badge');
  const $verdictTitle = page.querySelector('#result-verdict-title');
  const $verdictSummary = page.querySelector('#result-verdict-summary');
  const $verdictReasons = page.querySelector('#result-verdict-reasons');

  // 读暂存
  const last = get('liuyao.lastCast');
  if (!last || !last.linesYang || last.linesYang.length !== 6) {
    // 没数据，回到首页
    location.hash = '/';
    return;
  }

  // 显示占问（紧凑一行）
  if (last.question) {
    $qText.textContent = last.question.question || '';
    $qInline.hidden = false;
  }

  // 调 wasm 装卦 + 吉凶速断（计算全在 Rust 层）
  let hex;
  try {
    hex = await installOnly(last.linesYang, last.lineKinds, last.castAtMs);
  } catch (e) {
    console.error('[result] wasm 失败：', e);
    alert('卦象装卦失败：' + (e.message || e));
    return;
  }

  if (!hex) {
    alert('卦象为空');
    return;
  }

  // 标题 / 副标题
  $name.textContent = hex.hex_name || '—';
  $subtitle.textContent =
    `${hex.upper_nature_zh || ''}${hex.upper_trigram_zh || ''}上 · ` +
    `${hex.lower_nature_zh || ''}${hex.lower_trigram_zh || ''}下 · ` +
    (hex.hex_number ? `卦序 #${hex.hex_number}` : '');

  // ===== 吉凶速断（wasm verdict，纯展示） =====
  const verdict = hex.verdict;
  if (verdict) {
    $verdictBadge.textContent = verdict.badge;
    $verdictBadge.className = `verdict-badge verdict-${verdict.level}`;
    $verdictTitle.textContent = `${verdict.level} · 速断`;
    $verdictSummary.textContent = verdict.summary;
    $verdictReasons.innerHTML = (verdict.reasons || []).map(r => `<div>· ${r}</div>`).join('');
    $verdictCard.hidden = false;
    $verdictReasons.hidden = false;
  }

  // ===== 卦象（PIXI） =====
  const lines = last.linesYang.map((yang, i) => ({
    yang,
    changing: last.lineKinds[i] === 1 || last.lineKinds[i] === -1
  }));
  const stage = createHexagramStage($hexCanvas, lines);
  await stage.ready;

  // ===== 干支一行 =====
  if (hex.cast_at_gz) {
    const g = hex.cast_at_gz;
    $gzInline.textContent = `${g.year}年 ${g.month}月 ${g.day}日 · ${g.shichen}时`;
  }

  // ===== 装卦表（折叠；数据全来自 wasm，爻序自下而上） =====
  if (hex.installed) {
    const symbols = last.linesYang.map(y => y ? SYMBOL_YANG : SYMBOL_YIN);
    const installed = hex.installed;
    const header = `
      <div class="lines-row lines-row-header">
        <span class="col col-idx">爻位</span>
        <span class="col col-sym">爻象</span>
        <span class="col col-dz">纳甲</span>
        <span class="col col-lq">六亲</span>
        <span class="col col-ls">六神</span>
      </div>
    `;
    const rows = symbols.map((sym, i) => {
      const changing = last.lineKinds[i] === 1 || last.lineKinds[i] === -1;
      const shi = installed.shi_position === i + 1;
      const ying = installed.ying_position === i + 1;
      const mark = shi ? '世' : ying ? '应' : '';
      return `
        <div class="lines-row">
          <span class="col col-idx">${LABELS[i]}${mark ? `<em class="shi-mark">${mark}</em>` : ''}</span>
          <span class="col col-sym ${changing ? 'changing' : ''}">${sym}</span>
          <span class="col col-dz">${installed.dizhis[i]}</span>
          <span class="col col-lq">${installed.liuqin[i]}</span>
          <span class="col col-ls">${installed.liushen[i]}</span>
        </div>
      `;
    }).join('');
    $linesTable.innerHTML = header + rows;
    $guaMeta.textContent =
      `${installed.palace_zh}（${installed.gua_wuxing}） · 世爻：第${installed.shi_position}爻 · 应爻：第${installed.ying_position}爻`;
    $installedCard.hidden = false;
  }

  // ===== 变卦（折叠区内） =====
  const hasChanged = (last.lineKinds || []).some(k => k === 1 || k === -1);
  if (hasChanged && hex.changed_hex_name) {
    $changedLabel.textContent = `变卦 · ${hex.changed_hex_name}`;
    const changedSymbols = last.linesYang.map((y, i) => {
      const k = last.lineKinds[i];
      if (k === 1) return SYMBOL_YIN;    // 老阳 → 变阴
      if (k === -1) return SYMBOL_YANG;  // 老阴 → 变阳
      return y ? SYMBOL_YANG : SYMBOL_YIN;
    });
    $changedSymbols.innerHTML = changedSymbols.map((s, i) => {
      const changing = last.lineKinds[i] === 1 || last.lineKinds[i] === -1;
      return `<span class="sym ${changing ? 'changing' : ''}">${s}</span>`;
    }).join('');
    $changedBox.hidden = false;
  }

  // 写入历史
  appendHistory({
    hexName: hex.hex_name,
    upperTrigram: hex.upper_trigram_zh,
    lowerTrigram: hex.lower_trigram_zh,
    upperNature: hex.upper_nature_zh,
    lowerNature: hex.lower_nature_zh,
    hasChanging: hasChanged,
    hexIndex: hex.hex_index,
    hexNumber: hex.hex_number,
    castAt: last.castAtMs,
    question: last.question,
    verdict: verdict ? verdict.level : null
  });

  function onAgain() {
    remove('liuyao.lastCast');
    location.hash = '#inquire';
  }

  function onClick(e) {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'resultAgain') onAgain();
  }

  page.addEventListener('click', onClick);

  return () => {
    page.removeEventListener('click', onClick);
    if (stage) stage.destroy();
  };
}

function appendHistory(entry) {
  const list = get(KEY_CAST_HISTORY, []);
  list.unshift({
    ...entry,
    castAt: entry.castAt,
    castAtText: formatTime(entry.castAt)
  });
  // 最多保留 100 条
  if (list.length > 100) list.length = 100;
  setStorage(KEY_CAST_HISTORY, list);
}

function formatTime(ts) {
  const d = new Date(ts);
  const pad = n => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
