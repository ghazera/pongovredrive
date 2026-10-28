import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createGame,
  type State,
  type Mode,
  type Difficulty,
} from "../../shared/game";
import type { ServerMessage } from "../../shared/protocol";
import { Connection } from "./network";
import { loadSettings, saveSettings, type Settings } from "./settings";
import { sound } from "./audio";
import "./style.css";
const Arena = lazy(() => import("./Arena"));
type Screen = "home" | "ai" | "online" | "room" | "game" | "settings";
function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M5 19 19 5M5 5h14v14" />
    </svg>
  );
}
function App() {
  const [screen, setScreen] = useState<Screen>(
    new URLSearchParams(location.search).has("room") ? "online" : "home",
  );
  const [back, setBack] = useState<Screen>("home");
  const [settings, setSettings] = useState(loadSettings),
    [mode, setMode] = useState<Mode>("classic"),
    [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [kind, setKind] = useState<"local" | "ai" | "network">("local"),
    [hud, setHud] = useState<State>(createGame),
    [paused, setPaused] = useState(false),
    [confirm, setConfirm] = useState(false),
    [round, setRound] = useState(0);
  const [name, setName] = useState("Player"),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("room")?.toUpperCase() || "",
    ),
    [room, setRoom] = useState<Extract<ServerMessage, { type: "ROOM" }> | null>(
      null,
    ),
    [status, setStatus] = useState("Offline"),
    [error, setError] = useState(""),
    [ping, setPing] = useState(0),
    [copied, setCopied] = useState("");
  const net = useRef<Connection | null>(null);
  if (!net.current) net.current = new Connection();
  const connection = net.current;
  const remote = useRef<State | null>(null);
  const localState = useRef<State | null>(null);
  const roomPaused = useRef(false);
  useEffect(() => {
    saveSettings(settings);
    sound.configure(settings);
    document.documentElement.dataset.motion = settings.reduced
      ? "reduced"
      : "full";
    document.documentElement.style.setProperty("--cyan", settings.left);
    document.documentElement.style.setProperty("--pink", settings.right);
  }, [settings]);
  useEffect(() => {
    connection.onstatus = (s) => {
      setStatus(s);
      if (s !== "Connected") roomPaused.current = true;
    };
    connection.onmessage = (m) => {
      if (m.type === "ERROR") {
        setError(m.message);
        return;
      }
      if (m.type === "PONG") {
        setPing(Date.now() - m.time);
        return;
      }
      if (m.type === "ROOM") {
        setRoom(m);
        setCode(m.code);
        roomPaused.current = m.paused;
        setScreen((s) => (s === "game" ? s : "room"));
      }
      if (m.type === "STATE") {
        remote.current = m.state;
        roomPaused.current = m.paused;
        setKind("network");
        setMode(m.state.mode);
        setScreen((s) => (s === "settings" ? s : "game"));
      }
    };
    if (connection.session) connection.connect();
    return () => connection.leave();
  }, [connection]);
  // Network snapshots are consumed by Phaser; React only receives HUD updates at 10 Hz.
  const control = {
    get state() {
      return kind === "network" ? remote.current : localState.current;
    },
    get paused() {
      return kind === "network" ? roomPaused.current : paused;
    },
    settings,
    send: (d: number) => connection.send({ type: "INPUT", direction: d }),
    sendPointer: (y: number) => connection.send({ type: "POINTER", y }),
  };
  function click() {
    sound.unlock();
    sound.configure(settings);
    sound.play("button");
  }
  function navigate(s: Screen) {
    click();
    setError("");
    setScreen(s);
  }
  function start(k: "local" | "ai") {
    click();
    connection.leave();
    setKind(k);
    localState.current = createGame(mode);
    setHud(localState.current);
    setPaused(false);
    setRound((n) => n + 1);
    setScreen("game");
  }
  function leave() {
    connection.leave();
    remote.current = null;
    setRoom(null);
    setConfirm(false);
    setPaused(false);
    setScreen("home");
    history.replaceState(null, "", location.pathname);
  }
  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("Copied!");
    } catch {
      setCopied(value);
    }
  }
  const names =
    kind === "network"
      ? [
          room?.players[0]?.name || "Player 1",
          room?.players[1]?.name || "Player 2",
        ]
      : [
          "Player 1",
          kind === "ai" ? `AI · ${difficulty.toUpperCase()}` : "Player 2",
        ];
  return (
    <div className="shell" onPointerDown={() => sound.unlock()}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            if (screen === "game") setConfirm(true);
            else navigate("home");
          }}
        >
          <span className="brand-icon">
            N
            <span>
              <Arrow />
            </span>
          </span>
          <span>
            NEON PONG<small>OVERDRIVE</small>
          </span>
        </a>
        <div className="top-right">
          <span className="system">
            <i /> SYSTEM ONLINE
          </span>
          <button
            className="icon-button"
            aria-label={settings.mute ? "Unmute" : "Mute"}
            onClick={() => change("mute", !settings.mute)}
          >
            {settings.mute ? "♪̸" : "♫"}
          </button>
          <button
            className="icon-button"
            aria-label="Open settings"
            onClick={() => {
              setBack(screen);
              navigate("settings");
            }}
          >
            ⚙
          </button>
        </div>
      </header>
      {screen === "home" && (
        <main id="main-content" className="home">
          <section className="hero-copy">
            <div className="edition">
              <span /> THE ARCADE. RECHARGED.
            </div>
            <h1>NEON PONG</h1>
            <div className="overdrive">OVERDRIVE</div>
            <p className="intro">
              One ball. Two rivals.
              <br />
              No room to slow down.
            </p>
            <div className="mode-toggle" aria-label="Rules">
              <button
                className={mode === "classic" ? "selected" : ""}
                onClick={() => setMode("classic")}
              >
                CLASSIC
              </button>
              <button
                className={mode === "overdrive" ? "selected" : ""}
                onClick={() => setMode("overdrive")}
              >
                OVERDRIVE{" "}
                <span>
                  <Arrow />
                </span>
              </button>
            </div>
            <div className="main-actions">
              <button className="primary quick" onClick={() => start("ai")}>
                <span>
                  QUICK PLAY<small>Jump in against the AI</small>
                </span>
                <b>
                  <Arrow />
                </b>
              </button>
              <button
                aria-label="LOCAL 2 PLAYERS"
                onClick={() => start("local")}
              >
                <span className="action-icon">II</span> LOCAL 2 PLAYERS{" "}
                <small>W S / ↑ ↓</small>
              </button>
              <button aria-label="PLAY VS AI" onClick={() => navigate("ai")}>
                <span className="action-icon">◇</span> PLAY VS AI{" "}
                <small>4 LEVELS</small>
              </button>
              <button
                aria-label="ONLINE / LAN"
                onClick={() => navigate("online")}
              >
                <span className="action-icon">⌁</span> ONLINE / LAN{" "}
                <small>PLAY WITH FRIENDS</small>
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setBack("home");
                  navigate("settings");
                }}
              >
                SETTINGS
              </button>
            </div>
            <div className="hero-foot">
              <span>60 Hz precision</span>
              <span>Original synth audio</span>
              <span>No account needed</span>
            </div>
          </section>
          <section
            className="hero-art"
            aria-label="Neon Pong court illustration"
          >
            <div className="arena-label">
              <i /> LIVE FROM THE GRID <span>CLASSIC ARENA</span>
            </div>
            <div className="court-art">
              <div className="court-grid" />
              <div className="court-center" />
              <div className="court-ring" />
              <div className="art-paddle left" />
              <div className="art-paddle right" />
              <div className="art-ball" />
              <div className="art-score">
                0 <span>:</span> 0
              </div>
              <div className="court-corner tl" />
              <div className="court-corner br" />
            </div>
            <div className="art-caption">
              <span>
                PURE REFLEX.
                <br />
                <strong>FULL OVERDRIVE.</strong>
              </span>
              <span className="art-orbit">
                <Arrow />
              </span>
            </div>
            <p className="art-note">A classic rivalry. A whole new voltage.</p>
          </section>
        </main>
      )}
      {screen === "ai" && (
        <main id="main-content" className="panel">
          <p className="eyebrow">TRAIN YOUR REFLEXES</p>
          <h2>Choose your rival.</h2>
          <p>Prediction, precision, pressure. Find your level.</p>
          <div className="difficulty">
            {(["easy", "normal", "hard", "insane"] as const).map((d, i) => (
              <button
                key={d}
                className={difficulty === d ? "selected" : ""}
                onClick={() => setDifficulty(d)}
              >
                <span>
                  {"▰".repeat(i + 1)}
                  <em>{"▱".repeat(3 - i)}</em>
                </span>
                <strong>{d.toUpperCase()}</strong>
                <small>
                  {
                    [
                      "Find your rhythm",
                      "A worthy opponent",
                      "No easy points",
                      "Push your limits",
                    ][i]
                  }
                </small>
              </button>
            ))}
          </div>
          <button className="primary" onClick={() => start("ai")}>
            START MATCH
          </button>
          <button onClick={() => navigate("home")}>BACK</button>
        </main>
      )}
      {screen === "online" && (
        <main id="main-content" className="panel network-panel">
          <p className="eyebrow">ONE COURT. ANY DISTANCE.</p>
          <h2>Bring a rival.</h2>
          <p>Create a room or enter your friend's code.</p>
          <label>
            Player name
            <input
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          </label>
          <div className="online-options">
            <section>
              <h3>Host the match</h3>
              <p>Your arena. Your invitation.</p>
              <button
                className="primary"
                onClick={() => {
                  click();
                  setError("");
                  connection.connect({ type: "CREATE", name, mode });
                }}
              >
                CREATE ROOM
              </button>
            </section>
            <section>
              <h3>Join the action</h3>
              <label>
                Room code
                <input
                  maxLength={6}
                  placeholder="ABC123"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    )
                  }
                />
              </label>
              <button
                disabled={code.length !== 6}
                onClick={() => {
                  click();
                  setError("");
                  connection.connect({ type: "JOIN", name, code });
                }}
              >
                JOIN ROOM
              </button>
            </section>
          </div>
          <p role="status">{status}</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            onClick={() => {
              connection.leave();
              navigate("home");
            }}
          >
            BACK
          </button>
        </main>
      )}
      {screen === "room" && room && (
        <main id="main-content" className="panel room-panel">
          <p className="eyebrow">YOUR ARENA IS OPEN</p>
          <h2>Rivals, assemble.</h2>
          <p>Room code</p>
          <div className="room-code" data-testid="room-code">
            {room.code}
          </div>
          <div className="copy-buttons">
            <button onClick={() => void copy(room.code)}>COPY CODE</button>
            <button
              onClick={() => void copy(`${location.origin}/?room=${room.code}`)}
            >
              COPY INVITE LINK
            </button>
          </div>
          <p role="status">{copied || status}</p>
          <div className="players">
            {room.players.map((p, i) => (
              <div key={i} className={i ? "pink" : "cyan"}>
                <div className="avatar">{i ? "◇" : "◈"}</div>
                <strong>{p?.name || "Waiting for opponent"}</strong>
                <span>
                  {p
                    ? p.connected
                      ? p.ready
                        ? "READY"
                        : "CONNECTED"
                      : "DISCONNECTED"
                    : "SHARE YOUR ROOM CODE"}
                </span>
              </div>
            ))}
          </div>
          <button
            className="primary"
            disabled={
              !room.players.every(Boolean) || room.players[room.side]?.ready
            }
            onClick={() => {
              click();
              connection.send({ type: "READY" });
            }}
          >
            READY
          </button>
          <button onClick={leave}>LEAVE ROOM</button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </main>
      )}
      {screen === "game" && (
        <main id="main-content" className="game-page">
          <div className="match-meta">
            <span>
              <i /> {kind === "network" ? status : "LOCAL SESSION"}
            </span>
            <span>{mode.toUpperCase()} · FIRST TO 7 · WIN BY 2</span>
            <span>
              {kind === "network" && settings.ping
                ? `${ping} ms`
                : "60 Hz SIMULATION"}
            </span>
          </div>
          <div className="scoreboard">
            <div className="player-name cyan">
              <span>◈</span>
              <strong>{names[0]}</strong>
            </div>
            <div
              data-testid="score"
              className="score"
              key={hud.score.join("-")}
            >
              {hud.score[0]}
              <span>:</span>
              {hud.score[1]}
            </div>
            <div className="player-name pink">
              <strong>{names[1]}</strong>
              <span>◇</span>
            </div>
          </div>
          <div className="arena-wrap">
            <Suspense fallback={<div className="loading">Charging arena…</div>}>
              <Arena
                key={round}
                kind={kind}
                mode={mode}
                difficulty={difficulty}
                control={control}
                onHud={(s) => {
                  if (kind !== "network") localState.current = s;
                  setHud(s);
                }}
              />
            </Suspense>
            {kind === "network" &&
              roomPaused.current &&
              hud.phase !== "finished" && (
                <div className="disconnected" role="status">
                  <strong>PLAYER DISCONNECTED</strong>
                  <p>Match paused. Reconnecting for up to 30 seconds.</p>
                </div>
              )}
            {paused && (
              <div className="pause-actions">
                <strong>PAUSED</strong>
                <button className="primary" onClick={() => setPaused(false)}>
                  RESUME
                </button>
              </div>
            )}
            {hud.phase === "finished" && (
              <div className="victory">
                <span className="victory-symbol">✦</span>
                <p>THE GRID HAS A CHAMPION</p>
                <h2>{names[hud.winner]} wins.</h2>
                <div className="final-score">{hud.score.join(" : ")}</div>
                <div className="stats">
                  <span>
                    {Math.floor(hud.elapsed)}s<small>MATCH TIME</small>
                  </span>
                  <span>
                    {hud.longest}
                    <small>LONGEST RALLY</small>
                  </span>
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    click();
                    if (kind === "network")
                      connection.send({ type: "REMATCH" });
                    else start(kind);
                  }}
                >
                  REMATCH
                </button>
                {kind === "network" && (
                  <p>
                    {room?.players[room.side]?.ready
                      ? "Waiting for opponent to accept…"
                      : "Both players must accept."}
                  </p>
                )}
                <button onClick={() => setConfirm(true)}>MAIN MENU</button>
              </div>
            )}
          </div>
          <div className="game-toolbar">
            <span>
              {kind === "network"
                ? "MOVE  MOUSE / W S / ↑ ↓"
                : kind === "ai"
                  ? "MOVE  MOUSE / W S"
                  : "PLAYER 1  W / S"}
              <span className="toolbar-right">
                {kind === "local"
                  ? "PLAYER 2  ↑ / ↓"
                  : kind === "ai"
                    ? difficulty.toUpperCase() + " AI"
                    : ""}
              </span>
            </span>
            <div>
              {kind !== "network" && hud.phase !== "finished" && !paused && (
                <button onClick={() => setPaused((p) => !p)}>
                  {paused ? "RESUME" : "PAUSE"}
                </button>
              )}
              <button onClick={() => setConfirm(true)}>MAIN MENU</button>
            </div>
          </div>
          <div className="rally-meter">
            <span>RALLY ENERGY</span>
            <div>
              <i style={{ width: `${Math.min(100, hud.hits * 7)}%` }} />
            </div>
            <strong>{hud.hits.toString().padStart(2, "0")}</strong>
          </div>
        </main>
      )}
      {screen === "settings" && (
        <main id="main-content" className="panel settings-panel">
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2>Fine-tune the voltage.</h2>
          <div className="settings-grid">
            <section>
              <h3>Audio</h3>
              {(["master", "sfx", "music"] as const).map((k, i) => (
                <label key={k}>
                  {["Master volume", "Effects volume", "Music volume"][i]}
                  <span>{Math.round(settings[k] * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings[k]}
                    onChange={(e) => change(k, Number(e.target.value))}
                  />
                </label>
              ))}
              <label className="check">
                <input
                  type="checkbox"
                  checked={settings.mute}
                  onChange={(e) => change("mute", e.target.checked)}
                />
                Mute audio
              </label>
            </section>
            <section>
              <h3>Visuals</h3>
              <label>
                Effects intensity
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.intensity}
                  onChange={(e) => change("intensity", +e.target.value)}
                />
              </label>
              {(["particles", "quality"] as const).map((k) => (
                <label key={k}>
                  {k === "particles" ? "Particles" : "Graphics quality"}
                  <select
                    value={settings[k]}
                    onChange={(e) =>
                      change(k, e.target.value as Settings[typeof k])
                    }
                  >
                    {["low", "medium", "high"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              ))}
              {(["shake", "reduced", "ping"] as const).map((k) => (
                <label className="check" key={k}>
                  <input
                    type="checkbox"
                    checked={settings[k]}
                    onChange={(e) => change(k, e.target.checked)}
                  />
                  {k === "shake"
                    ? "Screen shake"
                    : k === "reduced"
                      ? "Reduced motion"
                      : "Show ping"}
                </label>
              ))}
            </section>
            <section>
              <h3>Player colors</h3>
              <label>
                Player 1
                <input
                  type="color"
                  value={settings.left}
                  onChange={(e) => change("left", e.target.value)}
                />
              </label>
              <label>
                Player 2
                <input
                  type="color"
                  value={settings.right}
                  onChange={(e) => change("right", e.target.value)}
                />
              </label>
              <button
                onClick={() => {
                  if (!document.fullscreenElement)
                    void document.documentElement
                      .requestFullscreen?.()
                      .catch(() =>
                        setError("Fullscreen is unavailable in this browser."),
                      );
                  else void document.exitFullscreen();
                }}
              >
                TOGGLE FULLSCREEN
              </button>
            </section>
          </div>
          {error && <p role="alert">{error}</p>}
          <p className="subtle">Preferences are saved on this device.</p>
          <button className="primary" onClick={() => navigate(back)}>
            BACK
          </button>
        </main>
      )}
      {confirm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
          >
            <h2 id="leave-title">Leave the arena?</h2>
            <p>Your current match will end for you.</p>
            <button className="primary" autoFocus onClick={leave}>
              LEAVE MATCH
            </button>
            <button onClick={() => setConfirm(false)}>KEEP PLAYING</button>
          </section>
        </div>
      )}
      <footer>
        <span>NEON PONG: OVERDRIVE</span>
        <span>
          BUILT FOR THE NEXT RALLY{" "}
          <b>
            <Arrow />
          </b>
        </span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
