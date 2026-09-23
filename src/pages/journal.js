import {
  get,
  set,
  remove,
  KEY_CURRENT_QUESTION,
  KEY_CAST_HISTORY,
  KEY_LAST,
} from "../utils/storage.js";
import { esc, formatTime } from "../utils/view.js";
export function mountHome() {
  document.getElementById("page-home").innerHTML =
    `<div class="home-art"></div><div class="home-copy"><p class="overline">月照万象 · 心有所问</p><h1>借一轮月色<br>照见心中事</h1><p>风过古树，三叶轻落。<br>把此刻的疑问，交给六次静候。</p><a class="primary" href="#inquire">写下所问 <span>↗</span></a><a class="subtle" href="#history">翻阅往日卦记</a></div><div class="home-bottom">一念起 · 六爻成 <span>MOON ORACLE / 六爻</span></div>`;
}
export function mountInquire({ signal }) {
  const page = document.getElementById("page-inquire"),
    old = get(KEY_CURRENT_QUESTION, {});
  page.innerHTML = `<div class="page-wrap"><p class="overline">01 / 心有所问</p><h1>此刻，心系何事？</h1><p class="muted">一卦一问。把事情说清，也给自己片刻宁静。</p><form><fieldset><legend>所问之事</legend><div class="categories">${["事业", "感情", "财运", "健康", "学业", "其他"].map((c, i) => `<label><input type="radio" name="category" value="${c}" ${old.category === c || (!old.category && i === 0) ? "checked" : ""}><span>${c}</span></label>`).join("")}</div></fieldset><label class="field-label" for="question">写下你的问题</label><textarea id="question" name="question" minlength="4" maxlength="500" required placeholder="例如：接下来三个月，我该如何推进手头的项目？">${esc(old.question || "")}</textarea><div class="form-meta"><span>具体的人、事与时间，更便于回看。</span><span id="char-count">${(old.question || "").length} / 500</span></div><p class="form-error" role="alert"></p><button class="primary" type="submit">步入月下 <span>↗</span></button></form><div class="quiet-note"><span>起卦之前</span><p>三片卦叶落定，记为一爻。<br>由初爻向上，六次成卦。动爻以金色标记。</p></div></div>`;
  page.querySelector("textarea").addEventListener(
    "input",
    (e) => {
      page.querySelector("#char-count").textContent =
        `${e.target.value.length} / 500`;
    },
    { signal },
  );
  page.querySelector("form").addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      const data = new FormData(e.target),
        question = data.get("question").trim();
      if (question.length < 4) {
        page.querySelector(".form-error").textContent =
          "请至少写下四个字，描述所问之事。";
        return;
      }
      set(KEY_CURRENT_QUESTION, { question, category: data.get("category") });
      remove(KEY_LAST);
      location.hash = "cast";
    },
    { signal },
  );
}
export function mountHistory({ signal }) {
  const page = document.getElementById("page-history");
  const render = () => {
    const list = get(KEY_CAST_HISTORY, []);
    page.innerHTML = `<div class="page-wrap"><p class="overline">JOURNAL / 月下卦记</p><div class="heading-row"><h1>往日所问</h1>${list.length ? '<button class="text-button" id="clear-history">清空卦记</button>' : ""}</div><p class="muted">留一页卦记，回看当时的念头。仅存于此设备。</p><div class="history-list">${list.length ? list.map((r, i) => `<article class="history-item"><div class="record-meta">${esc(formatTime(r.castAt))}<span>${esc(r.question?.category || "往日卦记")}</span></div><h2>${esc(r.hexName)} <span>${r.hasChanging ? "有动爻" : "静卦"}</span></h2><p>${esc(r.question?.question || "未记录所问")}</p>${r.raw ? `<button class="text-button" data-open="${i}">重读此卦 ↗</button>` : '<small class="muted">早期记录 · 未保存原始六爻</small>'}</article>`).join("") : '<div class="empty-state"><span>◯</span><h2>此处，尚无落笔</h2><p>第一次问卦后，卦记便会留在这里。</p><a href="#inquire" class="primary">去问一卦 ↗</a></div>'}</div><div id="clear-confirm" class="confirm-panel" hidden><p>清空此设备的全部卦记？此操作无法撤销。</p><button class="text-button" data-confirm>确认清空</button><button class="text-button" data-cancel>保留卦记</button></div></div>`;
  };
  render();
  page.addEventListener(
    "click",
    (e) => {
      const open = e.target.closest("[data-open]");
      if (open) {
        const r = get(KEY_CAST_HISTORY, [])[Number(open.dataset.open)];
        if (r?.raw) {
          set(KEY_LAST, r.raw);
          location.hash = "result";
        }
      }
      if (e.target.closest("#clear-history"))
        page.querySelector("#clear-confirm").hidden = false;
      if (e.target.closest("[data-cancel]"))
        page.querySelector("#clear-confirm").hidden = true;
      if (e.target.closest("[data-confirm]")) {
        remove(KEY_CAST_HISTORY);
        render();
      }
    },
    { signal },
  );
}
export function mountStats() {
  const list = get(KEY_CAST_HISTORY, []),
    counts = new Map();
  for (const r of list) counts.set(r.hexName, (counts.get(r.hexName) || 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  document.getElementById("page-leaderboard").innerHTML =
    `<div class="page-wrap"><p class="overline">REFLECTION / 卦象小记</p><h1>念念，皆有迹</h1><p class="muted">来自此设备的卦记，看看自己曾经关心什么。</p><div class="stats-grid"><div><strong>${list.length}</strong><span>次问卦</span></div><div><strong>${counts.size}</strong><span>种卦象</span></div><div><strong>${list.filter((r) => r.hasChanging).length}</strong><span>卦有动爻</span></div></div><h2 class="section-title">常见于你的卦记</h2>${
      ranked.length
        ? ranked
            .slice(0, 10)
            .map(
              ([name, n], i) =>
                `<div class="stat-row"><span class="muted">${String(i + 1).padStart(2, "0")}</span><span>${esc(name)}</span><small>${n} 次</small></div>`,
            )
            .join("")
        : '<p class="empty-copy">尚无记录。不必急于求问，等心有所问时再来。</p>'
    }<a class="primary" href="#inquire">月下再问 ↗</a></div>`;
}
