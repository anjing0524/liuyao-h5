const transitions = {
  loading: ["ready", "error", "disposed"],
  ready: ["drawing", "error", "disposed"],
  drawing: ["wind", "ready", "error", "disposed"],
  wind: ["falling", "error", "disposed"],
  falling: ["settling", "error", "disposed"],
  settling: ["inscribing", "error", "disposed"],
  inscribing: ["ready", "revealing", "error", "disposed"],
  revealing: ["complete", "error", "disposed"],
  complete: ["installing", "disposed"],
  installing: ["result-error", "disposed"],
  "result-error": ["installing", "disposed"],
  error: ["disposed"],
  disposed: [],
};
export class OracleMachine {
  phase = "loading";
  lines = [];
  constructor(notify = () => {}) {
    this.notify = notify;
  }
  transition(next) {
    if (!transitions[this.phase].includes(next))
      throw new Error(`Invalid transition: ${this.phase} → ${next}`);
    this.phase = next;
    this.notify(next, [...this.lines]);
  }
  append(line) {
    if (this.phase !== "inscribing" || this.lines.length >= 6)
      throw new Error("Cannot inscribe now");
    this.lines.push(line);
    this.notify(this.phase, [...this.lines]);
  }
}
