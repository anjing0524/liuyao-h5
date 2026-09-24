# 月下问卦 · H5

在原 liuyao-h5 代码上更新的完整产品：月夜古树起卦、真实 Rust WASM、可回看的卦记。保留原项目 Vite / JavaScript 结构，未额外引入 Vue。

## 运行

Node.js 22.12+（推荐 24 LTS）。计算模块已随源码提供，普通运行不需要 Rust。

```sh
npm install
npm run dev
```

打开终端显示的地址。`npm run build` 生成 `dist/`；`npm run preview` 检查生产包。静态服务器需提供 `.wasm` 文件，推荐 MIME `application/wasm`。使用 hash 路由和相对 base，可部署到子目录。

## 页面

- 首页：写下所问 / 翻阅卦记。
- 问事：分类、问题编辑、输入验证。
- 起卦：900 × 1600 逻辑场景，9:16 等比适配；WebGL；六次独立交互，初爻在最下方。
- 结果：本卦、变卦、动爻、干支、简析、六亲六神与世应；详情可展开，页面自然滚动。
- 卦记：保存在当前设备，可重读、确认后清空；兼容旧记录。
- 小记：本机记录统计，不是云端排行榜。

取消底部 tab，保留顶部轻导航；起卦时隐藏外部导航。

全部页面共用同一个 9:16 画幅（最大宽度 480px），长内容在画幅内部滚动。`src/ambience/` 为共享月夜背景：太极、反向八卦环、金色微粒与薄雾。输入时背景降低亮度，后台与起卦页暂停装饰动画，并响应减少动态效果偏好。装饰卦阵不参与计算。

## 数据与动画边界

`src/utils/wasm-loader.js` 是唯一计算入口。`roll_one_line()` 返回 `{yang, changing, kind, faces: [bool, bool, bool]}`。Rust 同一次随机采样生成真实叶面与爻值，前端不随机生成、不排列或改写起卦结果。true 显示金色正面。原六爻概率与装卦算法保留。

六次结果按初、二、三、四、五、上顺序传入 `install_only()`。结果页直接使用返回的 `lines`、`changed_lines`、卦名、干支、装卦和简析。历史重读仍调用该接口。记录以同一编号去重，刷新不重复记卦。

状态机在 `src/moon/flow.js`：loading → ready → drawing → wind → falling → settling → inscribing；前五次回到 ready，第六次 revealing → complete → installing。错误可以重试，离开页面转 disposed 并销毁动画、监听、音频与渲染器。计算失败时不制造模拟结果。

`src/moon/MoonScene.js` 负责场景、Idle 与 GSAP 单次 Timeline。每次三片卦叶独立翻转、依次落地，再生成一爻。成卦后环境收束、轻推镜头。支持减少动态效果与后台暂停；声音默认关闭，用户主动开启。

## 美术资产

线上使用等分辨率的无损 WebP。PNG 原图保存在 `source-art/`，不会复制进 `dist/`；更换原图后运行 `npm run assets:optimize`。脚本逐像素比较尺寸、透明度和所有非全透明像素的 RGB，任一不一致就失败。全透明像素内部不可见的 RGB 不作为画质差异。

首页只加载轻量导航和背景；进入问事页后利用空闲时间预加载起卦模块、纹理和 WASM。省流模式不主动预热，用户进入起卦时正常加载。预热不调用摇爻接口，不提前生成卦象。

本次生产目录从 8,725,708 字节降到 5,510,371 字节（约减少 36.8%）；纹理减少 41.5%。首页入口 JS 从约 343 KB 降到约 11.9 KB，重型起卦模块独立加载。数字为文件原始大小，实际网络传输还取决于服务器压缩和缓存。源码包包含 PNG 母版，因此不会与生产包一样小。

`public/art/manifest.json` 为 Pixi Assets bundle；`frames.json` 定义图集区域。主视觉全部使用纹理，未用 Graphics 绘制树、月、人物、叶、雾、山、石台。极小萤火点使用 Texture.WHITE。

目前为已确认风格的 AI 生成原型美术。替换时保持 alias 与逻辑尺寸，图集修改对应 frames。创作说明及提示词见 `public/art/ASSET_NOTES.md`、`PROMPTS-v2.txt`。这不是宣称已有正式商业美术验收的素材包。

## 项目结构

```
src/main.js                  路由、异步挂载与清理
src/pages/cast.js            WASM → 起卦动画的控制器
src/pages/result.js          Rust 结果展示
src/pages/journal.js         首页、问事、卦记、小记
src/moon/                   场景、状态机、素材加载
src/utils/                  展示、存储、WASM 适配
src/wasm/                   已编译 JS / WASM / 类型
src/divination/AudioSystem.js 可选环境声音
liuyao-core-rs/              Rust 算法源代码
tests/                      真实 WASM 与状态机测试
public/art/                 纹理和素材清单
```

旧版铜钱、树实验室、程序化纹理与未使用的旧页面已移除，避免两套视觉实现并存。

## 验证与重编译

```sh
npm test
cargo test --manifest-path liuyao-core-rs/Cargo.toml --locked
npm run wasm:build
```

最后一条需要 Rust、wasm32-unknown-unknown target 和 wasm-pack。Cargo.lock 固定 wasm-bindgen 0.2.128；若直接使用 wasm-bindgen CLI，必须使用同版本：

```sh
rustup target add wasm32-unknown-unknown
cargo build --manifest-path liuyao-core-rs/Cargo.toml --locked --release --target wasm32-unknown-unknown
wasm-bindgen liuyao-core-rs/target/wasm32-unknown-unknown/release/liuyao_core.wasm --target web --out-dir src/wasm --out-name liuyao_core
```

测试真实 `.wasm` 的三叶契约、乾坤本变卦、装卦字段与种子复现，另测试状态机防重入及离开清理。Rust 测试覆盖原算法与新增叶面契约。

## 来源

基于用户提供的 `liuyao-h5-master.zip`，归档注释版本为 `2898ae736786eb1746707144ef77e8727dc2fabb`。本地交付不会自动修改 GitHub 远端。旧问事和历史存储键保留，最多保留 100 条卦记。
