//! 吉凶速断（速断层，非完整断卦）
//!
//! 依据：
//!   1. 世爻五行 vs 日辰/月建五行 → 旺相休囚死（权重：日辰最高）
//!   2. 世应生克关系（比和/相生 → 顺；相克 → 阻）
//!   3. 动爻提示（阳动主进 / 阴动主退；世爻发动加权）
//!
//! 输出五级：大吉 / 吉 / 平 / 凶 / 大凶。
//! 本模块属于"速断层"——完整断卦（用神、原忌仇神、旬空月破等）不在本层实现。

use crate::ganzhi::{dizhi_index, DIZHI_WUXING};
use crate::install::{wx_ke, wx_sheng, InstalledHexagram};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct QuickVerdict {
    pub level: String,      // 大吉/吉/平/凶/大凶
    pub badge: String,      // 吉/平/凶（徽标单字）
    pub summary: String,    // 一句话结论
    pub reasons: Vec<String>, // 依据明细
    pub score: i32,
}

/// 其他五行相对「我」（世爻五行）的旺衰：
/// 同我=旺，他生我=相，我生他=休，我克他=囚，他克我=死
fn wang_xiang(mine: &str, other: &str) -> &'static str {
    if other == mine { "旺" }
    else if wx_sheng(other) == mine { "相" }
    else if wx_sheng(mine) == other { "休" }
    else if wx_ke(mine) == other { "囚" }
    else { "死" }
}

/// 干支（如 "己亥"）取支的五行
fn branch_wuxing(gz: &str) -> Option<&'static str> {
    let chars: Vec<char> = gz.chars().collect();
    if chars.len() < 2 { return None; }
    let dz: String = chars[1].to_string();
    let idx = dizhi_index(&dz);
    Some(DIZHI_WUXING[idx])
}

/// 干支取地支字符
fn branch_char(gz: &str) -> Option<char> {
    gz.chars().nth(1)
}

/// 吉凶速断主入口
///   - inst: 装卦结果（六爻自下而上）
///   - line_kinds: 6 爻类型（0=静, 1=老阳动, -1=老阴动）
///   - day_gz / month_gz: 起卦日/月干支
pub fn quick_verdict(
    inst: &InstalledHexagram,
    line_kinds: &[i8; 6],
    day_gz: &str,
    month_gz: &str,
) -> QuickVerdict {
    let mut reasons: Vec<String> = Vec::new();
    let mut score: i32 = 0;

    // 世爻 / 应爻地支（dizhis 自下而上，第 N 爻 = dizhis[N-1]）
    let shi_idx = (inst.shi_position as usize).saturating_sub(1);
    let ying_idx = (inst.ying_position as usize).saturating_sub(1);
    let shi_dz = inst.dizhis[shi_idx].as_str();
    let ying_dz = inst.dizhis[ying_idx].as_str();
    let shi_dz_idx = dizhi_index(shi_dz);
    let shi_wx = DIZHI_WUXING[shi_dz_idx];
    let ying_wx = DIZHI_WUXING[dizhi_index(ying_dz)];

    // 日辰对世爻（权重最高）
    if let (Some(day_b), Some(day_wx)) = (branch_char(day_gz), branch_wuxing(day_gz)) {
        let r = wang_xiang(shi_wx, day_wx);
        let delta: i32 = match r {
            "旺" => 2, "相" => 1, "休" => 0, "囚" => -1, _ => -2,
        };
        score += delta;
        let verb = if delta >= 0 { "生扶世爻" } else { "压制世爻" };
        reasons.push(format!(
            "日辰{}（{}）对世爻{}（{}）为「{}」，{}",
            day_b, day_wx, shi_dz, shi_wx, r, verb
        ));
    }

    // 月建对世爻
    if let (Some(mon_b), Some(mon_wx)) = (branch_char(month_gz), branch_wuxing(month_gz)) {
        let r = wang_xiang(shi_wx, mon_wx);
        let delta: i32 = match r {
            "旺" | "相" => 1, "休" | "囚" => 0, _ => -1,
        };
        score += delta;
        reasons.push(format!(
            "月建{}（{}）对世爻{}（{}）为「{}」",
            mon_b, mon_wx, shi_dz, shi_wx, r
        ));
    }

    // 世应生克
    if ying_wx == shi_wx {
        score += 1;
        reasons.push("世应比和，内外一心".to_string());
    } else if wx_sheng(shi_wx) == ying_wx || wx_sheng(ying_wx) == shi_wx {
        score += 1;
        reasons.push("世应相生，两情相谐".to_string());
    } else if wx_ke(shi_wx) == ying_wx || wx_ke(ying_wx) == shi_wx {
        score -= 1;
        reasons.push("世应相克，事多阻隔".to_string());
    }

    // 动爻
    let changing: Vec<usize> = (0..6)
        .filter(|&i| line_kinds[i] == 1 || line_kinds[i] == -1)
        .collect();
    if changing.is_empty() {
        reasons.push("六爻安静，事态平稳".to_string());
    } else {
        reasons.push(format!("本卦 {} 爻发动，事有变数", changing.len()));
        if line_kinds[shi_idx] == 1 {
            score += 1;
            reasons.push("世爻老阳发动，阳动主进".to_string());
        }
        if line_kinds[shi_idx] == -1 {
            score -= 1;
            reasons.push("世爻老阴发动，阴动主退".to_string());
        }
    }

    // 定级
    let (level, badge, summary) = if score >= 3 {
        ("大吉", "吉", "卦气旺相，世爻得日月生扶，所问之事大势可成，宜乘势而为。")
    } else if score >= 1 {
        ("吉", "吉", "世爻得扶，所问之事可图，把握时机、稳步推进则吉。")
    } else if score == 0 {
        ("平", "平", "卦气平和，事在两可之间，宜静观其变、谋定后动。")
    } else if score >= -2 {
        ("凶", "凶", "世爻受制，所问之事多有阻滞，宜缓图不宜强求。")
    } else {
        ("大凶", "凶", "世爻衰弱受克，此时不宜妄动，宜退守蓄势、另择时机。")
    };

    QuickVerdict {
        level: level.to_string(),
        badge: badge.to_string(),
        summary: summary.to_string(),
        reasons,
        score,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::install::install;

    #[test]
    fn verdict_zhen() {
        // 震为雷：世爻戌土（第 6 爻）
        let lines = [true, false, false, true, false, false];
        let inst = install(&lines, "己");
        let v = quick_verdict(&inst, &[0; 6], "己亥", "戊戌");
        // 亥水对戌土：土克水 → 我克他 = 囚
        assert!(v.reasons.iter().any(|r| r.contains("「囚」")));
        assert!(!v.level.is_empty());
    }

    #[test]
    fn verdict_badge_matches_level() {
        let lines = [true; 6]; // 乾为天，世爻戌土
        let inst = install(&lines, "甲");
        let v = quick_verdict(&inst, &[1, 0, 0, 0, 0, 0], "甲辰", "丙寅");
        // 辰土对戌土=旺；寅木对戌土=死（木克土）……仅验证结构与徽标一致
        let expect_badge = match v.level.as_str() {
            "大吉" | "吉" => "吉",
            "平" => "平",
            _ => "凶",
        };
        assert_eq!(v.badge, expect_badge);
        assert!(!v.reasons.is_empty());
    }
}
