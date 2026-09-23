var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value,
      })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Application, Container, Sprite, Texture } from "pixi.js";
import { gsap } from "gsap";
import { loadArt } from "./art.js";
import { OracleMachine } from "./flow.js";
const WORLD = { width: 900, height: 1600 };
class MoonScene {
  constructor(host, hooks) {
    __publicField(this, "host", host);
    __publicField(this, "hooks", hooks);
    __publicField(this, "machine");
    __publicField(this, "app", new Application());
    __publicField(this, "world", new Container());
    __publicField(this, "camera", new Container());
    __publicField(this, "art");
    __publicField(this, "tree");
    __publicField(this, "traveler");
    __publicField(this, "grass");
    __publicField(this, "mist", []);
    __publicField(this, "leaves", []);
    __publicField(this, "ambient", []);
    __publicField(this, "sparks", []);
    __publicField(this, "timeline");
    __publicField(this, "observer");
    __publicField(this, "time", 0);
    __publicField(this, "atmosphere", {
      wind: 0,
      branchWind: 0,
      quiet: 1,
      zoom: 1,
    });
    __publicField(this, "initialized", false);
    __publicField(
      this,
      "reduced",
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    __publicField(this, "visibility", () => {
      if (document.hidden) {
        this.app.stop();
        this.timeline?.pause();
      } else {
        this.app.start();
        this.timeline?.resume();
      }
    });
    __publicField(this, "tick", (ticker) => {
      this.time += Math.min(ticker.deltaMS, 50) / 1e3;
      const t = this.time,
        a = this.atmosphere,
        calm = this.reduced ? 0.12 : 1;
      const wind = a.wind * calm;
      this.tree.rotation =
        Math.sin(t * 1.4) * (18e-4 + a.branchWind * calm * 8e-3) * a.quiet;
      this.traveler.skew.x = Math.sin(t * 2.4) * (2e-3 + wind * 0.021);
      this.traveler.height = 350 + Math.sin(t * 1.7) * 1.3 * calm;
      this.grass.skew.x = Math.sin(t * 3) * (0.012 + wind * 0.11) * calm;
      for (const d of this.mist) {
        d.sprite.x =
          d.x + Math.sin(t * 0.13 + d.phase) * 50 * calm + wind * 42 * d.speed;
        d.sprite.alpha =
          (d.opacity ?? 0.055) *
          (1 + Math.sin(t * 0.16 + d.phase) * 0.18) *
          a.quiet;
      }
      for (const d of this.ambient) {
        const v = (t * d.speed * calm + d.y) % 1100;
        d.sprite.position.set(
          d.x + Math.sin(t * 0.7 + d.phase) * 25 + wind * 25,
          v + 220,
        );
        d.sprite.rotation = t * 0.4 + d.phase;
        d.sprite.alpha = 0.3 * a.quiet;
      }
      for (const d of this.sparks) {
        d.sprite.position.set(
          d.x + Math.sin(t * 0.6 + d.phase) * 15,
          d.y + Math.cos(t * 0.5 + d.phase) * 18,
        );
        d.sprite.alpha =
          (0.15 + Math.max(0, Math.sin(t * 1.2 + d.phase)) * 0.55) * a.quiet;
      }
      this.camera.scale.set(a.zoom);
      this.camera.position.set(450 * (1 - a.zoom), 930 * (1 - a.zoom));
    });
    this.machine = new OracleMachine(hooks.state);
  }
  async init() {
    try {
      this.art = await loadArt(this.hooks.progress);
      if (this.machine.phase === "disposed") return;
      await this.app.init({
        width: 900,
        height: 1600,
        preference: "webgl",
        background: 531485,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        powerPreference: "low-power",
      });
      this.initialized = true;
      if (this.machine.phase === "disposed") {
        this.app.destroy(true, { children: true });
        return;
      }
      this.host.appendChild(this.app.canvas);
      this.app.canvas.setAttribute("aria-hidden", "true");
      this.app.stage.addChild(this.world);
      this.world.addChild(this.camera);
      this.compose();
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.host);
      this.resize();
      this.app.ticker.maxFPS = 60;
      this.app.ticker.add(this.tick);
      document.addEventListener("visibilitychange", this.visibility);
      this.machine.transition("ready");
    } catch (error) {
      if (this.machine.phase !== "disposed") {
        this.machine.transition("error");
        this.hooks.error(
          error instanceof Error
            ? error.message
            : "\u573A\u666F\u52A0\u8F7D\u5931\u8D25",
        );
      }
    }
  }
  sprite(key, x, y, w, h, anchorX = 0.5, anchorY = 0.5) {
    const s = new Sprite(this.art[key]);
    s.anchor.set(anchorX, anchorY);
    s.position.set(x, y);
    s.width = w;
    s.height = h;
    this.camera.addChild(s);
    return s;
  }
  compose() {
    this.sprite("landscape", 450, 800, 900, 1600);
    for (let i = 0; i < 2; i++) {
      const s = this.sprite("mist", 270 + i * 500, 330 + i * 95, 950, 180);
      s.alpha = 0.095;
      this.mist.push({
        sprite: s,
        x: s.x,
        y: s.y,
        phase: i * 3,
        speed: 0.3,
        opacity: 0.055,
      });
    }
    this.tree = this.sprite("tree", 290, 1200, 790, 711, 0.5, 1);
    for (let i = 0; i < 2; i++) {
      const s = this.sprite("mist", 190 + i * 500, 1185 + i * 60, 800, 110);
      s.alpha = 0.045;
      this.mist.push({
        sprite: s,
        x: s.x,
        y: s.y,
        phase: i * 2,
        speed: 1,
        opacity: 0.045,
      });
    }
    this.sprite("altar", 620, 1230, 250, 208, 0.5, 1);
    this.traveler = this.sprite("traveler", 410, 1252, 220, 350, 0.5, 1);
    this.grass = this.sprite("grass", 870, 1375, 150, 185, 0.5, 1);
    this.grass.tint = 7903879;
    const leftGrass = this.sprite("grass", 5, 1375, 145, 178, 0.5, 1);
    leftGrass.scale.x *= -1;
    leftGrass.tint = 7903879;
    for (let i = 0; i < 7; i++) {
      const s = this.sprite(
        "leafFront",
        0,
        0,
        13 + (i % 3) * 3,
        13 + (i % 3) * 3,
      );
      s.alpha = 0.32;
      this.ambient.push({
        sprite: s,
        x: 70 + i * 121,
        y: 490 + i * 115,
        phase: i * 1.7,
        speed: 9 + i * 2,
      });
    }
    for (let i = 0; i < 12; i++) {
      const s = new Sprite(Texture.WHITE);
      s.tint = 15191684;
      s.width = s.height = 2 + (i % 2);
      this.camera.addChild(s);
      this.sparks.push({
        sprite: s,
        x: 130 + i * 57,
        y: 830 + (i % 4) * 92,
        phase: i * 2.1,
        speed: 1,
      });
    }
    for (let i = 0; i < 3; i++) {
      const s = this.sprite("leafFront", 0, 0, 34, 31);
      s.visible = false;
      this.leaves.push(s);
    }
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.app.renderer.resize(w, h);
    const scale = Math.min(w / 900, h / 1600);
    this.world.scale.set(scale);
    this.world.position.set((w - 900 * scale) / 2, (h - 1600 * scale) / 2);
  }
  ask(line) {
    if (this.machine.phase !== "drawing") return;
    this.machine.transition("wind");
    this.leaves.forEach((s) => {
      s.visible = false;
    });
    const tl = (this.timeline = gsap.timeline({
      onComplete: () => {
        this.timeline = void 0;
      },
      onInterrupt: () => {},
    }));
    tl.to(this.atmosphere, { wind: 1, duration: 1.6, ease: "sine.inOut" }, 0)
      .to(
        this.atmosphere,
        { branchWind: 1, duration: 1, ease: "sine.inOut" },
        0.85,
      )
      .call(() => this.machine.transition("falling"), [], 1.9);
    this.leaves.forEach((leaf, i) =>
      this.animateLeaf(tl, leaf, i, line, 2 + i * 0.37),
    );
    tl.call(() => this.machine.transition("settling"), [], 5.8)
      .to(
        this.atmosphere,
        { wind: 0.12, branchWind: 0.12, duration: 1.1, ease: "sine.out" },
        5.8,
      )
      .call(
        () => {
          this.machine.transition("inscribing");
          this.machine.append(line);
        },
        [],
        6.7,
      );
    if (this.machine.lines.length === 5) {
      tl.call(() => this.machine.transition("revealing"), [], 7.35)
        .to(
          this.atmosphere,
          {
            zoom: this.reduced ? 1 : 1.065,
            quiet: 0.28,
            wind: 0,
            branchWind: 0,
            duration: 2.2,
            ease: "sine.inOut",
          },
          7.35,
        )
        .call(() => this.machine.transition("complete"), [], 9.55);
    } else
      tl.to(
        this.atmosphere,
        { wind: 0, branchWind: 0, duration: 0.45 },
        7.15,
      ).call(() => this.machine.transition("ready"), [], 7.65);
    if (this.reduced) tl.timeScale(1.7);
  }
  animateLeaf(tl, leaf, i, line, start) {
    const duration = 2.5 + i * 0.18,
      flight = { p: 0 },
      landX = 583 + i * 38,
      landY = 1065 + (i % 2) * 9;
    const originX = 350 + i * 85,
      originY = 665 + i * 24,
      turns = 3 + i;
    tl.call(
      () => {
        leaf.visible = true;
        leaf.alpha = 1;
        leaf.texture = this.art.leafFront;
      },
      [],
      start,
    )
      .to(
        flight,
        {
          p: 1,
          duration,
          ease: "none",
          onUpdate: () => {
            const p = flight.p,
              flip = Math.cos(p * Math.PI * turns * 2);
            leaf.texture =
              p > 0.97
                ? line.faces[i] === true
                  ? this.art.leafFront
                  : this.art.leafBack
                : flip >= 0
                  ? this.art.leafFront
                  : this.art.leafBack;
            leaf.width = 34 * Math.max(0.08, Math.abs(flip));
            leaf.height = 31 * (1 - p * 0.35);
            leaf.x =
              originX +
              (landX - originX) * p +
              Math.sin(p * Math.PI * 3 + i) * Math.sin(p * Math.PI) * 57;
            leaf.y = originY + (landY - originY) * p * p;
            leaf.rotation = Math.sin(p * 9 + i) * 0.65 * (1 - p) + i * 0.24;
          },
        },
        start,
      )
      .call(() => this.hooks.leafLand?.(i), [], start + duration)
      .to(
        leaf,
        { y: landY - 4, duration: 0.11, ease: "sine.out" },
        start + duration,
      )
      .to(
        leaf,
        { y: landY, duration: 0.18, ease: "sine.in" },
        start + duration + 0.11,
      );
  }
  destroy() {
    if (this.machine.phase === "disposed") return;
    this.machine.transition("disposed");
    this.timeline?.kill();
    this.observer?.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    if (this.initialized)
      this.app.destroy(true, {
        children: true,
        texture: false,
        textureSource: false,
      });
  }
}
export { MoonScene, WORLD };
