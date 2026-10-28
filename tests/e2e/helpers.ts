import type { Page } from "@playwright/test";
// Inspect the rendered cyan paddle, including WebGL canvases, without exposing test hooks in the game.
export async function paddleY(page: Page) {
  const png = await page.locator("canvas").screenshot();
  return page.evaluate(async (base64) => {
    const blob = await (await fetch("data:image/png;base64," + base64)).blob();
    const image = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    image.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const rows: number[] = [];
    for (let y = 0; y < canvas.height; y++) {
      const i = (y * canvas.width + Math.floor((canvas.width * 42) / 1280)) * 4;
      if (pixels[i] < 120 && pixels[i + 1] > 170 && pixels[i + 2] > 170)
        rows.push(y);
    }
    return rows.length
      ? ((rows[0] + rows[rows.length - 1]) / 2 / canvas.height) * 720
      : -1;
  }, png.toString("base64"));
}
export async function mouseAt(page: Page, y: number) {
  await page.locator("canvas").scrollIntoViewIfNeeded();
  const b = await page.locator("canvas").boundingBox();
  if (!b) throw Error("No canvas");
  await page.mouse.move(b.x + b.width * 0.45, b.y + (b.height * y) / 720);
}
