/**
 * src/pages/index.js — 首页
 *
 * 三个按钮：开始起卦 / 历史记录 / 热门卦象
 */

export function mountIndex() {
  const page = document.getElementById('page-index');

  function goCast()       { location.hash = '#inquire'; }
  function goHistory()    { location.hash = '#history'; }
  function goLeaderboard(){ location.hash = '#leaderboard'; }

  function onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    if (a === 'goCast') goCast();
    else if (a === 'goHistory') goHistory();
    else if (a === 'goLeaderboard') goLeaderboard();
  }

  page.addEventListener('click', onClick);

  return () => page.removeEventListener('click', onClick);
}