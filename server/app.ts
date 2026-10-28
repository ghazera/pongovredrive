import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createGame, step, DT, type State } from "../shared/game";
import { parseMessage, type ServerMessage } from "../shared/protocol";
type Player = {
  name: string;
  ready: boolean;
  socket: WebSocket | null;
  token: string;
  input: number;
  targetY: number | null;
  seq: number;
  until: number;
};
type Room = {
  code: string;
  players: (Player | null)[];
  state: State;
  started: boolean;
  updated: number;
};
const clean = (name: string) =>
  [...name]
    .filter((c) => c.charCodeAt(0) >= 32 && c !== "<" && c !== ">")
    .join("")
    .trim()
    .slice(0, 20) || "Player";
export function makeServer(options: { graceMs?: number } = {}) {
  const app = express();
  app.disable("x-powered-by");
  const http = createServer(app);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  const rooms = new Map<string, Room>();
  const grace = options.graceMs ?? Number(process.env.GRACE_MS || 30000);
  const send = (ws: WebSocket | null, m: ServerMessage) => {
    if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 131072)
      ws.send(JSON.stringify(m));
  };
  const paused = (r: Room) =>
    r.state.boss
      ? r.players.some(
          (p) => p !== null && p.socket?.readyState !== WebSocket.OPEN,
        )
      : !r.players.every((p) => p?.socket?.readyState === WebSocket.OPEN);
  function broadcast(r: Room) {
    r.players.forEach((p, i) => {
      if (p)
        send(p.socket, {
          type: "ROOM",
          code: r.code,
          mode: r.state.mode,
          boss: r.state.boss?.id,
          side: i,
          token: p.token,
          players: r.players.map((q) =>
            q ? { name: q.name, ready: q.ready, connected: !!q.socket } : null,
          ),
          paused: paused(r),
        });
    });
  }
  function leave(ws: WebSocket, permanent = false) {
    for (const r of rooms.values()) {
      const p = r.players.find((p) => p?.socket === ws);
      if (p) {
        p.socket = null;
        p.input = 0;
        p.targetY = null;
        p.seq = 0;
        p.until = Date.now() + (permanent ? 0 : grace);
        broadcast(r);
      }
    }
  }
  http.on("upgrade", (req, socket, head) => {
    const origin = req.headers.origin;
    const allowed = process.env.ALLOWED_ORIGINS?.split(",");
    let valid = true;
    if (origin) {
      try {
        valid = allowed
          ? allowed.includes(origin)
          : new URL(origin).host === req.headers.host;
      } catch {
        valid = false;
      }
    }
    if (req.url !== "/ws" || !valid || wss.clients.size >= 200) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  wss.on("connection", (ws) => {
    let window = Date.now(),
      count = 0,
      alive = true;
    ws.on("pong", () => {
      alive = true;
    });
    const heartbeat = setInterval(() => {
      if (!alive) {
        ws.terminate();
        return;
      }
      alive = false;
      ws.ping();
    }, 10000);
    ws.on("error", () => {});
    ws.on("message", (data) => {
      if (Date.now() - window > 1000) {
        window = Date.now();
        count = 0;
      }
      if (++count > 160) {
        ws.close(1008, "Rate limit");
        return;
      }
      const m = parseMessage(data.toString());
      const error = (message: string) => send(ws, { type: "ERROR", message });
      if (!m) {
        error("Invalid command");
        return;
      }
      if (m.type === "PING") {
        send(ws, { type: "PONG", time: m.time });
        return;
      }
      const r = [...rooms.values()].find((r) =>
        r.players.some((p) => p?.socket === ws),
      );
      if (m.type === "CREATE" || m.type === "JOIN" || m.type === "RESUME") {
        if (r) {
          error("Leave your current room first");
          return;
        }
        let room: Room | undefined;
        if (m.type === "CREATE") {
          if (rooms.size >= 100) {
            error("Server full");
            return;
          }
          let code: string;
          do {
            code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
          } while (rooms.has(code));
          room = {
            code,
            players: Array(m.mode === "boss" ? 4 : 2).fill(null),
            state: createGame(m.mode, m.boss),
            started: false,
            updated: Date.now(),
          };
          rooms.set(code, room);
        } else room = rooms.get(m.code);
        if (!room) {
          error("Room not found");
          return;
        }
        if (m.type === "RESUME") {
          const p = room.players.find(
            (p) => p?.token === m.token && !p.socket && p.until > Date.now(),
          );
          if (!p) {
            error("Session expired or already connected");
            return;
          }
          p.socket = ws;
          p.input = 0;
          p.targetY = null;
          p.seq = 0;
          p.until = 0;
        } else {
          const seat = room.players.findIndex((p) => !p);
          if (seat < 0 || room.started) {
            error("Room full");
            return;
          }
          room.players[seat] = {
            name: clean(m.name),
            ready: false,
            socket: ws,
            token: randomBytes(24).toString("hex"),
            input: 0,
            targetY: null,
            seq: 0,
            until: 0,
          };
        }
        room.updated = Date.now();
        broadcast(room);
        return;
      }
      if (!r) {
        error("Join a room first");
        return;
      }
      const p = r.players.find((p) => p?.socket === ws)!;
      r.updated = Date.now();
      if (m.type === "LEAVE") {
        leave(ws, true);
        return;
      }
      if (m.type === "POINTER") {
        p.seq = m.seq ?? 0;
        p.targetY = m.y;
        p.input = 0;
        return;
      }
      if (m.type === "INPUT") {
        p.targetY = null;
        p.seq = m.seq ?? 0;
        p.input = m.direction;
        return;
      }
      if (m.type === "REMATCH") {
        if (r.state.phase !== "finished") {
          error("Match is still active");
          return;
        }
        p.ready = true;
        if (r.players.filter(Boolean).every((p) => p!.ready)) {
          if (r.state.boss) r.players = r.players.filter(Boolean);
          r.state = createGame(
            r.state.mode,
            r.state.boss?.id,
            r.players.length,
          );
          r.started = true;
          r.players.forEach((p) => {
            if (p) p.ready = false;
          });
        }
        broadcast(r);
        return;
      }
      if (m.type === "READY") {
        if (r.started) {
          error("Match already started");
          return;
        }
        p.ready = true;
        if (
          r.state.boss
            ? r.players.filter(Boolean).length >= 2 &&
              r.players.filter(Boolean).every((p) => p!.ready && p!.socket)
            : r.players.every((p) => p?.ready && p.socket)
        ) {
          if (r.state.boss) {
            r.players = r.players.filter(Boolean);
            r.state = createGame("boss", r.state.boss.id, r.players.length);
          }
          r.started = true;
          r.players.forEach((p) => {
            if (p) p.ready = false;
          });
        }
        broadcast(r);
      }
    });
    ws.on("close", () => {
      clearInterval(heartbeat);
      leave(ws);
    });
  });
  let last = performance.now(),
    acc = 0,
    ticks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    while (acc >= DT) {
      acc -= DT;
      ticks++;
      for (const r of rooms.values()) {
        for (let i = 0; i < r.players.length; i++) {
          const p = r.players[i];
          if (p && !p.socket && p.until <= Date.now()) {
            r.players[i] = null;
            if (r.started && r.state.phase !== "finished") {
              if (r.state.boss) {
                r.state.boss.players[i] = 0;
                if (r.state.boss.players.every((hp) => hp <= 0)) {
                  r.state.phase = "finished";
                  r.state.winner = 1;
                }
              } else {
                r.state.phase = "finished";
                r.state.winner = 1 - i;
              }
              r.players.forEach((p) => {
                if (p) p.ready = false;
              });
            }
            broadcast(r);
          }
        }
        if (r.started && !paused(r))
          step(
            r.state,
            r.players.map((p) => p?.input ?? 0),
            DT,
            r.players.map((p) => p?.targetY ?? null),
          );
        if (ticks % 3 === 0 && r.started)
          r.players.forEach((p) =>
            send(p?.socket ?? null, {
              type: "STATE",
              state: r.state,
              inputAck: r.players.map((p) => p?.seq ?? 0),
              paused: paused(r),
            }),
          );
        if (
          r.players.every((p) => !p) ||
          (!r.started && Date.now() - r.updated > 900000)
        ) {
          r.players.forEach((p) => p?.socket?.close(1000, "Room expired"));
          rooms.delete(r.code);
        }
      }
    }
  }, 5);
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, rooms: rooms.size, tickRate: 60, snapshotRate: 20 }),
  );
  return {
    app,
    http,
    close: async () => {
      clearInterval(timer);
      wss.clients.forEach((ws) => ws.terminate());
      await new Promise<void>((r) => wss.close(() => r()));
      if (http.listening) await new Promise<void>((r) => http.close(() => r()));
    },
  };
}
