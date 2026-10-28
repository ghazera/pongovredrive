import { test, expect } from "@playwright/test";
import type { State } from "../../shared/game";
for (const boss of ["VOLTMAW", "VOID WATCHER", "EMBER COLOSSUS"])
  test(`${boss}: solo encounter shows the monster, attack warnings and health`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page.getByRole("button", { name: /BOSS BATTLE/ }).click();
    await page.getByRole("button", { name: boss, exact: true }).click();
    await page.screenshot({
      path: "test-results/boss-selection.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "PLAY SOLO", exact: true }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.locator(".boss-health > div:first-child > strong")).toHaveText(boss);
    await expect(page.locator(".raid-party>div")).toHaveCount(1);
    await expect(page.locator(".raid-cue")).not.toContainText("GET READY", {
      timeout: 20000,
    });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `test-results/boss-${boss.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test("four friends share one boss, four lanes, health and reconnect state", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const contexts = await Promise.all(
    Array.from({ length: 4 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const states: (State | null)[] = Array(4).fill(null);
  const errors: string[] = [];
  pages.forEach((p, i) =>
    p.on("pageerror", (e) => errors.push(`${i}: ${e.message}`)),
  );
  for (const [i, p] of pages.entries())
    p.on("websocket", (ws) =>
      ws.on("framereceived", (f) => {
        const m = JSON.parse(f.payload.toString());
        if (m.type === "STATE") states[i] = m.state;
      }),
    );
  try {
    const host = pages[0];
    await host.goto("/");
    await host.getByRole("button", { name: /BOSS BATTLE/ }).click();
    await host
      .getByRole("button", { name: "VOID WATCHER", exact: true })
      .click();
    await host
      .getByRole("button", { name: "CO-OP RAID · 2–4 PLAYERS", exact: true })
      .click();
    await host.getByLabel("Player name").fill("Host");
    await host
      .getByRole("button", { name: "CREATE ROOM", exact: true })
      .click();
    const code = await host.getByTestId("room-code").innerText();
    for (let i = 1; i < 4; i++) {
      await pages[i].goto("/?room=" + code);
      await pages[i].getByLabel("Player name").fill(`Friend ${i}`);
      await pages[i]
        .getByRole("button", { name: "JOIN ROOM", exact: true })
        .click();
    }
    for (const p of pages)
      await p.getByRole("button", { name: "READY", exact: true }).click();
    for (const p of pages) {
      await expect(p.locator("canvas")).toBeVisible();
      await expect(p.locator(".raid-party>div")).toHaveCount(4);
      await expect(p.locator(".boss-health > div:first-child > strong")).toHaveText("VOID WATCHER");
    }
    await expect
      .poll(() => states.filter((s) => s?.boss?.players.length === 4).length)
      .toBe(4);
    expect(new Set(states.map((s) => s!.boss!.maxHp)).size).toBe(1);
    await pages[3].reload();
    await expect(pages[3].locator("canvas")).toBeVisible();
    await expect(pages[3].locator(".raid-party>div")).toHaveCount(4);
    expect(errors).toEqual([]);
    await expect(
      host.getByText("PLAYER DISCONNECTED", { exact: true }),
    ).not.toBeVisible();
    await host.screenshot({
      path: "test-results/boss-coop.png",
      fullPage: true,
    });
  } finally {
    for (const c of contexts) await c.close();
  }
});
for (const mode of ["RICOCHET", "BLITZ"])
  test(`${mode}: new duel starts`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: new RegExp("^" + mode) }).click();
    await page.getByRole("button", { name: /QUICK PLAY/ }).click();
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.locator(".mode-status strong")).toHaveText(mode);
  });
test("solo defeat shows the raid result and rematch restores health", async ({
  page,
}) => {
  test.setTimeout(100000);
  await page.goto("/");
  await page.getByRole("button", { name: /BOSS BATTLE/ }).click();
  await page
    .getByRole("button", { name: "EMBER COLOSSUS", exact: true })
    .click();
  await page.getByRole("button", { name: "PLAY SOLO", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "TEAM DEFEATED", exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await page.screenshot({
    path: "test-results/boss-result.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "REMATCH", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "TEAM DEFEATED", exact: true }),
  ).not.toBeVisible();
  await expect(page.getByTestId("boss-health")).toHaveText("66 / 66 HP");
});

test("a real cooperative phase clear displays the next tactic and a safe recovery transition", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const a = await browser.newContext(),
    b = await browser.newContext();
  const p = await a.newPage(),
    q = await b.newPage();
  const { bossTargets } = await import("../helpers/boss-driver");
  const errors: string[] = [];
  for (const page of [p, q]) {
    page.on("pageerror", (e) => errors.push(e.message));
    await page.routeWebSocket("**/ws", (ws) => {
      const server = ws.connectToServer();
      let side = 0,
        seq = 0;
      ws.onMessage((raw) => {
        const m = JSON.parse(raw.toString());
        if (m.type !== "INPUT" && m.type !== "POINTER") server.send(raw);
      });
      server.onMessage((raw) => {
        const m = JSON.parse(raw.toString());
        if (m.type === "ROOM") side = m.side;
        if (m.type === "STATE" && m.state.phase !== "finished") {
          server.send(
            JSON.stringify({
              type: "POINTER",
              y: bossTargets(m.state)[side],
              seq: ++seq,
            }),
          );
        }
        ws.send(raw);
      });
    });
  }
  try {
    await p.goto("/");
    await p.getByRole("button", { name: /BOSS BATTLE/ }).click();
    await p
      .getByRole("button", { name: "CO-OP RAID · 2–4 PLAYERS", exact: true })
      .click();
    await p.getByRole("button", { name: "CREATE ROOM", exact: true }).click();
    const code = await p.getByTestId("room-code").innerText();
    await q.goto("/?room=" + code);
    await q.getByRole("button", { name: "JOIN ROOM", exact: true }).click();
    await p.getByRole("button", { name: "READY", exact: true }).click();
    await q.getByRole("button", { name: "READY", exact: true }).click();
    await expect(p.locator(".boss-phase-track span")).toHaveCount(5);
    await expect(p.locator(".boss-health b")).toContainText("PHASE 2 / 5", {
      timeout: 70000,
    });
    await expect(q.locator(".boss-health b")).toContainText("PHASE 2 / 5");
    await expect(p.locator(".raid-cue")).toContainText("REFORMATION");
    await expect(p.locator(".boss-tactic")).toContainText("sweeping");
    await p.screenshot({
      path: "test-results/boss-phase-transition.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
