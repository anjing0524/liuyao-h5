//! 八宫六十四卦完整世应表（京房纳甲法）
//!
//! 八宫 64 卦，每宫 8 卦，按"本宫卦→一世→二世→三世→四世→五世→游魂→归魂"排列。
//! 世爻位置：
//!   本宫=6, 一世=1, 二世=2, 三世=3, 四世=4, 五世=5, 游魂=4, 归魂=3
//! 应爻位置：与世爻隔两爻（世+3 mod 6），如世1→应4, 世2→应5, 世3→应6, 世4→应1, 世5→应2, 世6→应3
//!
//! 表格：[(上卦 code, 下卦 code, 卦名, 宫属, 次第)] × 64
//! 编码：乾=111 兑=110 离=101 震=100 巽=011 坎=010 艮=001 坤=000
//!
//! 变卦规则（自本宫卦推演，表按此规则逐一核对）：
//!   一世：初爻变；二世：初二爻变；三世：下三爻全变；
//!   四世：下三爻变+四爻变；五世：下五爻变；
//!   游魂：五世卦的四爻变回；归魂：下三爻变回本宫。

/// 宫属（用于装卦"本宫卦"判定与卦宫五行）
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Palace {
    Qian,  // 乾宫（金）
    Kun,   // 坤宫（土）
    Zhen,  // 震宫（木）
    Xun,   // 巽宫（木）
    Kan,   // 坎宫（水）
    Li,    // 离宫（火）
    Gen,   // 艮宫（土）
    Dui,   // 兑宫（金）
}

pub fn palace_wuxing(p: Palace) -> &'static str {
    match p {
        Palace::Qian | Palace::Dui => "金",
        Palace::Zhen | Palace::Xun => "木",
        Palace::Kan => "水",
        Palace::Li => "火",
        Palace::Gen | Palace::Kun => "土",
    }
}

/// 一卦的索引信息
#[derive(Debug, Clone, Copy)]
pub struct HexEntry {
    pub upper: u8,
    pub lower: u8,
    pub name_zh: &'static str,
    pub palace: Palace,
    /// 0=本宫, 1..5=一世..五世, 6=游魂, 7=归魂
    pub kind: u8,
    /// 周易通行卦序（1..64，乾为天=1 … 水火未济=64）
    pub king_wen: u8,
}

pub fn shi_position_of(kind: u8) -> u8 {
    [6u8, 1, 2, 3, 4, 5, 4, 3][kind as usize]
}

/// 64 卦完整数据表（京房八宫，按变卦规则推演核对）
pub const TABLE: [HexEntry; 64] = [
    // 乾宫（金）— 八纯→五世→游魂→归魂
    HexEntry { upper: 0b111, lower: 0b111, name_zh: "乾为天",     palace: Palace::Qian, kind: 0, king_wen: 1 },
    HexEntry { upper: 0b111, lower: 0b011, name_zh: "天风姤",     palace: Palace::Qian, kind: 1, king_wen: 44 },
    HexEntry { upper: 0b111, lower: 0b001, name_zh: "天山遁",     palace: Palace::Qian, kind: 2, king_wen: 33 },
    HexEntry { upper: 0b111, lower: 0b000, name_zh: "天地否",     palace: Palace::Qian, kind: 3, king_wen: 12 },
    HexEntry { upper: 0b011, lower: 0b000, name_zh: "风地观",     palace: Palace::Qian, kind: 4, king_wen: 20 },
    HexEntry { upper: 0b001, lower: 0b000, name_zh: "山地剥",     palace: Palace::Qian, kind: 5, king_wen: 23 },
    HexEntry { upper: 0b101, lower: 0b000, name_zh: "火地晋",     palace: Palace::Qian, kind: 6, king_wen: 35 },
    HexEntry { upper: 0b101, lower: 0b111, name_zh: "火天大有",   palace: Palace::Qian, kind: 7, king_wen: 14 },

    // 兑宫（金）
    HexEntry { upper: 0b110, lower: 0b110, name_zh: "兑为泽",     palace: Palace::Dui, kind: 0, king_wen: 58 },
    HexEntry { upper: 0b110, lower: 0b010, name_zh: "泽水困",     palace: Palace::Dui, kind: 1, king_wen: 47 },
    HexEntry { upper: 0b110, lower: 0b000, name_zh: "泽地萃",     palace: Palace::Dui, kind: 2, king_wen: 45 },
    HexEntry { upper: 0b110, lower: 0b001, name_zh: "泽山咸",     palace: Palace::Dui, kind: 3, king_wen: 31 },
    HexEntry { upper: 0b010, lower: 0b001, name_zh: "水山蹇",     palace: Palace::Dui, kind: 4, king_wen: 39 },
    HexEntry { upper: 0b000, lower: 0b001, name_zh: "地山谦",     palace: Palace::Dui, kind: 5, king_wen: 15 },
    HexEntry { upper: 0b100, lower: 0b001, name_zh: "雷山小过",   palace: Palace::Dui, kind: 6, king_wen: 62 },
    HexEntry { upper: 0b100, lower: 0b110, name_zh: "雷泽归妹",   palace: Palace::Dui, kind: 7, king_wen: 54 },

    // 离宫（火）
    HexEntry { upper: 0b101, lower: 0b101, name_zh: "离为火",     palace: Palace::Li,  kind: 0, king_wen: 30 },
    HexEntry { upper: 0b101, lower: 0b001, name_zh: "火山旅",     palace: Palace::Li,  kind: 1, king_wen: 56 },
    HexEntry { upper: 0b101, lower: 0b011, name_zh: "火风鼎",     palace: Palace::Li,  kind: 2, king_wen: 50 },
    HexEntry { upper: 0b101, lower: 0b010, name_zh: "火水未济",   palace: Palace::Li,  kind: 3, king_wen: 64 },
    HexEntry { upper: 0b001, lower: 0b010, name_zh: "山水蒙",     palace: Palace::Li,  kind: 4, king_wen: 4 },
    HexEntry { upper: 0b011, lower: 0b010, name_zh: "风水涣",     palace: Palace::Li,  kind: 5, king_wen: 59 },
    HexEntry { upper: 0b111, lower: 0b010, name_zh: "天水讼",     palace: Palace::Li,  kind: 6, king_wen: 6 },
    HexEntry { upper: 0b111, lower: 0b101, name_zh: "天火同人",   palace: Palace::Li,  kind: 7, king_wen: 13 },

    // 震宫（木）
    HexEntry { upper: 0b100, lower: 0b100, name_zh: "震为雷",     palace: Palace::Zhen, kind: 0, king_wen: 51 },
    HexEntry { upper: 0b100, lower: 0b000, name_zh: "雷地豫",     palace: Palace::Zhen, kind: 1, king_wen: 16 },
    HexEntry { upper: 0b100, lower: 0b010, name_zh: "雷水解",     palace: Palace::Zhen, kind: 2, king_wen: 40 },
    HexEntry { upper: 0b100, lower: 0b011, name_zh: "雷风恒",     palace: Palace::Zhen, kind: 3, king_wen: 32 },
    HexEntry { upper: 0b000, lower: 0b011, name_zh: "地风升",     palace: Palace::Zhen, kind: 4, king_wen: 46 },
    HexEntry { upper: 0b010, lower: 0b011, name_zh: "水风井",     palace: Palace::Zhen, kind: 5, king_wen: 48 },
    HexEntry { upper: 0b110, lower: 0b011, name_zh: "泽风大过",   palace: Palace::Zhen, kind: 6, king_wen: 28 },
    HexEntry { upper: 0b110, lower: 0b100, name_zh: "泽雷随",     palace: Palace::Zhen, kind: 7, king_wen: 17 },

    // 巽宫（木）
    HexEntry { upper: 0b011, lower: 0b011, name_zh: "巽为风",     palace: Palace::Xun,  kind: 0, king_wen: 57 },
    HexEntry { upper: 0b011, lower: 0b111, name_zh: "风天小畜",   palace: Palace::Xun,  kind: 1, king_wen: 9 },
    HexEntry { upper: 0b011, lower: 0b101, name_zh: "风火家人",   palace: Palace::Xun,  kind: 2, king_wen: 37 },
    HexEntry { upper: 0b011, lower: 0b100, name_zh: "风雷益",     palace: Palace::Xun,  kind: 3, king_wen: 42 },
    HexEntry { upper: 0b111, lower: 0b100, name_zh: "天雷无妄",   palace: Palace::Xun,  kind: 4, king_wen: 25 },
    HexEntry { upper: 0b101, lower: 0b100, name_zh: "火雷噬嗑",   palace: Palace::Xun,  kind: 5, king_wen: 21 },
    HexEntry { upper: 0b001, lower: 0b100, name_zh: "山雷颐",     palace: Palace::Xun,  kind: 6, king_wen: 27 },
    HexEntry { upper: 0b001, lower: 0b011, name_zh: "山风蛊",     palace: Palace::Xun,  kind: 7, king_wen: 18 },

    // 坎宫（水）
    HexEntry { upper: 0b010, lower: 0b010, name_zh: "坎为水",     palace: Palace::Kan, kind: 0, king_wen: 29 },
    HexEntry { upper: 0b010, lower: 0b110, name_zh: "水泽节",     palace: Palace::Kan, kind: 1, king_wen: 60 },
    HexEntry { upper: 0b010, lower: 0b100, name_zh: "水雷屯",     palace: Palace::Kan, kind: 2, king_wen: 3 },
    HexEntry { upper: 0b010, lower: 0b101, name_zh: "水火既济",   palace: Palace::Kan, kind: 3, king_wen: 63 },
    HexEntry { upper: 0b110, lower: 0b101, name_zh: "泽火革",     palace: Palace::Kan, kind: 4, king_wen: 49 },
    HexEntry { upper: 0b100, lower: 0b101, name_zh: "雷火丰",     palace: Palace::Kan, kind: 5, king_wen: 55 },
    HexEntry { upper: 0b000, lower: 0b101, name_zh: "地火明夷",   palace: Palace::Kan, kind: 6, king_wen: 36 },
    HexEntry { upper: 0b000, lower: 0b010, name_zh: "地水师",     palace: Palace::Kan, kind: 7, king_wen: 7 },

    // 艮宫（土）
    HexEntry { upper: 0b001, lower: 0b001, name_zh: "艮为山",     palace: Palace::Gen, kind: 0, king_wen: 52 },
    HexEntry { upper: 0b001, lower: 0b101, name_zh: "山火贲",     palace: Palace::Gen, kind: 1, king_wen: 22 },
    HexEntry { upper: 0b001, lower: 0b111, name_zh: "山天大畜",   palace: Palace::Gen, kind: 2, king_wen: 26 },
    HexEntry { upper: 0b001, lower: 0b110, name_zh: "山泽损",     palace: Palace::Gen, kind: 3, king_wen: 41 },
    HexEntry { upper: 0b101, lower: 0b110, name_zh: "火泽睽",     palace: Palace::Gen, kind: 4, king_wen: 38 },
    HexEntry { upper: 0b111, lower: 0b110, name_zh: "天泽履",     palace: Palace::Gen, kind: 5, king_wen: 10 },
    HexEntry { upper: 0b011, lower: 0b110, name_zh: "风泽中孚",   palace: Palace::Gen, kind: 6, king_wen: 61 },
    HexEntry { upper: 0b011, lower: 0b001, name_zh: "风山渐",     palace: Palace::Gen, kind: 7, king_wen: 53 },

    // 坤宫（土）
    HexEntry { upper: 0b000, lower: 0b000, name_zh: "坤为地",     palace: Palace::Kun, kind: 0, king_wen: 2 },
    HexEntry { upper: 0b000, lower: 0b100, name_zh: "地雷复",     palace: Palace::Kun, kind: 1, king_wen: 24 },
    HexEntry { upper: 0b000, lower: 0b110, name_zh: "地泽临",     palace: Palace::Kun, kind: 2, king_wen: 19 },
    HexEntry { upper: 0b000, lower: 0b111, name_zh: "地天泰",     palace: Palace::Kun, kind: 3, king_wen: 11 },
    HexEntry { upper: 0b100, lower: 0b111, name_zh: "雷天大壮",   palace: Palace::Kun, kind: 4, king_wen: 34 },
    HexEntry { upper: 0b110, lower: 0b111, name_zh: "泽天夬",     palace: Palace::Kun, kind: 5, king_wen: 43 },
    HexEntry { upper: 0b010, lower: 0b111, name_zh: "水天需",     palace: Palace::Kun, kind: 6, king_wen: 5 },
    HexEntry { upper: 0b010, lower: 0b000, name_zh: "水地比",     palace: Palace::Kun, kind: 7, king_wen: 8 },
];

/// 由上下卦 code 查到 HexEntry
pub fn lookup(upper: u8, lower: u8) -> Option<HexEntry> {
    TABLE.iter().find(|h| h.upper == upper && h.lower == lower).copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookup_qian_zai_tian() {
        let h = lookup(0b111, 0b111).unwrap();
        assert_eq!(h.name_zh, "乾为天");
        assert_eq!(h.palace, Palace::Qian);
        assert_eq!(h.kind, 0);
    }

    #[test]
    fn lookup_kun_di() {
        let h = lookup(0b000, 0b000).unwrap();
        assert_eq!(h.name_zh, "坤为地");
        assert_eq!(h.palace, Palace::Kun);
    }

    /// 每宫变卦推演：本宫卦按一世→归魂逐爻变，核对每宫 7 个变卦的编码
    #[test]
    fn palace_derivation() {
        // (本宫 code, 宫, [(变卦名, upper, lower)] × 7)
        let cases: [(&str, u8, [(&str, u8, u8); 7]); 8] = [
            ("乾为天", 0b111, [("天风姤",0b111,0b011),("天山遁",0b111,0b001),("天地否",0b111,0b000),("风地观",0b011,0b000),("山地剥",0b001,0b000),("火地晋",0b101,0b000),("火天大有",0b101,0b111)]),
            ("兑为泽", 0b110, [("泽水困",0b110,0b010),("泽地萃",0b110,0b000),("泽山咸",0b110,0b001),("水山蹇",0b010,0b001),("地山谦",0b000,0b001),("雷山小过",0b100,0b001),("雷泽归妹",0b100,0b110)]),
            ("离为火", 0b101, [("火山旅",0b101,0b001),("火风鼎",0b101,0b011),("火水未济",0b101,0b010),("山水蒙",0b001,0b010),("风水涣",0b011,0b010),("天水讼",0b111,0b010),("天火同人",0b111,0b101)]),
            ("震为雷", 0b100, [("雷地豫",0b100,0b000),("雷水解",0b100,0b010),("雷风恒",0b100,0b011),("地风升",0b000,0b011),("水风井",0b010,0b011),("泽风大过",0b110,0b011),("泽雷随",0b110,0b100)]),
            ("巽为风", 0b011, [("风天小畜",0b011,0b111),("风火家人",0b011,0b101),("风雷益",0b011,0b100),("天雷无妄",0b111,0b100),("火雷噬嗑",0b101,0b100),("山雷颐",0b001,0b100),("山风蛊",0b001,0b011)]),
            ("坎为水", 0b010, [("水泽节",0b010,0b110),("水雷屯",0b010,0b100),("水火既济",0b010,0b101),("泽火革",0b110,0b101),("雷火丰",0b100,0b101),("地火明夷",0b000,0b101),("地水师",0b000,0b010)]),
            ("艮为山", 0b001, [("山火贲",0b001,0b101),("山天大畜",0b001,0b111),("山泽损",0b001,0b110),("火泽睽",0b101,0b110),("天泽履",0b111,0b110),("风泽中孚",0b011,0b110),("风山渐",0b011,0b001)]),
            ("坤为地", 0b000, [("地雷复",0b000,0b100),("地泽临",0b000,0b110),("地天泰",0b000,0b111),("雷天大壮",0b100,0b111),("泽天夬",0b110,0b111),("水天需",0b010,0b111),("水地比",0b010,0b000)]),
        ];

        for (ben_gong_name, ben_code, expected) in cases {
            // 变卦推演：lines 自下而上，爻变从初爻开始
            let derive = |changed_mask: u8| -> (u8, u8) {
                // 本宫卦上下相同；lines[i] = ben_code bit(2-i)
                let mut lines = [false; 6];
                for i in 0..3 {
                    lines[i] = (ben_code >> (2 - i)) & 1 == 1;
                }
                for i in 0..3 {
                    lines[3 + i] = lines[i];
                }
                for i in 0..6 {
                    if (changed_mask >> i) & 1 == 1 {
                        lines[i] = !lines[i];
                    }
                }
                let lower = (lines[0] as u8) << 2 | (lines[1] as u8) << 1 | lines[2] as u8;
                let upper = (lines[3] as u8) << 2 | (lines[4] as u8) << 1 | lines[5] as u8;
                (upper, lower)
            };

            // 一世~五世：初爻起逐爻变
            let masks = [0b000001u8, 0b000011, 0b000111, 0b001111, 0b011111];
            let names: [&str; 8] = [ben_gong_name, expected[0].0, expected[1].0, expected[2].0, expected[3].0, expected[4].0, expected[5].0, expected[6].0];

            // 本宫
            assert_eq!(lookup(ben_code, ben_code).unwrap().name_zh, names[0]);

            // 一世~五世
            for k in 1..=5 {
                let (u, l) = derive(masks[k - 1]);
                let e = lookup(u, l).unwrap();
                assert_eq!(e.name_zh, names[k], "{} 第{}卦", ben_gong_name, k);
            }

            // 游魂：五世卦的四爻变回 → 初二三爻变 + 五爻变
            {
                let (u, l) = derive(0b010111);
                let e = lookup(u, l).unwrap();
                assert_eq!(e.name_zh, names[6], "{} 游魂", ben_gong_name);
                assert_eq!(shi_position_of(e.kind), 4);
            }

            // 归魂：下三爻变回本宫 → 仅五爻变
            {
                let (u, l) = derive(0b010000);
                let e = lookup(u, l).unwrap();
                assert_eq!(e.name_zh, names[7], "{} 归魂", ben_gong_name);
                assert_eq!(shi_position_of(e.kind), 3);
            }
        }
    }

    /// 64 卦编码两两不同（覆盖全部 8×8 组合）
    #[test]
    fn all_64_unique() {
        let mut seen = std::collections::HashSet::new();
        for h in TABLE.iter() {
            assert!(seen.insert((h.upper, h.lower)), "重复编码：{}", h.name_zh);
        }
        assert_eq!(seen.len(), 64);
        // 每卦名唯一
        let mut names = std::collections::HashSet::new();
        for h in TABLE.iter() {
            assert!(names.insert(h.name_zh), "重复卦名：{}", h.name_zh);
        }
    }

    /// 周易通行卦序：king_wen 恰好覆盖 1..64 各一次，且抽查锚点正确
    #[test]
    fn king_wen_order() {
        let mut seen = std::collections::HashSet::new();
        for h in TABLE.iter() {
            assert!((1..=64).contains(&h.king_wen), "{} 卦序越界：{}", h.name_zh, h.king_wen);
            assert!(seen.insert(h.king_wen), "重复卦序：{} #{}", h.name_zh, h.king_wen);
        }
        assert_eq!(seen.len(), 64);

        // 锚点抽查（通行本《周易》上经/下经起止与代表卦）
        let by_name = |n: &str| TABLE.iter().find(|h| h.name_zh == n).unwrap().king_wen;
        assert_eq!(by_name("乾为天"), 1);
        assert_eq!(by_name("坤为地"), 2);
        assert_eq!(by_name("水雷屯"), 3);
        assert_eq!(by_name("山水蒙"), 4);
        assert_eq!(by_name("水火既济"), 63);
        assert_eq!(by_name("火水未济"), 64);
        assert_eq!(by_name("天风姤"), 44);   // 下经之首紧邻
        assert_eq!(by_name("雷泽归妹"), 54);
        assert_eq!(by_name("风泽中孚"), 61);
        assert_eq!(by_name("雷山小过"), 62);
    }

    #[test]
    fn shi_positions() {
        assert_eq!(shi_position_of(0), 6);
        assert_eq!(shi_position_of(1), 1);
        assert_eq!(shi_position_of(2), 2);
        assert_eq!(shi_position_of(3), 3);
        assert_eq!(shi_position_of(4), 4);
        assert_eq!(shi_position_of(5), 5);
        assert_eq!(shi_position_of(6), 4);
        assert_eq!(shi_position_of(7), 3);
    }
}
