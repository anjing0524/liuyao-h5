/* tslint:disable */
/* eslint-disable */

export function _start(): void;

/**
 * WASM 入口：完整起卦 + 装卦
 * 入参：
 *   - question:  所问之事（占问）
 *   - cast_at_ms: 起卦时刻（JS Date.now() 毫秒）
 *   - rng_seed: 可选随机种子（None 时走 getrandom）
 * 返回：JSON 序列化后的完整结果（含装卦）
 */
export function cast_and_install(question: string, cast_at_ms: number, rng_seed?: number | null): any;

/**
 * 仅装卦（不重新起卦）。
 * 入参：
 *   - lines_yang: [bool; 6]   6 爻阴阳（自下而上）
 *   - line_kinds: [i8; 6]     6 爻类型：0=静, 1=老阳, -1=老阴
 *   - cast_at_ms: f64         起卦时刻（用于取年月日时干支）
 * 返回：JSON 对象（与 cast_and_install 同构，但 question/has_changing/cast_at_gz 字段稍不同）
 */
export function install_only(lines_yang: Array<any>, line_kinds: Array<any>, cast_at_ms: number): any;

/**
 * 单独暴露：摇一爻（测试 / 教学用）
 */
export function roll_one_line(): any;

/**
 * 暴露一些工具常量给前端（避免 JS 端再写一份）
 */
export function version(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly _start: () => void;
    readonly cast_and_install: (a: number, b: number, c: number, d: number) => any;
    readonly install_only: (a: any, b: any, c: number) => any;
    readonly roll_one_line: () => any;
    readonly version: () => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
