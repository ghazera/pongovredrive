import { movePaddle } from "../../shared/game";
type Command = {
  seq: number;
  direction: number;
  target: number | null;
  dt: number;
};
/** Only predicts our paddle. Ball, collisions, score and opponent remain authoritative. */
export class PaddlePrediction {
  y: number;
  private pending: Command[] = [];
  constructor(y: number) {
    this.y = y;
  }
  push(
    seq: number,
    direction: number,
    target: number | null,
    dt: number,
    height: number,
    bounds?: readonly [number, number],
  ) {
    this.pending.push({ seq, direction, target, dt });
    if (this.pending.length > 180) this.pending.shift();
    this.y = movePaddle(this.y, direction, target, dt, height, bounds);
    return this.y;
  }
  reconcile(
    y: number,
    ack: number,
    height: number,
    bounds?: readonly [number, number],
  ) {
    this.pending = this.pending.filter((c) => c.seq > ack);
    this.y = y;
    for (const c of this.pending)
      this.y = movePaddle(this.y, c.direction, c.target, c.dt, height, bounds);
  }
  reset(y: number) {
    this.y = y;
    this.pending = [];
  }
}
