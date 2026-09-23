//! liuyao-core — 六爻起卦与装卦核心算法
//!
//! # 模块
//! - [`coin`] 三铜钱起卦（一背少阳/两背少阴/三背老阳/零背老阴）
//! - [`trigram`] 八经卦（含先天八卦数与五行）
//! - [`hexagram`] 卦序映射
//! - [`ganzhi`] 天干地支、五行、时辰换算
//! - [`install_table`] 京房八宫 64 卦完整表
//! - [`install`] 装卦（纳甲 / 世应 / 六亲 / 六神）
//!
//! # 编译到 WASM
//! ```bash
//! wasm-pack build --target web --out-dir ../src/wasm
//! ```
//!
//! # 编译到 Node addon（napi-rs / neon 不在本骨架）
//! N-API 路径不适用于微信小程序；如需服务端 Node.js 集成，请直接使用
//! `cargo build --release` 暴露 rlib，或调用 wasm-pack 的 `--target nodejs`。
//!
//! # 不做什么
//! - 不内置 64 卦爻辞与卦辞（解读层内容，未经验证不应混入）
//! - 不实现"断卦"（用神旺衰、月破日破旬空等）——另一层逻辑

pub mod coin;
pub mod trigram;
pub mod hexagram;
pub mod ganzhi;
pub mod install_table;
pub mod install;
pub mod verdict;

use serde::Serialize;
use wasm_bindgen::prelude::*;

/// WASM 入口：完整起卦 + 装卦
/// 入参：
///   - question:  所问之事（占问）
///   - cast_at_ms: 起卦时刻（JS Date.now() 毫秒）
///   - rng_seed: 可选随机种子（None 时走 getrandom）
/// 返回：JSON 序列化后的完整结果（含装卦）
#[wasm_bindgen]
pub fn cast_and_install(question: &str, cast_at_ms: f64, rng_seed: Option<u32>) -> JsValue {
    let result = inner_cast_and_install(question, cast_at_ms as i64, rng_seed);
    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[derive(Serialize)]
pub struct CastResult {
    pub question: String,
    pub cast_at_ms: i64,
    pub cast_at_gz: CastAtGz,        // 年月日时干支
    pub lines: [coin::Line; 6],
    pub changed_lines: [coin::Line; 6],
    /// 稳定 ID：上卦code*8+下卦code（0..63，与 InstalledHexagram.hex_index 同义）
    pub hex_index: u8,
    /// 周易通行卦序（1..64）
    pub hex_number: u8,
    pub hex_name: String,             // 64 卦名
    pub upper_trigram_zh: String,
    pub lower_trigram_zh: String,
    pub upper_nature_zh: String,
    pub lower_nature_zh: String,
    pub has_changing: bool,
    pub changed_hex_index: Option<u8>,   // 变卦稳定 ID（无动爻时 None）
    pub changed_hex_number: Option<u8>,  // 变卦通行卦序
    pub changed_hex_name: Option<String>, // 变卦卦名
    pub installed: install::InstalledHexagram,
    pub changed_installed: Option<install::InstalledHexagram>,
    pub verdict: verdict::QuickVerdict, // 吉凶速断
}

#[derive(Serialize)]
pub struct CastAtGz {
    pub year: String,
    pub month: String,
    pub day: String,
    pub shichen: String,
}

pub fn inner_cast_and_install(question: &str, cast_at_ms: i64, rng_seed: Option<u32>) -> CastResult {
    use rand::SeedableRng;
    use rand::rngs::StdRng;

    let mut rng = match rng_seed {
        Some(s) => StdRng::seed_from_u64(s as u64),
        None => {
            // getrandom 在 wasm 下需要 js feature
            StdRng::from_entropy()
        }
    };

    let lines = coin::cast_hexagram(&mut rng);
    let changed = coin::changed_lines(&lines);

    let (lower_code, upper_code) = trigram::split_hexagram(&lines_bool(&lines));
    let lower_t = trigram::by_code(lower_code);
    let upper_t = trigram::by_code(upper_code);

    let hex_index = ((upper_t.code as u8) * 8) + lower_t.code as u8;

    let entry = install_table::lookup(upper_t.code, lower_t.code);
    let hex_name = entry.map(|e| e.name_zh.to_string()).unwrap_or_else(|| {
        format!("{}{}上{}{}下", upper_t.nature_zh, upper_t.name_zh, lower_t.nature_zh, lower_t.name_zh)
    });
    let hex_number = entry.map(|e| e.king_wen).unwrap_or(0);

    let (year, month, day, shichen) = ganzhi::ganzhi_from_ms(cast_at_ms);
    let day_tg: String = day.chars().take(1).collect();

    let installed = install::install(&lines_bool(&lines), &day_tg);

    // 吉凶速断（Rust 层完成，JS 仅展示）
    let mut kinds = [0i8; 6];
    for (i, l) in lines.iter().enumerate() {
        kinds[i] = l.kind;
    }
    let verdict = verdict::quick_verdict(&installed, &kinds, &day, &month);

    let has_changing = lines.iter().any(|l| l.changing);
    let (changed_hex_index, changed_hex_number, changed_hex_name, changed_installed) = if has_changing {
        let ch_lines = lines_bool(&changed);
        let (ch_lower_code, ch_upper_code) = trigram::split_hexagram(&ch_lines);
        let ch_entry = install_table::lookup(ch_upper_code, ch_lower_code);
        (
            Some(((ch_upper_code as u8) * 8) + ch_lower_code as u8),
            ch_entry.map(|e| e.king_wen),
            Some(ch_entry.map(|e| e.name_zh.to_string()).unwrap_or_else(|| {
                let ch_lower_t = trigram::by_code(ch_lower_code);
                let ch_upper_t = trigram::by_code(ch_upper_code);
                format!("{}{}上{}{}下", ch_upper_t.nature_zh, ch_upper_t.name_zh, ch_lower_t.nature_zh, ch_lower_t.name_zh)
            })),
            Some(install::install(&ch_lines, &day_tg)),
        )
    } else {
        (None, None, None, None)
    };

    CastResult {
        question: question.to_string(),
        cast_at_ms,
        cast_at_gz: CastAtGz { year, month, day, shichen },
        lines,
        changed_lines: changed,
        hex_index,
        hex_number,
        hex_name,
        upper_trigram_zh: upper_t.name_zh.to_string(),
        lower_trigram_zh: lower_t.name_zh.to_string(),
        upper_nature_zh: upper_t.nature_zh.to_string(),
        lower_nature_zh: lower_t.nature_zh.to_string(),
        has_changing,
        changed_hex_index,
        changed_hex_number,
        changed_hex_name,
        installed,
        changed_installed,
        verdict,
    }
}

fn lines_bool(lines: &[coin::Line; 6]) -> [bool; 6] {
    let mut out = [false; 6];
    for (i, l) in lines.iter().enumerate() {
        out[i] = l.yang;
    }
    out
}

/// 单独暴露：摇一爻（测试 / 教学用）
#[wasm_bindgen]
pub fn roll_one_line() -> JsValue {
    use rand::SeedableRng;
    use rand::rngs::StdRng;
    let mut rng = StdRng::from_entropy();
    let (line, faces) = coin::roll_line_with_faces(&mut rng);
    serde_wasm_bindgen::to_value(&RolledLine { yang: line.yang, changing: line.changing, kind: line.kind, faces }).unwrap()
}

/// Backward-compatible line fields plus exact coin/leaf faces.
#[derive(Serialize)]
struct RolledLine {
    yang: bool,
    changing: bool,
    kind: i8,
    faces: [bool; 3],
}

/// 仅装卦（不重新起卦）。
/// 入参：
///   - lines_yang: [bool; 6]   6 爻阴阳（自下而上）
///   - line_kinds: [i8; 6]     6 爻类型：0=静, 1=老阳, -1=老阴
///   - cast_at_ms: f64         起卦时刻（用于取年月日时干支）
/// 返回：JSON 对象（与 cast_and_install 同构，但 question/has_changing/cast_at_gz 字段稍不同）
#[wasm_bindgen]
pub fn install_only(lines_yang: js_sys::Array, line_kinds: js_sys::Array, cast_at_ms: f64) -> JsValue {
    let mut lines = [false; 6];
    let mut kinds = [0i8; 6];
    for i in 0..6 {
        lines[i] = lines_yang.get(i as u32).as_bool().unwrap_or(false);
        kinds[i] = line_kinds.get(i as u32).as_f64().unwrap_or(0.0) as i8;
    }

    let (lower_code, upper_code) = trigram::split_hexagram(&lines);
    let lower_t = trigram::by_code(lower_code);
    let upper_t = trigram::by_code(upper_code);

    let entry = install_table::lookup(upper_t.code, lower_t.code);
    let hex_name = entry.map(|e| e.name_zh.to_string()).unwrap_or_else(|| {
        format!("{}{}上{}{}下", upper_t.nature_zh, upper_t.name_zh, lower_t.nature_zh, lower_t.name_zh)
    });
    let hex_number = entry.map(|e| e.king_wen).unwrap_or(0);

    let (year, month, day, shichen) = ganzhi::ganzhi_from_ms(cast_at_ms as i64);
    let day_tg: String = day.chars().take(1).collect();
    let installed = install::install(&lines, &day_tg);

    // 还原变卦（动爻反转），与 cast_and_install 保持一致
    let mut changed_lines = [coin::Line { yang: false, changing: false, kind: 0 }; 6];
    for i in 0..6 {
        let is_changing = kinds[i] != 0;
        changed_lines[i] = if is_changing {
            coin::Line { yang: !lines[i], changing: false, kind: 0 }
        } else {
            coin::Line { yang: lines[i], changing: false, kind: 0 }
        };
    }
    let changed_lower_code = trigram::split_hexagram(&lines_bool(&changed_lines)).0;
    let changed_upper_code = trigram::split_hexagram(&lines_bool(&changed_lines)).1;
    let ch_lower_t = trigram::by_code(changed_lower_code);
    let ch_upper_t = trigram::by_code(changed_upper_code);
    let ch_entry = install_table::lookup(ch_upper_t.code, ch_lower_t.code);
    let ch_hex_name = ch_entry.map(|e| e.name_zh.to_string()).unwrap_or_else(|| {
        format!("{}{}上{}{}下", ch_upper_t.nature_zh, ch_upper_t.name_zh, ch_lower_t.nature_zh, ch_lower_t.name_zh)
    });
    let ch_hex_number = ch_entry.map(|e| e.king_wen).unwrap_or(0);
    let changed_installed = if kinds.iter().any(|&k| k != 0) {
        let ch_lines = lines_bool(&changed_lines);
        Some(install::install(&ch_lines, &day_tg))
    } else {
        None
    };

    let lines_struct: Vec<coin::Line> = (0..6).map(|i| coin::Line {
        yang: lines[i],
        changing: kinds[i] != 0,
        kind: kinds[i],
    }).collect();

    // 吉凶速断（Rust 层完成，JS 仅展示）
    let verdict = verdict::quick_verdict(&installed, &kinds, &day, &month);

    let result = InstallOnlyResult {
        question: String::new(),
        cast_at_ms: cast_at_ms as i64,
        cast_at_gz: CastAtGz { year, month, day, shichen },
        lines: lines_struct,
        changed_lines: changed_lines.to_vec(),
        hex_index: ((upper_t.code as u8) * 8) + lower_t.code as u8,
        hex_number,
        hex_name,
        upper_trigram_zh: upper_t.name_zh.to_string(),
        lower_trigram_zh: lower_t.name_zh.to_string(),
        upper_nature_zh: upper_t.nature_zh.to_string(),
        lower_nature_zh: lower_t.nature_zh.to_string(),
        changed_hex_index: ((ch_upper_t.code as u8) * 8) + ch_lower_t.code as u8,
        changed_hex_number: ch_hex_number,
        changed_hex_name: ch_hex_name,
        has_changing: kinds.iter().any(|&k| k != 0),
        installed,
        changed_installed,
        verdict,
    };
    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[derive(Serialize)]
pub struct InstallOnlyResult {
    pub question: String,
    pub cast_at_ms: i64,
    pub cast_at_gz: CastAtGz,
    pub lines: Vec<coin::Line>,
    pub changed_lines: Vec<coin::Line>,
    pub hex_index: u8,
    /// 周易通行卦序（1..64）
    pub hex_number: u8,
    pub hex_name: String,
    pub upper_trigram_zh: String,
    pub lower_trigram_zh: String,
    pub upper_nature_zh: String,
    pub lower_nature_zh: String,
    pub changed_hex_index: u8,
    pub changed_hex_number: u8,
    pub changed_hex_name: String,
    pub has_changing: bool,
    pub installed: install::InstalledHexagram,
    pub changed_installed: Option<install::InstalledHexagram>,
    pub verdict: verdict::QuickVerdict, // 吉凶速断
}

/// 暴露一些工具常量给前端（避免 JS 端再写一份）
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[wasm_bindgen(start)]
pub fn _start() {
    // 初始化 hook（目前无需）
}