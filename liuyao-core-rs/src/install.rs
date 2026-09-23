//! 装卦（纳甲 + 世应 + 六亲 + 六神）
//!
//! 装卦是六爻占卜的核心步骤——仅靠"6 爻"无法判断吉凶，必须
//! 把占问时刻的年/月/日/时干支以及动变关系映射到每一爻上。
//!
//! 本模块实现最常用的火珠林 / 京房纳甲法骨架：
//!   1. **纳甲**：内卦初爻起子月，外卦四爻起午月，按经卦顺逆排
//!   2. **定世应**：按京房八宫卦序（一世二三四五游归魂），世爻与应爻间隔两爻
//!   3. **排六亲**：以本卦宫五行为"我"，按生克比和关系 → 父母/兄弟/子孙/妻财/官鬼
//!   4. **安六神**：青龙、朱雀、勾陈、螣蛇、白虎、玄武，按日干起
//!
//! 注：本骨架只实现"装卦"骨架，不实现"断卦"。断卦涉及旺衰、用神、原忌仇神、
//! 月破日破旬空等，是另一层逻辑；未经验证不内置。

use crate::trigram;
use crate::install_table::{self, Palace};
use serde::Serialize;

/// 京房八宫卦序：
///   每一宫八卦，本宫卦在末位；一世到五世、游魂、归魂按世爻位置递推。
///   世爻位置：八纯=6, 一世=1, 二世=2, 三世=3, 四世=4, 五世=5, 游魂=4, 归魂=3
///   应爻位置：与世隔两爻（世1↔应4, 世2↔应5, 世3↔应6, 世4↔应1, 世5↔应2, 世6↔应3）
pub const SHI_POSITION_BY_KIND: [u8; 8] = [6, 1, 2, 3, 4, 5, 4, 3]; // index by kind 0..7
pub const YING_OFFSET: u8 = 3; // 应 = 世 + 3 (mod 6)

// 八宫五行（金=0, 木=1, 水=2, 火=3, 土=4）
pub const WUXING: [&str; 5] = ["金", "木", "水", "火", "土"];

/// 世爻位置（1..6）由卦在宫中的"次第"决定——查完整京房八宫表。
/// 表覆盖全部 64 卦；兜底分支仅防御性保留。
pub fn shi_position(upper_code: u8, lower_code: u8) -> u8 {
    match install_table::lookup(upper_code, lower_code) {
        Some(e) => install_table::shi_position_of(e.kind),
        None => {
            if upper_code == lower_code { 6 } else { 4 }
        }
    }
}

/// 卦宫名（如 "乾宫"）——查八宫表
pub fn palace_zh(upper_code: u8, lower_code: u8) -> &'static str {
    match install_table::lookup(upper_code, lower_code) {
        Some(e) => palace_name(e.palace),
        None => "",
    }
}

pub fn palace_name(p: Palace) -> &'static str {
    match p {
        Palace::Qian => "乾宫",
        Palace::Kun => "坤宫",
        Palace::Zhen => "震宫",
        Palace::Xun => "巽宫",
        Palace::Kan => "坎宫",
        Palace::Li => "离宫",
        Palace::Gen => "艮宫",
        Palace::Dui => "兑宫",
    }
}

/// 卦宫五行——按京房八宫归属查表（而非简化取下卦五行）
pub fn palace_wuxing_of(upper_code: u8, lower_code: u8) -> String {
    match install_table::lookup(upper_code, lower_code) {
        Some(e) => install_table::palace_wuxing(e.palace).to_string(),
        None => trigram::by_code(lower_code).wuxing.to_string(),
    }
}

/// 由世爻位置（1..6）算出应爻位置（1..6）
pub fn ying_position(shi: u8) -> u8 {
    ((shi + 2) % 6) + 1
}

/// 纳甲——内卦初爻起子，外卦四爻起午；按经卦顺/逆 + 隔位（步长 2）排地支。
///
/// 传统纳甲规则（核心）：
///   - 内卦（阳卦：乾震坎艮）：子寅辰 / 子寅辰 / 寅辰午 / 辰午申，顺行隔位
///   - 内卦（阴卦：坤巽离兑）：未巳卯 / 丑亥酉 / 卯丑亥 / 巳卯丑，逆行隔位
///   - 外卦（阳卦）：乾震午申戌 / 坎申戌子 / 艮戌子寅，顺行隔位
///   - 外卦（阴卦）：坤丑亥酉 / 巽未巳卯 / 离酉未巳 / 兑亥酉未，逆行隔位
pub fn najia(_lines: &[bool; 6], upper_code: u8, lower_code: u8) -> [String; 6] {
    let lower_trigram = trigram::by_code(lower_code);
    let upper_trigram = trigram::by_code(upper_code);
    let mut out: [String; 6] = Default::default();

    // 内卦：(方向, 起点地支索引)
    let (lower_dir, lower_start) = match lower_trigram.code {
        0b111 => (1_i32, 0_i32),   // 乾：子起顺
        0b100 => (1, 0),           // 震：子起顺
        0b010 => (1, 2),           // 坎：寅起顺
        0b001 => (1, 4),           // 艮：辰起顺
        0b000 => (-1, 7),          // 坤：未起逆（未巳卯）
        0b011 => (-1, 1),          // 巽：丑起逆（丑亥酉）
        0b101 => (-1, 3),          // 离：卯起逆（卯丑亥）
        0b110 => (-1, 5),          // 兑：巳起逆（巳卯丑）
        _ => (1, 0),
    };
    for i in 0..3 {
        let dz_idx = (lower_start + lower_dir * (i as i32 * 2)).rem_euclid(12) as usize;
        out[i] = crate::ganzhi::DIZHI[dz_idx].to_string();
    }

    // 外卦
    let (upper_dir, upper_start) = match upper_trigram.code {
        0b111 => (1, 6),   // 乾：午起顺（午申戌）
        0b100 => (1, 6),   // 震：午起顺（午申戌）
        0b010 => (1, 8),   // 坎：申起顺（申戌子）
        0b001 => (1, 10),  // 艮：戌起顺（戌子寅）
        0b000 => (-1, 1),  // 坤：丑起逆（丑亥酉）
        0b011 => (-1, 7),  // 巽：未起逆（未巳卯）
        0b101 => (-1, 9),  // 离：酉起逆（酉未巳）
        0b110 => (-1, 11), // 兑：亥起逆（亥酉未）
        _ => (1, 6),
    };
    for i in 0..3 {
        let dz_idx = (upper_start + upper_dir * (i as i32 * 2)).rem_euclid(12) as usize;
        out[3 + i] = crate::ganzhi::DIZHI[dz_idx].to_string();
    }
    out
}

/// 五行相生：甲生乙
pub fn wx_sheng(x: &str) -> &'static str {
    match x {
        "金" => "水", "水" => "木", "木" => "火", "火" => "土", "土" => "金",
        _ => "?",
    }
}

/// 五行相克：甲克乙
pub fn wx_ke(x: &str) -> &'static str {
    match x {
        "金" => "木", "木" => "土", "土" => "水", "水" => "火", "火" => "金",
        _ => "?",
    }
}

/// 排六亲：以"卦宫五行"为我，看每一爻地支的五行相对我。
/// 同我=兄弟，我克=妻财，克我=官鬼，我生=子孙，生我=父母
/// 返回六爻数组（自下而上）。
pub fn liuqin(dizhis: &[String; 6], gua_wuxing: &str) -> [String; 6] {
    let my = gua_wuxing;
    let mut out: [String; 6] = Default::default();
    for i in 0..6 {
        let dz = &dizhis[i];
        let dz_idx = crate::ganzhi::dizhi_index(dz);
        let wx = crate::ganzhi::DIZHI_WUXING[dz_idx];
        let lq = if wx == my {
            "兄弟"
        } else if wx_ke(my) == wx {
            "妻财"      // 我克者
        } else if wx_ke(wx) == my {
            "官鬼"      // 克我者
        } else if wx_sheng(my) == wx {
            "子孙"      // 我生者
        } else {
            "父母"      // 生我者
        };
        out[i] = lq.to_string();
    }
    out
}

/// 六神：青龙（初爻）、朱雀（二爻）、勾陈（三爻）、螣蛇（四爻）、白虎（五爻）、玄武（上爻）
/// 起法：按日干起。甲乙起青龙（初爻），丙丁起朱雀，戊日起勾陈，己日起螣蛇，庚辛起白虎，壬癸起玄武。
pub fn liushen(day_tiangan: &str) -> [&'static str; 6] {
    let start = match day_tiangan {
        "甲"|"乙" => 0, // 青龙
        "丙"|"丁" => 1, // 朱雀
        "戊"     => 2, // 勾陈
        "己"     => 3, // 螣蛇
        "庚"|"辛" => 4, // 白虎
        "壬"|"癸" => 5, // 玄武
        _ => 0,
    };
    let names = ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"];
    let mut out: [&'static str; 6] = Default::default();
    for i in 0..6 {
        out[i] = names[(start + i) % 6];
    }
    out
}

/// 装卦完整结果（骨架层）
#[derive(Debug, Clone, Serialize)]
pub struct InstalledHexagram {
    pub upper_name: String,           // 外卦名（如 "天"）
    pub lower_name: String,           // 内卦名（如 "泽"）
    pub upper_trigram_zh: String,     // 如 "乾"
    pub lower_trigram_zh: String,
    pub upper_wuxing: String,
    pub lower_wuxing: String,
    pub dizhis: [String; 6],          // 纳甲地支（自下而上）
    pub liuqin: [String; 6],          // 六亲
    pub liushen: [&'static str; 6],   // 六神
    pub shi_position: u8,             // 1..6
    pub ying_position: u8,            // 1..6
    pub gua_wuxing: String,           // 卦宫五行（用于排六亲）
    pub palace_zh: String,            // 卦宫名（如 "乾宫"）
    pub hex_index: u8,                // 0..63（上卦code*8+下卦code，稳定 ID）
    pub hex_number: u8,               // 周易通行卦序（1..64）
}

pub fn install(lines: &[bool; 6], day_tiangan: &str) -> InstalledHexagram {
    let (lower_code, upper_code) = trigram::split_hexagram(lines);
    let lower_t = trigram::by_code(lower_code);
    let upper_t = trigram::by_code(upper_code);
    let hex_idx = ((upper_code + 1) - 1) * 8 + ((lower_code + 1) - 1);

    // 卦宫五行：按京房八宫表归属（而非简化取下卦五行）
    let gua_wx = palace_wuxing_of(upper_code, lower_code);

    let dizhis = najia(lines, upper_code, lower_code);
    let liuqin = liuqin(&dizhis, &gua_wx);
    let liushen = liushen(day_tiangan);

    let shi = shi_position(upper_code, lower_code);
    let ying = ying_position(shi);
    let hex_number = install_table::lookup(upper_code, lower_code).map(|e| e.king_wen).unwrap_or(0);

    InstalledHexagram {
        upper_name: upper_t.nature_zh.to_string(),
        lower_name: lower_t.nature_zh.to_string(),
        upper_trigram_zh: upper_t.name_zh.to_string(),
        lower_trigram_zh: lower_t.name_zh.to_string(),
        upper_wuxing: upper_t.wuxing.to_string(),
        lower_wuxing: lower_t.wuxing.to_string(),
        dizhis,
        liuqin,
        liushen,
        shi_position: shi,
        ying_position: ying,
        gua_wuxing: gua_wx,
        palace_zh: palace_zh(upper_code, lower_code).to_string(),
        hex_index: hex_idx,
        hex_number,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn najia_basic() {
        // 乾为天：内乾（初子、二寅、三辰）+ 外乾（四午、五申、六戌）
        let lines = [true, true, true, true, true, true];
        let (l, u) = trigram::split_hexagram(&lines);
        let d = najia(&lines, u, l);
        assert_eq!(d[0], "子");
        assert_eq!(d[1], "寅");
        assert_eq!(d[2], "辰");
        assert_eq!(d[3], "午");
        assert_eq!(d[4], "申");
        assert_eq!(d[5], "戌");
    }

    /// 京房纳甲全表回归：8 经卦内外卦地支（依《卜筮正宗》/《火珠林》标准）
    #[test]
    fn najia_full_table() {
        // (上卦, 下卦, 期望六爻地支[自下而上])
        let cases: [(u8, u8, [&str; 6]); 8] = [
            // 乾为天：乾内子寅辰 / 乾外午申戌
            (0b111, 0b111, ["子","寅","辰","午","申","戌"]),
            // 坤为地：坤内未巳卯 / 坤外丑亥酉
            (0b000, 0b000, ["未","巳","卯","丑","亥","酉"]),
            // 震为雷：震内子寅辰 / 震外午申戌
            (0b100, 0b100, ["子","寅","辰","午","申","戌"]),
            // 巽为风：巽内丑亥酉 / 巽外未巳卯
            (0b011, 0b011, ["丑","亥","酉","未","巳","卯"]),
            // 坎为水：坎内寅辰午 / 坎外申戌子
            (0b010, 0b010, ["寅","辰","午","申","戌","子"]),
            // 离为火：离内卯丑亥 / 离外酉未巳
            (0b101, 0b101, ["卯","丑","亥","酉","未","巳"]),
            // 艮为山：艮内辰午申 / 艮外戌子寅
            (0b001, 0b001, ["辰","午","申","戌","子","寅"]),
            // 兑为泽：兑内巳卯丑 / 兑外亥酉未
            (0b110, 0b110, ["巳","卯","丑","亥","酉","未"]),
        ];
        for (u, l, expected) in cases {
            let lines = [false; 6]; // 地支只取决于上下卦，与爻阴阳无关
            let d = najia(&lines, u, l);
            for (i, e) in expected.iter().enumerate() {
                assert_eq!(&d[i], e, "上卦{} 下卦{} 第{}爻", u, l, i + 1);
            }
        }
    }

    /// 经典卦例：天风姤（乾上巽下）——初丑、二亥、三酉、四午、五申、上戌
    #[test]
    fn najia_tian_feng_gou() {
        // 巽 = 初阴、二阳、三阳 → 自下而上 [false, true, true]
        let lines = [false, true, true, true, true, true];
        let (l, u) = trigram::split_hexagram(&lines);
        assert_eq!((u, l), (0b111, 0b011));
        let d = najia(&lines, u, l);
        assert_eq!(d, ["丑","亥","酉","午","申","戌"].map(|s| s.to_string()));
    }

    /// 经典卦例：雷泽归妹（震上兑下）——初巳、二卯、三丑、四午、五申、上戌
    #[test]
    fn najia_lei_ze_gui_mei() {
        // 兑 = 初阳、二阳、三阴；震 = 初阳、二阴、三阴
        let lines = [true, true, false, true, false, false];
        let (l, u) = trigram::split_hexagram(&lines);
        assert_eq!((u, l), (0b100, 0b110));
        let d = najia(&lines, u, l);
        assert_eq!(d, ["巳","卯","丑","午","申","戌"].map(|s| s.to_string()));
    }

    /// 经典卦例：风泽中孚（巽上兑下）——初巳、二卯、三丑、四未、五巳、上卯
    #[test]
    fn najia_feng_ze_zhong_fu() {
        let lines = [true, true, false, false, true, true];
        let (l, u) = trigram::split_hexagram(&lines);
        assert_eq!((u, l), (0b011, 0b110));
        let d = najia(&lines, u, l);
        assert_eq!(d, ["巳","卯","丑","未","巳","卯"].map(|s| s.to_string()));
    }

    #[test]
    fn liushen_basic() {
        assert_eq!(liushen("甲")[0], "青龙");
        assert_eq!(liushen("丙")[0], "朱雀");
        assert_eq!(liushen("戊")[0], "勾陈");
        assert_eq!(liushen("己")[0], "螣蛇");
        assert_eq!(liushen("庚")[0], "白虎");
        assert_eq!(liushen("壬")[0], "玄武");
    }

    #[test]
    fn liuqin_qian() {
        // 乾为天（乾宫金）：子水子孙、寅木妻财、辰土父母、午火官鬼、申金兄弟、戌土父母
        let d = ["子","寅","辰","午","申","戌"].map(|s| s.to_string());
        let lq = liuqin(&d, "金");
        assert_eq!(lq[0], "子孙");
        assert_eq!(lq[1], "妻财");
        assert_eq!(lq[2], "父母");
        assert_eq!(lq[3], "官鬼");
        assert_eq!(lq[4], "兄弟");
        assert_eq!(lq[5], "父母");
    }

    #[test]
    fn install_zhen() {
        // 震为雷（震宫木，八纯卦世 6 应 3）
        let lines = [true, false, false, true, false, false];
        let inst = install(&lines, "己");
        assert_eq!(inst.gua_wuxing, "木");
        assert_eq!(inst.palace_zh, "震宫");
        assert_eq!(inst.shi_position, 6);
        assert_eq!(inst.ying_position, 3);
    }

    #[test]
    fn install_gou_fulgurum() {
        // 天风姤（乾宫金，一世卦世 1 应 4）——验证卦宫按八宫表而非下卦五行
        let lines = [false, true, true, true, true, true];
        let inst = install(&lines, "甲");
        assert_eq!(inst.gua_wuxing, "金");
        assert_eq!(inst.palace_zh, "乾宫");
        assert_eq!(inst.shi_position, 1);
        assert_eq!(inst.ying_position, 4);
    }
}