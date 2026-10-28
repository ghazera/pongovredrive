import { bossTargets } from "./helpers/boss-driver";
import { it, expect } from "vitest";
import { WebSocket } from "ws";
import { makeServer } from "../server/app";
import type { ServerMessage } from "../shared/protocol";
import type { State } from "../shared/game";
it("four authoritative allies defeat a boss, share phases and health, then vote for a fresh raid", async () => {
  const server = makeServer();
  await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
  const addr = server.http.address();
  if (!addr || typeof addr === "string") throw Error("port");
  const peers: {
    ws: WebSocket;
    room: Extract<ServerMessage, { type: "ROOM" }> | null;
    state: State | null;
    seq: number;
  }[] = [];
  const phases = new Set<number>();
  async function peer() {
    const p = {
      ws: new WebSocket(
        `ws://127.0.0.1:${typeof addr === "object" ? addr!.port : 0}/ws`,
      ),
      room: null as Extract<ServerMessage, { type: "ROOM" }> | null,
      state: null as State | null,
      seq: 0,
    };
    peers.push(p);
    p.ws.on("message", (d) => {
      const m = JSON.parse(d.toString()) as ServerMessage;
      if (m.type === "ROOM") p.room = m;
      if (m.type === "STATE") {
        p.state = m.state;
        const b = m.state.boss!;
        phases.add(b.phase);
        if (m.state.phase !== "finished" && p.room) {
          const side = p.room.side;
          const target = bossTargets(m.state)[side];
          p.ws.send(
            JSON.stringify({ type: "POINTER", y: target, seq: ++p.seq }),
          );
        }
      }
    });
    await new Promise<void>((r, j) => {
      p.ws.once("open", r);
      p.ws.once("error", j);
    });
    return p;
  }
  async function until(fn: () => boolean, timeout = 5000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (fn()) return;
      await new Promise((r) => setTimeout(r, 15));
    }
    throw Error("Raid timeout");
  }
  try {
    const a = await peer();
    a.ws.send(
      JSON.stringify({
        type: "CREATE",
        name: "Host",
        mode: "boss",
        boss: "voltmaw",
      }),
    );
    await until(() => !!a.room);
    for (let i = 1; i < 4; i++) {
      const p = await peer();
      p.ws.send(
        JSON.stringify({
          type: "JOIN",
          name: `Friend ${i}`,
          code: a.room!.code,
        }),
      );
      await until(() => !!p.room);
      expect(p.room!.side).toBe(i);
    }
    const extra = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${typeof addr === "object" ? addr!.port : 0}/ws`,
      );
      ws.once("open", () =>
        ws.send(
          JSON.stringify({ type: "JOIN", name: "Extra", code: a.room!.code }),
        ),
      );
      ws.on("message", (d) => {
        const m = JSON.parse(d.toString());
        ws.terminate();
        resolve(m.type === "ERROR");
      });
      ws.once("error", reject);
    });
    expect(extra).toBe(true);
    peers.forEach((p) => p.ws.send('{"type":"READY"}'));
    await until(() => peers.every((p) => p.state?.boss?.players.length === 4));
    await until(
      () => peers.every((p) => p.state?.phase === "finished"),
      300000,
    );
    expect(a.state!.winner).toBe(0);
    expect(phases.size).toBe(5);
    for (const p of peers) {
      expect(p.state!.boss!.hp).toBe(0);
      expect(p.state!.score).toEqual(a.state!.score);
    }
    for (const p of peers) p.ws.send('{"type":"REMATCH"}');
    await until(() => peers.every((p) => p.state?.phase === "countdown"));
    expect(a.state!.boss!.hp).toBe(a.state!.boss!.maxHp);
    expect(a.state!.boss!.players).toEqual([5, 5, 5, 5]);
  } finally {
    peers.forEach((p) => p.ws.terminate());
    await server.close();
  }
}, 320000);

it("a raid resumes with the missing ally eliminated after reconnect grace expires", async () => {
  const server = makeServer({ graceMs: 120 });
  await new Promise<void>((r) => server.http.listen(0, "127.0.0.1", r));
  const addr = server.http.address();
  if (!addr || typeof addr === "string") throw Error("port");
  const a = new WebSocket(`ws://127.0.0.1:${addr.port}/ws`),
    b = new WebSocket(`ws://127.0.0.1:${addr.port}/ws`);
  const observed: {
    code: string;
    state: State | null;
    paused: boolean;
    joined: boolean;
  } = { code: "", state: null, paused: false, joined: false };
  a.on("message", (d) => {
    const m = JSON.parse(d.toString()) as ServerMessage;
    if (m.type === "ROOM") observed.code = m.code;
    if (m.type === "STATE") {
      observed.state = m.state;
      observed.paused = m.paused;
    }
  });
  b.on("message", (d) => {
    if (JSON.parse(d.toString()).type === "ROOM") observed.joined = true;
  });
  const until = async (fn: () => boolean) => {
    const end = Date.now() + 5000;
    while (!fn()) {
      if (Date.now() > end) throw Error("Timeout");
      await new Promise((r) => setTimeout(r, 10));
    }
  };
  try {
    await Promise.all([
      new Promise<void>((r) => a.once("open", r)),
      new Promise<void>((r) => b.once("open", r)),
    ]);
    a.send('{"type":"CREATE","name":"A","mode":"boss"}');
    await until(() => !!observed.code);
    b.send(JSON.stringify({ type: "JOIN", name: "B", code: observed.code }));
    await until(() => observed.joined);
    a.send('{"type":"READY"}');
    b.send('{"type":"READY"}');
    await until(() => !!observed.state);
    b.terminate();
    await until(
      () => observed.state?.boss?.players[1] === 0 && !observed.paused,
    );
    expect(observed.state!.phase).not.toBe("finished");
    expect(observed.state!.boss!.players[0]).toBe(5);
  } finally {
    a.terminate();
    b.terminate();
    await server.close();
  }
});
