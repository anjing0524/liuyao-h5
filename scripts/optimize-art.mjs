import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const originalDir = new URL("../source-art/", import.meta.url);
const publicDir = new URL("../public/art/", import.meta.url);
let before = 0,
  after = 0;
for (const name of await readdir(originalDir)) {
  if (!name.endsWith(".png")) continue;
  const source = fileURLToPath(new URL(name, originalDir));
  const target = fileURLToPath(
    new URL(name.replace(/\.png$/, ".webp"), publicDir),
  );
  await sharp(source).webp({ lossless: true, effort: 6 }).toFile(target);
  const a = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const b = await sharp(target)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    a.info.width !== b.info.width ||
    a.info.height !== b.info.height ||
    a.data.length !== b.data.length
  )
    throw new Error(`${name}: dimensions changed`);
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i + 3] !== b.data[i + 3])
      throw new Error(`${name}: alpha changed`);
    // RGB under completely transparent pixels has no visible contribution.
    if (
      a.data[i + 3] &&
      (a.data[i] !== b.data[i] ||
        a.data[i + 1] !== b.data[i + 1] ||
        a.data[i + 2] !== b.data[i + 2])
    )
      throw new Error(`${name}: visible pixel changed at ${i / 4}`);
  }
  const input = (await stat(source)).size,
    output = (await stat(target)).size;
  before += input;
  after += output;
  console.log(
    `${name}: ${input} -> ${output} bytes; ${a.info.width}x${a.info.height}; all visible pixels and alpha identical`,
  );
}
console.log(
  `Textures: ${before} -> ${after} bytes (${((1 - after / before) * 100).toFixed(1)}% smaller)`,
);
