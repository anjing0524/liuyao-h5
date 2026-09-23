import { installOnly } from "../utils/wasm-loader.js";
import { get, set, KEY_LAST, KEY_CAST_HISTORY } from "../utils/storage.js";
import { esc, renderLines, positions, formatTime } from "../utils/view.js";
function installedTable(inst, lines) {
  if (!inst) return "";
  return `<p class="table-meta">${esc(inst.palace_zh)} · ${esc(inst.gua_wuxing)} · 世在${positions[inst.shi_position - 1]}爻 · 应在${positions[inst.ying_position - 1]}爻</p><table><thead><tr><th>爻位</th><th>阴阳</th><th>纳支</th><th>六亲</th><th>六神</th></tr></thead><tbody>${[5, 4, 3, 2, 1, 0].map((i) => `<tr class="${lines[i].changing ? "moving-table" : ""}"><th>${positions[i]}${inst.shi_position === i + 1 ? " · 世" : inst.ying_position === i + 1 ? " · 应" : ""}</th><td>${lines[i].yang ? "阳" : "阴"}${lines[i].changing ? " · 动" : ""}</td><td>${esc(inst.dizhis[i])}</td><td>${esc(inst.liuqin[i])}</td><td>${esc(inst.liushen[i])}</td></tr>`).join("")}</tbody></table>`;
}
export async function mountResult({ signal }) {
  const page = document.getElementById("page-result"),
    last = get(KEY_LAST);
  if (!last) {
    location.hash = "inquire";
    return;
  }
  page.innerHTML =
    '<div class="page-wrap empty-state"><span>◯</span><p role="status">六爻已成，正在展开卦象…</p></div>';
  let hex;
  try {
    hex = await installOnly(last.linesYang, last.lineKinds, last.castAtMs);
  } catch {
    if (signal.aborted) return;
    page.innerHTML =
      '<div class="page-wrap"><h1>六爻已保留</h1><p>卦象暂时未能展开，请重试。</p><button class="primary">重新展开</button></div>';
    page
      .querySelector("button")
      .addEventListener("click", () => mountResult({ signal }), {
        once: true,
        signal,
      });
    return;
  }
  if (signal.aborted) return;
  const id = last.id || `${last.castAtMs}:${last.linesYang}:${last.lineKinds}`,
    history = get(KEY_CAST_HISTORY, []);
  let saved = true;
  if (!history.some((r) => r.id === id || r.castAt === last.castAtMs)) {
    history.unshift({
      id,
      raw: last,
      hexName: hex.hex_name,
      hexIndex: hex.hex_index,
      hexNumber: hex.hex_number,
      hasChanging: hex.has_changing,
      castAt: last.castAtMs,
      question: last.question,
    });
    saved = set(KEY_CAST_HISTORY, history.slice(0, 100));
  }
  const moving = hex.lines.flatMap((l, i) =>
      l.changing ? [`${positions[i]}爻`] : [],
    ),
    g = hex.cast_at_gz,
    v = hex.verdict;
  page.innerHTML = `<div class="page-wrap result-page"><div class="result-kicker"><span class="overline">六爻已成 · 月下得卦</span><span class="date">${esc(formatTime(last.castAtMs))}</span></div><div class="question-quote"><span>所问</span><p>${esc(last.question?.question || "此刻所问")}</p></div><article class="hex-feature"><div class="result-symbol">${renderLines(hex.lines)}</div><div><p class="overline">本卦 / 第 ${esc(hex.hex_number)} 卦</p><h1>${esc(hex.hex_name)}</h1><p class="muted">${esc(hex.upper_nature_zh)}${esc(hex.upper_trigram_zh)}上 · ${esc(hex.lower_nature_zh)}${esc(hex.lower_trigram_zh)}下</p><p class="moving-note">${moving.length ? `${moving.join("、")}动` : "六爻安静 · 此卦无动爻"}</p></div></article>${hex.has_changing ? `<article class="changed-feature"><div><p class="overline">之卦 / 变化所向</p><h2>${esc(hex.changed_hex_name)}</h2><p class="muted">金色标记为本卦动爻</p></div><div class="mini-symbol">${renderLines(hex.changed_lines)}</div></article>` : ""}${v ? `<article class="reading"><p class="overline">卦象简析</p><h2>${esc(v.badge)}${v.badge !== v.level ? ` <span>${esc(v.level)}</span>` : ""}</h2><p>${esc(v.summary)}</p><details><summary>展开简析依据</summary><ul>${(v.reasons || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul></details></article>` : ""}<div class="calendar-line">${esc(g.year)}年 · ${esc(g.month)}月 · ${esc(g.day)}日 · ${esc(g.shichen)}时</div><details class="installation"><summary>本卦装卦 · 六亲六神 <span>＋</span></summary>${installedTable(hex.installed, hex.lines)}</details>${hex.has_changing ? `<details class="installation"><summary>变卦装卦 <span>＋</span></summary>${installedTable(hex.changed_installed, hex.changed_lines)}</details>` : ""}<p class="save-note">${saved ? "此卦已收入卦记，留待日后回看。" : "设备存储不可用，关闭页面后卦记可能丢失。"}</p><div class="result-actions"><a class="primary" href="#inquire">再问一事 ↗</a><a class="text-button" href="#history">翻阅卦记</a></div><p class="result-end">月有盈亏，事在人为。</p></div>`;
}
