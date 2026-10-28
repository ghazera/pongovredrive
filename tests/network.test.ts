import { it, expect } from "vitest";
import { WebSocket } from "ws";
import { makeServer } from "../server/app";
import { parseMessage } from "../shared/protocol";
import type { ServerMessage } from "../shared/protocol";
it("rejects malformed, oversized, and nonfinite commands", () => {
  expect(parseMessage("{bad")).toBeNull();
  expect(
    parseMessage(JSON.stringify({ type: "INPUT", direction: 2 })),
  ).toBeNull();
  expect(
    parseMessage(JSON.stringify({ type: "JOIN", code: "../", name: "a" })),
  ).toBeNull();
  expect(parseMessage('{"type":"READY"}')).toEqual({ type: "READY" });
});
it("hosts authoritative matches, reserves seats, reconnects and rejects forged state", async () => {
  const server = makeServer({ graceMs: 1500 });
  await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
  const address = server.http.address();
  if (!address || typeof address === "string") throw Error("port");
  const sockets: WebSocket[] = [];
  async function client() {
    const ws = new WebSocket(
      `ws://127.0.0.1:${typeof address === "object" ? address!.port : 0}/ws`,
    );
    sockets.push(ws);
    const messages: ServerMessage[] = [];
    ws.on("message", (d) => messages.push(JSON.parse(d.toString())));
    await new Promise<void>((r, j) => {
      ws.once("open", r);
      ws.once("error", j);
    });
    return {
      ws,
      messages,
      send: (m: unknown) => ws.send(JSON.stringify(m)),
      wait: async (type: string) => {
        const until = Date.now() + 5000;
        while (Date.now() < until) {
          const i = messages.findIndex((x) => x.type === type);
          if (i >= 0) return messages.splice(i, 1)[0];
          await new Promise((r) => setTimeout(r, 10));
        }
        throw Error("Timed out: " + type);
      },
    };
  }
  try {
    const a = await client();
    a.send({ type: "CREATE", name: "Alice" });
    const room = await a.wait("ROOM");
    if (room.type !== "ROOM") throw Error("room");
    expect(room.side).toBe(0);
    const b = await client();
    b.send({ type: "JOIN", code: room.code, name: "Bob" });
    const joined = await b.wait("ROOM");
    expect(joined.type === "ROOM" && joined.side).toBe(1);
    const c = await client();
    c.send({ type: "JOIN", code: room.code, name: "Eve" });
    expect((await c.wait("ERROR")).type).toBe("ERROR");
    a.send({ type: "READY" });
    b.send({ type: "READY" });
    let state = await a.wait("STATE");
    expect(state.type === "STATE" && state.state.phase).toBe("countdown");
    a.send({ type: "INPUT", direction: -1 });
    await new Promise((r) => setTimeout(r, 150));
    a.messages.length = 0;
    state = await a.wait("STATE");
    expect(state.type === "STATE" && state.state.paddles[0]).toBeLessThan(360);
    a.send({ type: "STATE", score: [100, 0] });
    expect((await a.wait("ERROR")).type).toBe("ERROR");
    b.ws.close();
    await new Promise((r) => setTimeout(r, 80));
    a.messages.length = 0;
    state = await a.wait("STATE");
    expect(state.type === "STATE" && state.paused).toBe(true);
    const d = await client();
    if (joined.type !== "ROOM") throw Error("joined");
    d.send({ type: "RESUME", code: room.code, token: joined.token });
    const restored = await d.wait("ROOM");
    expect(restored.type === "ROOM" && restored.side).toBe(1);
    d.send({ type: "PING", time: 123 });
    expect(await d.wait("PONG")).toEqual({ type: "PONG", time: 123 });
    d.send({ type: "LEAVE" });
    await new Promise((r) => setTimeout(r, 50));
  } finally {
    for (const s of sockets) s.terminate();
    await server.close();
  }
}, 12000);

it("finishes a network game, synchronizes the final score and requires two rematch votes", async () => {
  const server = makeServer();
  await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
  const addr = server.http.address();
  if (!addr || typeof addr === "string") throw Error("port");
  const a = new WebSocket(`ws://127.0.0.1:${addr.port}/ws`),
    b = new WebSocket(`ws://127.0.0.1:${addr.port}/ws`);
  let left: import("../shared/game").State | null = null,
    right: import("../shared/game").State | null = null,
    code = "",
    lastDirection = 9;
  let resets = 0;
  let aReady = false,
    bReady = false;
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(Error("network match timeout")),
      90000,
    );
    a.on("open", () =>
      a.send(JSON.stringify({ type: "CREATE", name: "Left" })),
    );
    a.on("message", (d) => {
      const m = JSON.parse(d.toString()) as ServerMessage;

      if (m.type === "ROOM" && !code) {
        code = m.code;
        const join = () =>
          b.send(JSON.stringify({ type: "JOIN", code, name: "Right" }));
        if (b.readyState === WebSocket.OPEN) join();
        else b.once("open", join);
      }
      if (m.type === "ROOM" && m.players.every(Boolean) && !aReady) {
        aReady = true;
        a.send(JSON.stringify({ type: "READY" }));
      }
      if (m.type === "STATE") {
        left = m.state;
        if (
          m.state.phase === "countdown" &&
          m.state.score[0] === 0 &&
          resets === 1
        ) {
          resets++;
          clearTimeout(timeout);
          resolve();
        }
        if (m.state.phase === "playing") {
          const y = m.state.ball.y;
          const diff = y - m.state.paddles[0];
          const direction = Math.abs(diff) < 12 ? 0 : Math.sign(diff);
          if (direction !== lastDirection) {
            a.send(JSON.stringify({ type: "INPUT", direction }));
            lastDirection = direction;
          }
        }
      }
    });
    b.on("message", (d) => {
      const m = JSON.parse(d.toString()) as ServerMessage;
      if (m.type === "ROOM" && !bReady) {
        bReady = true;
        b.send(JSON.stringify({ type: "READY" }));
      }
      if (m.type === "STATE") {
        right = m.state;
        if (m.state.phase !== "finished")
          b.send(JSON.stringify({ type: "INPUT", direction: -1 }));
      }
    });
  });
  try {
    const until = Date.now() + 80000;
    while (Date.now() < until) {
      if (
        (left as import("../shared/game").State | null)?.phase === "finished" &&
        (right as import("../shared/game").State | null)?.phase === "finished"
      )
        break;
      await new Promise((r) => setTimeout(r, 25));
    }
    const l = left as import("../shared/game").State | null,
      r = right as import("../shared/game").State | null;
    expect(l?.phase).toBe("finished");
    expect(r?.score).toEqual(l?.score);
    expect(l?.winner).toBe(0);
    a.send(JSON.stringify({ type: "REMATCH" }));
    await new Promise((r) => setTimeout(r, 100));
    expect((left as import("../shared/game").State | null)?.phase).toBe(
      "finished",
    );
    resets = 1;
    b.send(JSON.stringify({ type: "REMATCH" }));
    await ready;
    expect(resets).toBe(2);
  } finally {
    a.terminate();
    b.terminate();
    await server.close();
  }
}, 95000);

it("expires a reserved disconnected seat and awards a forfeit", async () => {
  const server = makeServer({ graceMs: 120 });
  await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
  const addr = server.http.address();
  if (!addr || typeof addr === "string") throw Error("port");
  const sockets: WebSocket[] = [];
  async function peer() {
    const ws = new WebSocket(
      `ws://127.0.0.1:${typeof addr === "object" ? addr!.port : 0}/ws`,
    );
    sockets.push(ws);
    const queue: ServerMessage[] = [];
    ws.on("message", (d) => queue.push(JSON.parse(d.toString())));
    await new Promise<void>((r) => ws.once("open", r));
    return {
      ws,
      send: (m: unknown) => ws.send(JSON.stringify(m)),
      wait: async (type: string) => {
        for (let i = 0; i < 200; i++) {
          const idx = queue.findIndex((m) => m.type === type);
          if (idx >= 0) return queue.splice(idx, 1)[0];
          await new Promise((r) => setTimeout(r, 10));
        }
        throw Error("Timeout " + type);
      },
    };
  }
  try {
    const a = await peer();
    a.send({ type: "CREATE", name: "A" });
    const room = await a.wait("ROOM");
    if (room.type !== "ROOM") throw Error("room");
    const b = await peer();
    b.send({ type: "JOIN", name: "B", code: room.code });
    await b.wait("ROOM");
    a.send({ type: "READY" });
    b.send({ type: "READY" });
    await a.wait("STATE");
    b.ws.terminate();
    await new Promise((r) => setTimeout(r, 250));
    let m = await a.wait("STATE");
    for (
      let i = 0;
      i < 20 && m.type === "STATE" && m.state.phase !== "finished";
      i++
    )
      m = await a.wait("STATE");
    expect(m.type === "STATE" && m.state.phase).toBe("finished");
    expect(m.type === "STATE" && m.state.winner).toBe(0);
    const c = await peer();
    c.send({ type: "RESUME", code: room.code, token: "a".repeat(48) });
    expect((await c.wait("ERROR")).type).toBe("ERROR");
  } finally {
    sockets.forEach((s) => s.terminate());
    await server.close();
  }
});
