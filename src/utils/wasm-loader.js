/**
 * src/utils/wasm-loader.js — H5 版 wasm 加载器
 *
 * 浏览器原生 WebAssembly + fetch + wasm-bindgen default init。
 *
 * 用法：
 *   import { installOnly, rollOneLine, castAndInstall, version, ensureReady } from './wasm-loader.js';
 *   await ensureReady();
 *   const hex = await installOnly(linesYang, lineKinds, Date.now());
 */

import init, {
  roll_one_line,
  install_only,
  cast_and_install,
  version as wasm_version,
} from "../wasm/liuyao_core.js";

let initPromise = null;

/** 确保 wasm 初始化完成（多次调用幂等） */
export function ensureReady() {
  if (!initPromise) {
    // 不传路径 → wasm-bindgen 用 import.meta.url 找 liuyao_core_bg.wasm
    // 产物放在 src/wasm/ 下由 Vite 打包，资产 URL 自动解析正确（dev / build 均可）
    initPromise = init().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

/** 摇一爻：返回 { yang: bool, changing: bool, kind: i8 } */
export async function rollOneLine() {
  await ensureReady();
  const line = roll_one_line();
  if (
    typeof line.yang !== "boolean" ||
    typeof line.changing !== "boolean" ||
    ![-1, 0, 1].includes(line.kind) ||
    line.faces?.length !== 3 ||
    !line.faces.every((f) => typeof f === "boolean")
  )
    throw new Error("Invalid WASM line");
  return line;
}

/** 仅装卦：传入 6 爻阴阳 + 类型 + 起卦时刻 */
export async function installOnly(linesYang, lineKinds, castAtMs) {
  if (
    linesYang?.length !== 6 ||
    lineKinds?.length !== 6 ||
    !linesYang.every((y) => typeof y === "boolean") ||
    !lineKinds.every(
      (k, i) =>
        [-1, 0, 1].includes(k) && (k === 0 || linesYang[i] === (k === 1)),
    ) ||
    !Number.isFinite(castAtMs)
  )
    throw new Error("Invalid six lines");
  await ensureReady();
  return install_only(linesYang, lineKinds, castAtMs);
}

/** 一次性起卦 + 装卦（wasm 端自摇） */
export async function castAndInstall(question, castAtMs, rngSeed) {
  await ensureReady();
  return cast_and_install(question, castAtMs, rngSeed ?? null);
}

/** wasm 版本号 */
export async function version() {
  await ensureReady();
  return wasm_version();
}
