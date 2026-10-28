import { useEffect, useRef } from "react";
import Phaser from "phaser";
import {
  createGame,
  step,
  aiTarget,
  difficulties,
  DT,
  W,
  H,
  PADDLE,
  PX,
  type State,
  type Mode,
  type Difficulty,
} from "../../shared/game";
import type { Settings } from "./settings";
import { sound } from "./audio";
import { Effects } from "./vfx";
export type ArenaControl = {
  state: State | null;
  paused: boolean;
  settings: Settings;
  send: (d: number) => void;
  sendPointer: (y: number) => void;
};
type Props = {
  kind: "local" | "ai" | "network";
  mode: Mode;
  difficulty: Difficulty;
  control: ArenaControl;
  onHud: (s: State) => void;
};

export default function Arena({
  kind,
  mode,
  difficulty,
  control,
  onHud,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ control, onHud });
  latest.current = { control, onHud };
  useEffect(() => {
    let accumulator = 0,
      lastHud = 0,
      lastEvent = 0,
      lastDirection = 99,
      aiClock = 0,
      target = H / 2;
    const keys = new Set<string>();
    let mouseY: number | null = null;
    let lastPointerY: number | null = null;
    let lastPointerSent = -Infinity;
    const pointerMove = (e: PointerEvent) => {
      if (kind === "local" || e.pointerType !== "mouse") return;
      const canvas = host.current?.querySelector("canvas");
      if (!canvas || e.target !== canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.height > 0)
        mouseY = Math.max(
          0,
          Math.min(H, ((e.clientY - rect.top) * H) / rect.height),
        );
    };
    const pointerLeave = () => {
      mouseY = null;
    };
    const element = host.current!;
    element.addEventListener("pointermove", pointerMove);
    element.addEventListener("pointerleave", pointerLeave);
    let local =
      kind !== "network" && control.state ? control.state : createGame(mode);
    const effects = new Effects();
    let trails: { x: number; y: number }[] = [];
    let visual: State | null = null;
    let lastNet: State | null = null;
    let prevNet: State | null = null;
    let received = 0;
    let glow = 0;
    const down = (e: KeyboardEvent) => {
      if (
        ["KeyW", "KeyS", "ArrowUp", "ArrowDown", "Space"].includes(e.code) &&
        !(e.target instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        keys.add(e.code);
        mouseY = null;
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => {
      keys.clear();
      mouseY = null;
      lastDirection = 99;
      lastPointerY = null;
      latest.current.control.send(0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    class Pong extends Phaser.Scene {
      graphics!: Phaser.GameObjects.Graphics;
      label!: Phaser.GameObjects.Text;
      create() {
        this.graphics = this.add.graphics();
        this.label = this.add
          .text(W / 2, H / 2, "", {
            fontFamily: "Arial Black, sans-serif",
            fontSize: "84px",
            color: "#f4f7ff",
            align: "center",
          })
          .setOrigin(0.5);
      }
      update(time: number, delta: number) {
        const c = latest.current.control,
          s = c.settings;
        const input = [
          Number(keys.has("KeyS")) - Number(keys.has("KeyW")),
          Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp")),
        ];
        if (kind === "network") {
          const direction = input[0] || input[1];
          if (mouseY !== null && direction === 0) {
            if (
              mouseY !== lastPointerY &&
              time - lastPointerSent >= 1000 / 30
            ) {
              c.sendPointer(mouseY);
              lastPointerY = mouseY;
              lastPointerSent = time;
              lastDirection = 99;
            }
          } else if (direction !== lastDirection) {
            c.send(direction);
            lastDirection = direction;
            lastPointerY = null;
          }
          if (c.state && c.state !== lastNet) {
            if (lastNet?.phase === "finished" && c.state.phase === "countdown")
              lastEvent = 0;
            prevNet = lastNet;
            lastNet = c.state;
            received = time;
          }
          if (!lastNet) return;
          if (!visual) visual = structuredClone(lastNet);
          const t = Math.min(1, (time - received) / 50);
          const from = prevNet ?? lastNet;
          visual = {
            ...lastNet,
            ball: {
              ...lastNet.ball,
              x: Phaser.Math.Linear(from.ball.x, lastNet.ball.x, t),
              y: Phaser.Math.Linear(from.ball.y, lastNet.ball.y, t),
            },
            paddles: [
              Phaser.Math.Linear(from.paddles[0], lastNet.paddles[0], t),
              Phaser.Math.Linear(from.paddles[1], lastNet.paddles[1], t),
            ],
          };
        } else {
          if (!c.paused) {
            accumulator += Math.min(delta / 1000, 0.1);
            while (accumulator >= DT) {
              accumulator -= DT;
              if (kind === "ai") {
                aiClock -= DT;
                if (aiClock <= 0) {
                  target = aiTarget(local, difficulty);
                  aiClock = difficulties[difficulty].reaction;
                }
                const d = target - local.paddles[1];
                input[1] =
                  Math.abs(d) < 8
                    ? 0
                    : (Math.sign(d) * difficulties[difficulty].speed) / 580;
              }
              step(local, input, DT, kind === "ai" ? [mouseY, null] : []);
            }
          }
          visual = local;
        }
        const state = visual;
        if (!state) return;
        if (time - lastHud > 90) {
          lastHud = time;
          latest.current.onHud({ ...state });
        }
        const colors = [
          Phaser.Display.Color.HexStringToColor(s.left).color,
          Phaser.Display.Color.HexStringToColor(s.right).color,
        ];
        for (const e of state.events) {
          if (e.id <= lastEvent) continue;
          lastEvent = e.id;
          sound.play(e.type, state.hits / 8);
          glow = e.type === "goal" ? 1 : 0.4;
          if (s.shake && !s.reduced)
            this.cameras.main.shake(
              e.type === "goal" ? 190 : 55,
              e.type === "goal" ? 0.006 : 0.0015,
            );
          effects.emit(e, s, e.side === 1 ? colors[1] : colors[0]);
        }
        const g = this.graphics;
        g.clear();
        g.fillStyle(0x080e22);
        g.fillRect(0, 0, W, H);
        g.lineStyle(1, 0x263454, 0.35);
        for (let x = 0; x < W; x += 64) g.lineBetween(x, 0, x, H);
        for (let y = 0; y < H; y += 60) g.lineBetween(0, y, W, y);
        // A restrained horizon and court markings keep the moving ball readable.
        g.lineStyle(1, 0x6a7dad, 0.14);
        g.strokeCircle(W / 2, H / 2, 130);
        g.strokeCircle(W / 2, H / 2, 136);
        g.lineStyle(2, 0x8796b8, 0.3);
        for (let y = 12; y < H; y += 26) g.lineBetween(W / 2, y, W / 2, y + 12);
        glow = Math.max(0, glow - delta / 900);
        g.lineStyle(3, 0x7287cb, 0.45 + glow * 0.5);
        g.strokeRect(1, 1, W - 2, H - 2);
        for (let i = 0; i < 2; i++) {
          const x = i === 0 ? PX : W - PX,
            y = state.paddles[i];
          if (s.quality !== "low")
            for (let j = 4; j > 0; j--) {
              g.fillStyle(colors[i], 0.025 * s.intensity);
              g.fillRoundedRect(
                x - 8 - j * 5,
                y - PADDLE / 2 - j * 4,
                16 + j * 10,
                PADDLE + j * 8,
                10,
              );
            }
          g.fillStyle(colors[i], 1);
          g.fillRoundedRect(x - 8, y - PADDLE / 2, 16, PADDLE, 6);
          g.fillStyle(0xffffff, 0.8);
          g.fillRoundedRect(x - 3, y - PADDLE / 2 + 5, 4, PADDLE - 10, 2);
          g.lineStyle(3, colors[i], 0.6);
          g.lineBetween(
            i === 0 ? 2 : W - 2,
            y - 30,
            i === 0 ? 2 : W - 2,
            y + 30,
          );
        }
        if (state.phase === "playing") {
          trails.push({ x: state.ball.x, y: state.ball.y });
          if (trails.length > (s.quality === "low" ? 6 : 22)) trails.shift();
          const color = state.ball.vx > 0 ? colors[0] : colors[1];
          if (!s.reduced)
            trails.forEach((p, i) => {
              g.fillStyle(color, (i / trails.length) * 0.35 * s.intensity);
              g.fillCircle(p.x, p.y, 3 + (i / trails.length) * 7);
            });
          for (let j = s.quality === "low" ? 1 : 4; j > 0; j--) {
            g.fillStyle(color, 0.05 * s.intensity);
            g.fillCircle(state.ball.x, state.ball.y, 9 + j * 6);
          }
          g.fillStyle(0xf4f7ff);
          g.fillCircle(state.ball.x, state.ball.y, 9);
        } else trails = [];
        effects.draw(g, delta / 1000, s);
        this.label.setText(
          c.paused
            ? ""
            : glow > 0.7
              ? "GOAL!"
              : state.phase === "countdown"
                ? state.timer > 1.5
                  ? String(Math.ceil(state.timer))
                  : "GET READY"
                : "",
        );
        this.label.setAlpha(c.paused || state.phase === "countdown" ? 1 : glow);
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current!,
      width: W,
      height: H,
      backgroundColor: "#080e22",
      scene: Pong,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      audio: { noAudio: true },
      banner: false,
    });
    return () => {
      element.removeEventListener("pointermove", pointerMove);
      element.removeEventListener("pointerleave", pointerLeave);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      latest.current.control.send(0);
      game.destroy(true);
      trails = [];
      local = createGame();
    };
  }, [kind, mode, difficulty]);
  return (
    <div
      className="arena"
      ref={host}
      aria-label={
        kind === "local"
          ? "Pong arena. Left player W and S; right player up and down arrows."
          : "Pong arena. Move your paddle with the mouse, W and S, or up and down arrows in online play."
      }
    />
  );
}
