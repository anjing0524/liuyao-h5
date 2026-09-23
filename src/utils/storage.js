/**
 * src/utils/storage.js — localStorage 包装
 *
 * 替代小程序的 wx.setStorageSync / wx.getStorageSync / wx.removeStorageSync。
 * 所有访问包在 try/catch 里（隐私模式或无痕浏览器可能抛错）。
 */

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage.set]', key, e);
    return false;
  }
}

export function remove(key) {
  try { localStorage.removeItem(key); } catch {}
}

/** 当前起卦问题 */
export const KEY_CURRENT_QUESTION = 'liuyao.currentQuestion';
/** 历史记录数组 */
export const KEY_CAST_HISTORY = 'liuyao.castHistory';