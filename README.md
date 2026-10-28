# NEON PONG: OVERDRIVE

An original neon arcade game built with strict TypeScript, Phaser 3, React, Vite, Express and `ws`. Local and online play share the same fixed-step simulation. No account, database, external artwork or audio downloads required.

## Start playing

Node.js 22 or newer and npm are required (validated with Node 24).

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
- **Quick Play**: start immediately against Normal AI.
- **Play vs AI**: Easy, Normal, Hard or Insane; speed, reaction time, prediction error and wall anticipation vary. AI movement obeys paddle bounds.
- **Online / LAN**: enter a name, create a room, share the six-character code or invitation link. A second player joins; both press **Ready**. Each client controls its assigned paddle with W/S or ↑/↓. Both players must accept **Rematch** after the result.
- **Classic**: first to 7, win by 2, absolute cap at 15. **Overdrive** raises ball acceleration. Chaos and other bonus modes are not included.

Master/effects/music volumes, mute, effects strength, camera shake, particles, graphics quality, colors, ping and reduced motion are saved on the device. Music is an optional quiet synthesized drone. Audio starts only after interaction. Keyboard remapping, touch and gamepad input are not included.

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
shared/       physics, rules, typed protocol and input validation
tests/        unit, WebSocket integration and Chromium end-to-end tests
docs/         architecture, verification and skills provenance
```

See [architecture](docs/architecture.md) and [skills consulted](docs/skills.md). Phaser is loaded lazily when entering a match; its engine bundle remains larger than Vite's default 500 kB warning threshold. No third-party runtime CDN is needed.
