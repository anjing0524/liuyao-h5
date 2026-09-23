# 原型素材与替换 · V2

使用内置 image_gen 生成；新素材提示词见 PROMPTS-v2.txt，初版提示词见 PROMPTS.txt。主视觉继续采用纹理，不使用 Graphics 绘图。

| 当前加载文件 | 用途 |
|---|---|
| background-v2.png | 青绿月夜、远山与完整石质平台 |
| scene-atlas-v2.png | 一棵完整古银杏及简洁小石台；无独立右枝 |
| traveler-v2.png | 独立浅色衣袍人物，清晰剪影 |
| effects-atlas.png | 叶片正反面、云雾、草 |

旧 background.png / scene-atlas.png 留作对比，不在运行时 Bundle 加载。新透明图集和人物保留原始 alpha；未通过程序绘制或抠图修改图像。帧边界在 frames.json。人物前方不再叠雾，也不再使用深色 tint。

这些仍是 AI 原型美术。月亮、远山、地面暂时合并在背景；树干和冠层合成在一张连贯纹理内。人物衣摆通过整体轻微 skew 表达，尚未做局部骨骼。

## 替换正式素材

1. PNG / WebP 主体需透明背景，并维持合理锚点。
2. 在 manifest.json 的 moon-grove bundle 修改 alias 与路径。
3. frames.json 指定 source 和可选 frame；独立纹理可省略 frame。
4. 构图调 MoonScene.compose()；对应台面落点调 animateLeaf()。
5. 领域规则、状态机、六爻 UI 不依赖素材文件。

点状萤火使用 Texture.WHITE；这是光点粒子，不是主视觉程序绘制。标题、卦爻、按钮由 DOM/CSS 表达。
