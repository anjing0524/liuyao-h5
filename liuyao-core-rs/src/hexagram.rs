//! 六十四卦（重卦）
//!
//! 命名采用通行周易卦序（1..64），但骨架不内置 64 卦爻辞全文——
//! 爻辞与卦辞属解读内容，未经验证不应塞进算法层。
//!
//! 本模块只做上下卦→卦名映射，不展开解读。

use crate::trigram;

/// 由 6 爻算出卦名（上下卦字面组合）
pub fn hex_name(lines: &[bool; 6]) -> String {
    let (l, u) = trigram::split_hexagram(lines);
    let lu = trigram::by_code(l);
    let uu = trigram::by_code(u);
    format!("{}{}上{}{}下", uu.nature_zh, uu.name_zh, lu.nature_zh, lu.name_zh)
    }