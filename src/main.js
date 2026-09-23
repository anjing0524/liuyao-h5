/**
 * src/main.js — SPA 入口
 *
 * 用 hash 路由切换不同 page section。所有页面共享 index.html，
 * 每个 section 平时 hidden，路由切换时只显示目标。
 *
 * 路由表：
 *   /             → 首页
 *   #inquire      → 静心占问
 *   #cast         → 摇卦
 *   #result       → 结果（从 cast 跳转过来）
 *   #history      → 历史
 *   #leaderboard  → 榜单
 */

import { mountIndex } from './pages/index.js';
import { mountInquire } from './pages/inquire.js';
import { mountCast } from './pages/cast.js';
import { mountResult } from './pages/result.js';
import { mountHistory } from './pages/history.js';
import { mountLeaderboard } from './pages/leaderboard.js';
import { startBackground } from './pixi/background.js';

// 启动全局 PIXI 星空背景（只启动一次，挂在 #bg-canvas）
try {
  startBackground();
} catch (e) {
  console.warn('[bg] PIXI 背景启动失败：', e);
}

const routes = {
  '/':             { id: 'page-index',       nav: 0, mount: mountIndex },
  '#inquire':     { id: 'page-inquire',     nav: 1, mount: mountInquire },
  '#cast':        { id: 'page-cast',        nav: 1, mount: mountCast },
  '#result':      { id: 'page-result',      nav: -1, mount: mountResult },
  '#history':     { id: 'page-history',     nav: 2, mount: mountHistory },
  '#leaderboard': { id: 'page-leaderboard', nav: 3, mount: mountLeaderboard }
};

let currentUnmount = null;
let currentHash = null;

function show(cfg) {
  // 隐藏所有 .page
  document.querySelectorAll('.page').forEach(el => { el.hidden = true; });
  // 显示目标
  const el = document.getElementById(cfg.id);
  if (el) el.hidden = false;
  // 结果页为专注流程页：隐藏底部 tabbar，释放纵向空间（无滚动条目标）
  document.body.classList.toggle('no-tabbar', cfg.id === 'page-result');
  // 摇卦页：全屏沉浸（隐藏 tabbar / 全局星空背景）
  document.body.classList.toggle('casting', cfg.id === 'page-cast');
  // nav 高亮
  document.querySelectorAll('#tabbar .tab').forEach(t => t.classList.remove('active'));
  if (cfg.nav >= 0) {
    const tabs = document.querySelectorAll('#tabbar .tab');
    tabs[cfg.nav]?.classList.add('active');
  }
}

async function navigate() {
  const hash = location.hash || '/';
  // 空 hash 表示 /
  const key = hash === '' || hash === '#' ? '/' : hash;
  const cfg = routes[key] || routes['/'];

  if (key === currentHash) return;  // 同路由不重复挂载
  currentHash = key;

  // 卸载上一个
  if (typeof currentUnmount === 'function') {
    try { currentUnmount(); } catch (e) { console.warn('[unmount]', e); }
  }
  currentUnmount = null;

  // 显示目标 section
  show(cfg);

  // 挂载新页面
  try {
    const unmount = await cfg.mount();
    currentUnmount = typeof unmount === 'function' ? unmount : null;
  } catch (e) {
    console.error('[mount]', cfg.id, e);
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);

// 兜底：如果 main.js 加载晚于 DOMContentLoaded
if (document.readyState !== 'loading') navigate();