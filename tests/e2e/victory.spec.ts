import { test, expect } from "@playwright/test";
test("a full local match scores, reaches victory and restarts", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page
    .getByRole("button", { name: "LOCAL 2 PLAYERS", exact: true })
    .click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByTestId("score")).not.toHaveText("0:0", {
    timeout: 15000,
  });
  await expect(
    page.getByRole("button", { name: "REMATCH", exact: true }),
  ).toBeVisible({ timeout: 100000 });
  await page.screenshot({ path: "test-results/victory.png", fullPage: true });
  await page.getByRole("button", { name: "REMATCH", exact: true }).click();
  await expect(page.getByTestId("score")).toHaveText("0:0");
  await expect(
    page.getByRole("button", { name: "REMATCH", exact: true }),
  ).not.toBeVisible();
});
