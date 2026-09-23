import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import init, {
  roll_one_line,
  install_only,
  cast_and_install,
} from "../src/wasm/liuyao_core.js";
await init({
  module_or_path: await readFile(
    new URL("../src/wasm/liuyao_core_bg.wasm", import.meta.url),
  ),
});
const time = Date.UTC(2026, 8, 23, 12);
test("真实 WASM：三片正反面与爻值一致", () => {
  const observed = new Set();
  for (let i = 0; i < 1000; i++) {
    const l = roll_one_line();
    assert.equal(l.faces.length, 3);
    assert.ok(l.faces.every((f) => typeof f === "boolean"));
    const n = l.faces.filter(Boolean).length;
    observed.add(n);
    assert.equal(l.yang, n % 2 === 1);
    assert.equal(l.changing, n === 0 || n === 3);
    assert.equal(l.kind, n === 0 ? -1 : n === 3 ? 1 : 0);
  }
  assert.equal(observed.size, 4);
});
test("真实 WASM：乾坤与全动爻的本卦变卦", () => {
  for (const yang of [true, false]) {
    const hex = install_only(
      Array(6).fill(yang),
      Array(6).fill(yang ? 1 : -1),
      time,
    );
    assert.equal(hex.hex_number, yang ? 1 : 2);
    assert.equal(hex.changed_hex_number, yang ? 2 : 1);
    assert.ok(hex.changed_lines.every((l) => l.yang === !yang && !l.changing));
    for (const key of ["dizhis", "liuqin", "liushen"]) {
      assert.equal(hex.installed[key].length, 6);
      assert.equal(hex.changed_installed[key].length, 6);
    }
    assert.ok(hex.verdict.summary);
    assert.ok(hex.cast_at_gz.day);
  }
});
test("真实 WASM：固定种子和时刻可复现", () => {
  assert.deepEqual(
    cast_and_install("测试", time, 42),
    cast_and_install("测试", time, 42),
  );
});
