export type Settings = {
  master: number;
  sfx: number;
  music: number;
  intensity: number;
  shake: boolean;
  particles: "low" | "medium" | "high";
  quality: "low" | "medium" | "high";
  ping: boolean;
  reduced: boolean;
  left: string;
  right: string;
  mute: boolean;
};
const defaults: Settings = {
  master: 0.55,
  sfx: 0.7,
  music: 0,
  intensity: 0.7,
  shake: true,
  particles: "high",
  quality: "high",
  ping: true,
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  left: "#00e5ff",
  right: "#ff3d9a",
  mute: false,
};
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem("pong.settings.v1") || "{}");
    const s = { ...defaults };
    for (const k of Object.keys(defaults) as (keyof Settings)[]) {
      const v = raw[k];
      if (typeof v === typeof defaults[k]) Object.assign(s, { [k]: v });
    }
    for (const k of ["master", "sfx", "music", "intensity"] as const)
      s[k] = Math.max(
        0,
        Math.min(1, Number.isFinite(s[k]) ? s[k] : defaults[k]),
      );
    for (const k of ["left", "right"] as const)
      if (!/^#[a-f0-9]{6}$/i.test(s[k])) s[k] = defaults[k];
    return s;
  } catch {
    return { ...defaults };
  }
}
export function saveSettings(s: Settings) {
  try {
    localStorage.setItem("pong.settings.v1", JSON.stringify(s));
  } catch {
    /* Private mode may disable storage. */
  }
}
