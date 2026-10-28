export const W = 1280,
  H = 720,
  R = 9,
  PADDLE = 108,
  PX = 48,
  SPEED = 580,
  MAX_SPEED = 1250,
  DT = 1 / 60;
export type Mode = "classic" | "overdrive";
export type GameEvent = {
  id: number;
  type: "paddle" | "wall" | "goal" | "win" | "serve";
  x: number;
  y: number;
  side: number;
};
export type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: [number, number];
  score: [number, number];
  phase: "countdown" | "playing" | "finished";
  timer: number;
  winner: number;
  hits: number;
  longest: number;
  elapsed: number;
  seq: number;
  events: GameEvent[];
  mode: Mode;
};
export function createGame(mode: Mode = "classic"): State {
  return {
    ball: { x: W / 2, y: H / 2, vx: 440, vy: 180 },
    paddles: [H / 2, H / 2],
    score: [0, 0],
    phase: "countdown",
    timer: 3,
    winner: -1,
    hits: 0,
    longest: 0,
    elapsed: 0,
    seq: 0,
    events: [],
    mode,
  };
}
export function won(a: number, b: number) {
  return a >= 15 || (a >= 7 && a - b >= 2);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function event(s: State, type: GameEvent["type"], side = -1) {
  s.events.push({ id: ++s.seq, type, x: s.ball.x, y: s.ball.y, side });
  s.events = s.events.slice(-32);
}
export function step(s: State, input: readonly number[], dt = DT): void {
  if (!Number.isFinite(dt) || dt <= 0 || s.phase === "finished") return;
  // Substeps bound displacement below the ball radius, including unusually large frame deltas.
  const total = Math.min(dt, 0.25),
    n = Math.max(1, Math.ceil((total * MAX_SPEED) / 6)),
    h = total / n;
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < 2; i++) {
      const v = Number.isFinite(input[i]) ? clamp(input[i], -1, 1) : 0;
      s.paddles[i] = clamp(
        s.paddles[i] + v * SPEED * h,
        PADDLE / 2,
        H - PADDLE / 2,
      );
    }
    if (s.phase === "countdown") {
      s.timer -= h;
      if (s.timer <= 0) {
        s.phase = "playing";
        event(s, "serve");
      }
      continue;
    }
    s.elapsed += h;
    const b = s.ball;
    const old = b.x;
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y < R) {
      b.y = 2 * R - b.y;
      b.vy = Math.abs(b.vy);
      event(s, "wall");
    }
    if (b.y > H - R) {
      b.y = 2 * (H - R) - b.y;
      b.vy = -Math.abs(b.vy);
      event(s, "wall");
    }
    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? PX + 8 + R : W - PX - 8 - R;
      const crossed =
        i === 0
          ? b.vx < 0 && old >= x && b.x <= x
          : b.vx > 0 && old <= x && b.x >= x;
      if (crossed && Math.abs(b.y - s.paddles[i]) <= PADDLE / 2 + R) {
        const speed = Math.min(
          MAX_SPEED,
          Math.hypot(b.vx, b.vy) * (s.mode === "overdrive" ? 1.095 : 1.055),
        );
        let a = clamp(
          ((b.y - s.paddles[i]) / (PADDLE / 2)) * 1.02 + (input[i] || 0) * 0.12,
          -1.12,
          1.12,
        );
        if (Math.abs(a) < 0.12) a = a < 0 ? -0.12 : 0.12;
        b.x = x;
        b.vx = (i === 0 ? 1 : -1) * Math.cos(a) * speed;
        b.vy = Math.sin(a) * speed;
        s.hits++;
        s.longest = Math.max(s.longest, s.hits);
        event(s, "paddle", i);
      }
    }
    if (b.x < -R || b.x > W + R) {
      const side = b.x > W ? 0 : 1;
      s.score[side]++;
      event(s, "goal", side);
      s.hits = 0;
      if (won(s.score[side], s.score[1 - side])) {
        s.phase = "finished";
        s.winner = side;
        event(s, "win", side);
        return;
      }
      s.ball = {
        x: W / 2,
        y: H / 2,
        vx: side === 0 ? -440 : 440,
        vy: s.score.reduce((a, b) => a + b) % 2 ? 180 : -180,
      };
      s.phase = "countdown";
      s.timer = 1.5;
    }
  }
}
export const difficulties = {
  easy: { speed: 240, reaction: 0.23, error: 65 },
  normal: { speed: 350, reaction: 0.15, error: 38 },
  hard: { speed: 460, reaction: 0.09, error: 18 },
  insane: { speed: 560, reaction: 0.045, error: 6 },
};
export type Difficulty = keyof typeof difficulties;
export function aiTarget(s: State, difficulty: Difficulty): number {
  const d = difficulties[difficulty],
    b = s.ball;
  if (b.vx <= 0) return H / 2;
  const t = (W - PX - b.x) / b.vx;
  const raw = b.y + b.vy * Math.max(0, t),
    span = H - 2 * R;
  const fold = (((raw - R) % (2 * span)) + 2 * span) % (2 * span);
  return (
    R +
    (fold > span ? 2 * span - fold : fold) +
    Math.sin(s.elapsed * 1.7) * d.error
  );
}
