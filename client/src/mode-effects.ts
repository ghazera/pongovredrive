import type Phaser from "phaser";
import type { State } from "../../shared/game";
import { W, H } from "../../shared/game";
import {
  gravityCenter,
  bumperY,
  pulseActive,
  paddleHeight,
} from "../../shared/modes";
import type { Settings } from "./settings";
export function drawMode(
  g: Phaser.GameObjects.Graphics,
  state: State,
  s: Settings,
) {
  const opacity = s.intensity * (s.quality === "low" ? 0.4 : 1);
  if (state.mode === "gravity") {
    const y = gravityCenter(state.elapsed);
    const motion = s.reduced ? 0 : state.elapsed * 0.5;
    for (let i = 0; i < 3; i++) {
      g.lineStyle(2, 0xa855f7, (0.16 + i * 0.08) * opacity);
      g.strokeEllipse(W / 2, y, 130 + i * 52, 46 + i * 20);
    }
    g.fillStyle(0xc79cff, 0.6 * opacity);
    g.fillCircle(W / 2, y, 7);
    if (!s.reduced)
      for (let i = 0; i < 5; i++) {
        const a = motion + (i * Math.PI * 2) / 5;
        g.fillStyle(0xd6b5ff, 0.5 * opacity);
        g.fillCircle(W / 2 + Math.cos(a) * 100, y + Math.sin(a) * 35, 3);
      }
  }
  if (state.mode === "pulse") {
    const active = pulseActive(state.elapsed),
      progress = (state.elapsed % 8) / 8;
    g.fillStyle(0xffd166, opacity * (active ? 0.12 : 0.03));
    g.fillRect(W / 2 - 24, 0, 48, H);
    g.lineStyle(active ? 4 : 2, 0xffd166, opacity * (active ? 0.8 : 0.3));
    g.lineBetween(W / 2 - 24, 0, W / 2 - 24, H);
    g.lineBetween(W / 2 + 24, 0, W / 2 + 24, H);
    g.fillStyle(0xffd166, opacity * 0.8);
    g.fillRect(W / 2 - 100, H - 12, 200 * progress, 4);
  }
  if (state.mode === "shrink") {
    const height = paddleHeight(state.mode, state.hits);
    g.lineStyle(2, 0x5bffb0, 0.22 * opacity);
    for (const x of [48, W - 48])
      g.strokeRoundedRect(
        x - 18,
        state.paddles[x === 48 ? 0 : 1] - 54,
        36,
        108,
        8,
      );
    if (height < 108) {
      g.fillStyle(0x5bffb0, 0.5 * opacity);
      g.fillRect(W / 2 - 55, 10, height, 3);
    }
  }
  if (state.mode === "ricochet") {
    const y = bumperY(state.elapsed);
    g.fillStyle(0x7df9ff, 0.07 * opacity);
    g.fillCircle(W / 2, y, 54);
    g.lineStyle(3, 0x7df9ff, 0.8 * opacity);
    g.strokeCircle(W / 2, y, 45);
    g.lineStyle(1, 0xffffff, 0.4 * opacity);
    g.strokeCircle(W / 2, y, 32);
  }
}
