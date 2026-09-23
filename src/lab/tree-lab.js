/**
 * src/lab/tree-lab.js — 摇树模块独立实验室
 * 只渲染 TreeScene，铺满 9:16 视口，用于自动截图迭代。
 */
import { createTreeStage } from '../divination/tree-stage.js';

const canvas = document.getElementById('lab-canvas');
const stage = await createTreeStage(canvas);
window.__lab = stage;

// 截图握手：场景首帧渲染完成后置位
stage.app.render();
requestAnimationFrame(() => {
  window.__treeReady = true;
});

// 调试 HUD：FPS / 设计高度
const hud = document.getElementById('lab-hud');
setInterval(() => {
  const fps = stage.app.ticker.FPS;
  const H = stage.scene.H;
  hud.textContent = `fps ${fps.toFixed(0)}  H ${H.toFixed(0)}  wind ${stage.scene.wind.toFixed(2)}`;
}, 500);
