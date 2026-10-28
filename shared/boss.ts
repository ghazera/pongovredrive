import {
  BOSSES,
  bossLane,
  raidBounds,
  raidHeight,
  type BossId,
} from "./bosses";
import { H, W, PX, movePaddle, type State, type GameEvent } from "./game";
export type Orb = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: number;
  returned: boolean;
  radius: number;
  damage: number;
};
export type Warning = {
  id: number;
  target: number;
  y: number;
  timer: number;
  duration: number;
};
export type BossBattle = {
  id: BossId;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  players: number[];
  maxHearts: number;
  orbs: Orb[];
  warnings: Warning[];
  cooldown: number;
  wave: number;
  nextId: number;
  parries: number;
  damageTaken: number;
};
export function createBoss(id: BossId, count: number): BossBattle {
  const hp = BOSSES[id].hp + 6 * (count - 1);
  return {
    id,
    hp,
    maxHp: hp,
    phase: 1,
    players: Array(count).fill(5),
    maxHearts: 5,
    orbs: [],
    warnings: [],
    cooldown: 0,
    wave: 0,
    nextId: 0,
    parries: 0,
    damageTaken: 0,
  };
}
function emit(
  s: State,
  type: GameEvent["type"],
  x: number,
  y: number,
  side = -1,
) {
  s.events.push({ id: ++s.seq, type, x, y, side, time: s.elapsed });
  s.events = s.events.slice(-48);
}
function finish(s: State, winner: number) {
  s.phase = "finished";
  s.winner = winner;
  s.boss!.warnings = [];
  emit(s, "win", winner === 0 ? 1030 : PX, H / 2, winner);
}
export function stepBoss(
  s: State,
  input: readonly number[],
  dt: number,
  targets: readonly (number | null)[],
) {
  const b = s.boss!,
    cfg = BOSSES[b.id],
    n = Math.max(1, Math.ceil((Math.min(dt, 0.25) * 1400) / 5)),
    h = Math.min(dt, 0.25) / n;
  for (let tick = 0; tick < n; tick++) {
    for (let i = 0; i < b.players.length; i++)
      if (b.players[i] > 0)
        s.paddles[i] = movePaddle(
          s.paddles[i],
          input[i] ?? 0,
          targets[i] ?? null,
          h,
          raidHeight(b.players.length),
          raidBounds(i, b.players.length),
        );
    if (s.phase === "countdown") {
      s.timer -= h;
      if (s.timer <= 0) {
        s.phase = "playing";
        emit(s, "serve", W / 2, H / 2);
      }
      continue;
    }
    if (b.hp <= 0) {
      b.hp = 0;
      finish(s, 0);
      return;
    }
    if (b.players.every((hp) => hp <= 0)) {
      finish(s, 1);
      return;
    }
    s.elapsed += h;
    const phase = b.hp / b.maxHp <= 1 / 3 ? 3 : b.hp / b.maxHp <= 2 / 3 ? 2 : 1;
    if (phase !== b.phase) {
      b.phase = phase;
      emit(s, "boss-phase", 1030, 360);
      b.cooldown = Math.min(b.cooldown, 0.6);
    }
    b.cooldown -= h;
    if (b.cooldown <= 0) {
      const alive = b.players.flatMap((hp, i) => (hp > 0 ? [i] : []));
      b.wave++;
      const shots = Math.min(3, b.phase === 1 ? 1 : b.phase === 2 ? 2 : 3);
      for (let i = 0; i < shots; i++) {
        const target = alive[(b.wave - 1 + i) % alive.length],
          lane = bossLane(target, b.players.length),
          margin = (b.id === "colossus" ? 17 : 11) + 10;
        const offset = Math.sin(b.wave * 1.9 + i * 2.3) * 0.95;
        const y =
          (lane.top + lane.bottom) / 2 +
          offset * ((lane.bottom - lane.top) / 2 - margin);
        const duration =
          (b.id === "colossus" ? 1.15 : 0.9) +
          i * (alive.length === 1 ? 0.65 : 0.32);
        b.warnings.push({
          id: ++b.nextId,
          target,
          y,
          timer: duration,
          duration,
        });
      }
      b.cooldown = Math.max(
        cfg.interval - (b.phase - 1) * 0.42,
        shots * (alive.length === 1 ? 0.65 : 0.32) + 0.15,
      );
    }
    for (const w of b.warnings) {
      w.timer -= h;
      if (w.timer <= 0) {
        const speed = cfg.speed + (b.phase - 1) * 95;
        b.orbs.push({
          id: w.id,
          x: 960,
          y: w.y,
          vx: -speed,
          vy: 0,
          target: w.target,
          returned: false,
          radius: b.id === "colossus" ? 17 : 11,
          damage: cfg.damage,
        });
        emit(s, "boss-shot", 960, w.y, w.target);
      }
    }
    b.warnings = b.warnings.filter((w) => w.timer > 0);
    for (const o of b.orbs) {
      const old = o.x;
      if (!o.returned && b.id === "watcher") {
        const lane = bossLane(o.target, b.players.length),
          half = raidHeight(b.players.length) / 2;
        o.vy = Math.sin(s.elapsed * 3 + o.id) * 105;
        o.y = Math.max(
          lane.top + half,
          Math.min(lane.bottom - half, o.y + o.vy * h),
        );
      }
      o.x += o.vx * h;
      if (o.returned) {
        o.y += o.vy * h;
        if (o.x >= 1000) {
          b.hp = Math.max(0, b.hp - 1);
          s.score[0]++;
          o.x = 2000;
          emit(s, "boss-hit", 1030, 360, o.target);
          if (b.hp === 0) {
            finish(s, 0);
            return;
          }
        }
      } else {
        const plane = PX + 8 + o.radius;
        if (
          old >= plane &&
          o.x <= plane &&
          b.players[o.target] > 0 &&
          Math.abs(o.y - s.paddles[o.target]) <=
            raidHeight(b.players.length) / 2 + o.radius
        ) {
          o.returned = true;
          o.x = plane;
          const dx = 1030 - o.x,
            dy = 360 - o.y,
            d = Math.hypot(dx, dy),
            speed = 1000 + (b.phase - 1) * 130;
          o.vx = (dx / d) * speed;
          o.vy = (dy / d) * speed;
          b.parries++;
          s.hits++;
          s.longest = Math.max(s.longest, s.hits);
          emit(s, "paddle", o.x, o.y, o.target);
        }
        if (o.x < -o.radius) {
          b.players[o.target] = Math.max(0, b.players[o.target] - o.damage);
          b.damageTaken += o.damage;
          s.score[1] += o.damage;
          s.hits = 0;
          o.x = 2000;
          emit(s, "player-hit", PX, o.y, o.target);
        }
      }
    }
    b.orbs = b.orbs.filter((o) => o.x < 1500);
    if (b.players.every((hp) => hp <= 0)) {
      finish(s, 1);
      return;
    }
  }
}
