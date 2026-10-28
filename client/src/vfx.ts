import type Phaser from "phaser";
import type { GameEvent } from "../../shared/game";
import type { Settings } from "./settings";
type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
};
type Ring = {
  x: number;
  y: number;
  life: number;
  color: number;
  goal: boolean;
};
/** Bounded pools: visual effects never affect simulation or allocate per frame. */
export class Effects {
  private sparks: Spark[] = Array.from({ length: 350 }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    color: 0,
  }));
  private rings: Ring[] = Array.from({ length: 12 }, () => ({
    x: 0,
    y: 0,
    life: 0,
    color: 0,
    goal: false,
  }));
  emit(e: GameEvent, s: Settings, color: number) {
    if (s.reduced) return;
    const goal = e.type === "goal" || e.type === "win" || e.type === "power";
    const count =
      (s.particles === "low" ? 6 : s.particles === "medium" ? 16 : 30) *
      (goal ? 3 : 1);
    let added = 0;
    for (const p of this.sparks) {
      if (p.life > 0) continue;
      const a = Math.random() * Math.PI * 2,
        v = 80 + Math.random() * (goal ? 650 : 400);
      Object.assign(p, {
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.4 + Math.random() * 0.5,
        color,
      });
      if (++added >= count) break;
    }
    const ring = this.rings.find((r) => r.life <= 0);
    if (ring) Object.assign(ring, { x: e.x, y: e.y, life: 1, color, goal });
  }
  draw(g: Phaser.GameObjects.Graphics, delta: number, s: Settings) {
    for (const p of this.sparks) {
      if (p.life <= 0) continue;
      p.life -= delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      g.fillStyle(p.color, Math.max(0, p.life) * s.intensity);
      g.fillRect(p.x, p.y, 3, 3);
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= delta * (r.goal ? 1.8 : 3.5);
      g.lineStyle(r.goal ? 4 : 2, r.color, Math.max(0, r.life) * s.intensity);
      g.strokeCircle(r.x, r.y, 8 + (1 - r.life) * (r.goal ? 240 : 65));
    }
  }
}
