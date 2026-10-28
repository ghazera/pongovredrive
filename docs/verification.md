# Verification evidence — 2026-10-28

Validated in the managed Linux cloud environment with Node 24.19.0, npm 11.9.0 and system Chromium 154.0.8037.57. These results describe this machine, not restoration into a new cloud task.

| Check | Actual outcome |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed; 242 packages installed from the lockfile |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | **17 passed**, 0 failed, in about 38 seconds |
| `npm run build` | Passed; Phaser's lazy engine chunk emits Vite's large-chunk advisory |
| Chromium E2E on the production build | **3 passed**, 0 failed, about 1 minute 40 seconds |
| Production `/api/health` | `ok: true`, tick rate 60, snapshot rate 20 |

Production browser command:

```sh
E2E_PRODUCTION=1 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

The first two browser journeys also passed against the Vite development server. Tests exercised menus, settings, simultaneous keys, pause/resume, leaving, AI startup, two independent browser contexts creating/joining a room, readiness, identical score displays and a tab reload/reconnection. A complete unattended local match reached victory, produced a screenshot and restarted at 0–0 after Rematch. The local browser journey checked JavaScript page errors and found none. Visual captures of home, arena, network and victory are generated under ignored `test-results/` and were inspected.

Unit tests cover walls, paddles, angle variation, maximum speed, tunneling, scores, resets, win-by-two and the hard score cap, countdown, finite state, movement bounds, equivalent time subdivisions and event sequencing. Native WebSocket integration tests cover full rooms, seat assignment, malformed inputs, rejection of forged state, authoritative movement, disconnect pause, token reconnection, heartbeat echo, a full network match with identical final scores, two-vote rematch and expiration/forfeit.

Initial failing tests exposed the unimplemented physics and protocol. Browser runs exposed accessible-name selector mismatches, a whitespace mismatch in the score assertion and an overlapping test-server lifecycle; these were corrected and the complete production suite rerun. The final suite has no failing or skipped tests.

## Limitations

- No real two-machine LAN or Cloudflare Tunnel session was executed. Cloudflare instructions and same-origin `ws`/`wss` routing are implemented/documented; public ingress remains unverified.
- No artificial jitter, packet-loss, load/stress or cross-browser suite was run. Chromium software rendering in this machine does not establish a 60 FPS hardware guarantee.
- Synth audio executes after user interaction without browser errors; no subjective audio listening test was performed.
- The Playwright-managed Chromium download was denied by the network policy. The supported `CHROMIUM_PATH` override used the preinstalled browser instead. Download host additions were saved in the configuration draft, not asserted to be applied to this running instance.
- The cloud installation and startup instructions are saved in a draft. Publication and fresh-task restoration must be performed by the user and have not been verified here.
- Optional Chaos, key remapping, touch input, gamepads, tournaments and replays are not included.

## Dependency security follow-up

The npm installation screenshot reported three advisories in the development test toolchain: `vitest`, `@vitest/mocker` and `tinypool`. Upgrading Vitest to 4.1.12 removes the affected Tinypool dependency and installs the corrected mocker. ESLint and its JavaScript configuration were upgraded to supported 10.x releases. The Node engine requirement is now 22.13+ within 22.x, or 24+, matching the tooling requirements.

Fresh checks after this update:

- `npm ci --no-fund`: passed, 223 packages installed.
- `npm audit --json`: zero vulnerabilities at all severity levels.
- `npm run lint` and `npm run build` (including TypeScript): passed.
- `npm test`: 17 passed with Vitest 4.1.12, about 38 seconds.
- `E2E_PRODUCTION=1 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- tests/e2e/game.spec.ts`: both local and two-browser multiplayer journeys passed. The full-length local victory test was not repeated for this dependency-only change; its earlier result above remains the original validation.

No gameplay or server logic was changed. The npm `allow-scripts` notice in the screenshot is a separate local npm approval setting for esbuild's install script; it is not an audit vulnerability. If a local build reports an esbuild installation error, review esbuild with npm's `approve-scripts` command rather than enabling all package scripts globally. No change to that local policy was made here.
