import { test } from "node:test";
import assert from "node:assert/strict";
import { OracleMachine } from "../src/moon/flow.js";
test("六次成卦，拒绝重复点击与超量成爻", () => {
  const m = new OracleMachine();
  m.transition("ready");
  for (let i = 0; i < 6; i++) {
    m.transition("drawing");
    assert.throws(() => m.transition("drawing"));
    for (const p of ["wind", "falling", "settling", "inscribing"])
      m.transition(p);
    m.append({
      yang: true,
      changing: false,
      kind: 0,
      faces: [true, false, false],
    });
    m.transition(i === 5 ? "revealing" : "ready");
  }
  m.transition("complete");
  assert.equal(m.lines.length, 6);
  assert.throws(() => m.append({}));
  m.transition("installing");
  m.transition("result-error");
  m.transition("installing");
  m.transition("disposed");
  assert.throws(() => m.transition("ready"));
});
test("每个动画阶段都可安全离开", () => {
  for (const end of [
    "loading",
    "ready",
    "drawing",
    "wind",
    "falling",
    "settling",
    "inscribing",
  ]) {
    const m = new OracleMachine();
    if (end !== "loading")
      for (const p of [
        "ready",
        "drawing",
        "wind",
        "falling",
        "settling",
        "inscribing",
      ]) {
        m.transition(p);
        if (p === end) break;
      }
    m.transition("disposed");
    assert.throws(() => m.append({}));
  }
});
