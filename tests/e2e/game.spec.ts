import { test, expect } from "@playwright/test";
test("local controls, pause, settings, rematch and menu", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "NEON PONG" })).toBeVisible();
  await page.screenshot({ path: "test-results/home.png", fullPage: true });
  await page.getByRole("button", { name: "SETTINGS", exact: true }).click();
  await page.getByLabel("Master volume").fill("0.2");
  await page.getByLabel("Reduced motion").check();
  await page.getByRole("button", { name: "BACK", exact: true }).click();
  await page
    .getByRole("button", { name: "LOCAL 2 PLAYERS", exact: true })
    .click();
  await expect(page.locator("canvas")).toBeVisible();
  await page.keyboard.down("w");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(250);
  await page.keyboard.up("w");
  await page.keyboard.up("ArrowDown");
  await page.getByRole("button", { name: "PAUSE", exact: true }).click();
  await expect(page.getByText("PAUSED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "RESUME", exact: true }).click();
  await page.screenshot({ path: "test-results/arena.png", fullPage: true });
  await page.getByRole("button", { name: "MAIN MENU", exact: true }).click();
  await page.getByRole("button", { name: "LEAVE MATCH", exact: true }).click();
  await expect(page.getByRole("heading", { name: "NEON PONG" })).toBeVisible();
  await page.getByRole("button", { name: "PLAY VS AI", exact: true }).click();
  await page.getByRole("button", { name: "START MATCH", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  expect(errors).toEqual([]);
});
test("two browser contexts create, join and ready into one official match", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const p = await a.newPage(),
    q = await b.newPage();
  try {
    await p.goto("/");
    await p.getByRole("button", { name: "ONLINE / LAN", exact: true }).click();
    await p.getByLabel("Player name").fill("Alice");
    await p.getByRole("button", { name: "CREATE ROOM", exact: true }).click();
    const code = await p.getByTestId("room-code").innerText();
    await q.goto("/?room=" + code);
    await q.getByLabel("Player name").fill("Bob");
    await q.getByRole("button", { name: "JOIN ROOM", exact: true }).click();
    await expect(p.getByText("Bob", { exact: true })).toBeVisible();
    await p.getByRole("button", { name: "READY", exact: true }).click();
    await q.getByRole("button", { name: "READY", exact: true }).click();
    await expect(p.locator("canvas")).toBeVisible();
    await expect(q.locator("canvas")).toBeVisible();
    await expect(p.getByTestId("score")).toHaveText(
      (await q.getByTestId("score").textContent())!,
    );
    await q.reload();
    await expect(q.locator("canvas")).toBeVisible();
    await expect(
      p.getByText("PLAYER DISCONNECTED", { exact: true }),
    ).not.toBeVisible();
    await p.screenshot({ path: "test-results/network.png", fullPage: true });
  } finally {
    await a.close();
    await b.close();
  }
});
