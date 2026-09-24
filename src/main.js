import "./style.css";
import "./ambience/ambient.css";
import { mountAmbience } from "./ambience/ambient.js";
mountAmbience(document.querySelector(".ambient-scene"));
import {
  mountHome,
  mountInquire,
  mountHistory,
  mountStats,
} from "./pages/journal.js";
const routes = {
  "/": ["home", mountHome],
  inquire: ["inquire", mountInquire],
  cast: ["cast", null],
  result: ["result", null],
  history: ["history", mountHistory],
  leaderboard: ["leaderboard", mountStats],
};
// Route changes start at the top of the shared inner scroll area.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
let current, cleanup;
function warmCast(signal) {
  const warm = () => {
    if (signal.aborted || navigator.connection?.saveData) return;
    import("./pages/cast.js")
      .then((module) => {
        if (!signal.aborted) return module.prepareCast();
      })
      .catch(() => {
        /* Navigation will retry and show its normal loading state. */
      });
  };
  const idle = "requestIdleCallback" in window;
  const id = idle
    ? window.requestIdleCallback(warm, { timeout: 1500 })
    : setTimeout(warm, 500);
  signal.addEventListener(
    "abort",
    () => (idle ? window.cancelIdleCallback(id) : clearTimeout(id)),
    { once: true },
  );
}
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
    let mountPage = mount;
    if (!mountPage) {
      document.getElementById(`page-${name}`).innerHTML =
        '<div class="page-wrap"><p role="status">正在铺开月色…</p></div>';
      mountPage =
        name === "cast"
          ? (await import("./pages/cast.js")).mountCast
          : (await import("./pages/result.js")).mountResult;
      if (scope.signal.aborted) return;
    }
    const dispose = await mountPage({ signal: scope.signal });
    if (scope.signal.aborted) dispose?.();
    else {
      cleanup = dispose;
      if (name === "inquire") warmCast(scope.signal);
    }
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
