import { describe, it, expect } from "vitest";
import { createGame, step, won, DT, H, MAX_SPEED } from "../shared/game";
const live = () => {
  const s = createGame();
  s.phase = "playing";
  return s;
};
describe("fixed-step physics", () => {
  it("bounces inward off a wall", () => {
    const s = live();
    s.ball = { x: 600, y: 10, vx: 400, vy: -300 };
    step(s, [0, 0]);
    expect(s.ball.vy).toBeGreaterThan(0);
    expect(s.ball.y).toBeGreaterThanOrEqual(9);
  });
  it("clamps simultaneous paddle movement", () => {
    const s = live();
    for (let i = 0; i < 180; i++) step(s, [-1, 1]);
    expect(s.paddles).toEqual([54, 666]);
  });
  it("prevents tunneling and accelerates on paddle contact", () => {
    const s = live();
    s.ball = { x: 80, y: 360, vx: -1200, vy: 100 };
    step(s, [0, 0], 0.05);
    expect(s.ball.vx).toBeGreaterThan(0);
    expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeLessThanOrEqual(
      MAX_SPEED + 0.001,
    );
    expect(s.hits).toBe(1);
  });
  it("varies bounce angle with impact position", () => {
    const a = live(),
      b = live();
    a.ball = { x: 70, y: 320, vx: -450, vy: 0 };
    b.ball = { x: 70, y: 400, vx: -450, vy: 0 };
    step(a, [0, 0]);
    step(b, [0, 0]);
    expect(a.ball.vy).toBeLessThan(0);
    expect(b.ball.vy).toBeGreaterThan(0);
  });
  it("scores once and resets with countdown", () => {
    const s = live();
    s.ball.x = 1295;
    step(s, [0, 0]);
    expect(s.score).toEqual([1, 0]);
    expect(s.phase).toBe("countdown");
    expect(s.ball.x).toBe(640);
    step(s, [0, 0]);
    expect(s.score).toEqual([1, 0]);
  });
  it("finishes at match point", () => {
    const s = live();
    s.score = [6, 3];
    s.ball.x = 1295;
    step(s, [0, 0]);
    expect(s.winner).toBe(0);
    expect(s.phase).toBe("finished");
  });
  it("requires two points clear with an absolute cap", () => {
    expect(won(7, 6)).toBe(false);
    expect(won(8, 6)).toBe(true);
    expect(won(15, 14)).toBe(true);
  });
  it("rejects invalid time and inputs without corrupting state", () => {
    const s = live();
    step(s, [NaN, Infinity], NaN);
    expect(Number.isFinite(s.ball.x)).toBe(true);
    expect(s.paddles).toEqual([360, 360]);
  });
  it("runs long rallies with finite positions and bounded paddles", () => {
    const s = live();
    for (let i = 0; i < 10000; i++) {
      step(
        s,
        [
          Math.sign(s.ball.y - s.paddles[0]),
          Math.sign(s.ball.y - s.paddles[1]),
        ],
        DT,
      );
      expect(Number.isFinite(s.ball.x + s.ball.y)).toBe(true);
      expect(s.paddles[0]).toBeGreaterThanOrEqual(54);
      expect(s.paddles[1]).toBeLessThanOrEqual(H - 54);
    }
  });
  it("emits uniquely sequenced authoritative events", () => {
    const s = live();
    s.ball = { x: 600, y: 10, vx: 400, vy: -300 };
    step(s, [0, 0]);
    expect(s.events[0]?.type).toBe("wall");
    expect(s.events[0]?.id).toBe(1);
  });
});
describe("rules and progression", () => {
  it("serves after a countdown without awarding a point", () => {
    const s = createGame();
    for (let i = 0; i < 181; i++) step(s, [0, 0]);
    expect(s.phase).toBe("playing");
    expect(s.score).toEqual([0, 0]);
  });
  it("never exceeds maximum speed after repeated hits", () => {
    const s = live();
    for (let i = 0; i < 40; i++) {
      const speed = Math.hypot(s.ball.vx, s.ball.vy);
      s.ball = { x: 70, y: s.paddles[0], vx: -speed, vy: 0 };
      step(s, [0, 0]);
      expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeLessThanOrEqual(1250.001);
    }
    expect(s.hits).toBe(40);
  });
  it("advances equivalently with subdivided time", () => {
    const a = live(),
      b = live();
    for (let i = 0; i < 30; i++) step(a, [0, 0], 1 / 30);
    for (let i = 0; i < 120; i++) step(b, [0, 0], 1 / 120);
    expect(a.ball.x).toBeCloseTo(b.ball.x, 5);
    expect(a.ball.y).toBeCloseTo(b.ball.y, 5);
  });
});

describe("pointer targets", () => {
  it("moves toward a mouse target at paddle speed without teleporting", () => {
    const s = createGame();
    step(s, [0, 0], 1 / 60, [80, null]);
    expect(s.paddles[0]).toBeCloseTo(341.666667, 5);
    expect(s.paddles[1]).toBe(360);
  });
  it("stops exactly at a target and clamps it inside the court", () => {
    const s = createGame();
    for (let i = 0; i < 120; i++) step(s, [0, 0], 1 / 60, [355, 720]);
    expect(s.paddles).toEqual([355, 666]);
  });
  it("ignores invalid targets and keeps keyboard movement available", () => {
    const s = createGame();
    step(s, [-1, 0], 1 / 60, [NaN, Infinity]);
    expect(s.paddles[0]).toBeCloseTo(350.333333, 5);
    expect(s.paddles[1]).toBe(360);
  });
});
