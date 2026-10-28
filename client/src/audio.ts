import type { Settings } from "./settings";
class Sound {
  private ctx: AudioContext | null = null;
  private drone: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  settings: Settings | null = null;
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {
      /* Audio is optional. */
    }
  }
  configure(s: Settings) {
    this.settings = s;
    if (!this.ctx) return;
    if (s.music > 0 && !s.mute) {
      if (!this.drone) {
        this.drone = this.ctx.createOscillator();
        this.droneGain = this.ctx.createGain();
        this.drone.type = "sine";
        this.drone.frequency.value = 55;
        this.drone.connect(this.droneGain);
        this.droneGain.connect(this.ctx.destination);
        this.drone.start();
      }
      this.droneGain!.gain.setTargetAtTime(
        s.master * s.music * 0.08,
        this.ctx.currentTime,
        0.1,
      );
    } else if (this.droneGain)
      this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
  }
  play(kind: string, intensity = 1) {
    const c = this.ctx,
      s = this.settings;
    if (!c || !s || s.mute || !s.master) return;
    const o = c.createOscillator(),
      g = c.createGain();
    const t = c.currentTime;
    const f =
      kind === "paddle"
        ? 420 + intensity * 130
        : kind === "wall"
          ? 200
          : kind === "goal"
            ? 90
            : kind === "win"
              ? 660
              : kind === "serve"
                ? 780
                : 520;
    o.type = kind === "goal" ? "sawtooth" : "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(
      kind === "win" ? 1320 : Math.max(35, f * 0.42),
      t + 0.2,
    );
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(
      s.master * s.sfx * (kind === "goal" ? 0.22 : 0.12),
      t + 0.008,
    );
    g.gain.exponentialRampToValueAtTime(
      0.001,
      t + (kind === "goal" ? 0.55 : 0.2),
    );
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(t + 0.6);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
}
export const sound = new Sound();
