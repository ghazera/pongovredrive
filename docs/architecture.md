# Architecture

## Simulation

`shared/game.ts` owns a 1280 × 720 logical court. The server advances an accumulator at 60 Hz and publishes snapshots every third tick (20 Hz). Local play uses a frame accumulator with the same 1/60-second steps. Resizing changes only display scale. Small bounded movement substeps prevent tunneling at the configured 1250 px/s speed limit. Paddle impact offset and movement set a capped bounce angle; a minimum angle avoids indefinitely flat rallies. Scoring, countdown and victory are independent of visual effects.

State includes scores, countdown, elapsed time, rally and longest rally, a winner and a bounded event history. Events carry a monotonically increasing sequence number. Clients process each sequence once; a rematch resets the event epoch. Rings, particles, trails and camera shake cannot affect the simulation. Sparks and shockwaves use bounded pools. Reduced motion disables particle bursts, trails and shake; low graphics reduces glow and trail length.

AI predicts wall reflections, refreshes its target at a difficulty-specific reaction interval and moves within speed and position limits. Its deterministic time-varying aim error gives each difficulty a different level of precision.

## Wire protocol

Client messages: `CREATE {name,mode?,boss?}`, `JOIN {code,name}`, `RESUME {code,token}`, `READY`, `INPUT {direction:-1|0|1,seq?}`, `POINTER {y:0..720,seq?}`, `REMATCH`, `LEAVE`, `PING {time}`.

Server messages: `ROOM {code,mode,boss?,players,side,token,paused}`, `STATE {state,paused,inputAck}`, `ERROR {message}`, `PONG {time}`. Gameplay events (`paddle`, `wall`, `goal`, `serve`, `win`) travel inside the authoritative snapshot's bounded event history. React receives HUD updates at approximately 10 Hz; Phaser interpolates snapshots for display. The client predicts its own paddle at 60 Hz using the same movement helper as the server. Input commands carry monotonically increasing per-client sequence numbers; snapshots acknowledge the latest command applied for each seat. Reconciliation starts from the official position and replays only unacknowledged commands. Pending history is bounded and resets on pause or rematch. Ball and opponent remain interpolated approximately one snapshot behind authority. No fixed latency is promised.

Players send keyboard directions or mouse targets only. A mouse target is a desired vertical coordinate, never a direct position update: the server moves only the authenticated player’s paddle toward that target at the bounded mouse speed (1100 logical px/s; keyboard 580 px/s) and clamps it inside the court. Keyboard input clears the mouse target; disconnect/resume clears both controls. Active clients send one numbered direction or mouse target per prediction tick, at most 60 times per second, within the existing 160-command limit. The server rejects unknown message types, malformed JSON, out-of-range directions, invalid room codes and invalid sessions. It cannot accept a client-supplied score. The room code is an invitation, not a reconnection credential. A 24-byte cryptographic token reserves a seat during disconnection. Tokens are private per-player and stored only in that tab's session storage. Reconnect pauses the simulation until both players return. After the grace period the remaining player wins by forfeit. Rematches require both players' agreement. Rooms are in memory; idle waiting rooms expire after 15 minutes. Boss raids extend the seat model to four players; raid-specific disconnect behavior is described below.

WebSockets are capped at 2048 bytes per message, 160 commands/second per connection, 200 concurrent connections and 100 rooms. Ping/pong probes remove dead sockets. Buffered outbound data is bounded. Default Origin checks compare the page origin to the HTTP Host; an explicit allowed-origin list supports reverse proxies. Public deployment still needs proxy-level connection/IP rate limiting for resistance to distributed abuse. The app serves only `dist`, never the repository root.

## Lifecycle

Production and development use the same HTTP server and `/ws` route. Vite middleware is development-only. Process shutdown terminates owned sockets and closes the server. Browser listeners and Phaser resources are removed on leaving a match. Online matches pause only for disconnections, not a player's UI settings. Local settings navigation preserves game state.

## Additional rulesets

`shared/modes.ts` centralizes mode metadata, acceleration, dynamic paddle height, pulse timing and gravity-well position. Pulse awards two goal points in its 2-second active window per 8 seconds of active simulation time, preserving the absolute 15-point cap. Gravity rotates the ball velocity toward a moving vertical attractor, preserving speed and a minimum horizontal component. Shrink uses the rally count to reduce paddle heights; rendering, collisions, movement bounds and prediction all read the same height helper. Goal resets the rally and restores paddle size.

Power transitions emit sequenced authoritative `power` events that trigger pooled shockwaves, sparks and a distinct synthesized tone. Mode-specific Phaser overlays respect graphics intensity and reduced motion. React displays the active rule, power countdown or current paddle size. Room metadata communicates the host's mode before readiness; the server preserves it for rematches.

## Cursor capture

An intentional primary click on the Phaser canvas requests the browser Pointer Lock API in AI/network play. When captured, document-level mouse movement supplies relative `movementY` scaled to the logical court; absolute pointer events are ignored to avoid applying motion twice. Capture starts from the current local/predicted paddle position, and relative targets clamp to the current paddle bounds, including Shrink. The simulation, numbered input protocol and reconciliation are unchanged.

Escape releases the lock. Pointer-lock changes clear pending movement intentions. Paused/disconnected/finished states, window blur and component cleanup also release only this arena's lock. Listeners are removed on cleanup. Synchronous API errors, rejected promises and pointer-lock error events show a nonblocking fallback message. Capture is never requested automatically or in same-computer two-player mode.

## Boss Battle

`shared/bosses.ts` defines three original bosses and lane geometry; `shared/boss.ts` owns their deterministic encounter simulation. `State.boss` adds party hearts, boss/max HP, phase, attack cooldown/wave counters, telegraphs, bounded-lifetime projectiles and encounter statistics. Local solo play and the server call the same substepped simulation. Reflected projectiles target the boss; no client command can set health, spawn attacks or decide damage.

Boss raids support one local solo player or 2–4 network players. A room has four waiting slots, then compacts joined seats when everybody is ready. Each phase health pool scales by a factor of 1 + 0.65 × (party size − 1), rounded up. Each player moves within a separate vertical lane; shared lane bounds are used by simulation, pointer lock, prediction and rendering. Only the projectile's targeted player can reflect it. Eliminated players spectate, and all losing hearts causes defeat. Boss death causes shared victory. There are five separately authored health-gated stages. Breaking a phase clears warnings and projectiles, advances exactly one stage, heals surviving allies by one heart and begins a 3.2-second safe transition. Phase-local HP prevents in-flight hits from skipping stages; global HP is the total remaining across phases. Solo volleys have sufficient spacing for the bounded movement speed.

Disconnect pauses the raid during the grace period. After expiry the missing seat is eliminated and the remaining party continues. Rematches compact the remaining players and create a fresh scaled encounter with the same boss. Duel rooms retain two-player rules. The first network snapshot seeds the React HUD before Phaser starts, avoiding a transient duel HUD during raid reconnection.

`client/src/boss-render.ts` draws original geometric monsters, shields, colored lanes, warning paths and projectiles using Phaser. BossMenu and BossHUD provide boss selection, health, phases and party status. Boss hit/phase/player damage events use the existing bounded effect pool and synthesized audio. No external artwork or Roblox assets are used.

Ricochet uses a moving circular bumper and normal reflection, with minimum horizontal velocity and depenetration. Blitz changes serve speed, goal countdown and the victory target to five without a deuce rule.

## Five-phase boss pacing

Each BossPhase contains a name, readable tactic, hit budget, targeting pattern, rounds per ally, cadence, speed offset, telegraph, curve and optional midair hold. Attack scheduling rotates through authored aimed, sweeping, mirrored, feint, suspended, lava-gap and finale patterns. Hollow decoy warnings never spawn projectiles; lava gap warnings resolve against the authoritative shield position and do not count as reflectable orbs. Suspended projectiles hold once at the center and then resume, including under substeps.

Attack volume scales with living players; phase health scales more slowly than party size. Each player's repeated shots are separated by 0.85 seconds and each phase transition is an explicit recovery interval. Surviving players gain one heart up to the cap, with no revival of eliminated slots. The renderer and HUD show the next tactic, five-stage progression, phase HP and recovery countdown. All encounter progression is server-owned and shared with the solo simulation.
