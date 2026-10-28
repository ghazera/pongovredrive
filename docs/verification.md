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

## Mouse controls follow-up

Mouse control is enabled against AI and in network matches, and disabled in same-computer two-player mode. The shared simulation moves toward the mouse target at the existing paddle speed, stops precisely at the target and clamps inside the court. Network targets are validated and apply only to the sender's assigned paddle; keyboard input and disconnect clear them. Browser coordinates scale to the logical court after resizing. Leaving the arena stops mouse movement.

Fresh checks for this change:

- `npm test`: **21 passed**, including target following, no teleportation/overshoot, court bounds, invalid targets, network seat isolation and switching back to keyboard input.
- `npm run build`, `npm run typecheck` and `npm run lint`: passed.
- `E2E_PRODUCTION=1 CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`: **6 passed**, including mouse movement against AI, resized rendering, mouse leave, keyboard handoff, same-computer mode exclusion, independent network players, and the full local victory/rematch flow.

The first visual mouse test helper clipped a canvas extending below the viewport and required a full-element capture. The same-computer assertion was adjusted to allow one screen pixel of rasterization rounding. The complete suite passed after correcting those measurement issues. LAN between physical machines and a public Cloudflare tunnel remain untested.

## Additional multiplayer modes and faster mouse response

Added Pulse, Gravity and Shrink alongside Classic and Overdrive. Host selection is shared with guests before readiness and preserved by rematches. Mode-specific court effects, sequenced power bursts, a distinct synthesized power tone and a match banner communicate the rules. Home, Pulse, Gravity and Shrink screenshots were inspected in Chromium.

Mouse movement now uses a bounded 1100 logical px/s speed, compared with the previous 580 px/s. Keyboard speed remains 580 px/s. Network clients predict only their own paddle at 60 Hz and reconcile from authoritative positions plus unacknowledged numbered input commands. Ball, collisions, score and opponent remain authoritative. A bounded prediction history resets when paused or starting another match.

The browser prediction test deliberately withholds inbound STATE messages while allowing input to reach the server; the rendered local paddle still follows the mouse, and converges after snapshots resume. This demonstrates removal of snapshot-dependent local visual response, not a fixed end-to-end latency guarantee. The test allows the software renderer time to capture the complete arena; no claim of a measured millisecond input latency is made. Real public Cloudflare/LAN ingress and hardware performance remain unverified.

Final verification for this change: **37 unit/network tests passed** (including long finite-state runs for all five modes and prediction replay/reset cases), **10 production Chromium journeys passed** (including all three new multiplayer modes, withheld snapshots and the complete victory/rematch flow). TypeScript, ESLint and the production build passed. Vite retains its existing advisory about the lazy Phaser engine chunk size. No new runtime dependency was added.

## Pointer-lock follow-up

Primary clicks on the arena capture the cursor for AI and network matches. Relative vertical movement continues even beyond the former viewport/arena limits; Escape releases capture. Pause, window blur, disconnection/finished state and leaving the arena also release this canvas's lock. Same-computer mode remains keyboard-only. A rejected browser request leaves hover-mouse and keyboard controls available with an inline notice.

The new Chromium test failed first because clicking did not capture the cursor. After implementation, five pointer-lock journeys passed: AI relative movement in both directions past the viewport limits with Escape/pause/blur release, independent locking and authoritative movement for both network seats, no capture in same-computer mode, a simulated NotAllowedError with working keyboard fallback, and leaving a captured arena. These use the real Pointer Lock API except for the deliberately rejected-request test. Together with the existing menu and mouse journeys, **10 selected production Chromium tests passed**. The unchanged physics/network suite also passed: **37 tests**. Build, TypeScript and ESLint passed. The longer mode/victory browser suites were not repeated for this client input/lifecycle change; earlier results remain recorded above. Browser-specific behavior outside the tested desktop Chromium environment remains unverified.
