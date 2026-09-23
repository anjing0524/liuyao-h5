/**
 * src/pages/leaderboard.js — 榜单
 *
 * H5 版暂用本地聚合：从 history 统计出现过的卦象，按次数排序。
 * 云端榜单（如需）后续接 CloudBase 云函数。
 */

import { get, KEY_CAST_HISTORY } from '../utils/storage.js';

export function mountLeaderboard() {
  const page = document.getElementById('page-leaderboard');
  const $loading = page.querySelector('#leaderboard-loading');
  const $fallback = page.querySelector('#leaderboard-fallback');
  const $empty = page.querySelector('#leaderboard-empty');
  const $list = page.querySelector('#leaderboard-list');

  function aggregate() {
    const history = get(KEY_CAST_HISTORY, []);
    const map = new Map();  // hexIndex → { upperName, lowerName, count }
    for (const item of history) {
      if (item.hexIndex == null) continue;
      const key = item.hexIndex;
      const upperName = (item.upperNature || '') + (item.upperTrigram || '');
      const lowerName = (item.lowerNature || '') + (item.lowerTrigram || '');
      if (!map.has(key)) {
        map.set(key, { hexIndex: key, hexNumber: item.hexNumber || 0, upperName, lowerName, count: 0 });
      }
      const cur = map.get(key);
      if (!cur.hexNumber && item.hexNumber) cur.hexNumber = item.hexNumber;
      cur.count++;
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }

  function render() {
    $loading.hidden = true;
    const list = aggregate();
    if (list.length === 0) {
      $empty.hidden = false;
      $fallback.hidden = false;
      $list.innerHTML = '';
      return;
    }
    $empty.hidden = true;
    $fallback.hidden = true;
    $list.innerHTML = list.map((item, i) => `
      <div class="card item">
        <div class="rank">#${i + 1}</div>
        <div class="meta">
          <div class="hex-name">${escapeHtml(item.upperName || '—')}上 · ${escapeHtml(item.lowerName || '—')}下</div>
          <div class="muted">${item.hexNumber ? `卦序 #${item.hexNumber} · ` : ''}${item.count} 次</div>
        </div>
      </div>
    `).join('');
  }

  render();

  return () => {};
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}