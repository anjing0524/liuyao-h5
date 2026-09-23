/**
 * src/divination/TreeScene.js — 月下问树主场景 v2
 *
 * 设计原则（docs/01/03/04）：
 *  - Texture First / Graphics Last：主视觉全部为素材贴图，Graphics 不参与绘制
 *  - 层次景深：远天 → 月 → 云 → 后景树 → 主枝干 → 前冠 → 雾 → 人物石台 → 卦叶 → 前景压暗
 *  - 光照：月光为主光源（冷银），地面月斑、月晕、月束、暗角共同建立光影
 *  - 运动会呼吸：云/雾/尘/萤火由 ticker 驱动；问卦 Timeline 由 GSAP 驱动
 *
 * 设计空间：宽固定 1080，高 = 画布高宽比 × 1080（9:16 → 1920）。resize 时整体缩放 root。
 */
import { Assets, Container, Sprite, TilingSprite, ColorMatrixFilter, Graphics } from 'pixi.js';
import { gsap } from 'gsap';
import { manifest } from './manifest.js';
import { DivinationLeaf } from './DivinationLeaf.js';

const DESIGN_W = 1080;
const H_MIN = 640, H_MAX = 2800;

// 夜色调色：去饱和 + 冷蓝偏移 + 蓝通道轻提（月光氛围）
function makeNightGrade() {
  const f = new ColorMatrixFilter();
  f.matrix = [
    1.046, 0.161, 0.023, 0, -0.006,
    0.058, 1.208, 0.023, 0, -0.008,
    0.058, 0.090, 1.050, 0, 0.006,
    0, 0, 0, 1, 0,
  ];
  return f;
}

export class TreeScene {
  constructor() {
    this.root = new Container();
    this.cam = new Container();
    this.wind = 0;              // 问卦驱动的额外风强度 0~1
    this.progress = 0;          // 六爻进度 0~6
    this.onLeafLand = null;     // 卦叶落地回调（供音频系统使用）
    this.leaves = [];
    this.particles = [];
    this.state = 'BOOT';
    this._t = 0;
    this.H = 1920;
    this._camBase = 1;
  }

  fitW(sp, frac) {
    const k = (DESIGN_W * frac) / sp.texture.width;
    sp.scale.set(sp.scale.x < 0 ? -Math.abs(k) : k, Math.abs(k));
    return k;
  }

  cover(sp, w, h) {
    const k = Math.max(w / sp.texture.width, h / sp.texture.height);
    sp.scale.set(k);
    return k;
  }

  async init(app) {
    await Assets.init({ manifest });
    await Assets.loadBundle(['environment', 'tree', 'character', 'divination']);
    this.buildScene();
    app.stage.addChild(this.root);
    try { this.root.filters = [makeNightGrade()]; } catch (e) { console.warn('[grade]', e); }
    this.resize(app);
    app.ticker.add((ticker) => this.update(ticker.deltaMS / 1000));
  }

  buildScene() {
    const S = (k, tint) => { const s = new Sprite(Assets.get(k)); if (tint) s.tint = tint; return s; };

    // ===== 天空层 =====
    this.skyLayer = new Container();
    this.sky = S('sky', 0xdbe7f2);
    this.sky.anchor.set(0.5);
    this.moonHalo = S('moonHalo', 0xcfe2ff);
    this.moonHalo.anchor.set(0.5);
    this.moonHalo.blendMode = 'screen';
    this.moon = S('moon', 0xeaf3ff);
    this.moon.anchor.set(0.5);
    this.moon.blendMode = 'screen';
    this.cloudA = S('cloud', 0x8ea6bc);
    this.cloudA.anchor.set(0.5);
    this.cloudA.blendMode = 'screen';
    this.cloudB = S('cloud', 0x7f97ad);
    this.cloudB.anchor.set(0.5);
    this.cloudB.blendMode = 'screen';
    this.scatterGlow = S('moonHalo', 0xa8c4e0);
    this.scatterGlow.anchor.set(0.5);
    this.scatterGlow.blendMode = 'screen';
    this.scatterGlow.alpha = 0.16;
    this.skyLayer.addChild(this.sky, this.scatterGlow, this.moonHalo, this.moon, this.cloudA, this.cloudB);

    // ===== 月束（树后） =====
    this.moonBeam3 = S('moonBeam', 0xbcd8f0);
    this.moonBeam3.anchor.set(0.5, 0);
    this.moonBeam3.blendMode = 'screen';
    this.moonBeam3.alpha = 0.05;
    this.moonBeam2 = S('moonBeam', 0xcfe4ff);
    this.moonBeam2.anchor.set(0.5, 0);
    this.moonBeam2.blendMode = 'screen';
    this.moonBeam2.alpha = 0.08;
    this.moonBeam = S('moonBeam', 0xd9ecff);
    this.moonBeam.anchor.set(0.5, 0);
    this.moonBeam.blendMode = 'screen';
    this.moonBeam.alpha = 0.13;

    // ===== 远景雾霭 =====
    this.hazeFar = S('haze', 0x9fb8cc);
    this.hazeFar.anchor.set(0.5);
    this.hazeFar.blendMode = 'screen';

    // ===== 树层（禁止整树一张图摇） =====
    this.treeBackLayer = new Container();
    this.leavesBackA = S('leavesMid', 0x4c5f6a); this.leavesBackA.anchor.set(0.5);
    this.leavesBackB = S('leavesBack', 0x465862); this.leavesBackB.anchor.set(0.5);
    this.treeBranch2 = S('treeBranch', 0x6d8291);   // 远景树，靠雾霭推远
    this.treeBranch2.anchor.set(0.13, 0.98);
    this.treeBranch2.alpha = 0.62;
    this.treeBackLayer.addChild(this.leavesBackA, this.leavesBackB, this.treeBranch2);

    this.treeMidLayer = new Container();
    this.leavesRim = S('leavesFrontRim', 0xc4d8e8); this.leavesRim.anchor.set(0.5);
    this.leavesRim.blendMode = 'add'; this.leavesRim.alpha = 0.12;
    this.leavesMidD = S('leavesFront', 0x7f95a3); this.leavesMidD.anchor.set(0.5);
    this.leavesMidE = S('leavesFront', 0x63798a); this.leavesMidE.anchor.set(0.5);
    this.leavesMidF = S('leavesFront', 0x6d8393); this.leavesMidF.anchor.set(0.5);
    this.leavesMidA = S('leavesFront', 0x9db2be); this.leavesMidA.anchor.set(0.5);
    this.leavesMidB = S('leavesFront', 0x8299a7); this.leavesMidB.anchor.set(0.5);
    this.leavesMidC = S('leavesMid', 0x64798a); this.leavesMidC.anchor.set(0.5);
    this.moonCover = S('leavesFront', 0x7f96a4); this.moonCover.anchor.set(0.5);
    this.treeMidLayer.addChild(this.leavesRim, this.leavesMidF, this.leavesMidD, this.leavesMidE, this.leavesMidA, this.leavesMidB, this.leavesMidC, this.moonCover);
    this.hazeMid = S('haze', 0x9fb8cc);
    this.hazeMid.anchor.set(0.5);
    this.hazeMid.blendMode = 'screen';

    this.treeLayer = new Container();
    this.treeBranchRim = S('treeBranchRim', 0xd6e6f2);
    this.treeBranchRim.anchor.set(0.13, 0.98);
    this.treeBranchRim.blendMode = 'add';
    this.treeBranchRim.alpha = 0.17;
    this.treeBranch = S('treeBranch', 0x7f96a6);
    this.treeBranch.anchor.set(0.13, 0.98);
    this.treeTrunk = S('treeTrunk', 0x7d919d);
    this.treeTrunk.anchor.set(0.5, 1);
    this.leavesFrontA = S('leavesFront', 0x8ba3b1); this.leavesFrontA.anchor.set(0.5);
    this.treeLayer.addChild(this.treeBranchRim, this.treeBranch, this.treeTrunk, this.leavesFrontA);

    // ===== 中景雾（软边 haze，避免 tiling 硬缝） =====
    this.mistBack = S('haze', 0xa8c0d4);
    this.mistBack.anchor.set(0.5);
    this.mistBack.blendMode = 'screen';
    this.mistBack.alpha = 0.22;
    this.mistMid = S('haze', 0x9fb8cc);
    this.mistMid.anchor.set(0.5);
    this.mistMid.blendMode = 'screen';

    // ===== 地面月光 =====
    this.groundLight = S('groundLight', 0xcfe0f2);
    this.groundLight.anchor.set(0.5);
    this.groundLight.blendMode = 'screen';
    this.groundLight.alpha = 0.42;

    // ===== 地面灌木剪影（压住画面底边） =====
    this.groundLayer = new Container();
    this.bushL = S('leavesFrontBlur', 0x16212a); this.bushL.anchor.set(0.5, 1);
    this.bushR = S('leavesFrontBlur', 0x131c24); this.bushR.anchor.set(0.5, 1);
    this.warmGlow = S('groundLight', 0xd07a30);
    this.warmGlow.anchor.set(0.5);
    this.warmGlow.blendMode = 'screen';
    this.warmGlow.alpha = 0.5;
    // 地面月影（随树冠摆动，docs/03 §8）
    this.groundShadow = S('leavesBackBlur', 0x08121a);
    this.groundShadow.anchor.set(0.5);
    this.groundShadow.alpha = 0.5;
    this.groundLayer.addChild(this.groundShadow, this.bushL, this.bushR, this.warmGlow);

    // ===== 人物 / 石台 =====
    this.characterRim = S('characterRim', 0xd0e0ee);
    this.characterRim.anchor.set(0.5, 1);
    this.characterRim.blendMode = 'add';
    this.characterRim.alpha = 0.4;
    this.character = S('character', 0xccdae3);
    this.character.anchor.set(0.5, 1);
    this.altar = S('altar', 0xb0bec7);
    this.altar.anchor.set(0.5, 1);

    // ===== 石台六爻（极少量 UI 几何，docs/04 §5 允许） =====
    this.yaoLayer = new Container();
    this.yaoLines = [];
    this.yaoData = [];
    this._yaoW = 120; this._yaoH = 9;
    for (let i = 0; i < 6; i++) {
      const g = new Graphics();
      g.alpha = 0;
      this.yaoLines.push(g);
      this.yaoLayer.addChild(g);
    }

    // ===== 普通落叶（低频 idle 事件，docs/03 §1） =====
    this.idleLeafLayer = new Container();
    this.normalLeaves = [];
    for (let i = 0; i < 5; i++) {
      const s = S('leafFront', 0xb0c2ce);
      s.anchor.set(0.5);
      s.alpha = 0; s.visible = false; s._active = false;
      this.idleLeafLayer.addChild(s);
      this.normalLeaves.push(s);
    }
    this._normalTimer = 3 + Math.random() * 5;

    // ===== 卦叶 =====
    this.leafLayer = new Container();
    this.leafShadowLayer = new Container();
    this.leafShadows = [0, 1, 2].map(() => {
      const sh = new Sprite(Assets.get('dust'));
      sh.anchor.set(0.5);
      sh.tint = 0x05080d;
      sh.alpha = 0;
      this.leafShadowLayer.addChild(sh);
      return sh;
    });
    this.leafLayer.addChild(this.leafShadowLayer);
    this.leaves = [0, 1, 2].map(() => {
      const l = new DivinationLeaf('leafFront');
      l.tint = 0xc2d2dc;
      l.textureKey = 'leafFront';
      this.leafLayer.addChild(l);
      return l;
    });

    // ===== 尘 / 萤火 =====
    this.particleLayer = new Container();
    for (let i = 0; i < 40; i++) {
      const warm = i % 7 === 0;
      const p = S('dust', warm ? 0xffd9a0 : 0xbcd2e4);
      p.anchor.set(0.5);
      p.blendMode = 'screen';
      p._seed = Math.random() * 1000;
      p._spd = 4 + Math.random() * 10;
      p._range = 20 + Math.random() * 60;
      p._amp = 0.10 + Math.random() * 0.35;
      p._baseY = 0;
      p._baseX = 0;
      p._warm = warm;
      this.particleLayer.addChild(p);
      this.particles.push(p);
    }

    // 石台附近暖色余烬（暖色占比 < 5%，置于雾前）
    this.emberLayer = new Container();
    this.altarGlow = S('groundLight', 0xd07a30);
    this.altarGlow.anchor.set(0.5);
    this.altarGlow.blendMode = 'screen';
    this.altarGlow.alpha = 0.7;
    this.emberLayer.addChild(this.altarGlow);
    this.embers = [];
    for (let i = 0; i < 7; i++) {
      const e = S('dust', 0xffc074);
      e.anchor.set(0.5);
      e.blendMode = 'screen';
      e.alpha = 0.6;
      this.emberLayer.addChild(e);
      this.embers.push(e);
    }

    // ===== 前景雾 + 前景压暗叶 =====
    this.fogFront = S('haze', 0x93aec4);
    this.fogFront.anchor.set(0.5);
    this.fogFront.blendMode = 'screen';
    this.fogFront.alpha = 0.18;

    this.foregroundLayer = new Container();
    this.overhangR = S('leavesFrontBlur', 0x2f3f49); this.overhangR.anchor.set(0.5);
    this.overhangR.alpha = 0.9;
    this.overhangL = S('leavesMidBlur', 0x1d2830); this.overhangL.anchor.set(0.5);
    this.overhangL.alpha = 0.86;
    this.overhangL.scale.x = -1;
    this.foregroundLayer.addChild(this.overhangR, this.overhangL);

    this.vignette = S('vignette');
    this.vignette.anchor.set(0.5);
    this.vignette.alpha = 0.95;

    // 胶片颗粒（multiply 叠加，逐帧抖动）
    this.grain = new TilingSprite({ texture: Assets.get('grain'), width: DESIGN_W, height: 1920 });
    this.grain.blendMode = 'multiply';
    this.grain.alpha = 0.5;

    this.camPush = new Container();
    this.cam.addChild(this.camPush);
    this.camPush.addChild(
      this.skyLayer,
      this.moonBeam3,
      this.moonBeam2,
      this.moonBeam,
      this.hazeFar,
      this.treeBackLayer,
      this.hazeMid,
      this.treeMidLayer,
      this.treeLayer,
      this.mistBack,
      this.mistMid,
      this.groundLight,
      this.groundLayer,
      this.characterRim,
      this.character,
      this.altar,
      this.yaoLayer,
      this.idleLeafLayer,
      this.leafLayer,
      this.particleLayer,
      this.fogFront,
      this.emberLayer,
      this.foregroundLayer,
    );
    this.root.addChild(this.cam, this.grain, this.vignette);

    this.layout();
  }

  layout() {
    const W = DESIGN_W, H = this.H;

    // 天空铺满
    this.sky.position.set(W * 0.5, H * 0.5);
    this.cover(this.sky, W, H);

    // 月（被枝与云遮挡 25%~40%）
    this.moon.position.set(W * 0.72, H * 0.14);
    this.fitW(this.moon, 0.33);
    this.moon.alpha = 1.0;
    this.moonHalo.position.copyFrom(this.moon.position);
    this.fitW(this.moonHalo, 1.35);
    this.moonHalo.alpha = 0.85;
    this.scatterGlow.position.copyFrom(this.moon.position);
    this.fitW(this.scatterGlow, 2.6);

    this.cloudA.position.set(W * 0.52, H * 0.075);
    this.fitW(this.cloudA, 1.05);
    this.cloudA.rotation = 0.02;
    this.cloudA.alpha = 0.34;
    this.cloudB.position.set(W * 0.88, H * 0.205);
    this.fitW(this.cloudB, 0.85);
    this.cloudB.rotation = -0.03;
    this.cloudB.alpha = 0.26;

    this.moonBeam.position.set(W * 0.70, -H * 0.02);
    this.moonBeam.width = W * 0.58;
    this.moonBeam.height = H * 1.02;
    this.moonBeam.alpha = 0.13;
    this.moonBeam2.position.set(W * 0.73, -H * 0.02);
    this.moonBeam2.width = W * 1.02;
    this.moonBeam2.height = H * 1.02;
    this.moonBeam3.position.set(W * 0.77, -H * 0.02);
    this.moonBeam3.width = W * 1.55;
    this.moonBeam3.height = H * 1.02;

    this.hazeFar.position.set(W * 0.5, H * 0.44);
    this.hazeFar.width = W;
    this.hazeFar.height = H * 0.24;
    this.hazeFar.alpha = 0.15;

    // 后景树冠：暗、虚，只作层次
    this.leavesBackA.position.set(W * 0.03, H * 0.18);
    this.fitW(this.leavesBackA, 0.38);
    this.leavesBackA.rotation = -0.25;
    this.leavesBackB.position.set(W * 1.03, H * 0.11);
    this.fitW(this.leavesBackB, 0.32);
    this.leavesBackB.rotation = 0.20;

    // 远景枝：斜穿月亮下沿，制造"月被枝遮"的层次（置于雾后）
    this.treeBranch2.position.set(W * 0.56, H * 0.20);
    this.treeBranch2.rotation = 0.26;
    this.fitW(this.treeBranch2, 0.96);
    this.hazeMid.position.set(W * 0.5, H * 0.30);
    this.hazeMid.width = W;
    this.hazeMid.height = H * 0.20;
    this.hazeMid.alpha = 0.17;

    // 中景垂枝：树冠从顶部两侧垂落，中间留出月亮
    this.leavesMidD.position.set(W * 0.27, H * 0.075);
    this.fitW(this.leavesMidD, 0.48);
    this.leavesMidD.rotation = -0.28;
    this.leavesMidE.position.set(W * 0.95, H * 0.045);
    this.fitW(this.leavesMidE, 0.46);
    this.leavesMidE.rotation = 0.42;
    this.leavesMidF.position.set(W * 0.05, H * 0.30);
    this.fitW(this.leavesMidF, 0.52);
    this.leavesMidF.rotation = -0.52;
    this.leavesMidA.position.set(W * 0.10, H * 0.11);
    this.fitW(this.leavesMidA, 0.66);
    this.leavesMidA.rotation = -0.34;
    this.leavesRim.position.copyFrom(this.leavesMidA.position);
    this.leavesRim.rotation = this.leavesMidA.rotation;
    this.fitW(this.leavesRim, 0.66);
    this.leavesMidB.position.set(W * 0.37, H * 0.01);
    this.fitW(this.leavesMidB, 0.60);
    this.leavesMidB.rotation = -0.10;
    this.leavesMidC.position.set(W * 0.98, H * 0.09);
    this.fitW(this.leavesMidC, 0.64);
    this.leavesMidC.rotation = 0.32;
    // 悬在月亮上沿的枝叶（遮挡 25%~40%）
    this.moonCover.position.set(W * 0.735, H * -0.115);
    this.fitW(this.moonCover, 0.60);
    this.moonCover.rotation = 0.18;
    this.moonCover.alpha = 0.0;

    // 主树（枝干从左侧升起）
    this.treeBranch.position.set(W * 0.04, H * 0.99);
    this.treeBranch.rotation = -0.10;
    this.fitW(this.treeBranch, 1.92);
    // 月光轮廓光：略放大并朝月亮方向偏移的加色副本
    this.treeBranchRim.position.copyFrom(this.treeBranch.position);
    this.treeBranchRim.rotation = this.treeBranch.rotation;
    this.fitW(this.treeBranchRim, 1.92);
    // 大树干从左边框切入
    this.treeTrunk.position.set(W * -0.03, H * 1.12);
    this.fitW(this.treeTrunk, 0.60);
    // 前冠
    this.leavesFrontA.position.set(W * 0.16, H * -0.05);
    this.fitW(this.leavesFrontA, 0.80);
    this.leavesFrontA.rotation = -0.10;

    // 雾带（软边横带，缓慢横移）
    this.mistBack.position.set(W * 0.5, H * 0.70);
    this.mistBack.width = W * 1.25;
    this.mistBack.height = H * 0.20;
    this.mistMid.position.set(W * 0.5, H * 0.80);
    this.mistMid.width = W * 1.15;
    this.mistMid.height = H * 0.16;
    this.mistMid.alpha = 0.12;

    // 地面月斑
    this.groundLight.position.set(W * 0.52, H * 0.94);
    this.groundLight.width = W * 1.05;
    this.groundLight.height = H * 0.24;
    this._groundLightX = this.groundLight.x;

    // 地面月影（压扁的树冠投影）
    this.groundShadow.position.set(W * 0.34, H * 0.985);
    this.fitW(this.groundShadow, 0.95);
    this.groundShadow.scale.y *= 0.30;
    this._shadowBaseRot = this.groundShadow.rotation;

    // 前景（虚焦）框底枝叶
    this.bushL.position.set(W * -0.08, H * 1.03);
    this.fitW(this.bushL, 0.66);
    this.bushL.rotation = 2.55;
    this.bushR.position.set(W * 1.06, H * 1.05);
    this.fitW(this.bushR, 0.74);
    this.bushR.rotation = -2.55;

    // 人物 / 石台（右下，人小天地大）
    this.character.position.set(W * 0.455, H * 0.905);
    this.fitW(this.character, 0.132);
    this._charSY = this.character.scale.y;
    this.characterRim.position.copyFrom(this.character.position);
    this.fitW(this.characterRim, 0.132);
    this.altar.position.set(W * 0.635, H * 0.915);
    this.fitW(this.altar, 0.235);
    this.warmGlow.position.set(W * 0.6, H * 0.905);
    this.warmGlow.width = W * 0.42;
    this.warmGlow.height = H * 0.075;
    this.altarGlow.position.set(W * 0.60, H * 0.905);
    this.altarGlow.width = W * 0.22;
    this.altarGlow.height = H * 0.045;
    for (const e of this.embers) {
      e.position.set(W * (0.48 + Math.random() * 0.26), H * (0.85 + Math.random() * 0.06));
      const r = 10 + Math.random() * 12;
      e.width = r; e.height = r;
    }

    // 六爻面板：贴在石台顶面，自下而上
    this._yaoW = W * 0.098;
    this._yaoH = this._yaoW * 0.085;
    const yStep = this._yaoH * 2.3;
    const yBase = this.altar.y - this.altar.height * 0.54;
    for (let i = 0; i < 6; i++) {
      const g = this.yaoLines[i];
      g.position.set(this.altar.x, yBase - i * yStep);
      this._drawYao(g, this.yaoData[i]);
    }

    // 卦叶
    const lk = (DESIGN_W * 0.115) / this.leaves[0].texture.width;
    for (const l of this.leaves) l.size = lk;
    // 普通落叶尺寸
    const nlk = (DESIGN_W * 0.062) / this.normalLeaves[0].texture.width;
    for (const s of this.normalLeaves) s.scale.set(nlk);

    // 粒子分布
    for (const p of this.particles) {
      p._baseX = W * (0.05 + Math.random() * 0.9);
      p._baseY = H * (0.28 + Math.random() * 0.62);
      const r = (p._warm ? 6 : 2.5) + Math.random() * (p._warm ? 5 : 5);
      p.width = r; p.height = r;
      p.position.set(p._baseX, p._baseY);
    }

    // 前景雾 / 压暗叶
    this.fogFront.position.set(W * 0.5, H * 0.91);
    this.fogFront.width = W * 1.35;
    this.fogFront.height = H * 0.22;
    this.overhangR.position.set(W * 1.0, H * -0.01);
    this.fitW(this.overhangR, 0.92);
    this.overhangR.rotation = 0.52;
    this.overhangL.position.set(W * -0.05, H * 0.0);
    this.fitW(this.overhangL, 0.5);
    this.overhangL.rotation = -0.55;
    this.overhangL.scale.x = -Math.abs(this.overhangL.scale.x);

    // 暗角
    this.vignette.position.set(W * 0.5, H * 0.5);
    this.cover(this.vignette, W, H);

    // 颗粒铺满
    this.grain.width = W;
    this.grain.height = H;
  }

  resize(app) {
    const screen = app.renderer.screen;
    const vw = screen.width, vh = screen.height;
    if (!vw || !vh) return;
    // 设计基准 1080×1920（9:16）：比 9:16 更高时向下延展设计高度；
    // 更宽时按 cover 居中裁切，保证构图不被压扁。
    const aspect = vw / vh;
    const TARGET = 9 / 16;
    const designH = aspect >= TARGET ? 1920 : DESIGN_W / aspect;
    this.H = designH;
    const s = Math.max(vw / DESIGN_W, vh / designH);
    this.root.scale.set(s);
    this.root.position.set((vw - DESIGN_W * s) / 2, (vh - designH * s) / 2);
    this._camBase = 1;
    this.cam.scale.set(1);
    this.cam.position.set(0, 0);
    if (this.camPush) { this.camPush.scale.set(1); this.camPush.position.set(0, 0); }
    if (this.sky) this.layout();
  }

  /** 生成一片普通落叶（不参与起卦，仅让世界活着） */
  spawnNormalLeaf() {
    const s = this.normalLeaves.find((l) => !l._active);
    if (!s) return;
    const W = DESIGN_W, H = this.H;
    const x0 = W * (0.06 + Math.random() * 0.62);
    const y0 = H * (0.05 + Math.random() * 0.22);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const x1 = x0 + W * (0.05 + Math.random() * 0.22) * dir;
    const y1 = H * (0.86 + Math.random() * 0.06);
    s._active = true; s.visible = true;
    s._t = 0; s._dur = 5 + Math.random() * 4;
    s._x0 = x0; s._y0 = y0; s._x1 = x1; s._y1 = y1;
    s._cx = (x0 + x1) / 2 + (Math.random() - 0.5) * W * 0.18;
    s._cy = (y0 + y1) / 2 - H * 0.05;
    s._sway = 0.6 + Math.random() * 0.9;
    s._spin = (Math.random() - 0.5) * 4;
    s.alpha = 0;
    s.position.set(x0, y0);
  }

  /** 画一个爻（阳=实线，阴=断线；动爻加暖色点） */
  _drawYao(g, data) {
    const w = this._yaoW, h = this._yaoH;
    g.clear();
    if (!data) { g.alpha = 0; return; }
    const color = 0xcfe0ec;
    if (data.yang) {
      g.roundRect(-w / 2, -h / 2, w, h, h / 2);
      g.fill({ color, alpha: 0.92 });
    } else {
      const gap = w * 0.24, seg = (w - gap) / 2;
      g.roundRect(-w / 2, -h / 2, seg, h, h / 2);
      g.roundRect(gap / 2, -h / 2, seg, h, h / 2);
      g.fill({ color, alpha: 0.92 });
    }
    if (data.changing) {
      g.circle(w / 2 + h * 1.7, 0, h * 0.78);
      g.fill({ color: 0xc9924f, alpha: 0.95 });
    }
    g.alpha = 0.8;
  }

  /** 由外部（cast.js）同步六爻到石台；animateIndex 指定刚生成的一爻 */
  setLines(linesYang, lineKinds, animateIndex = -1) {
    this.yaoData = (linesYang || []).map((yang, i) => ({
      yang,
      changing: lineKinds && (lineKinds[i] === 1 || lineKinds[i] === -1),
    }));
    for (let i = 0; i < 6; i++) {
      const g = this.yaoLines[i];
      const d = this.yaoData[i];
      if (!d) { g.clear(); g.alpha = 0; g.scale.set(1); continue; }
      this._drawYao(g, d);
      if (i === animateIndex) {
        g.alpha = 0; g.scale.set(0.12, 1);
        gsap.to(g, { alpha: 0.92, duration: 0.5, ease: 'sine.out' });
        gsap.to(g.scale, { x: 1, duration: 0.65, ease: 'power3.out' });
      } else {
        g.alpha = 0.8; g.scale.set(1);
      }
    }
  }

  /** 环境运动（ticker）：云、雾、尘、呼吸、层级摆动 */
  update(dt) {
    this._t += dt;
    const t = this._t;
    const w = this.wind + 0.05 + Math.sin(t * 0.21) * 0.025 + Math.sin(t * 0.047) * 0.02;

    // 云极慢移动
    this.cloudA.x += dt * (2.2 + w * 22);
    this.cloudB.x += dt * (1.4 + w * 14);
    if (this.cloudA.x > DESIGN_W * 1.35) this.cloudA.x = -DESIGN_W * 0.35;
    if (this.cloudB.x > DESIGN_W * 1.35) this.cloudB.x = -DESIGN_W * 0.35;

    // 雾流动（软边横移 + 呼吸）
    this.mistBack.x = DESIGN_W * 0.5 + Math.sin(t * 0.045) * (30 + w * 60);
    this.fogFront.x = DESIGN_W * 0.5 - Math.sin(t * 0.06) * (36 + w * 80);
    this.mistMid.x = DESIGN_W * 0.5 + Math.sin(t * 0.08) * 30;
    this.mistBack.alpha = 0.30 + Math.sin(t * 0.11) * 0.04;
    this.fogFront.alpha = 0.26 + Math.sin(t * 0.09 + 1.7) * 0.04;

    // 分层摆动：树干几乎不动，粗枝慢而小，叶冠快而大且带相位差
    const sway = (o, amp, freq, ph) => {
      if (o._baseRot === undefined) o._baseRot = o.rotation;
      o.rotation = o._baseRot + Math.sin(t * freq + ph) * (amp + w * amp * 6);
    };
    sway(this.leavesBackB, 0.008, 0.55, 0.4);
    sway(this.leavesBackA, 0.007, 0.62, 2.1);
    sway(this.leavesMidC, 0.012, 0.78, 3.4);
    sway(this.leavesMidF, 0.016, 0.66, 5.2);
    sway(this.leavesMidD, 0.018, 0.76, 0.6);
    sway(this.leavesMidE, 0.014, 0.70, 3.9);
    sway(this.leavesMidA, 0.016, 0.72, 1.1);
    sway(this.leavesMidB, 0.014, 0.68, 4.8);
    sway(this.leavesFrontA, 0.020, 0.85, 5.6);
    this.treeBranch.rotation = Math.sin(t * 0.42 + 2.7) * (0.004 + w * 0.018);
    this.treeTrunk.rotation = Math.sin(t * 0.35 + 0.6) * (0.002 + w * 0.004);
    this.treeBranchRim.rotation = this.treeBranch.rotation;
    this.leavesRim.rotation = this.leavesMidA.rotation;

    // 地面月斑 / 月影随清风晃动（docs/03 §8）
    if (this._groundLightX !== undefined) {
      this.groundLight.x = this._groundLightX + Math.sin(t * 0.17) * (18 + w * 46);
      this.groundLight.alpha = 0.42 + w * 0.20 + Math.sin(t * 0.13) * 0.03;
    }
    this.groundShadow.rotation = this._shadowBaseRot + Math.sin(t * 0.55) * (0.012 + w * 0.06);
    this.groundShadow.alpha = 0.5 - w * 0.12;

    // 人物呼吸
    if (this._charSY) this.character.scale.y = this._charSY * (1 + Math.sin(t * 1.35) * 0.008);

    // 镜头呼吸（idle）：极轻的漂移与缩放
    this.cam.x = Math.sin(t * 0.06) * DESIGN_W * 0.004;
    this.cam.y = Math.sin(t * 0.045 + 1.2) * this.H * 0.003;
    this.cam.scale.set(1 + Math.sin(t * 0.05 + 0.4) * 0.002);

    // 普通落叶：10~25s 随机掉一片
    this._normalTimer -= dt;
    if (this._normalTimer <= 0) {
      this.spawnNormalLeaf();
      this._normalTimer = 10 + Math.random() * 15;
    }
    for (const s of this.normalLeaves) {
      if (!s._active) continue;
      s._t += dt;
      const k = s._t / s._dur;
      if (k >= 1) { s._active = false; s.visible = false; s.alpha = 0; continue; }
      const mt = 1 - k;
      s.x = mt * mt * s._x0 + 2 * mt * k * s._cx + k * k * s._x1 + Math.sin(k * 9 * s._sway) * 18 * mt;
      s.y = mt * mt * s._y0 + 2 * mt * k * s._cy + k * k * s._y1;
      s.rotation = k * s._spin;
      s.alpha = Math.min(1, k * 5) * Math.min(1, (1 - k) * 4) * 0.92;
    }

    // 胶片颗粒抖动
    this.grain.tilePosition.set(Math.random() * 512, Math.random() * 512);

    // 尘 / 萤火
    for (const p of this.particles) {
      p.y = p._baseY + Math.sin(t * 0.5 + p._seed) * p._range - ((t * p._spd) % (DESIGN_W * 0.35));
      p.x = p._baseX + Math.sin(t * 0.32 + p._seed * 1.7) * 26;
      p.alpha = p._amp * (0.55 + 0.45 * Math.sin(t * 1.8 + p._seed * 3.1));
    }

    // 暖色余烬呼吸
    for (const e of this.embers) {
      e.alpha = 0.34 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.1 + e.position.x * 0.01));
    }

    for (const l of this.leaves) l.update(dt);

    // 卦叶接地阴影：随下落渐显，落地后稳定
    this.leaves.forEach((l, i) => {
      const sh = this.leafShadows[i];
      if (!l.visible) { sh.alpha = 0; return; }
      const groundY = l.y1 !== undefined ? l.y1 : l.y;
      const t = l.state === 'landed' ? 1 : (l.t || 0);
      const leafW = (l.texture ? l.texture.width : 1024) * l.size;
      const k = (leafW / sh.texture.width) * (0.45 + 0.55 * t) * 0.85;
      sh.x = l.x;
      sh.y = groundY + leafW * 0.06;
      sh.scale.set(k, k * 0.34);
      sh.alpha = 0.5 * Math.min(1, Math.max(0, (t - 0.12) / 0.5));
    });
  }

  /** 六次递进：雾渐薄、月渐亮、地影渐清（docs/03 §8） */
  setProgress(i) {
    this.progress = i;
    const k = Math.min(1, i / 6);
    gsap.to(this.mistBack, { alpha: 0.30 - k * 0.14, duration: 1.4 });
    gsap.to(this.fogFront, { alpha: 0.26 - k * 0.12, duration: 1.4 });
    gsap.to(this.mistMid, { alpha: 0.16 - k * 0.08, duration: 1.4 });
    gsap.to(this.moon, { alpha: 0.82 + k * 0.18, duration: 1.6 });
    gsap.to(this.moonHalo, { alpha: 0.5 + k * 0.35, duration: 1.6 });
    gsap.to(this.groundLight, { alpha: 0.42 + k * 0.24, duration: 1.6 });
    gsap.to(this.cloudA, { x: this.cloudA.x - 60, duration: 2.0, ease: 'sine.inOut' });
    if (i >= 6) this.finalReveal();
  }

  /** 成卦：风停、云散、月出、镜头轻推 */
  finalReveal() {
    const tl = gsap.timeline();
    tl.to(this, { wind: 0, duration: 1.2, ease: 'sine.out' }, 0);
    tl.to(this.cloudA, { x: DESIGN_W * 0.15, alpha: 0.18, duration: 2.4, ease: 'sine.inOut' }, 0.2);
    tl.to(this.cloudB, { x: DESIGN_W * 1.25, alpha: 0.2, duration: 2.4, ease: 'sine.inOut' }, 0.2);
    tl.to(this.moon, { alpha: 1, duration: 2.0 }, 0.3);
    tl.to(this.moonHalo, { alpha: 1, duration: 2.0 }, 0.3);
    tl.to(this.moonBeam, { alpha: 0.2, duration: 2.4 }, 0.4);
    // 镜头：停顿 → 缓慢推近 + 轻微上摇 → 继续极缓漂移
    tl.to(this.camPush.scale, { x: 1.035, y: 1.035, duration: 2.8, ease: 'power2.inOut' }, 0.5);
    tl.to(this.camPush, { y: -this.H * 0.014, duration: 2.8, ease: 'power2.inOut' }, 0.5);
    tl.to(this.camPush, { x: -DESIGN_W * 0.006, duration: 2.8, ease: 'power2.inOut' }, 0.5);
    tl.to(this.camPush.scale, { x: 1.042, y: 1.042, duration: 3.0, ease: 'sine.inOut' }, 3.3);
    tl.to(this.camPush, { y: -this.H * 0.02, duration: 3.0, ease: 'sine.inOut' }, 3.3);
  }

  /**
   * 单次问卦时间线（docs/03 §2 风的视觉因果链）：
   * 远方风声 → 雾加速 → 衣摆 → 树冠 → 枝条 → 三叶脱枝 → 停顿 → 月光扫过 → 爻生成
   */
  roll(faces) {
    return new Promise((resolve) => {
      const tl = gsap.timeline();
      // 风起（克制）
      tl.to(this, { wind: 0.35, duration: 0.55, ease: 'sine.out' }, 0);
      tl.to(this, { wind: 1.0, duration: 0.85, ease: 'sine.inOut' }, 0.45);
      tl.to(this, { wind: 0.12, duration: 1.7, ease: 'sine.out' }, 2.0);
      // 镜头极轻呼吸
      tl.to(this.camPush.scale, { x: 1.012, y: 1.012, duration: 3.2, ease: 'sine.inOut' }, 0.6);
      tl.to(this.camPush, { y: -this.H * 0.006, duration: 3.2, ease: 'sine.inOut' }, 0.6);
      // 三叶脱枝
      tl.call(() => this.launchAndTrack(faces, resolve), null, 1.02);
      // 月束扫过
      tl.call(() => this.flashBeam(), null, 2.45);
    });
  }

  launchLeaves(faces) {
    const W = DESIGN_W, H = this.H;
    const starts = [
      { x: W * 0.40, y: H * 0.16 },
      { x: W * 0.30, y: H * 0.24 },
      { x: W * 0.46, y: H * 0.13 },
    ];
    const targets = [
      { x: W * 0.34, y: H * 0.888 },
      { x: W * 0.56, y: H * 0.826 },
      { x: W * 0.74, y: H * 0.882 },
    ];
    this.leaves.forEach((l, i) => {
      const p = DivinationLeaf.PERSONAS[i % 3];
      l.launch(starts[i].x, starts[i].y, targets[i].x, targets[i].y, p, faces[i], i * 240);
    });
  }

  /** 发射三叶并在全部落定后 resolve（onLand 必须在 launch 之后挂，reset 会清空） */
  launchAndTrack(faces, resolve) {
    this.launchLeaves(faces);
    let landed = 0;
    this.leaves.forEach((l, i) => {
      l.onLand = () => {
        if (this.onLeafLand) this.onLeafLand(i);
        landed += 1;
        if (landed === this.leaves.length) setTimeout(resolve, 420);
      };
    });
  }

  flashBeam() {
    gsap.timeline()
      .to(this.moonBeam, { alpha: 0.55, duration: 0.22, ease: 'sine.out' })
      .to(this.overhangR, { alpha: 0.78, duration: 0.25 }, 0)
      .to(this.moonBeam, { alpha: 0.16, duration: 0.5, ease: 'sine.in' }, 0.24)
      .to(this.overhangR, { alpha: 0.96, duration: 0.5 }, 0.25);
  }
}
