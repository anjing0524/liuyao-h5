const memory = new Map();
export function get(key, fallback = null) {
  if (memory.has(key)) return memory.get(key);
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function set(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function remove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {}
}
export const KEY_CURRENT_QUESTION = "liuyao.currentQuestion";
export const KEY_CAST_HISTORY = "liuyao.castHistory";
export const KEY_LAST = "liuyao.lastCast";
