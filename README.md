# 六爻起卦 · H5 版

六爻起卦 H5 单页应用（SPA），Rust 编译产物 + 浏览器原生 WebAssembly。无需微信开发者工具、无需审核。

> 从原微信小程序项目改造而来。骨架阶段不内置卦辞解读。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 前端框架 | **原生 JS + ES Module**（无框架） | 单页应用，hash 路由 |
| 构建工具 | **Vite 5** | 处理 wasm / es module / dev server |
| 核心逻辑 | **Rust → WebAssembly** | `liuyao-core-rs/` 编译产物 |
| 渲染 | **Canvas 2D** | 铜钱翻转 + 卦象 |
| 存储 | **localStorage** | 占问 + 历史记录 |

## 目录结构

```
liuyao-h5/
├── index.html              ← SPA 入口（6 个 section + tabbar）
├── package.json
├── vite.config.js
├── src/
│   ├── main.js             ← hash 路由
│   ├── style.css           ← 全局样式（rpx→px 换算）
│   ├── pages/              ← 6 个页面的 mount 函数
│   │   ├── index.js          首页
│   │   ├── inquire.js        静心占问
│   │   ├── cast.js           摇卦（调 wasm.rollOneLine）
│   │   ├── result.js         结果（调 wasm.installOnly）
│   │   ├── history.js        历史
│   │   └── leaderboard.js    榜单（本地聚合）
│   └── utils/
│       ├── canvas-drawer.js  Canvas 绘制工具
│       ├── wasm-loader.js    wasm-bindgen 封装
│       └── storage.js        localStorage 包装
├── public/
│   └── wasm/               ← wasm-pack 产物（Vite 原样拷贝到 dist/）
│       ├── liuyao_core.js
│       └── liuyao_core_bg.wasm
└── liuyao-core-rs/         ← Rust 源码（cargo 工程）
    ├── Cargo.toml
    └── src/lib.rs
```

## 路由

| Hash | 页面 | tabBar 索引 |
|---|---|---|
| `/` | 首页 | 0 |
| `#inquire` | 静心占问 | 1 |
| `#cast` | 摇卦 | 1 |
| `#result` | 结果（从 cast 跳转） | — |
| `#history` | 历史 | 2 |
| `#leaderboard` | 榜单（本地聚合） | 3 |

## 开发

```bash
# 1. 安装依赖（首次）
npm install

# 2. 启动 dev server（默认 http://localhost:5173）
npm run dev

# 3. 浏览器打开 http://localhost:5173/
```

## 编译 wasm

修改 Rust 代码后重新编译产物：

```bash
npm run wasm:build
# 等价于：
# cd liuyao-core-rs && wasm-pack build --target web --out-dir ../public/wasm --release
```

产物位置：`public/wasm/liuyao_core_bg.wasm`（~64KB）+ `public/wasm/liuyao_core.js`（~17KB）。

## 生产构建

```bash
npm run build
# 产物在 dist/，可直接上传到 CloudBase 静态托管
```

## 部署到腾讯云 CloudBase

```bash
# 安装 CLI（首次）
npm install -g @cloudbase/cli

# 登录
tcb login

# 一键部署
tcb hosting deploy dist -e <your-env-id>
```

部署后访问 `https://<your-env-id>.tcloudbaseapp.com/` 即可。CloudBase 自动 HTTPS、CDN 加速。

## 与原小程序版差异

| 差异 | 小程序 | H5 |
|---|---|---|
| 运行环境 | 微信开发者工具 + 微信 App | 浏览器（任意） |
| Wasm 加载 | `WXWebAssembly` + patch 脚本 | 原生 `WebAssembly.instantiateStreaming` |
| 导航 | `wx.navigateTo` / `wx.switchTab` | hash 路由 + `<a href="#xxx">` |
| 存储 | `wx.setStorageSync` | `localStorage` |
| 云函数 | `wx.cloud.callFunction` | 暂未接入（榜单用本地聚合） |
| 分享 | `onShareAppMessage` | 待定（可接 Web Share API） |
| 工具链 | 必须装微信开发者工具 | 浏览器 + Vite |

## 待办

- [ ] 接 CloudBase 云函数做云端榜单（替换当前本地聚合）
- [ ] Web Share API 做分享
- [ ] 卦辞 + 解读层（接入 LLM 或预置数据，需独立验证）
- [ ] PWA 支持（添加到主屏、离线访问）

## 月下问树 · 摇树模块（迭代中）

摇卦页已重构为**全屏沉浸式 PixiJS 8 场景**，只渲染「月下问树」这一模块：

- 场景：`src/divination/TreeScene.js`（远天/月/云 → 后景树 → 主枝干 → 前冠 → 雾 → 人物石台 → 六爻 → 卦叶 → 前景压暗）
- 卦叶实体：`src/divination/DivinationLeaf.js`（贝塞尔轨迹 + 横摆 + 翻面 + 落地压弹 + 接地阴影）
- 场景入口：`src/divination/tree-stage.js`、`src/divination/manifest.js`
- 页面与 UI：`src/pages/cast.js` + `index.html` 的 `#page-cast` + `src/style.css` 的 `cast-*`
- 六爻直接显现在石台上（`TreeScene.setLines`），UI 仅保留左上爻数 / 右上声音 / 底部问卦
- 音频：`src/divination/AudioSystem.js`（纯 WebAudio 合成：三层风 / 夜虫 / 卦叶落地 / 石台低频共鸣），首次点击手势后启动
- Idle：云/雾/尘/余烬、分层风动、人物呼吸、镜头呼吸、10~25s 随机普通落叶

### 素材管线（v2）

`tools/build-assets.mjs` 从 `raw-assets/` 生成正式贴图：

- 软边抠像 + 去溢色 + 去 AI 水印
- 黑底素材按亮度取 alpha（月亮 / 云 / 雾 / 月束）
- 程序化氛围贴图：月晕、地面月斑、雾霭、暗角、尘点、胶片颗粒
- 离屏烘焙：**方向性月光轮廓**（`*-rim`，按光照方向平移相减）、虚焦前景（`*-blur`），运行时不再用 BlurFilter
- 纹理内存压缩：非细节关键贴图降采样（总解码显存 ~86MB → ~44MB），并移除未使用的 `mist` 贴图

```bash
node tools/build-assets.mjs
```

### 独立截图迭代（tree lab）

`lab.html` 只挂载 TreeScene，铺满 9:16，用于无人值守截图迭代：

```bash
npm run dev

# 画面复核工具
node tools/value-map.mjs generated-images/idle.png   # 明度分布/直方图
node tools/composition.mjs generated-images/idle.png # 九宫格 + 安全区 + 冷暖比
node tools/warm-audit.mjs generated-images/idle.png  # 暖色像素占比复核
node tools/scene-stats.js                            # 场景对象/draw call 探针（需在页面上下文调用）

# 空闲帧
node tools/shot.mjs --url=http://127.0.0.1:5199/lab.html --out=generated-images/idle.png
# 触发一次问卦并截取落定帧
node tools/shot.mjs --url=http://127.0.0.1:5199/lab.html --out=generated-images/roll.png \
  --eval='window.__lab.roll(["front","back","front"])' --after=4000
```