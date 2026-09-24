import { MoonScene } from "../moon/MoonScene.js";
import { loadArt } from "../moon/art.js";
import { AudioSystem } from "../divination/AudioSystem.js";
import { ensureReady, rollOneLine, installOnly } from "../utils/wasm-loader.js";
import { get, set, KEY_CURRENT_QUESTION, KEY_LAST } from "../utils/storage.js";
import { renderLines, lineName, positions } from "../utils/view.js";
export function prepareCast() {
  return Promise.all([ensureReady(), loadArt()]);
}
export async function mountCast({ signal }) {
  const question = get(KEY_CURRENT_QUESTION);
  if (!question?.question) {
    location.hash = "inquire";
    return;
  }
  const page = document.getElementById("page-cast");
  page.innerHTML = `<div class="experience"><div class="stage"><div class="canvas-host"></div><div class="scene-shade"></div><header class="masthead"><a class="wordmark" href="#inquire">‹ 返回问事</a><button class="sound-toggle" aria-pressed="false">声音 · 关</button></header><div class="title-group"><h1>月下问卦</h1><p class="intro">心有所问 · 静候叶落</p></div><aside class="hexagram"><div class="hex-heading">此刻成爻 <small id="cast-count">0 / 6</small></div><div id="cast-lines"></div><div class="hex-foot">自下而上 · 六次成卦</div></aside><footer class="ritual-control"><p class="phase-message" aria-live="polite">静候月色</p><p class="latest-line">一念起，万物有应</p><button class="ask-button" disabled>载入中</button><div class="progress-dots"></div><div class="footnote">三叶一爻 · 六爻一卦</div></footer><div class="loading-screen"><div class="loading-moon">◯</div><h2>月下问卦</h2><p>正在铺开月色…</p></div><div class="error-message" hidden role="alert"></div></div></div>`;
  const $ = (s) => page.querySelector(s),
    audio = new AudioSystem();
  audio.setMuted(true);
  let disposed = false,
    ready = false,
    lastCount = 0;
  const castAtMs = Date.now(),
    id =
      globalThis.crypto?.randomUUID?.() ?? `${castAtMs}-${performance.now()}`;
  const messages = {
    loading: "静候月色",
    ready: "心有所问，轻叩此间",
    drawing: "静候一念",
    wind: "风起远山",
    falling: "三叶问天地",
    settling: "叶落，声息渐止",
    inscribing: "一爻入卦",
    revealing: "六爻已成，万籁归静",
    complete: "卦成",
    installing: "正在展开卦象",
    "result-error": "卦象已保留，请重试",
    error: "月色暂未铺开",
  };
  const scene = new MoonScene($(".canvas-host"), {
    state(phase, lines) {
      if (disposed || phase === "disposed") return;
      $(".loading-screen").hidden = phase !== "loading";
      $("#cast-lines").innerHTML = renderLines(lines, true);
      $("#cast-count").textContent = `${lines.length} / 6`;
      $(".phase-message").textContent = messages[phase] || "";
      $(".latest-line").textContent = lines.length
        ? `${positions[lines.length - 1]}爻 · ${lineName(lines.at(-1))}${lines.at(-1).changing ? " · 动爻" : ""}`
        : "一念起，万物有应";
      $(".progress-dots").innerHTML = Array.from(
        { length: 6 },
        (_, i) => `<i class="${i < lines.length ? "lit" : ""}"></i>`,
      ).join("");
      $(".ask-button").disabled = !(
        (phase === "ready" && ready) ||
        phase === "result-error"
      );
      $(".ask-button").textContent =
        phase === "result-error"
          ? "重试查看卦象"
          : phase === "ready"
            ? `问${positions[lines.length]}爻`
            : "静候叶落";
      if (lines.length > lastCount) {
        audio.stoneResonate();
        lastCount = lines.length;
      }
      if (phase === "complete") queueMicrotask(finish);
    },
    progress() {},
    error(message) {
      showError(message, true);
    },
    leafLand(i) {
      audio.leafLand(i);
    },
  });
  function showError(message, reload = false) {
    $(".error-message").hidden = false;
    $(".error-message").textContent =
      `${message}${reload ? "，请刷新页面重试。" : ""}`;
    $(".loading-screen").hidden = true;
  }
  async function finish() {
    if (disposed) return;
    scene.machine.transition("installing");
    const lines = scene.machine.lines;
    const last = {
      id,
      question,
      castAtMs,
      linesYang: lines.map((l) => l.yang),
      lineKinds: lines.map((l) => l.kind),
      faces: lines.map((l) => l.faces),
    };
    set(KEY_LAST, last);
    try {
      await installOnly(last.linesYang, last.lineKinds, castAtMs);
      if (!disposed) location.hash = "result";
    } catch {
      if (!disposed) {
        scene.machine.transition("result-error");
        showError("装卦暂时失败，六爻已保留，可点击下方重试。");
      }
    }
  }
  const owned = new AbortController();
  $(".ask-button").addEventListener(
    "click",
    async () => {
      if (scene.machine.phase === "result-error") {
        $(".error-message").hidden = true;
        return finish();
      }
      if (scene.machine.phase !== "ready" || !ready) return;
      scene.machine.transition("drawing");
      $(".error-message").hidden = true;
      try {
        const line = await rollOneLine();
        if (disposed) return;
        audio.windSwell();
        scene.ask(line);
      } catch {
        if (!disposed) {
          scene.machine.transition("ready");
          showError("本次未能起爻，请重试。");
        }
      }
    },
    { signal: owned.signal },
  );
  $(".sound-toggle").addEventListener(
    "click",
    async () => {
      const enable = audio.muted;
      await audio.init();
      if (disposed) return;
      audio.setMuted(!enable);
      $(".sound-toggle").textContent = `声音 · ${enable ? "开" : "关"}`;
      $(".sound-toggle").setAttribute("aria-pressed", String(enable));
    },
    { signal: owned.signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => (document.hidden ? audio.suspend() : !audio.muted && audio.resume()),
    { signal: owned.signal },
  );
  function dispose() {
    if (disposed) return;
    disposed = true;
    owned.abort();
    scene.destroy();
    audio.dispose();
  }
  signal.addEventListener("abort", dispose, { once: true });
  try {
    await ensureReady();
    if (!disposed) await scene.init();
    if (!disposed && scene.machine.phase === "ready") {
      ready = true;
      $(".ask-button").disabled = false;
      $(".ask-button").textContent = "问初爻";
    }
  } catch {
    if (!disposed) {
      if (scene.machine.phase !== "error") scene.machine.transition("error");
      showError("计算模块加载失败", true);
    }
  }
  return dispose;
}
