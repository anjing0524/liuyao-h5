/**
 * src/pages/cast.js — 月下问树（docs/03 交互流程）
 *
 * 全屏沉浸式摇卦：场景铺满视口，UI 仅保留
 *   左上爻数 / 右上声音 / 底部问卦，
 * 六爻直接显现在石台上（scene.setLines）。
 */
import { rollOneLine, installOnly } from '../utils/wasm-loader.js';
import { get, set as setStorage, KEY_CURRENT_QUESTION } from '../utils/storage.js';
import { createTreeStage } from '../divination/tree-stage.js';
import { AudioSystem } from '../divination/AudioSystem.js';

const state = {
  linesYang: [],
  lineKinds: [],
  animating: false,
  castAtMs: Date.now(),
  question: null,
  stage: null,
  sound: true,
  audio: new AudioSystem(),
};

const YAO_NAMES = ['初', '二', '三', '四', '五', '上'];

/** 由 wasm 摇出的爻推导三片卦叶的正/背（正=阳面、背=阴面）
 *  规则：一正少阳、两正少阴、三正老阳、三背老阴 */
function facesFromLine(lineResult) {
  const kind = Number(lineResult.kind);
  const frontCount =
    kind === 1 ? 3 :        // 老阳：三正
    kind === -1 ? 0 :       // 老阴：三背
    (lineResult.yang ? 1 : 2);  // 少阳 1 正 / 少阴 2 正
  const faces = Array.from({ length: 3 }, (_, i) => i < frontCount ? 'front' : 'back');
  for (let i = faces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [faces[i], faces[j]] = [faces[j], faces[i]];
  }
  return faces;
}

export async function mountCast() {
  const page = document.getElementById('page-cast');
  const $progress = page.querySelector('#cast-progress');
  const $questionCard = page.querySelector('#cast-question-card');
  const $questionText = page.querySelector('#cast-question-text');
  const $questionCat = page.querySelector('#cast-question-cat');
  const $canvas = page.querySelector('#coin-canvas');
  const $rollBtn = page.querySelector('#cast-roll-btn');
  const $sound = page.querySelector('#cast-sound');
  const $verdict = page.querySelector('#cast-verdict');
  const $verdictName = page.querySelector('#cast-verdict-name');
  const $verdictSub = page.querySelector('#cast-verdict-sub');

  const stored = get(KEY_CURRENT_QUESTION);
  if (stored && stored.question) {
    state.question = stored;
    $questionText.textContent = stored.question;
    if (stored.category) {
      $questionCat.textContent = '· ' + stored.category;
      $questionCat.hidden = false;
    }
    $questionCard.hidden = false;
  } else {
    location.hash = '/';
    return;
  }

  state.linesYang = [];
  state.lineKinds = [];
  state.animating = false;
  state.castAtMs = Date.now();

  state.stage = await createTreeStage($canvas);
  state.stage.scene.setLines([], [], -1);
  state.stage.scene.onLeafLand = (i) => state.audio.leafLand(i);
  window.__castStage = state.stage;
  window.__castAudio = state.audio;
  window.__treeReady = true;

  // 浏览器要求用户手势后才能出声
  const ensureAudio = () => { state.audio.init().catch(() => {}); };
  const onVisibility = () => {
    if (document.hidden) state.audio.suspend();
    else state.audio.resume();
  };
  page.addEventListener('pointerdown', ensureAudio, { once: true });
  document.addEventListener('visibilitychange', onVisibility);

  function render() {
    const n = state.linesYang.length;
    if (n === 0) $progress.textContent = '初爻未起';
    else if (n >= 6) $progress.textContent = '六爻已满';
    else $progress.textContent = `${YAO_NAMES[n - 1]}爻已定 · 问${YAO_NAMES[n]}爻`;

    if (n >= 6) {
      $rollBtn.textContent = '六爻已满';
      $rollBtn.classList.add('disabled');
    } else {
      $rollBtn.textContent = state.animating ? '叶落中…' : '问 卦';
      $rollBtn.classList.remove('disabled');
    }
  }

  async function rollOne() {
    if (state.animating || state.linesYang.length >= 6) return;

    state.animating = true;
    render();

    let lineResult;
    try {
      lineResult = await rollOneLine();
    } catch (e) {
      console.error('[cast] wasm 失败：', e);
      alert('wasm 模块加载失败，请检查网络或刷新重试');
      state.animating = false;
      render();
      return;
    }

    const faces = facesFromLine(lineResult);
    state.audio.windSwell(1);
    await state.stage.roll(faces);

    state.linesYang.push(!!lineResult.yang);
    state.lineKinds.push(Number(lineResult.kind));
    state.stage.scene.setLines(state.linesYang, state.lineKinds, state.linesYang.length - 1);
    state.audio.stoneResonate();
    state.stage.setProgress(state.linesYang.length);

    state.animating = false;
    render();

    if (state.linesYang.length === 6) {
      // 成卦：风停/月出/镜头轻推 → 卦名浮现 → 再进入结果页
      let hex = null;
      try { hex = await installOnly(state.linesYang, state.lineKinds, state.castAtMs); }
      catch (e) { console.warn('[cast] 装卦失败：', e); }

      page.classList.add('revealing');
      setTimeout(() => {
        if (hex && hex.hex_name) {
          $verdictName.textContent = hex.hex_name;
          $verdictSub.textContent = hex.changed_hex_name ? `变卦 · ${hex.changed_hex_name}` : '';
          $verdict.classList.add('show');
        }
      }, 2200);

      setTimeout(() => {
        setStorage('liuyao.lastCast', {
          linesYang: state.linesYang,
          lineKinds: state.lineKinds,
          castAtMs: state.castAtMs,
          question: state.question,
          ts: Date.now(),
        });
        location.hash = '#result';
      }, 4800);
    }
  }

  function onRoll() { rollOne(); }

  function onReset() {
    if (!confirm('确定要重起吗？当前六爻将清空。')) return;
    state.linesYang = [];
    state.lineKinds = [];
    state.castAtMs = Date.now();
    state.animating = false;
    state.stage.scene.setLines([], [], -1);
    state.stage.setProgress(0);
    render();
  }

  function onSound() {
    state.sound = !state.sound;
    state.audio.init().catch(() => {});
    state.audio.setMuted(!state.sound);
    if ($sound) {
      $sound.textContent = state.sound ? '♪' : '∅';
      $sound.classList.toggle('muted', !state.sound);
    }
  }

  function onClick(e) {
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'castRoll') return onRoll();
    if (a === 'castReset') return onReset();
    if (a === 'castSound') return onSound();
  }

  page.addEventListener('click', onClick);

  // 预热 wasm（不等结果，只确保模块就位）
  rollOneLine().catch(() => {});

  render();

  return () => {
    page.removeEventListener('click', onClick);
    document.removeEventListener('visibilitychange', onVisibility);
    state.audio.dispose();
    if (state.stage) {
      state.stage.destroy();
      state.stage = null;
    }
  };
}
