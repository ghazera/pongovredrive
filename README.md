# NEON PONG: OVERDRIVE

An original neon arcade game built with strict TypeScript, Phaser 3, React, Vite, Express and `ws`. Local and online play share the same fixed-step simulation. No account, database, external artwork or audio downloads required.

## Start playing

Node.js 22.13+ on the 22.x LTS line, or Node.js 24+, and npm are required (validated with Node 24).

```sh
npm install
npm run dev
```

Open the server on port **3000**. Development serves Vite and WebSockets from the same port. `npm run dev:server` adds backend watching; `npm run dev:client` is an optional standalone Vite UI server for frontend-only work, not the multiplayer entry point.

For local production:

```sh
npm run build
npm start
```

Both frontend and `/ws` are served on port 3000. Run commands from the repository root. The server defaults to `HOST=0.0.0.0`; set `HOST=127.0.0.1` to restrict access to this machine. `PORT`, `HOST`, `GRACE_MS` and `ALLOWED_ORIGINS` can be set using your shell; `.env.example` documents them. `.env` is not automatically loaded.

## Play modes

- **Local 2 Players**: left paddle **W/S**, right paddle **↑/↓**. Both players can move simultaneously. Pause and resume using the buttons.
- **Quick Play**: start immediately against Normal AI in the selected duel ruleset (or the selected solo boss when Boss Raid is selected).
- **Play vs AI**: Easy, Normal, Hard or Insane; speed, reaction time, prediction error and wall anticipation vary. AI movement obeys paddle bounds. In AI matches, move the mouse up/down inside the arena to steer your paddle, or use W/S.
- **Online / LAN**: enter a name, create a room, share the six-character code or invitation link. A second player joins; both press **Ready**. Each client controls its assigned paddle with the mouse inside the arena, W/S or ↑/↓. Mouse control follows the vertical cursor position at 1100 logical pixels/second, including for the right-hand player. Your paddle is predicted locally and reconciled with server acknowledgments, while the ball and opponent stay authoritative. Keyboard movement remains 580 pixels/second. Both players must accept **Rematch** after the result.
- **Classic**: first to 7, win by 2, absolute cap at 15. **Overdrive** raises ball acceleration.
- **Pulse**: an amber energy gate marks a double-points window during seconds 6–8 of every 8 seconds of active play. Goals in that window award 2 points, capped at 15. Watch the countdown in the match banner.
- **Gravity**: a moving violet gravity well bends the ball's path while preserving its speed and a playable horizontal component. Its orbit shows where the pull is strongest.
- **Shrink**: every 2 paddle hits reduce both paddle heights by 8 pixels, down to 52 pixels. Each goal restores the full 108-pixel height. Green brackets and the banner show the current size.

- **Ricochet**: a moving central bumper reflects the ball. Serves start outside the obstacle; watch for changes in direction.
- **Blitz**: faster initial serves, shorter breaks after goals, first to **5 points** without a two-point lead.
- **Boss Raid**: choose one of three monsters and play solo or in **2–4 player co-op**. Each player guards a colored lane, catches orbs to send them back and has 5 hearts. Each boss changes attacks across 3 phases. Boss health scales with party size. See [Boss Battle guide](docs/boss-battle.md).

All seven duel rulesets work locally, against AI and over the same LAN/online backend. Choose one on the home screen or in the host section of Online / LAN before creating the room. Guests see the host's mode automatically; rematches retain it. The win-by-two rule and 15-point cap apply to duels except Blitz. Boss Raid uses boss/player health instead of a points target.

**Click inside the arena to capture the mouse** in AI and online/LAN matches. The cursor is hidden and relative movement steers the paddle, so it cannot leave the arena or hit a desktop edge. **Press Escape to release it**; click the arena again to recapture. A small hint shows the capture state. Pause, disconnection, window blur, match end and leaving the arena release capture automatically. Browser permission/policy may deny pointer lock; in that case the normal hover mouse controls and keyboard remain available with an inline notice. No fullscreen is required.

Before capture (or if unavailable), moving the mouse out of the arena stops mouse movement. Press a movement key to return to keyboard control. Mouse movement and cursor capture are disabled in same-computer two-player mode.

Master/effects/music volumes, mute, effects strength, camera shake, particles, graphics quality, colors, ping and reduced motion are saved on the device. Music is an optional quiet synthesized drone. Audio starts only after interaction. Keyboard remapping, touch and gamepad input are not included.

## Boss Battle — solo or with friends

1. Click **BOSS BATTLE** on the home screen.
2. Choose **Voltmaw**, **Void Watcher** or **Ember Colossus**.
3. Use **PLAY SOLO**, or **CO-OP RAID · 2–4 PLAYERS** to create an online room.
4. For co-op, share the invite link and wait for your friends to join before everyone presses **Ready**. The raid starts when all joined players are ready, with a minimum of two.
5. Catch incoming orbs with your shield to reflect them into the boss. Warnings mark incoming paths. Guard your own lane; other players cannot reflect your targeted orbs.
6. Losing all hearts eliminates you until the next raid; watch your surviving allies. Everyone still connected votes **Rematch** after victory or defeat.

Use the same LAN or Cloudflare URL as normal multiplayer. No additional port or service is required. Party size and boss selection are fixed once the fight starts; create a new room to change them. Reconnecting retains your seat and health for the 30-second grace period. If a disconnected player's grace expires, they are eliminated and the remaining team can continue. Boss health is not reduced when an ally leaves.

## LAN

Run the production server on the host computer. Allow inbound TCP port 3000 in its firewall, restricted to trusted networks. Both computers must be on the same LAN. On the other computer, open `http://HOST_LAN_IP:3000`, then create/join a room. No different backend is needed. Avoid exposing the port directly to the Internet.

## Cloudflare Tunnel

1. Install `cloudflared` following [Cloudflare's official instructions](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Run `npm run build` then `npm start`.
3. In another terminal run:

   ```sh
   cloudflared tunnel --url http://localhost:3000
   ```

4. Open the generated HTTPS URL, create a room, then share **Copy invite link** with your friend. Keep both server and tunnel running.
5. Your friend opens the link, enters a name and joins. Both press Ready.

The browser derives `/ws` from the page origin, choosing `wss:` for HTTPS automatically. No browser connection uses a hard-coded localhost address. A Quick Tunnel is temporary and may have usage limits. For a stable domain, use a [named tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/) with a public hostname pointing to `http://localhost:3000`. Keep WebSockets enabled. Tunnels do not eliminate latency.

**Troubleshooting:** a 502 usually means the local server stopped, the port is wrong or the tunnel cannot reach it. Check `/api/health` on the host first. For WebSocket issues, inspect the browser Network panel for `/ws` and a 101 upgrade, check that HTTPS uses `wss`, and check the Origin/Host headers passed by your proxy. By default WebSockets require the page origin to match the HTTP Host; set a comma-separated `ALLOWED_ORIGINS` list if your reverse proxy changes Host. A disconnected seat is retained for 30 seconds (configurable with `GRACE_MS`); reload the same tab to resume with its stored token. Closing the tab loses its session token. A server restart loses in-memory rooms.

Real external LAN and Cloudflare Tunnel sessions have **not** been validated in this cloud machine. Two independent browser contexts and native WebSocket clients are tested locally.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If a supported Chromium is already installed, set `CHROMIUM_PATH` to its executable path instead of downloading a browser. In this cloud environment:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

`npm run test:network` runs the WebSocket integration tests. Browser tests start the application automatically and save screenshots under ignored `test-results/`. Do not run multiple Playwright commands simultaneously on the same port. The full-match test deliberately plays a complete real-time game and takes longer than the menu tests. See [verification notes](docs/verification.md) for exact evidence and limitations.

## Layout

```text
client/src/   React menus, Phaser arena, pooled effects, audio, settings, network client
server/       HTTP entry point, authoritative rooms, reconnect and heartbeat
shared/       duel physics, boss encounters, mode definitions and typed protocol
tests/        unit, WebSocket integration and Chromium end-to-end tests
docs/         architecture, verification and skills provenance
```

See [architecture](docs/architecture.md) and [skills consulted](docs/skills.md). Phaser is loaded lazily when entering a match; its engine bundle remains larger than Vite's default 500 kB warning threshold. No third-party runtime CDN is needed.
