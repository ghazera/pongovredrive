export const MODES = {
  boss: {
    title: "BOSS RAID",
    description: "Face three monsters solo or in a 2–4 player co-op raid.",
    color: "#ff8059",
    acceleration: 1,
  },
  ricochet: {
    title: "RICOCHET",
    description:
      "A moving central bumper redirects the ball. Expect the unexpected.",
    color: "#7df9ff",
    acceleration: 1.06,
  },
  blitz: {
    title: "BLITZ",
    description: "Fast serves, short breaks. First to 5 wins.",
    color: "#ff6577",
    acceleration: 1.11,
  },
  classic: {
    title: "CLASSIC",
    description: "Pure rivalry. First to 7, win by 2.",
    color: "#00e5ff",
    acceleration: 1.055,
  },
  overdrive: {
    title: "OVERDRIVE",
    description: "Faster rallies. Higher voltage.",
    color: "#ff3d9a",
    acceleration: 1.095,
  },
  pulse: {
    title: "PULSE",
    description:
      "Every 8 seconds, a 2-second power window doubles goal points.",
    color: "#ffd166",
    acceleration: 1.07,
  },
  gravity: {
    title: "GRAVITY",
    description: "A moving gravity well bends the ball. Read the curve.",
    color: "#a855f7",
    acceleration: 1.045,
  },
  shrink: {
    title: "SHRINK",
    description: "Paddles shrink every 2 hits. A goal restores their size.",
    color: "#5bffb0",
    acceleration: 1.06,
  },
} as const;
export type Mode = keyof typeof MODES;
export const modeKeys = Object.keys(MODES) as Mode[];
export const pulseActive = (elapsed: number) => elapsed % 8 >= 6;
export const paddleHeight = (mode: Mode, hits: number) =>
  mode === "shrink" ? Math.max(52, 108 - Math.floor(hits / 2) * 8) : 108;
export const gravityCenter = (elapsed: number) =>
  360 + Math.sin(elapsed * 0.7) * 155;

export const bumperY = (elapsed: number) => 360 + Math.sin(elapsed * 0.8) * 180;
export const rulesCaption = (mode: Mode) =>
  mode === "boss"
    ? "CO-OP · REFLECT ORBS · DEFEAT THE BOSS"
    : mode === "blitz"
      ? "FIRST TO 5 · SUDDEN DEATH"
      : "FIRST TO 7 · WIN BY 2";
