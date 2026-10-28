import { H, type State } from "./game";
export type PlayerView = { name: string; ready: boolean; connected: boolean };
export type ServerMessage =
  | {
      type: "ROOM";
      code: string;
      players: (PlayerView | null)[];
      side: number;
      token: string;
      paused: boolean;
    }
  | { type: "STATE"; state: State; paused: boolean }
  | { type: "ERROR"; message: string }
  | { type: "PONG"; time: number };
export type ClientMessage =
  | { type: "CREATE"; name: string; mode?: "classic" | "overdrive" }
  | { type: "JOIN"; code: string; name: string }
  | { type: "RESUME"; code: string; token: string }
  | { type: "READY" }
  | { type: "INPUT"; direction: number }
  | { type: "POINTER"; y: number }
  | { type: "LEAVE" }
  | { type: "REMATCH" }
  | { type: "PING"; time: number };
export function parseMessage(raw: string): ClientMessage | null {
  if (raw.length > 2048) return null;
  try {
    const m = JSON.parse(raw);
    if (!m || typeof m !== "object") return null;
    switch (m.type) {
      case "CREATE":
        return typeof m.name === "string" &&
          m.name.length <= 40 &&
          (!m.mode || ["classic", "overdrive"].includes(m.mode))
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
          ? { type: "POINTER", y: m.y }
          : null;
      case "INPUT":
        return [-1, 0, 1].includes(m.direction)
          ? { type: "INPUT", direction: m.direction }
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
