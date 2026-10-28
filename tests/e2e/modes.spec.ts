import { test, expect } from "@playwright/test";
import { mouseAt, paddleY } from "./helpers";
import type { State } from "../../shared/game";
for (const mode of ["pulse", "gravity", "shrink"] as const)
  test(`${mode}: two players share the mode and official scores`, async ({
    browser,
  }) => {
    const a = await browser.newContext(),
      b = await browser.newContext();
    const p = await a.newPage(),
      q = await b.newPage();
    const observed: { a: State | null; b: State | null } = { a: null, b: null };
    const errors: string[] = [];
    for (const [page, key] of [
      [p, "a"],
      [q, "b"],
    ] as const) {
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("websocket", (ws) =>
        ws.on("framereceived", (frame) => {
          const m = JSON.parse(frame.payload.toString());
          if (m.type === "STATE") observed[key] = m.state;
        }),
      );
    }
    try {
      await p.goto("/");
      await p
        .getByRole("button", { name: "ONLINE / LAN", exact: true })
        .click();
      await p
        .getByRole("button", { name: new RegExp("^" + mode, "i") })
        .click();
      await p.getByRole("button", { name: "CREATE ROOM", exact: true }).click();
      const code = await p.getByTestId("room-code").innerText();
      await q.goto("/?room=" + code);
      await q.getByRole("button", { name: "JOIN ROOM", exact: true }).click();
      await expect(q.locator(".room-mode")).toContainText(mode.toUpperCase());
      await p.getByRole("button", { name: "READY", exact: true }).click();
      await q.getByRole("button", { name: "READY", exact: true }).click();
      await expect(p.locator("canvas")).toBeVisible();
      await expect(q.locator("canvas")).toBeVisible();
      await expect.poll(() => observed.a?.mode).toBe(mode);
      await expect.poll(() => observed.b?.mode).toBe(mode);
      await expect(p.locator(".mode-status strong")).toHaveText(
        mode.toUpperCase(),
      );
      await expect(q.locator(".mode-status strong")).toHaveText(
        mode.toUpperCase(),
      );
      await expect
        .poll(() => observed.a?.score[0], { timeout: 12000 })
        .toBeGreaterThan(0);
      await expect.poll(() => observed.b?.score[0]).toBe(observed.a!.score[0]);
      await p.screenshot({ path: `test-results/${mode}.png`, fullPage: true });
      expect(errors).toEqual([]);
    } finally {
      await a.close();
      await b.close();
    }
  });

test("our paddle responds while inbound authoritative snapshots are held back", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const p = await a.newPage(),
    q = await b.newPage();
  let block = false;
  let heldSnapshots = 0;
  await p.routeWebSocket("**/ws", (ws) => {
    const server = ws.connectToServer();
    server.onMessage((message) => {
      if (block && JSON.parse(message.toString()).type === "STATE") {
        heldSnapshots++;
        return;
      }
      ws.send(message);
    });
  });
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
    block = true;
    await mouseAt(p, 180);
    await expect
      .poll(() => paddleY(p), { timeout: 5000, intervals: [50] })
      .toBeLessThan(200);
    expect(heldSnapshots).toBeGreaterThan(0);
    block = false;
    await expect.poll(() => paddleY(p)).toBeGreaterThan(165);
    await expect.poll(() => paddleY(p)).toBeLessThan(195);
  } finally {
    block = false;
    await a.close();
    await b.close();
  }
});
