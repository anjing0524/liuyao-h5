//! 天干地支：用于装卦（纳甲）与时间因子
//!
//! 年/月/日/时干支计算基于 [tyme4rs]（tyme4ts 的 Rust 版，6tail 出品），
//! 完整实现传统规则：
//! - 年柱：以立春为界（非公历元旦）
//! - 月柱：以节气为界（立春=寅月…白露=酉月…，非农历月、非公历月）
//! - 日柱：23 点起算晚子时，进一日
//! - 时柱：日干起时（甲己还加甲），23 点属子时
//!
//! 常量表（天干/地支/五行/藏干）仍由本模块提供，供纳甲与六亲使用。
//!
//! [tyme4rs]: https://crates.io/crates/tyme4rs

use tyme4rs::tyme::solar::SolarTime;
use tyme4rs::tyme::sixtycycle::SixtyCycleHour;

pub const TIANGAN: [&str; 10] = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
pub const DIZHI: [&str; 12] = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
pub const SHICHEN: [&str; 12] = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

pub fn tiangan_wuxing(g: &str) -> &'static str {
    match g {
        "甲"|"乙" => "木",
        "丙"|"丁" => "火",
        "戊" => "土",
        "己" => "土",
        "庚"|"辛" => "金",
        "壬"|"癸" => "水",
        _ => "?",
    }
}

pub const DIZHI_WUXING: [&str; 12] = [
    "水", "土", "木", "木", "土", "火",
    "火", "土", "金", "金", "土", "水",
];

// 每个地支藏干（最多 3 个），用于"用神"层（骨架不展开断卦，此处仅声明）。
pub const DIZHI_HIDE_GAN: [[&str; 3]; 12] = [
    ["癸", "", ""],  // 子
    ["己", "辛", "癸"], // 丑
    ["甲", "丙", "戊"], // 寅
    ["乙", "", ""],  // 卯
    ["戊", "乙", "癸"], // 辰
    ["丙", "戊", "庚"], // 巳
    ["丁", "己", ""],  // 午
    ["己", "丁", "乙"], // 未
    ["庚", "壬", "戊"], // 申
    ["辛", "", ""],  // 酉
    ["戊", "辛", "丁"], // 戌
    ["壬", "甲", ""],  // 亥
];

/// 取得某时辰的地支名（按 23-1 子, 1-3 丑, ... 每两小时一支）
pub fn shichen_from_hour(hour: u32) -> &'static str {
    // 23点起算：子=23, 丑=1, 寅=3 ...
    let idx = if hour >= 23 { 0 } else { ((hour + 1) / 2) as usize };
    SHICHEN[idx]
}

/// 本地墙钟时间（年月日时分秒）
struct LocalYmdHms {
    year: isize,
    month: usize,
    day: usize,
    hour: usize,
    minute: usize,
    second: usize,
}

/// wasm 下无 tz 数据库，用 JS Date 取浏览器本地时区分量（数据来自宿主，干支计算仍在 Rust）
#[cfg(target_arch = "wasm32")]
fn local_ymd_hms(ms: i64) -> LocalYmdHms {
    let d = js_sys::Date::new(&wasm_bindgen::JsValue::from_f64(ms as f64));
    LocalYmdHms {
        year: d.get_full_year() as isize,
        month: (d.get_month() + 1) as usize,
        day: d.get_date() as usize,
        hour: d.get_hours() as usize,
        minute: d.get_minutes() as usize,
        second: d.get_seconds() as usize,
    }
}

/// 原生（测试/服务端）走 chrono Local
#[cfg(not(target_arch = "wasm32"))]
fn local_ymd_hms(ms: i64) -> LocalYmdHms {
    use chrono::{Datelike, Timelike};
    let dt = chrono::DateTime::<chrono::Utc>::from_timestamp_millis(ms)
        .map(|dt| dt.with_timezone(&chrono::Local))
        .unwrap_or_else(chrono::Local::now);
    LocalYmdHms {
        year: dt.year() as isize,
        month: dt.month() as usize,
        day: dt.day() as usize,
        hour: dt.hour() as usize,
        minute: dt.minute() as usize,
        second: dt.second() as usize,
    }
}

/// 由毫秒时间戳计算本地（年干支, 月干支, 日干支, 时柱干支）。
///
/// 年以立春分界、月以节气分界、日以 23 点进位、时按日干起时——
/// 全部规则由 tyme4rs 的 `SixtyCycleHour` 实现。
pub fn ganzhi_from_ms(ms: i64) -> (String, String, String, String) {
    let t = local_ymd_hms(ms);
    let st = SolarTime::from_ymd_hms(t.year, t.month, t.day, t.hour, t.minute, t.second);
    let sc = SixtyCycleHour::from_solar_time(st);
    (
        sc.get_year().to_string(),
        sc.get_month().to_string(),
        sc.get_day().to_string(),
        sc.get_sixty_cycle().to_string(),
    )
}

pub fn shichen_index(s: &str) -> usize {
    DIZHI.iter().position(|&d| d == s).unwrap_or(0)
}

pub fn dizhi_index(s: &str) -> usize {
    shichen_index(s)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    /// 用本机时区构造某天某时刻的毫秒时间戳（测试与运行环境一致地走本地时区）
    fn ms_of(y: i32, m: u32, d: u32, h: u32, min: u32) -> i64 {
        chrono::Local
            .with_ymd_and_hms(y, m, d, h, min, 0)
            .unwrap()
            .timestamp_millis()
    }

    #[test]
    fn hour_to_shichen() {
        assert_eq!(shichen_from_hour(0), "子");
        assert_eq!(shichen_from_hour(1), "丑");
        assert_eq!(shichen_from_hour(3), "寅");
        assert_eq!(shichen_from_hour(23), "子");
    }

    /// 月柱按节气切分（2026-09-07 白露切酉月）
    #[test]
    fn month_gz_by_term() {
        // 白露前：申月
        let (_, m1, _, _) = ganzhi_from_ms(ms_of(2026, 9, 1, 12, 0));
        assert_eq!(m1, "丙申");
        // 白露后：酉月（旧的公历月近似算法会错算成戌月）
        let (_, m2, _, _) = ganzhi_from_ms(ms_of(2026, 9, 22, 12, 0));
        assert_eq!(m2, "丁酉");
    }

    /// 年柱以立春为界（2026-02-04 立春）
    #[test]
    fn year_gz_by_lichun() {
        // 立春前属乙巳年
        let (y1, _, _, _) = ganzhi_from_ms(ms_of(2026, 1, 15, 12, 0));
        assert_eq!(y1, "乙巳");
        // 立春后属丙午年
        let (y2, _, _, _) = ganzhi_from_ms(ms_of(2026, 3, 1, 12, 0));
        assert_eq!(y2, "丙午");
    }

    /// 日柱锚点：1900-01-01 为甲戌日
    #[test]
    fn day_gz_anchor_1900() {
        let (_, _, d, _) = ganzhi_from_ms(ms_of(1900, 1, 1, 12, 0));
        assert_eq!(d, "甲戌");
    }

    /// 日柱以 23 点进位（晚子时属次日）；时柱日干起时（甲己还加甲）
    #[test]
    fn day_rolls_at_23_and_hour_pillar() {
        // 2026-09-22 己亥日；12:30 为午时，己日子时起甲子 → 午时庚午
        let (_, _, d, h) = ganzhi_from_ms(ms_of(2026, 9, 22, 12, 30));
        assert_eq!(d, "己亥");
        assert_eq!(h, "庚午");

        // 22:59 仍属当日；23:00 起晚子时，日柱进为庚子、时柱为甲子（庚日子时起丙子）
        let (_, _, d1, h1) = ganzhi_from_ms(ms_of(2026, 9, 22, 22, 59));
        assert_eq!(d1, "己亥");
        assert_eq!(h1, "乙亥");
        let (_, _, d2, h2) = ganzhi_from_ms(ms_of(2026, 9, 22, 23, 0));
        assert_eq!(d2, "庚子");
        assert_eq!(h2, "丙子");
    }
}
