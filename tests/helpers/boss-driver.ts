import type { State } from "../../shared/game";
/** A defender that sends legal movement targets, never health or encounter changes. */
export function bossTargets(s: State): number[] {
  const b = s.boss!;
  return b.players.map((_, side) => {
    const incoming = b.orbs
      .filter((o) => !o.returned && o.target === side)
      .sort((a, b) => arrival(a) - arrival(b))[0];
    const warnings = b.warnings
      .filter((w) => w.target === side && w.kind !== "decoy")
      .sort((a, b) => a.timer - b.timer);
    const blast = warnings.find((w) => w.kind === "blast");
    if (blast && (!incoming || blast.timer < arrival(incoming))) return blast.y;
    return incoming?.y ?? warnings[0]?.y ?? s.paddles[side];
  });
}
function arrival(o: {
  x: number;
  vx: number;
  held?: boolean;
  stall?: number;
  holdLeft?: number;
}) {
  return (
    Math.max(0, (o.x - 70) / Math.max(1, Math.abs(o.vx))) +
    (o.holdLeft ?? 0) +
    (!o.held && o.x > 600 ? (o.stall ?? 0) : 0)
  );
}
