import { Assets, Rectangle, Texture } from "pixi.js";
let pending;
export function loadArt(progress = () => {}) {
  if (!pending)
    pending = load(progress).catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending.then((art) => {
    progress(1);
    return art;
  });
}
async function load(progress) {
  const [m, f] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}art/manifest.json`),
    fetch(`${import.meta.env.BASE_URL}art/frames.json`),
  ]);
  if (!m.ok || !f.ok) throw new Error("场景素材清单加载失败");
  const manifest = await m.json(),
    frames = await f.json();
  for (const bundle of manifest.bundles)
    for (const asset of bundle.assets)
      asset.src = import.meta.env.BASE_URL + asset.src.replace(/^\.\//, "");
  await Assets.init({ manifest });
  const source = await Assets.loadBundle("moon-grove", progress),
    art = { landscape: source.landscape };
  for (const [key, item] of Object.entries(frames))
    art[key] = item.frame
      ? new Texture({
          source: source[item.source].source,
          frame: new Rectangle(...item.frame),
        })
      : source[item.source];
  return art;
}
