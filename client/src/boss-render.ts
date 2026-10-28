import type Phaser from "phaser";
import type { State } from "../../shared/game";
import { W, H, PX } from "../../shared/game";
import { BOSSES, bossLane, raidHeight } from "../../shared/bosses";
import type { Settings } from "./settings";
export function drawBossBattle(
  g: Phaser.GameObjects.Graphics,
  s: State,
  settings: Settings,
  side: number,
) {
  const b = s.boss!,
    cfg = BOSSES[b.id],
    color = parseInt(cfg.color.slice(1), 16),
    colors = [0x00e5ff, 0xff3d9a, 0x5bffb0, 0xb68cff];
  const motion = settings.reduced ? 0 : Math.sin(s.elapsed * 3) * 7;
  for (let i = 0; i < b.players.length; i++) {
    const lane = bossLane(i, b.players.length),
      y = s.paddles[i],
      height = raidHeight(b.players.length);
    g.fillStyle(colors[i], i === side ? 0.055 : 0.025);
    g.fillRect(0, lane.top, 920, lane.bottom - lane.top);
    g.lineStyle(1, colors[i], 0.25);
    g.lineBetween(0, lane.bottom, 920, lane.bottom);
    if (b.players[i] <= 0) {
      g.lineStyle(3, 0x65708a, 0.6);
      g.lineBetween(PX - 10, y - 10, PX + 10, y + 10);
      g.lineBetween(PX + 10, y - 10, PX - 10, y + 10);
      continue;
    }
    if (settings.quality !== "low") {
      g.fillStyle(colors[i], 0.1 * settings.intensity);
      g.fillRoundedRect(PX - 18, y - height / 2 - 8, 36, height + 16, 12);
    }
    g.fillStyle(colors[i]);
    g.fillRoundedRect(PX - 8, y - height / 2, 16, height, 6);
    g.fillStyle(0xffffff, 0.7);
    g.fillRoundedRect(PX - 3, y - height / 2 + 5, 4, height - 10, 2);
    for (let heart = 0; heart < b.maxHearts; heart++) {
      g.fillStyle(heart < b.players[i] ? colors[i] : 0x28334b, 0.8);
      g.fillCircle(105 + heart * 16, lane.top + 18, 4);
    }
  }
  for (const w of b.warnings) {
    const t = 1 - w.timer / w.duration;
    if (w.kind === "blast") {
      const lane = bossLane(w.target, b.players.length),
        gap = raidHeight(b.players.length) / 2 + 14;
      g.fillStyle(0xff654a, (0.08 + t * 0.13) * settings.intensity);
      g.fillRect(0, lane.top, 920, Math.max(0, w.y - gap - lane.top));
      g.fillRect(0, w.y + gap, 920, Math.max(0, lane.bottom - w.y - gap));
      g.fillStyle(0x5bffb0, 0.12 * settings.intensity);
      g.fillRect(0, w.y - gap, 920, gap * 2);
      g.lineStyle(3, 0x5bffb0, 0.7);
      g.lineBetween(0, w.y - gap, 920, w.y - gap);
      g.lineBetween(0, w.y + gap, 920, w.y + gap);
      continue;
    }
    if (w.kind === "decoy") {
      g.lineStyle(1, 0xa8b4d0, 0.3);
      g.strokeCircle(75, w.y, 24);
      for (let x = 100; x < 960; x += 70) g.lineBetween(x, w.y, x + 8, w.y);
      continue;
    }
    g.fillStyle(color, (0.03 + t * 0.1) * settings.intensity);
    g.fillRect(0, w.y - 22, 960, 44);
    g.lineStyle(2, color, 0.25 + t * 0.5);
    for (let x = 80; x < 960; x += 45) g.lineBetween(x, w.y, x + 23, w.y);
    g.strokeCircle(75, w.y, 20 + t * 12);
    g.fillStyle(color, 0.8);
    g.fillTriangle(85, w.y - 7, 85, w.y + 7, 70, w.y);
  }
  // An original geometric monster, drawn entirely in Phaser.
  const x = 1060,
    y = 360 + motion;
  if (settings.quality !== "low")
    for (let ring = 3; ring > 0; ring--) {
      g.fillStyle(color, 0.022 * settings.intensity);
      g.fillCircle(x, y, 115 + ring * 23);
    }
  if (b.transition > 0) {
    const radius = 155 + (settings.reduced ? 0 : Math.sin(s.elapsed * 3) * 8);
    g.lineStyle(4, color, 0.6 * settings.intensity);
    g.strokeCircle(x, y, radius);
    g.fillStyle(color, 0.045 * settings.intensity);
    g.fillCircle(x, y, radius);
  }
  g.lineStyle(2, color, 0.3);
  g.strokeCircle(x, y, 130 + b.phase * 9);
  if (b.id === "voltmaw") {
    g.fillStyle(color, 0.9);
    g.fillTriangle(x - 90, y - 45, x - 115, y - 140, x - 25, y - 85);
    g.fillTriangle(x + 90, y - 45, x + 115, y - 140, x + 25, y - 85);
    g.fillStyle(0x172537);
    g.fillEllipse(x, y, 208, 205);
    g.lineStyle(4, color, 0.8);
    g.strokeEllipse(x, y, 208, 205);
    for (const dx of [-48, 48]) {
      g.fillStyle(0xfff1b2);
      g.fillTriangle(
        x + dx - 25,
        y - 20,
        x + dx + 20,
        y - 5,
        x + dx + 5,
        y + 13,
      );
    }
    g.fillStyle(0x050816);
    g.fillTriangle(x - 45, y + 35, x + 45, y + 35, x, y + 78);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(color, 0.8);
      g.fillTriangle(
        x - 40 + i * 18,
        y + 35,
        x - 27 + i * 18,
        y + 35,
        x - 33 + i * 18,
        y + 50,
      );
    }
  } else if (b.id === "watcher") {
    g.fillStyle(0x18112f);
    g.fillCircle(x, y, 105);
    g.lineStyle(4, color, 0.8);
    g.strokeCircle(x, y, 105);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + (settings.reduced ? 0 : s.elapsed * 0.25);
      g.lineStyle(7, color, 0.65);
      g.lineBetween(
        x + Math.cos(a) * 92,
        y + Math.sin(a) * 92,
        x + Math.cos(a) * 137,
        y + Math.sin(a) * 137,
      );
    }
    g.fillStyle(0xe4cfff);
    g.fillEllipse(x, y, 142, 75);
    g.fillStyle(color);
    g.fillCircle(x, y, 32);
    g.fillStyle(0x050816);
    g.fillEllipse(x, y, 15, 52);
    g.fillStyle(0xffffff);
    g.fillCircle(x - 9, y - 12, 6);
  } else {
    g.fillStyle(0x482a29);
    g.fillRoundedRect(x - 100, y - 100, 200, 200, 25);
    g.lineStyle(5, color, 0.9);
    g.strokeRoundedRect(x - 100, y - 100, 200, 200, 25);
    g.fillStyle(color, 0.8);
    g.fillTriangle(x - 70, y - 100, x - 40, y - 160, x - 5, y - 100);
    g.fillTriangle(x + 70, y - 100, x + 40, y - 160, x + 5, y - 100);
    g.fillStyle(0xffd5a0);
    g.fillRect(x - 62, y - 32, 42, 14);
    g.fillRect(x + 20, y - 32, 42, 14);
    g.fillStyle(0x100c16);
    g.fillRoundedRect(x - 40, y + 27, 80, 38, 6);
    g.lineStyle(4, color, 0.7);
    g.lineBetween(x, y - 85, x - 15, y - 38);
    g.lineBetween(x - 15, y - 38, x + 9, y + 5);
  }
  const hit = [...s.events].reverse().find((e) => e.type === "boss-hit");
  if (
    !settings.reduced &&
    s.phase === "playing" &&
    hit?.time !== undefined &&
    s.elapsed - hit.time < 0.14
  ) {
    g.fillStyle(0xffffff, 0.24 * settings.intensity);
    g.fillCircle(x, y, 100);
  }
  for (let i = 0; i < b.phase; i++) {
    g.fillStyle(color, 0.8);
    g.fillCircle(x - 18 * (b.phase - 1) + i * 36, y + 155, 6);
  }
  for (const o of b.orbs) {
    const c = o.returned ? colors[o.target] : color;
    if (settings.quality !== "low") {
      g.fillStyle(c, 0.12 * settings.intensity);
      g.fillCircle(o.x, o.y, o.radius + 9);
    }
    if ((o.holdLeft ?? 0) > 0) {
      g.lineStyle(2, 0xffffff, 0.7);
      g.strokeCircle(o.x, o.y, o.radius + 12);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(o.x - 5, o.y - 5, 3, 10);
      g.fillRect(o.x + 2, o.y - 5, 3, 10);
    }
    g.fillStyle(c);
    g.fillCircle(o.x, o.y, o.radius);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(o.x - 2, o.y - 2, Math.max(3, o.radius * 0.4));
    g.lineStyle(2, c, 0.3);
    g.lineBetween(o.x, o.y, o.x - (o.returned ? 24 : -24), o.y);
  }
  g.lineStyle(3, color, 0.35);
  g.strokeRect(1, 1, W - 2, H - 2);
}
