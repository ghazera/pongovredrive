import {
  BOSSES,
  phaseHealth,
  PHASE_TRANSITION,
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
  curve?: number;
  stall?: number;
  held?: boolean;
  holdLeft?: number;
};
export type Warning = {
  id: number;
  target: number;
  y: number;
  timer: number;
  duration: number;
  kind?: "orb" | "decoy" | "blast";
};
export type BossBattle = {
  id: BossId;
  hp: number;
  maxHp: number;
  phase: number;
  phaseHp: number;
  phaseMaxHp: number;
  transition: number;
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
  const hp = BOSSES[id].phases.reduce(
    (sum, _, i) => sum + phaseHealth(id, i, count),
    0,
  );
  return {
    id,
    hp,
    maxHp: hp,
    phase: 1,
    phaseHp: phaseHealth(id, 0, count),
    phaseMaxHp: phaseHealth(id, 0, count),
    transition: 0,
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
    if (b.players.every((hp) => hp <= 0)) {
      finish(s, 1);
      return;
    }
    s.elapsed += h;
    if (b.transition > 0) {
      b.transition = Math.max(0, b.transition - h);
      continue;
    }
    const plan = cfg.phases[b.phase - 1];
    b.cooldown -= h;
    if (b.cooldown <= 0) {
      const alive = b.players.flatMap((hp, i) => (hp > 0 ? [i] : []));
      b.wave++;
      const blast = plan.pattern === "blast" && b.wave % 2 === 0;
      for (let round = 0; round < (blast ? 1 : plan.rounds); round++)
        for (const [order, target] of alive.entries()) {
          const lane = bossLane(target, b.players.length),
            margin = (b.id === "colossus" ? 17 : 11) + 10;
          let offset = Math.sin(b.wave * 1.9 + target * 2.3) * 0.9;
          if (plan.pattern === "sweep")
            offset = [-0.85, 0, 0.85][(b.wave + round + target) % 3];
          if (plan.pattern === "mirror")
            offset = (b.wave + target) % 2 ? -0.85 : 0.85;
          if (plan.pattern === "finale")
            offset =
              Math.sin(b.wave * 1.37 + target) * 0.85 * (round % 2 ? -1 : 1);
          const y =
            (lane.top + lane.bottom) / 2 +
            offset * ((lane.bottom - lane.top) / 2 - margin);
          const duration = blast
            ? 2.1
            : plan.telegraph + round * 0.85 + order * 0.08;
          b.warnings.push({
            id: ++b.nextId,
            target,
            y,
            timer: duration,
            duration,
            kind: blast ? "blast" : "orb",
          });
          if (plan.pattern === "feint") {
            const fake = lane.top + lane.bottom - y;
            b.warnings.push({
              id: ++b.nextId,
              target,
              y: fake,
              timer: duration * 0.8,
              duration: duration * 0.8,
              kind: "decoy",
            });
          }
        }
      b.cooldown = Math.max(plan.cadence, plan.rounds * 0.85 + 0.7);
    }
    for (const w of b.warnings) {
      w.timer -= h;
      if (w.timer <= 0) {
        if (w.kind === "decoy") continue;
        if (w.kind === "blast") {
          if (
            b.players[w.target] > 0 &&
            Math.abs(s.paddles[w.target] - w.y) >
              raidHeight(b.players.length) / 2 + 14
          ) {
            b.players[w.target] = Math.max(0, b.players[w.target] - 1);
            b.damageTaken++;
            s.score[1]++;
            s.hits = 0;
            emit(s, "player-hit", PX, w.y, w.target);
          }
          emit(s, "boss-blast", 100, w.y, w.target);
          continue;
        }
        b.orbs.push({
          id: w.id,
          x: 960,
          y: w.y,
          vx: -(cfg.speed + plan.speed),
          vy: 0,
          target: w.target,
          returned: false,
          radius: b.id === "colossus" ? 17 : 11,
          damage: cfg.damage,
          curve: plan.curve,
          stall: plan.hold,
          held: false,
          holdLeft: 0,
        });
        emit(s, "boss-shot", 960, w.y, w.target);
      }
    }
    b.warnings = b.warnings.filter((w) => w.timer > 0);
    for (const o of b.orbs) {
      const old = o.x;
      if (!o.returned && o.stall && !o.held && o.x <= 600) {
        o.held = true;
        o.holdLeft = o.stall;
      }
      if (!o.returned && (o.holdLeft ?? 0) > 0) {
        o.holdLeft = Math.max(0, o.holdLeft! - h);
        continue;
      }
      if (!o.returned && (o.curve ?? (b.id === "watcher" ? 65 : 0)) > 0) {
        const lane = bossLane(o.target, b.players.length),
          half = raidHeight(b.players.length) / 2;
        o.vy = Math.sin(s.elapsed * 3 + o.id) * (o.curve ?? 65);
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
          b.phaseHp = Math.max(0, b.phaseHp - 1);
          s.score[0]++;
          o.x = 2000;
          emit(s, "boss-hit", 1030, 360, o.target);
          if (b.phaseHp === 0) {
            if (b.phase === cfg.phases.length) {
              b.hp = 0;
              finish(s, 0);
              return;
            }
            b.phase++;
            b.phaseHp = phaseHealth(b.id, b.phase - 1, b.players.length);
            b.phaseMaxHp = b.phaseHp;
            b.transition = PHASE_TRANSITION;
            b.wave = 0;
            b.cooldown = 0;
            b.orbs = [];
            b.warnings = [];
            b.players = b.players.map((hp) =>
              hp > 0 ? Math.min(b.maxHearts, hp + 1) : 0,
            );
            emit(s, "boss-phase", 1030, 360);
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
