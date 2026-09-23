//! 八经卦（八卦）
//!
//! 编号采用「先天八卦数」（邵雍）：
//!   乾 1, 兑 2, 离 3, 震 4, 巽 5, 坎 6, 艮 7, 坤 8
//!
//! 每个经卦三爻，自下而上（初/中/上）。
//! 阳爻=1，阴爻=0；码值 = (初<<2) | (中<<1) | (上<<0)
//!
//! 含义与五行（用于装卦纳甲的"卦宫五行"）：
//!   乾兑=金，离=火，震巽=木，坎=水，艮坤=土

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Trigram {
    pub code: u8,         // 0..7，初→中→上，二进制
    pub name_zh: &'static str,
    pub nature_zh: &'static str,
    pub wuxing: &'static str, // 五行：金/木/水/火/土
}

// TRIGRAMS 按 `code` 升序排列，使 `by_code(code) = TRIGRAMS[code]`。
//   code=0b000(0)坤, 0b001(1)艮, 0b010(2)坎, 0b011(3)巽,
//   code=0b100(4)震, 0b101(5)离, 0b110(6)兑, 0b111(7)乾
pub const TRIGRAMS: [Trigram; 8] = [
    Trigram { code: 0b000, name_zh: "坤", nature_zh: "地", wuxing: "土" }, // 0
    Trigram { code: 0b001, name_zh: "艮", nature_zh: "山", wuxing: "土" }, // 1
    Trigram { code: 0b010, name_zh: "坎", nature_zh: "水", wuxing: "水" }, // 2
    Trigram { code: 0b011, name_zh: "巽", nature_zh: "风", wuxing: "木" }, // 3
    Trigram { code: 0b100, name_zh: "震", nature_zh: "雷", wuxing: "木" }, // 4
    Trigram { code: 0b101, name_zh: "离", nature_zh: "火", wuxing: "火" }, // 5
    Trigram { code: 0b110, name_zh: "兑", nature_zh: "泽", wuxing: "金" }, // 6
    Trigram { code: 0b111, name_zh: "乾", nature_zh: "天", wuxing: "金" }, // 7
];

pub fn by_code(code: u8) -> Trigram {
    TRIGRAMS[code as usize]
}

/// 三爻 → 经卦 code
pub fn read_trigram(lines: &[bool; 3]) -> u8 {
    let mut code = 0u8;
    for i in 0..3 {
        code = (code << 1) | (lines[i] as u8);
    }
    code
}

/// 六爻 → (下卦 code, 上卦 code)
pub fn split_hexagram(lines: &[bool; 6]) -> (u8, u8) {
    let lower = read_trigram(&[lines[0], lines[1], lines[2]]);
    let upper = read_trigram(&[lines[3], lines[4], lines[5]]);
    (lower, upper)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_trigram_basic() {
        // 三阳 = 乾
        assert_eq!(read_trigram(&[true, true, true]), 0b111);
        // 三阴 = 坤
        assert_eq!(read_trigram(&[false, false, false]), 0b000);
        // 上阳下阴 = 巽
        assert_eq!(read_trigram(&[false, true, true]), 0b011);
    }
}