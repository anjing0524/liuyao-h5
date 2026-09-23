export const positions = ["初", "二", "三", "四", "五", "上"];
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const lineName = (l) =>
  `${l.changing ? "老" : "少"}${l.yang ? "阳" : "阴"}`;
export function renderLines(lines = [], pending = false) {
  return `<div class="yao-stack">${[5, 4, 3, 2, 1, 0]
    .map((i) => {
      const l = lines[i];
      return `<div class="yao-row ${l ? "is-filled" : ""} ${l?.changing ? "is-moving" : ""} ${pending && i === lines.length ? "is-next" : ""}" aria-label="${positions[i]}爻：${l ? lineName(l) : "待成"}"><span class="yao-position">${positions[i]}</span><span class="yao-symbol ${l && !l.yang ? "is-yin" : ""}"><i></i><i></i></span><span class="moving-mark">${l?.changing ? (l.yang ? "○" : "×") : ""}</span></div>`;
    })
    .join("")}</div>`;
}
export const formatTime = (ts) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
