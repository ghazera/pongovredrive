import { bossIds, type BossId } from "./bosses";
import { modeKeys, type Mode } from "./modes";
import { H, type State } from "./game";
export type PlayerView = { name: string; ready: boolean; connected: boolean };
export type ServerMessage =
  | {
      type: "ROOM";
      code: string;
      mode: Mode;
      boss?: BossId;
      players: (PlayerView | null)[];
      side: number;
      token: string;
      paused: boolean;
    }
  | { type: "STATE"; state: State; paused: boolean; inputAck: number[] }
  | { type: "ERROR"; message: string }
  | { type: "PONG"; time: number };
export type ClientMessage =
  | { type: "CREATE"; name: string; mode?: Mode; boss?: BossId }
  | { type: "JOIN"; code: string; name: string }
  | { type: "RESUME"; code: string; token: string }
  | { type: "READY" }
  | { type: "INPUT"; direction: number; seq?: number }
  | { type: "POINTER"; y: number; seq?: number }
  | { type: "LEAVE" }
  | { type: "REMATCH" }
  | { type: "PING"; time: number };
export function parseMessage(raw: string): ClientMessage | null {
  if (raw.length > 2048) return null;
  try {
    const m = JSON.parse(raw);
    if (!m || typeof m !== "object") return null;
    if (
      (m.type === "INPUT" || m.type === "POINTER") &&
      m.seq !== undefined &&
      (!Number.isSafeInteger(m.seq) || m.seq < 0)
    )
      return null;
    if (
      m.type === "CREATE" &&
      m.boss !== undefined &&
      !bossIds.includes(m.boss)
    )
      return null;
    const sequence = m.seq === undefined ? {} : { seq: m.seq };
    switch (m.type) {
      case "CREATE":
        return typeof m.name === "string" &&
          m.name.length <= 40 &&
          (m.mode === undefined || modeKeys.includes(m.mode))
          ? m
          : null;
      case "JOIN":
        return typeof m.name === "string" &&
          m.name.length <= 40 &&
          typeof m.code === "string" &&
          /^[A-Z0-9]{6}$/.test(m.code)
          ? m
          : null;
      case "RESUME":
        return typeof m.code === "string" &&
          /^[A-Z0-9]{6}$/.test(m.code) &&
          typeof m.token === "string" &&
          /^[a-f0-9]{48}$/.test(m.token)
          ? m
          : null;
      case "POINTER":
        return Number.isFinite(m.y) && m.y >= 0 && m.y <= H
          ? { type: "POINTER", y: m.y, ...sequence }
          : null;
      case "INPUT":
        return [-1, 0, 1].includes(m.direction)
          ? { type: "INPUT", direction: m.direction, ...sequence }
          : null;
      case "PING":
        return Number.isFinite(m.time) ? { type: "PING", time: m.time } : null;
      case "READY":
      case "REMATCH":
      case "LEAVE":
        return { type: m.type };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
