import { it, expect } from "vitest";
import { createGame, step, H, PADDLE } from "../shared/game";
import { parseMessage } from "../shared/protocol";
for (const mode of ["pulse", "gravity", "shrink"] as const)
  it(`accepts ${mode} as an authoritative room rule`, () => {
    expect(
      parseMessage(JSON.stringify({ type: "CREATE", name: "A", mode })),
    ).toMatchObject({ mode });
  });
it("pulse awards two points only during its active window and respects the hard score cap", () => {
  const s = createGame("pulse");
  s.phase = "playing";
  s.elapsed = 6;
  s.ball.x = 1300;
  step(s, [0, 0]);
  expect(s.score).toEqual([2, 0]);
  const b = createGame("pulse");
  b.phase = "playing";
  b.elapsed = 2;
  b.ball.x = 1300;
  step(b, [0, 0]);
  expect(b.score).toEqual([1, 0]);
  s.phase = "playing";
  s.score = [14, 14];
  s.elapsed = 6;
  s.ball.x = 1300;
  step(s, [0, 0]);
  expect(s.score).toEqual([15, 14]);
  expect(s.winner).toBe(0);
});
it("gravity changes a flat trajectory without invalidating its speed or direction", () => {
  const s = createGame("gravity");
  s.phase = "playing";
  s.ball = { x: 640, y: 150, vx: 500, vy: 0 };
  step(s, [0, 0]);
  expect(s.ball.vy).toBeGreaterThan(0);
  expect(s.ball.vx).toBeGreaterThan(0);
  expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeCloseTo(500, 5);
});
it("shrink makes a previously hittable edge miss after a long rally", () => {
  const s = createGame("shrink");
  s.phase = "playing";
  s.hits = 12;
  s.ball = { x: 70, y: 405, vx: -500, vy: 0 };
  step(s, [0, 0]);
  expect(s.ball.vx).toBeLessThan(0);
  const b = createGame();
  b.phase = "playing";
  b.ball = { x: 70, y: 405, vx: -500, vy: 0 };
  step(b, [0, 0]);
  expect(b.ball.vx).toBeGreaterThan(0);
});
it("shrink resets paddle size after a goal and keeps paddles within their current bounds", () => {
  const s = createGame("shrink");
  s.phase = "playing";
  s.hits = 12;
  for (let i = 0; i < 60; i++) step(s, [-1, 0]);
  expect(s.paddles[0]).toBeLessThan(PADDLE / 2);
  s.ball.x = 1300;
  step(s, [0, 0]);
  step(s, [0, 0]);
  expect(s.hits).toBe(0);
  expect(s.paddles[0]).toBeGreaterThanOrEqual(PADDLE / 2);
  expect(s.paddles[1]).toBeLessThan(H);
});
it("rejects unknown modes and invalid input sequence numbers", () => {
  expect(
    parseMessage('{"type":"CREATE","name":"a","mode":"broken"}'),
  ).toBeNull();
  for (const seq of [-1, 1.2, "a", null])
    expect(
      parseMessage(JSON.stringify({ type: "POINTER", y: 120, seq })),
    ).toBeNull();
});
for (const mode of [
  "classic",
  "overdrive",
  "pulse",
  "gravity",
  "shrink",
] as const)
  it(`${mode}: long simulation stays finite and respects score/speed limits`, () => {
    const s = createGame(mode);
    for (let i = 0; i < 12000; i++) {
      step(s, [
        Math.sign(s.ball.y - s.paddles[0]),
        Math.sign(s.ball.y - s.paddles[1]),
      ]);
      expect(Number.isFinite(s.ball.x + s.ball.y + s.ball.vx + s.ball.vy)).toBe(
        true,
      );
      expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeLessThanOrEqual(1250.001);
      expect(Math.max(...s.score)).toBeLessThanOrEqual(15);
    }
  });
