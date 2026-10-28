import { test, expect } from "@playwright/test";
import type { State } from "../../shared/game";

import { paddleY, mouseAt } from "./helpers";

test("mouse steers the AI paddle, scales with the arena, stops on leave, and yields to keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: /QUICK PLAY/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await mouseAt(page, 140);
  await expect.poll(() => paddleY(page)).toBeGreaterThan(125);
  await expect.poll(() => paddleY(page)).toBeLessThan(155);
  await page.setViewportSize({ width: 1280, height: 900 });
  await mouseAt(page, 590);
  await expect.poll(() => paddleY(page)).toBeGreaterThan(575);
  await expect.poll(() => paddleY(page)).toBeLessThan(605);
  await page.keyboard.down("w");
  await expect.poll(() => paddleY(page)).toBeLessThan(500);
  await page.keyboard.up("w");
  const y = await paddleY(page);
  await page.mouse.move(1, 1);
  await page.waitForTimeout(150);
  expect(Math.abs((await paddleY(page)) - y)).toBeLessThan(20);
});

test("mouse does not steer either paddle in same-computer mode", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "LOCAL 2 PLAYERS", exact: true })
    .click();
  await expect(page.locator("canvas")).toBeVisible();
  await mouseAt(page, 100);
  await page.waitForTimeout(200);
  // Rasterization can round the center by one screen pixel.
  expect(Math.abs((await paddleY(page)) - 360)).toBeLessThan(2);
});

test("each network player controls only their assigned paddle with the mouse", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const p = await a.newPage(),
    q = await b.newPage();
  const observed: { state: State | null } = { state: null };
  p.on("websocket", (ws) =>
    ws.on("framereceived", (frame) => {
      const m = JSON.parse(frame.payload.toString());
      if (m.type === "STATE") observed.state = m.state;
    }),
  );
  try {
    await p.goto("/");
    await p.getByRole("button", { name: "ONLINE / LAN", exact: true }).click();
    await p.getByRole("button", { name: "CREATE ROOM", exact: true }).click();
    const code = await p.getByTestId("room-code").innerText();
    await q.goto("/?room=" + code);
    await q.getByRole("button", { name: "JOIN ROOM", exact: true }).click();
    await p.getByRole("button", { name: "READY", exact: true }).click();
    await q.getByRole("button", { name: "READY", exact: true }).click();
    await expect(p.locator("canvas")).toBeVisible();
    await expect(q.locator("canvas")).toBeVisible();
    await mouseAt(p, 130);
    await expect.poll(() => observed.state?.paddles[0]).toBeCloseTo(130, 0);
    expect(observed.state?.paddles[1]).toBe(360);
    await mouseAt(q, 610);
    await expect.poll(() => observed.state?.paddles[1]).toBeCloseTo(610, 0);
    expect(observed.state?.paddles[0]).toBe(130);
    await q.keyboard.down("ArrowUp");
    await expect.poll(() => observed.state?.paddles[1]).toBeLessThan(500);
    await q.keyboard.up("ArrowUp");
    await p.mouse.move(1, 1);
    const stopped = observed.state?.paddles[0];
    await p.waitForTimeout(150);
    expect(observed.state?.paddles[0]).toBe(stopped);
  } finally {
    await a.close();
    await b.close();
  }
});
