# Architecture

## Simulation

`shared/game.ts` owns a 1280 × 720 logical court. The server advances an accumulator at 60 Hz and publishes snapshots every third tick (20 Hz). Local play uses a frame accumulator with the same 1/60-second steps. Resizing changes only display scale. Small bounded movement substeps prevent tunneling at the configured 1250 px/s speed limit. Paddle impact offset and movement set a capped bounce angle; a minimum angle avoids indefinitely flat rallies. Scoring, countdown and victory are independent of visual effects.

State includes scores, countdown, elapsed time, rally and longest rally, a winner and a bounded event history. Events carry a monotonically increasing sequence number. Clients process each sequence once; a rematch resets the event epoch. Rings, particles, trails and camera shake cannot affect the simulation. Sparks and shockwaves use bounded pools. Reduced motion disables particle bursts, trails and shake; low graphics reduces glow and trail length.

AI predicts wall reflections, refreshes its target at a difficulty-specific reaction interval and moves within speed and position limits. Its deterministic time-varying aim error gives each difficulty a different level of precision.

## Wire protocol

Client messages: `CREATE {name,mode?}`, `JOIN {code,name}`, `RESUME {code,token}`, `READY`, `INPUT {direction:-1|0|1}`, `POINTER {y:0..720}`, `REMATCH`, `LEAVE`, `PING {time}`.

Server messages: `ROOM {code,players,side,token,paused}`, `STATE {state,paused}`, `ERROR {message}`, `PONG {time}`. Gameplay events (`paddle`, `wall`, `goal`, `serve`, `win`) travel inside the authoritative snapshot's bounded event history. React receives HUD updates at approximately 10 Hz; Phaser interpolates snapshots for display. Remote paddle prediction is intentionally omitted to avoid corrections under jitter; visual state is approximately one snapshot behind the authority. No fixed latency is promised.

Players send keyboard directions or mouse targets only. A mouse target is a desired vertical coordinate, never a direct position update: the server moves only the authenticated player’s paddle toward that target at the normal maximum speed and clamps it inside the court. Keyboard input clears the mouse target; disconnect/resume clears both controls. Clients send changing mouse targets at most 30 times per second. The server rejects unknown message types, malformed JSON, out-of-range directions, invalid room codes and invalid sessions. It cannot accept a client-supplied score. The room code is an invitation, not a reconnection credential. A 24-byte cryptographic token reserves a seat during disconnection. Tokens are private per-player and stored only in that tab's session storage. Reconnect pauses the simulation until both players return. After the grace period the remaining player wins by forfeit. Rematches require both players' agreement. Rooms are in memory; idle waiting rooms expire after 15 minutes.

WebSockets are capped at 2048 bytes per message, 160 commands/second per connection, 200 concurrent connections and 100 rooms. Ping/pong probes remove dead sockets. Buffered outbound data is bounded. Default Origin checks compare the page origin to the HTTP Host; an explicit allowed-origin list supports reverse proxies. Public deployment still needs proxy-level connection/IP rate limiting for resistance to distributed abuse. The app serves only `dist`, never the repository root.

## Lifecycle

Production and development use the same HTTP server and `/ws` route. Vite middleware is development-only. Process shutdown terminates owned sockets and closes the server. Browser listeners and Phaser resources are removed on leaving a match. Online matches pause only for disconnections, not a player's UI settings. Local settings navigation preserves game state.
