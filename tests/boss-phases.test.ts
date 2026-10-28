import { bossTargets } from "./helpers/boss-driver";
import { it, expect } from "vitest";
import { createGame, step } from "../shared/game";
import { BOSSES } from "../shared/bosses";
import type { Orb } from "../shared/boss";
function returned(id = 1): Orb {
  return {
    id,
    x: 1010,
    y: 360,
    vx: 800,
    vy: 0,
    target: 0,
    returned: true,
    radius: 10,
    damage: 1,
  };
}
it("each boss exposes five authored phase plans", () => {
  for (const c of Object.values(BOSSES)) {
    expect(c.phases).toHaveLength(5);
    expect(new Set(c.phases.map((p) => p.name)).size).toBe(5);
    expect(c.phases.every((p) => p.tactic.length > 20)).toBe(true);
  }
});
it("a phase break clears dangerous attacks, restores one heart and cannot skip stages", () => {
  const s = createGame("boss");
  s.phase = "playing";
  const b = s.boss!;
  b.phaseHp = 1;
  b.hp = b.maxHp - 11;
  b.players[0] = 3;
  b.orbs = [returned(), returned(2), returned(3)];
  step(s, [0]);
  expect(b.phase).toBe(2);
  expect(b.transition).toBeGreaterThan(2);
  expect(b.orbs).toHaveLength(0);
  expect(b.warnings).toHaveLength(0);
  expect(b.players[0]).toBe(4);
  const hp = b.hp;
  for (let i = 0; i < 60; i++) step(s, [0]);
  expect(b.hp).toBe(hp);
  expect(b.warnings).toHaveLength(0);
});
it("phase-local health, rather than a global threshold, advances the fight", () => {
  const s = createGame("boss");
  s.phase = "playing";
  s.boss!.hp = 1;
  step(s, [0]);
  expect(s.boss!.phase).toBe(1);
});
it("a completed final phase wins and transitions do not damage eliminated allies", () => {
  const s = createGame("boss", "colossus", 2);
  s.phase = "playing";
  const b = s.boss!;
  b.phase = 5;
  b.phaseHp = 1;
  b.hp = 1;
  b.players = [5, 0];
  b.orbs = [returned()];
  step(s, [0, 0]);
  expect(s.winner).toBe(0);
  expect(b.players[1]).toBe(0);
});
it("decoys disappear without spawning or damaging anyone", () => {
  const s = createGame("boss", "watcher");
  s.phase = "playing";
  const b = s.boss!;
  b.cooldown = 99;
  b.warnings = [
    { id: 1, target: 0, y: 100, timer: 0.001, duration: 1, kind: "decoy" },
  ];
  step(s, [0]);
  expect(b.orbs).toHaveLength(0);
  expect(b.players).toEqual([5]);
});
it("lava waves punish the danger zone and leave the safe gap unharmed", () => {
  for (const safe of [false, true]) {
    const s = createGame("boss", "colossus");
    s.phase = "playing";
    s.boss!.cooldown = 99;
    s.paddles[0] = safe ? 100 : 600;
    s.boss!.warnings = [
      { id: 1, target: 0, y: 100, timer: 0.001, duration: 2, kind: "blast" },
    ];
    step(s, [0]);
    expect(s.boss!.players[0]).toBe(safe ? 5 : 4);
  }
});
it("suspended orbs stop in the middle and resume without duplicating", () => {
  const s = createGame("boss", "watcher");
  s.phase = "playing";
  s.boss!.cooldown = 99;
  s.boss!.orbs = [
    {
      id: 1,
      x: 590,
      y: 360,
      vx: -500,
      vy: 0,
      target: 0,
      returned: false,
      radius: 10,
      damage: 1,
      stall: 0.3,
      curve: 0,
    },
  ];
  step(s, [0]);
  expect(s.boss!.orbs[0].x).toBe(590);
  for (let i = 0; i < 30; i++) step(s, [0]);
  expect(s.boss!.orbs).toHaveLength(1);
  expect(s.boss!.orbs[0].x).toBeLessThan(590);
});

for (const id of ["voltmaw", "watcher", "colossus"] as const)
  it(`${id}: cooperative clear has five phases and takes at least two and a half simulated minutes`, () => {
    const s = createGame("boss", id, 4),
      phases = new Set<number>();
    for (let i = 0; i < 21600 && s.phase !== "finished"; i++) {
      phases.add(s.boss!.phase);
      step(s, [0, 0, 0, 0], 1 / 60, bossTargets(s));
    }
    expect(s.winner).toBe(0);
    expect(phases.size).toBe(5);
    expect(s.elapsed).toBeGreaterThanOrEqual(150);
    expect(s.elapsed).toBeLessThan(260);
  });
