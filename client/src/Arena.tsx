import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import {
  createGame,
  step,
  aiTarget,
  difficulties,
  DT,
  W,
  H,
  PX,
  type State,
  type Mode,
  type Difficulty,
} from "../../shared/game";
import type { Settings } from "./settings";
import { sound } from "./audio";
import { Effects } from "./vfx";
import { paddleHeight, pulseActive } from "../../shared/modes";
import { PaddlePrediction } from "./prediction";
import { raidHeight, raidBounds, bossLane, BOSSES } from "../../shared/bosses";
import { drawBossBattle } from "./boss-render";
import { drawMode } from "./mode-effects";
export type ArenaControl = {
  state: State | null;
  paused: boolean;
  settings: Settings;
  side: number;
  inputAck: number[];
  send: (d: number) => number;
  sendPointer: (y: number) => number;
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
  const [captureStatus, setCaptureStatus] = useState(
    "Click arena to capture mouse · Esc to release",
  );
  const latest = useRef({ control, onHud });
  latest.current = { control, onHud };
  useEffect(() => {
    let accumulator = 0,
      lastHud = 0,
      lastEvent = 0,
      aiClock = 0,
      target = H / 2;
    const keys = new Set<string>();
    let mouseY: number | null = null;
    const prediction = new PaddlePrediction(
      control.state?.paddles[control.side] ?? H / 2,
    );
    const height = (state: State) =>
      state.boss
        ? raidHeight(state.boss.players.length)
        : paddleHeight(state.mode, state.hits);
    const bounds = (state: State, side: number): readonly [number, number] =>
      state.boss
        ? raidBounds(side, state.boss.players.length)
        : [height(state) / 2, H - height(state) / 2];
    const element = host.current!;
    const canvasElement = () => element.querySelector("canvas");
    const ownsLock = () =>
      document.pointerLockElement !== null &&
      document.pointerLockElement === canvasElement();
    const releaseLock = () => {
      if (ownsLock()) document.exitPointerLock();
    };
    let requesting = false;
    let wasLocked = false;
    const currentPaddle = () =>
      kind === "network" ? prediction.y : local.paddles[0];
    const captureError = () => {
      requesting = false;
      setCaptureStatus(
        "Cursor capture unavailable · Move over the arena or use the keyboard",
      );
    };
    const lockChange = () => {
      requesting = false;
      const locked = ownsLock();
      if (locked) {
        mouseY = currentPaddle();
        keys.clear();
        setCaptureStatus("Mouse captured · Esc to release");
      } else if (wasLocked) {
        mouseY = null;
        keys.clear();
        latest.current.control.send(0);
        setCaptureStatus("Click arena to capture mouse · Esc to release");
      }
      wasLocked = locked;
    };
    const capture = (e: MouseEvent) => {
      const c = latest.current.control;
      const canvas = canvasElement();
      const state = kind === "network" ? c.state : local;
      if (
        kind === "local" ||
        e.button !== 0 ||
        e.target !== canvas ||
        !canvas ||
        c.paused ||
        state?.phase === "finished" ||
        state?.boss?.players[c.side] === 0 ||
        requesting ||
        ownsLock()
      )
        return;
      if (typeof canvas.requestPointerLock !== "function") {
        captureError();
        return;
      }
      requesting = true;
      try {
        Promise.resolve(canvas.requestPointerLock()).catch(captureError);
      } catch {
        captureError();
      }
    };
    const relativeMove = (e: MouseEvent) => {
      if (!ownsLock() || !Number.isFinite(e.movementY)) return;
      const c = latest.current.control;
      const state = kind === "network" ? c.state : local;
      if (c.paused || state?.phase === "finished") return;
      const rect = canvasElement()!.getBoundingClientRect();
      const [min, max] = state ? bounds(state, c.side) : [54, H - 54];
      if (rect.height > 0)
        mouseY = Math.max(
          min,
          Math.min(
            max,
            (mouseY ?? currentPaddle()) + (e.movementY * H) / rect.height,
          ),
        );
    };
    element.addEventListener("click", capture);
    document.addEventListener("mousemove", relativeMove);
    document.addEventListener("pointerlockchange", lockChange);
    document.addEventListener("pointerlockerror", captureError);
    const pointerMove = (e: PointerEvent) => {
      if (kind === "local" || e.pointerType !== "mouse" || ownsLock()) return;
      const canvas = host.current?.querySelector("canvas");
      if (!canvas || e.target !== canvas) return;
      const rect = canvas.getBoundingClientRect();
      const c = latest.current.control,
        state = kind === "network" ? c.state : local;
      const lane = state?.boss
        ? bossLane(c.side, state.boss.players.length)
        : { top: 0, bottom: H };
      if (rect.height > 0)
        mouseY =
          lane.top +
          Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) *
            (lane.bottom - lane.top);
    };
    const pointerLeave = () => {
      if (!ownsLock()) mouseY = null;
    };
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
      if (e.code === "Escape") {
        releaseLock();
        return;
      }
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
      releaseLock();
      keys.clear();
      mouseY = null;
      prediction.reset(
        latest.current.control.state?.paddles[latest.current.control.side] ??
          H / 2,
      );
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
          if (c.state && c.state !== lastNet) {
            if (
              lastNet?.phase === "finished" &&
              c.state.phase === "countdown"
            ) {
              lastEvent = 0;
              prediction.reset(c.state.paddles[c.side]);
            }
            prediction.reconcile(
              c.state.paddles[c.side],
              c.inputAck[c.side],
              height(c.state),
              bounds(c.state, c.side),
            );
            prevNet = lastNet;
            lastNet = c.state;
            received = time;
          }
          if (!lastNet) return;
          if (!visual) visual = structuredClone(lastNet);
          if (c.paused || lastNet.phase === "finished") {
            prediction.reset(lastNet.paddles[c.side]);
            accumulator = 0;
          } else {
            accumulator += Math.min(delta / 1000, 0.1);
            while (accumulator >= DT) {
              accumulator -= DT;
              const pointer = direction === 0 ? mouseY : null;
              const seq =
                pointer !== null ? c.sendPointer(pointer) : c.send(direction);
              prediction.push(
                seq,
                direction,
                pointer,
                DT,
                height(lastNet),
                bounds(lastNet, c.side),
              );
            }
          }
          const t = Math.min(1, (time - received) / 50);
          const from = prevNet ?? lastNet;
          visual = {
            ...lastNet,
            ball: {
              ...lastNet.ball,
              x: Phaser.Math.Linear(from.ball.x, lastNet.ball.x, t),
              y: Phaser.Math.Linear(from.ball.y, lastNet.ball.y, t),
            },
            paddles: lastNet.paddles.map((y, i) =>
              Phaser.Math.Linear(from.paddles[i] ?? y, y, t),
            ),
          };
          visual.paddles[c.side] = prediction.y;
        } else {
          if (!c.paused) {
            accumulator += Math.min(delta / 1000, 0.1);
            while (accumulator >= DT) {
              accumulator -= DT;
              if (kind === "ai" && !local.boss) {
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
        if (c.paused || state.phase === "finished") releaseLock();
        if (time - lastHud > 90) {
          lastHud = time;
          latest.current.onHud({ ...state });
        }
        const PADDLE = height(state);
        const colors = [
          Phaser.Display.Color.HexStringToColor(s.left).color,
          Phaser.Display.Color.HexStringToColor(s.right).color,
          0x5bffb0,
          0xb68cff,
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
          effects.emit(
            e,
            s,
            state.boss && e.type.startsWith("boss")
              ? parseInt(BOSSES[state.boss.id].color.slice(1), 16)
              : e.type === "player-hit"
                ? 0xff496f
                : e.type === "power"
                  ? state.mode === "pulse"
                    ? 0xffd166
                    : 0x5bffb0
                  : (colors[e.side] ?? colors[0]),
          );
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
        if (state.boss) {
          if (state.boss.players[c.side] <= 0) releaseLock();
          drawBossBattle(g, state, s, c.side);
          effects.draw(g, delta / 1000, s);
          this.label.setText(
            c.paused
              ? ""
              : state.phase === "countdown"
                ? String(Math.ceil(Math.max(0, state.timer)))
                : state.boss.transition > 0
                  ? `PHASE ${state.boss.phase}`
                  : "",
          );
          this.label.setAlpha(1);
          return;
        }
        drawMode(g, state, s);
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
            : state.mode === "pulse" &&
                state.phase === "playing" &&
                pulseActive(state.elapsed) &&
                state.elapsed % 8 < 6.3
              ? "DOUBLE POINTS"
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
      document.removeEventListener("pointerlockchange", lockChange);
      document.removeEventListener("pointerlockerror", captureError);
      document.removeEventListener("mousemove", relativeMove);
      element.removeEventListener("click", capture);
      releaseLock();
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
    <div className="arena-container">
      <div
        className="arena"
        ref={host}
        aria-label={
          kind === "local"
            ? "Pong arena. Left player W and S; right player up and down arrows."
            : "Pong arena. Click to capture the mouse, Escape to release. Move your paddle with the mouse or keyboard."
        }
      />
      {kind !== "local" && (
        <span className="capture-hint" role="status">
          {control.state?.boss?.players[control.side] === 0
            ? "Eliminated · Watch your allies"
            : captureStatus}
        </span>
      )}
    </div>
  );
}
