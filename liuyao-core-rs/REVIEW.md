# 六爻核心算法复核报告

复核范围：`liuyao-core-rs/src`（coin / trigram / hexagram / ganzhi / install_table / install / verdict / lib）

## 结论总览

| 模块 | 复核结果 |
|---|---|
| coin.rs 三铜钱起卦 | ✅ 正确（一背少阳/两背少阴/三背老阳/零背老阴；概率 1/8、1/8、3/8、3/8 与测试吻合） |
| trigram.rs 八经卦 | ✅ 逻辑正确；文档注释位序写反（已修正） |
| hexagram.rs 卦序映射 | ✅ 正确（未被 lib 主流程使用） |
| ganzhi.rs 干支历法 | ✅ 正确（tyme4rs：立春分年、节气分月、23点进日、日干起时，测试锚点全部验证） |
| install_table.rs 京房八宫 64 卦表 | ✅ 正确（palace_derivation 测试按变卦规则全量推演核对，64 卦无重复） |
| install.rs **纳甲** | ❌ **发现 Bug：巽、兑两卦地支起点互换（已修复）** |
| install.rs 六亲 / 六神 / 世应 | ✅ 正确 |
| verdict.rs 吉凶速断 | ✅ 旺相休囚死规则正确（评分权重属启发式设计，非错误） |

## 发现的 Bug（已修复）

**纳甲巽兑互换**（`install.rs::najia`）：

| 卦 | 标准纳甲（内卦/外卦） | 修复前代码 | 修复后 |
|---|---|---|---|
| 巽 | 内：丑亥酉 / 外：未巳卯 | 内：巳卯丑 / 外：亥酉未（错，是兑的） | ✅ 丑亥酉 / 未巳卯 |
| 兑 | 内：巳卯丑 / 外：亥酉未 | 内：丑亥酉 / 外：未巳卯（错，是巽的） | ✅ 巳卯丑 / 亥酉未 |

影响面：凡上卦或下卦为巽或兑的卦（共 28/64 卦）纳甲地支全错，进而六亲、世爻五行、吉凶速断连锁出错。
卦例验证：天风姤应"初丑、二亥、三酉、四午、五申、上戌"；雷泽归妹应"初巳、二卯、三丑、四午、五申、上戌"——修复前均算错。

同时修正两处文档错误：`trigram.rs` 头注释位序（实际为 初<<2｜中<<1｜上）、`install.rs` 纳甲文档中离内卦"卯未酉"应为"卯丑亥"。

已新增 4 个回归测试锁定全表：`najia_full_table`（8 纯卦全表）、`najia_tian_feng_gou`、`najia_feng_ze_zhong_fu`、`najia_lei_ze_gui_mei`。**27/27 测试全部通过。**

## 遗留事项（已全部处理，2026-09-22）

1. **`hex_index` 语义不一致**（✅ 已修复）：`hexagram.rs::hex_index` 与 `trigram.rs::xiantian_index` 经确认全仓库无调用方，已作为死代码删除；`lib.rs` 的 `hex_index` 字段注释明确为"code 序稳定 ID"。同时新增 `hex_number` 字段（周易通行卦序 1..64，属历史约定无公式可算，`install_table.rs` 新增 `king_wen` 列并附全表唯一性 + 锚点测试），前端 `result.js`/`leaderboard.js` 的"卦序 #N"显示改用 `hex_number`。
2. **`CastResult` 缺变卦卦名**（✅ 已修复）：补齐 `changed_hex_index/changed_hex_number/changed_hex_name`，删除死代码。
3. **WASM 产物需重新编译**（✅ 已完成）：`wasm-pack build --target web --out-dir ../src/wasm` 重新生成；Node 实测验证：天风姤纳甲"丑亥酉午申戌"、卦序 44、变卦乾为天卦序 1，雷泽归妹纳甲"巳卯丑午申戌"、卦序 54，全部正确。
4. verdict 评分权重（日辰 ±2、月建 ±1 等）属"速断层"启发式，与模块声明的定位一致，不算算法错误（维持现状）。

注：lib.rs 头部注释中过时的构建命令（`../utils/wasm` 与不存在的 `tools/patch-wasm-bindgen.py`）已修正为实际路径 `../src/wasm`。
