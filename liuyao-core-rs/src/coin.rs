//! 三铜钱起卦核心
//!
//! 标准规则（参考《卜筮正宗》《火珠林》）：
//!   三枚铜钱（或同厚硬币），合掌摇动后掷出。
//!   - **字面（阴）** ← 即铜钱有汉字的一面
//!   - **背面（阳）** ← 即铜钱无汉字、满文或图案的一面
//!   **按"背面数"定：
//!   - 一背 = 少阳 (yang, 静)
//!   - 两背 = 少阴 (yin, 静)
//!   - 三背 = 老阳 (yang, 动)
//!   - 零背 = 老阴 (yin, 动)
//!
//! 摇 6 次成卦，自下而上（初、二、三、四、五、上）。

use rand::Rng;
use serde::Serialize;

/// 一爻的阴阳与动静
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct Line {
    /// true = 阳, false = 阴
    pub yang: bool,
    /// true = 动爻（老阳 / 老阴）
    pub changing: bool,
    /// 0=少阳/少阴（静）, 1=老阳（动）, -1=老阴（动）
    pub kind: i8,
}

impl Line {
    pub fn symbol(&self) -> &'static str {
        match (self.yang, self.changing) {
            (true, false)  => "⚊",
            (false, false) => "⚋",
            (true, true)   => "⚊×", // 动
            (false, true)  => "⚋×", // 动
        }
    }
    pub fn label_zh(&self) -> &'static str {
        match (self.yang, self.changing) {
            (true, false)  => "少阳",
            (false, false) => "少阴",
            (true, true)   => "老阳",
            (false, true)  => "老阴",
        }
    }
}

/// 摇一枚铜钱：返回 true=背面（阳），false=字面（阴）
fn flip<R: Rng + ?Sized>(rng: &mut R) -> bool {
    rng.gen_bool(0.5)
}

/// 摇一次三铜钱，得到一爻
pub fn roll_line<R: Rng + ?Sized>(rng: &mut R) -> Line {
    let backs = [flip(rng), flip(rng), flip(rng)]
        .iter()
        .filter(|&&b| b)
        .count() as i8;
    match backs {
        0 => Line { yang: false, changing: true,  kind: -1 }, // 老阴
        1 => Line { yang: true,  changing: false, kind:  0 }, // 少阳
        2 => Line { yang: false, changing: false, kind:  0 }, // 少阴
        3 => Line { yang: true,  changing: true,  kind:  1 }, // 老阳
        _ => unreachable!(),
    }
}

/// 起一卦（自下而上 6 爻）
pub fn cast_hexagram<R: Rng + ?Sized>(rng: &mut R) -> [Line; 6] {
    let mut lines = [Line { yang: false, changing: false, kind: 0 }; 6];
    // lines[0] = 初爻（最底）, lines[5] = 上爻（最上）
    for i in 0..6 {
        lines[i] = roll_line(rng);
    }
    lines
}

/// 给动爻反转：老阳→少阴，老阴→少阳
pub fn changed_lines(lines: &[Line; 6]) -> [Line; 6] {
    let mut out = [Line { yang: false, changing: false, kind: 0 }; 6];
    for i in 0..6 {
        let l = &lines[i];
        out[i] = if l.changing {
            match l.yang {
                true  => Line { yang: false, changing: false, kind:  0 },
                false => Line { yang: true,  changing: false, kind:  0 },
            }
        } else {
            *l
        };
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::rngs::StdRng;
    use rand::SeedableRng;

    #[test]
    fn probabilities_are_within_tolerance() {
        // 三铜钱，理论分布：
        //   老阳/老阴 各 1/8
        //   少阳/少阴 各 3/8
        let mut rng = StdRng::seed_from_u64(42);
        let n = 80_000;
        let mut counts = [0usize; 4]; // [old_yang, old_yin, young_yang, young_yin]
        for _ in 0..n {
            let l = roll_line(&mut rng);
            match (l.yang, l.changing) {
                (true,  true)  => counts[0] += 1,
                (false, true)  => counts[1] += 1,
                (true,  false) => counts[2] += 1,
                (false, false) => counts[3] += 1,
            }
        }
        let expected = [n as f64 / 8.0, n as f64 / 8.0, n as f64 * 3.0 / 8.0, n as f64 * 3.0 / 8.0];
        for (i, &c) in counts.iter().enumerate() {
            let diff = (c as f64 - expected[i]).abs();
            assert!(diff / expected[i] < 0.05, "bin {}: count={} expected={}", i, c, expected[i]);
        }
    }

    #[test]
    fn cast_returns_six_lines() {
        let mut rng = StdRng::seed_from_u64(7);
        let lines = cast_hexagram(&mut rng);
        assert_eq!(lines.len(), 6);
    }

    #[test]
    fn changed_lines_only_affects_changing() {
        let mut rng = StdRng::seed_from_u64(9);
        let lines = cast_hexagram(&mut rng);
        let changed = changed_lines(&lines);
        for i in 0..6 {
            if lines[i].changing {
                assert_ne!(lines[i].yang, changed[i].yang);
                assert!(!changed[i].changing);
            } else {
                assert_eq!(lines[i].yang, changed[i].yang);
            }
        }
    }
}