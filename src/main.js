import "./style.css";
import "./ambience/ambient.css";
import { mountAmbience } from "./ambience/ambient.js";
mountAmbience(document.querySelector(".ambient-scene"));
import { mountCast } from "./pages/cast.js";
import { mountResult } from "./pages/result.js";
import {
  mountHome,
  mountInquire,
  mountHistory,
  mountStats,
} from "./pages/journal.js";
const routes = {
  "/": ["home", mountHome],
  inquire: ["inquire", mountInquire],
  cast: ["cast", mountCast],
  result: ["result", mountResult],
  history: ["history", mountHistory],
  leaderboard: ["leaderboard", mountStats],
};
// Route changes start at the top of the shared inner scroll area.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
let current, cleanup;
async function navigate() {
  current?.abort();
  cleanup?.();
  cleanup = null;
  const scope = (current = new AbortController());
  const key = location.hash.replace(/^#\/?/, "") || "/";
  const [name, mount] = routes[key] || routes["/"];
  document.body.dataset.page = name;
  document
    .querySelectorAll("main>section")
    .forEach((p) => (p.hidden = p.id !== `page-${name}`));
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.hash === `#${key}`) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.querySelector("main").scrollTo(0, 0);
  try {
    const dispose = await mount({ signal: scope.signal });
    if (scope.signal.aborted) dispose?.();
    else cleanup = dispose;
  } catch (error) {
    if (!scope.signal.aborted) {
      console.error(error);
      document.getElementById(`page-${name}`).textContent =
        "页面暂时未能载入，请刷新重试。";
    }
  }
}
window.addEventListener("hashchange", navigate);
navigate();
