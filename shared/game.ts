import { createBoss, stepBoss, type BossBattle } from "./boss";
import { type BossId, bossLane } from "./bosses";
import {
  MODES,
  paddleHeight,
  pulseActive,
  gravityCenter,
  bumperY,
  type Mode,
} from "./modes";
export type { Mode } from "./modes";
export const W = 1280,
  H = 720,
  R = 9,
  PADDLE = 108,
  PX = 48,
  SPEED = 580,
  MAX_SPEED = 1250,
  DT = 1 / 60;
export const MOUSE_SPEED = 1100;
export type GameEvent = {
  id: number;
  type:
    | "paddle"
    | "wall"
    | "goal"
    | "win"
    | "serve"
    | "power"
    | "boss-shot"
    | "boss-hit"
    | "boss-phase"
    | "player-hit";
  x: number;
  y: number;
  side: number;
  time?: number;
};
export type State = {
  ball: { x: number; y: number; vx: number; vy: number };
  paddles: number[];
  boss?: BossBattle;
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
export function createGame(
  mode: Mode = "classic",
  boss: BossId = "voltmaw",
  count = 1,
): State {
  return {
    ball: {
      x: mode === "ricochet" ? W / 2 - 140 : W / 2,
      y: H / 2,
      vx: mode === "blitz" ? 680 : 440,
      vy: 180,
    },
    ...(mode === "boss"
      ? {
          boss: createBoss(
            boss,
            Math.max(1, Math.min(4, Math.floor(count) || 1)),
          ),
        }
      : {}),
    paddles:
      mode === "boss"
        ? Array.from(
            { length: Math.max(1, Math.min(4, Math.floor(count) || 1)) },
            (_, i) => {
              const l = bossLane(
                i,
                Math.max(1, Math.min(4, Math.floor(count) || 1)),
              );
              return (l.top + l.bottom) / 2;
            },
          )
        : [H / 2, H / 2],
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
export function won(a: number, b: number, mode: Mode = "classic") {
  if (mode === "blitz") return a >= 5;
  return a >= 15 || (a >= 7 && a - b >= 2);
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function movePaddle(
  y: number,
  direction: number,
  target: number | null,
  dt: number,
  height = 108,
  bounds: readonly [number, number] = [height / 2, H - height / 2],
): number {
  if (!Number.isFinite(dt) || dt <= 0) return y;
  const [min, max] = bounds;
  if (target !== null && Number.isFinite(target)) {
    const d = clamp(target, min, max) - y;
    return clamp(y + clamp(d, -MOUSE_SPEED * dt, MOUSE_SPEED * dt), min, max);
  }
  return clamp(
    y + (Number.isFinite(direction) ? clamp(direction, -1, 1) : 0) * SPEED * dt,
    min,
    max,
  );
}
function event(s: State, type: GameEvent["type"], side = -1) {
  s.events.push({ id: ++s.seq, type, x: s.ball.x, y: s.ball.y, side });
  s.events = s.events.slice(-32);
}
export function step(
  s: State,
  input: readonly number[],
  dt = DT,
  targets: readonly (number | null)[] = [],
): void {
  if (!Number.isFinite(dt) || dt <= 0 || s.phase === "finished") return;
  if (s.boss) {
    stepBoss(s, input, dt, targets);
    return;
  }
  // Substeps bound displacement below the ball radius, including unusually large frame deltas.
  const total = Math.min(dt, 0.25),
    n = Math.max(1, Math.ceil((total * MAX_SPEED) / 6)),
    h = total / n;
  const velocities = [0, 0];
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < 2; i++) {
      const before = s.paddles[i];
      s.paddles[i] = movePaddle(
        before,
        input[i],
        targets[i] ?? null,
        h,
        paddleHeight(s.mode, s.hits),
      );
      velocities[i] = clamp((s.paddles[i] - before) / (SPEED * h), -1, 1);
    }
    if (s.phase === "countdown") {
      s.timer -= h;
      if (s.timer <= 0) {
        s.phase = "playing";
        event(s, "serve");
      }
      continue;
    }
    const wasPulse = pulseActive(s.elapsed);
    s.elapsed += h;
    if (s.mode === "pulse" && wasPulse !== pulseActive(s.elapsed))
      event(s, "power");
    const b = s.ball;
    if (s.mode === "gravity") {
      const speed = Math.hypot(b.vx, b.vy);
      const pull =
        ((gravityCenter(s.elapsed) - b.y) * 2.6) /
        (1 + Math.abs(b.x - W / 2) / 220);
      b.vy = clamp(b.vy + pull * h, -speed * 0.87, speed * 0.87);
      b.vx =
        (b.vx < 0 ? -1 : 1) *
        Math.sqrt(Math.max(0, speed * speed - b.vy * b.vy));
    }
    if (s.mode === "ricochet") {
      const dx = b.x - W / 2,
        dy = b.y - bumperY(s.elapsed),
        d = Math.hypot(dx, dy),
        radius = 54;
      if (d < radius && d > 0) {
        const nx = dx / d,
          ny = dy / d,
          dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 2 * dot * nx;
          b.vy -= 2 * dot * ny;
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = (b.vx < 0 ? -1 : 1) * Math.max(Math.abs(b.vx), speed * 0.45);
          const scale = speed / Math.hypot(b.vx, b.vy);
          b.vx *= scale;
          b.vy *= scale;
          event(s, "power");
        }
        b.x = W / 2 + nx * (radius + 0.1);
        b.y = bumperY(s.elapsed) + ny * (radius + 0.1);
      }
    }
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
      if (
        crossed &&
        Math.abs(b.y - s.paddles[i]) <= paddleHeight(s.mode, s.hits) / 2 + R
      ) {
        const speed = Math.min(
          MAX_SPEED,
          Math.hypot(b.vx, b.vy) * MODES[s.mode].acceleration,
        );
        let a = clamp(
          ((b.y - s.paddles[i]) / (paddleHeight(s.mode, s.hits) / 2)) * 1.02 +
            velocities[i] * 0.12,
          -1.12,
          1.12,
        );
        if (Math.abs(a) < 0.12) a = a < 0 ? -0.12 : 0.12;
        b.x = x;
        b.vx = (i === 0 ? 1 : -1) * Math.cos(a) * speed;
        b.vy = Math.sin(a) * speed;
        s.hits++;
        if (s.mode === "shrink" && s.hits % 2 === 0) event(s, "power");
        s.longest = Math.max(s.longest, s.hits);
        event(s, "paddle", i);
      }
    }
    if (b.x < -R || b.x > W + R) {
      const side = b.x > W ? 0 : 1;
      s.score[side] = Math.min(
        15,
        s.score[side] + (s.mode === "pulse" && pulseActive(s.elapsed) ? 2 : 1),
      );
      event(s, "goal", side);
      s.hits = 0;
      if (won(s.score[side], s.score[1 - side], s.mode)) {
        s.phase = "finished";
        s.winner = side;
        event(s, "win", side);
        return;
      }
      s.ball = {
        x: s.mode === "ricochet" ? W / 2 + (side === 0 ? -140 : 140) : W / 2,
        y: H / 2,
        vx: (side === 0 ? -1 : 1) * (s.mode === "blitz" ? 680 : 440),
        vy: s.score.reduce((a, b) => a + b) % 2 ? 180 : -180,
      };
      s.phase = "countdown";
      s.timer = s.mode === "blitz" ? 0.65 : 1.5;
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
