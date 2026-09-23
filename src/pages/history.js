/**
 * src/pages/history.js — 历史记录
 *
 * 读 localStorage 列表渲染；提供清空。
 */

import { get, set as setStorage, KEY_CAST_HISTORY } from '../utils/storage.js';

export function mountHistory() {
  const page = document.getElementById('page-history');
  const $empty = page.querySelector('#history-empty');
  const $list = page.querySelector('#history-list');
  const $clearBtn = page.querySelector('#history-clear-btn');

  function render() {
    const list = get(KEY_CAST_HISTORY, []);
    if (list.length === 0) {
      $empty.hidden = false;
      $list.innerHTML = '';
      $clearBtn.hidden = true;
      return;
    }
    $empty.hidden = true;
    $list.innerHTML = list.map(item => {
      const upper = item.upperNature ? `${item.upperNature}${item.upperTrigram}` : '';
      const lower = item.lowerNature ? `${item.lowerNature}${item.lowerTrigram}` : '';
      const summary = (upper && lower) ? `${upper}上·${lower}下` : (item.hexName || '—');
      return `
        <div class="card record">
          <div class="row">
            <div class="label">卦象</div>
            ${item.hasChanging ? '<div class="badge">有动爻</div>' : ''}
          </div>
          <div class="hex-name">${escapeHtml(item.hexName || summary)}</div>
          <div class="muted">${escapeHtml(item.castAtText || '')}</div>
        </div>
      `;
    }).join('');
    $clearBtn.hidden = false;
  }

  function onClear() {
    if (!confirm('本地历史记录将被清空，确定吗？')) return;
    setStorage(KEY_CAST_HISTORY, []);
    render();
  }

  function onClick(e) {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'historyClear') onClear();
    else if (a === 'goCast') location.hash = '#inquire';
  }

  page.addEventListener('click', onClick);
  render();

  return () => page.removeEventListener('click', onClick);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}