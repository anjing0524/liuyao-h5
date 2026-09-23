/**
 * src/divination/tree-stage.js — 对 cast.js 的唯一门面（docs/05 §3）
 */
import { Application } from 'pixi.js';
import { TreeScene } from './TreeScene.js';

export async function createTreeStage(canvas) {
  const app = new Application();
  await app.init({
    canvas,
    resizeTo: canvas.parentElement,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    backgroundAlpha: 0,
    antialias: true,
  });

  const scene = new TreeScene();
  await scene.init(app);

  const onResize = () => scene.resize(app);
  window.addEventListener('resize', onResize);
  // 容器尺寸任何原因变化（tabbar 显隐、旋转等）都重新布局
  const ro = new ResizeObserver(() => onResize());
  ro.observe(canvas.parentElement);

  if (import.meta.env.DEV) window.__treeStage = { app, scene };  // 调试把手

  return {
    app,
    scene,
    /** 单次问卦：faces = ['front'|'back'] × 3 */
    roll: (faces) => scene.roll(faces),
    setProgress: (i) => scene.setProgress(i),
    destroy: () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      app.destroy(true, { children: true });
    },
  };
}
