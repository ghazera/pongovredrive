export const MODES = {
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
