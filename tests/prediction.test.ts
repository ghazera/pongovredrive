import { it, expect } from "vitest";
import { PaddlePrediction } from "../client/src/prediction";
it("shows mouse movement before any server snapshot arrives", () => {
  const p = new PaddlePrediction(360);
  p.push(1, 0, 80, 1 / 60, 108);
  expect(p.y).toBeCloseTo(341.666667, 5);
});
it("replays only inputs the server has not acknowledged", () => {
  const p = new PaddlePrediction(360);
  p.push(1, 0, 80, 1 / 60, 108);
  p.push(2, 0, 80, 1 / 60, 108);
  p.reconcile(342, 1, 108);
  expect(p.y).toBeCloseTo(323.666667, 5);
  p.reconcile(320, 2, 108);
  expect(p.y).toBe(320);
});
it("discards old prediction on pause or a new match and obeys shrink bounds", () => {
  const p = new PaddlePrediction(50);
  p.push(1, 0, 0, 1, 52);
  expect(p.y).toBe(26);
  p.reset(360);
  p.reconcile(360, 0, 108);
  expect(p.y).toBe(360);
});
