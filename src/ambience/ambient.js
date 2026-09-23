/** Shared decorative layer. No divination data or outcome is computed here. */
export function mountAmbience(host) {
  const trigrams = [7, 3, 5, 1, 0, 4, 2, 6];
  const marks = trigrams
    .map((bits, index) => {
      const lines = [0, 1, 2]
        .map((row) => {
          const y = -139 + row * 7;
          return bits & (1 << row)
            ? `<path d="M-14 ${y}h28"/>`
            : `<path d="M-14 ${y}h10m8 0h10"/>`;
        })
        .join("");
      return `<g transform="rotate(${index * 45})">${lines}</g>`;
    })
    .join("");
  const ticks = Array.from(
    { length: 64 },
    (_, i) =>
      `<path transform="rotate(${(i * 360) / 64})" d="M0 -164v${i % 8 === 0 ? 9 : 3}"/>`,
  ).join("");
  host.innerHTML = `<div class="ambient-landscape"></div><div class="ambient-veil"></div><div class="ambient-haze haze-one"></div><div class="ambient-haze haze-two"></div><div class="celestial-seal"><svg viewBox="-180 -180 360 360" fill="none" aria-hidden="true"><g class="seal-outer"><circle r="169"/><circle r="156"/>${ticks}</g><g class="seal-trigrams">${marks}<circle r="113" stroke-dasharray="1 9"/><circle r="103"/></g><g class="seal-core"><circle r="67"/><path class="taiji-light" d="M0 -67A67 67 0 0 1 0 67A33.5 33.5 0 0 1 0 0A33.5 33.5 0 0 0 0 -67Z"/><path d="M0 -67A33.5 33.5 0 0 1 0 0A33.5 33.5 0 0 0 0 67"/><circle class="taiji-dark" cy="-33.5" r="8"/><circle class="taiji-eye" cy="33.5" r="8"/></g></svg><div class="seal-aura"></div></div><div class="ambient-particles">${Array.from({ length: 24 }, (_, i) => `<i style="--x:${(i * 37 + 7) % 100}%;--y:${(i * 23 + 11) % 100}%;--duration:${12 + (i % 7) * 3}s;--delay:-${i * 1.9}s;--drift:${i % 2 ? 1 : -1};--size:${i % 4 === 0 ? 3 : 2}px"></i>`).join("")}</div><div class="ambient-grain"></div>`;
  const visibility = () =>
    document.body.classList.toggle("ambient-paused", document.hidden);
  document.addEventListener("visibilitychange", visibility);
  visibility();
  return () => document.removeEventListener("visibilitychange", visibility);
}
