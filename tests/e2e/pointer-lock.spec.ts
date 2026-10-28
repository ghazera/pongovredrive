import { test, expect, type Page } from "@playwright/test";
import type { State } from "../../shared/game";
import { paddleY } from "./helpers";
async function locked(page: Page) {
  return page.evaluate(() => document.pointerLockElement?.tagName === "CANVAS");
}
async function lockArena(page: Page) {
  await page.locator("canvas").click();
  await expect.poll(() => locked(page)).toBe(true);
}

test("AI: click locks the cursor, relative movement stays in bounds, Escape and pause release it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /QUICK PLAY/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await lockArena(page);
  const initial = await paddleY(page);
  await page.mouse.move(900, 2000);
  await expect.poll(() => paddleY(page)).toBeGreaterThan(640);
  // The physical pointer stays locked even after movement beyond the canvas and viewport.
  expect(await locked(page)).toBe(true);
  await page.mouse.move(900, -1000);
  await expect.poll(() => paddleY(page)).toBeLessThan(80);
  expect(initial).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect.poll(() => locked(page)).toBe(false);
  await lockArena(page);
  // Trigger the UI action directly: pointer lock deliberately prevents clicking outside the canvas.
  await page
    .getByRole("button", { name: "PAUSE", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect.poll(() => locked(page)).toBe(false);
  await page.getByRole("button", { name: "RESUME", exact: true }).click();
  await lockArena(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(() => locked(page)).toBe(false);
});

test("network: both players can lock, move their own paddle, and unlock independently", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const p = await a.newPage(),
    q = await b.newPage();
  const observed: { state: State | null } = { state: null };
  q.on("websocket", (ws) =>
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
    await lockArena(p);
    await p.mouse.move(700, 2000);
    await expect.poll(() => paddleY(p)).toBeGreaterThan(640);
    await p.keyboard.press("Escape");
    await expect.poll(() => locked(p)).toBe(false);
    await lockArena(q);
    expect(await locked(q)).toBe(true);
    await q.mouse.move(700, 2000);
    await expect.poll(() => observed.state?.paddles[1]).toBeGreaterThan(640);
    await q.keyboard.press("Escape");
    await expect.poll(() => locked(q)).toBe(false);
  } finally {
    await a.close();
    await b.close();
  }
});

test("same-computer play never captures the cursor", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "LOCAL 2 PLAYERS", exact: true })
    .click();
  await page.locator("canvas").click();
  expect(await locked(page)).toBe(false);
});

test("denied pointer lock keeps absolute mouse and keyboard controls available", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException("Blocked", "NotAllowedError"));
  });
  await page.goto("/");
  await page.getByRole("button", { name: /QUICK PLAY/ }).click();
  await page.locator("canvas").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cursor capture unavailable" }),
  ).toBeVisible();
  expect(await locked(page)).toBe(false);
  await page.keyboard.down("w");
  await expect.poll(() => paddleY(page)).toBeLessThan(250);
  await page.keyboard.up("w");
});

test("leaving a captured arena releases the cursor and removes its listeners", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /QUICK PLAY/ }).click();
  await lockArena(page);
  await page
    .getByRole("button", { name: "MAIN MENU", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await page
    .getByRole("button", { name: "LEAVE MATCH", exact: true })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.getByRole("heading", { name: "NEON PONG" })).toBeVisible();
  await expect.poll(() => locked(page)).toBe(false);
  await page.mouse.move(900, 200);
  expect(await locked(page)).toBe(false);
});
