import { it, expect } from "vitest";
import { createGame, step } from "../shared/game";
import { parseMessage } from "../shared/protocol";
for (const boss of ["voltmaw", "watcher", "colossus"] as const)
  it(`${boss}: creates a scaled cooperative encounter`, () => {
    const s = createGame("boss", boss, 4);
    expect(s.boss?.id).toBe(boss);
    expect(s.paddles).toHaveLength(4);
    expect(s.boss?.players).toHaveLength(4);
    expect(s.boss?.maxHp).toBeGreaterThan(
      createGame("boss", boss, 1).boss!.maxHp,
    );
  });
it("telegraphs attacks before spawning a hostile projectile", () => {
  const s = createGame("boss");
  s.phase = "playing";
  step(s, [0]);
  expect(s.boss!.warnings.length).toBeGreaterThan(0);
  expect(s.boss!.orbs).toHaveLength(0);
  for (let i = 0; i < 70; i++) step(s, [0]);
  expect(s.boss!.orbs.length).toBeGreaterThan(0);
});
it("parries only with the targeted player and damages the boss on return", () => {
  const s = createGame("boss", "voltmaw", 2);
  s.phase = "playing";
  const b = s.boss!;
  b.orbs = [
    {
      id: 1,
      x: 75,
      y: s.paddles[1],
      vx: -600,
      vy: 0,
      target: 1,
      returned: false,
      radius: 10,
      damage: 1,
    },
  ];
  step(s, [0, 0]);
  expect(b.orbs[0].returned).toBe(true);
  b.orbs[0].x = 1005;
  b.orbs[0].y = 360;
  step(s, [0, 0]);
  expect(b.hp).toBe(b.maxHp - 1);
  expect(s.events.some((e) => e.type === "boss-hit")).toBe(true);
});
it("a missed orb damages only its target and all players losing health ends the encounter", () => {
  const s = createGame("boss", "watcher", 2);
  s.phase = "playing";
  const b = s.boss!;
  b.players = [1, 1];
  b.orbs = [
    {
      id: 1,
      x: -20,
      y: 90,
      vx: -600,
      vy: 0,
      target: 0,
      returned: false,
      radius: 10,
      damage: 1,
    },
  ];
  step(s, [0, 0]);
  expect(b.players).toEqual([0, 1]);
  expect(s.phase).toBe("playing");
  b.orbs = [
    {
      id: 2,
      x: -20,
      y: 500,
      vx: -600,
      vy: 0,
      target: 1,
      returned: false,
      radius: 10,
      damage: 1,
    },
  ];
  step(s, [0, 0]);
  expect(s.phase).toBe("finished");
  expect(s.winner).toBe(1);
});
it("enters phases at health thresholds and finishes with a team victory", () => {
  const s = createGame("boss");
  s.phase = "playing";
  const b = s.boss!;
  b.hp = Math.floor(b.maxHp * 0.6);
  step(s, [0]);
  expect(b.phase).toBe(2);
  b.hp = 1;
  step(s, [0]);
  expect(b.phase).toBe(3);
  b.orbs = [
    {
      id: 99,
      x: 1010,
      y: 360,
      vx: 800,
      vy: 0,
      target: 0,
      returned: true,
      radius: 10,
      damage: 1,
    },
  ];
  step(s, [0]);
  expect(b.hp).toBe(0);
  expect(s.phase).toBe("finished");
  expect(s.winner).toBe(0);
});
it("validates boss selection and rejects invented bosses", () => {
  expect(
    parseMessage('{"type":"CREATE","name":"A","mode":"boss","boss":"watcher"}'),
  ).toMatchObject({ boss: "watcher" });
  expect(
    parseMessage('{"type":"CREATE","name":"A","mode":"boss","boss":"cheat"}'),
  ).toBeNull();
});
it("Ricochet reflects a ball at the central bumper", () => {
  const s = createGame("ricochet");
  s.phase = "playing";
  s.ball = { x: 584, y: 360, vx: 600, vy: 0 };
  step(s, [0, 0]);
  expect(s.ball.vx).toBeLessThan(0);
});
it("Blitz ends at five points without a two-point lead", () => {
  const s = createGame("blitz");
  s.phase = "playing";
  s.score = [4, 4];
  s.ball.x = 1300;
  step(s, [0, 0]);
  expect(s.winner).toBe(0);
});
for (const id of ["voltmaw", "watcher", "colossus"] as const)
  it(`${id}: a skilled solo defender can reach a real victory across all phases`, () => {
    const s = createGame("boss", id);
    const phases = new Set<number>();
    for (let frame = 0; frame < 18000 && s.phase !== "finished"; frame++) {
      const b = s.boss!;
      phases.add(b.phase);
      const incoming = b.orbs
        .filter((o) => !o.returned && o.target === 0)
        .sort((a, b) => a.x - b.x)[0];
      const target = incoming?.y ?? b.warnings[0]?.y ?? 360;
      step(s, [0], 1 / 60, [target]);
    }
    expect(s.winner).toBe(0);
    expect(s.boss!.hp).toBe(0);
    expect(phases.size).toBe(3);
  });
it("four stationary players are not immune to the attack pattern", () => {
  const s = createGame("boss", "voltmaw", 4);
  for (let i = 0; i < 5000 && s.phase !== "finished"; i++)
    step(s, [0, 0, 0, 0]);
  expect(s.boss!.damageTaken).toBeGreaterThan(0);
});
it("Ricochet serves outside the solid bumper", () => {
  const s = createGame("ricochet");
  expect(Math.hypot(s.ball.x - 640, s.ball.y - 360)).toBeGreaterThan(54);
});
