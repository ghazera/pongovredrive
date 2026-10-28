# Boss Battle

Intercept hostile orbs with the Pong shield and reflect them into the monster. Every player protects their own colored lane and starts with five hearts. Projectiles aimed at another lane cannot be parried by you.

Each boss now has **five authored phases**, each with its own health budget and tactic. On a phase clear, all old attacks disappear, surviving allies recover one heart, and a **3.2-second safe transition** introduces the next attack. Eliminated allies are not revived. A volley already in flight cannot skip a whole stage.

| Boss | Five phases | Mechanics | Solo total HP |
| --- | --- | --- | --- |
| Voltmaw | Charged awakening → Arc procession → Polarity shift → Ghost circuit → Tempest crown | Aimed bolts, sweeping pairs, polarity drift, hollow decoys, final paired storm | 70 |
| Void Watcher | The opening eye → Mirror choir → Orbital fracture → Suspended horizon → The unblinking night | Curving orbs, mirror decoys, orbital sweeps, suspended shots, paired void assault | 68 |
| Ember Colossus | Furnace ignition → Shattered mantle → Lava breathing → Hanging embers → Heart of catastrophe | Heavy shots, ordered fragments, safe-gap lava waves, suspended meteors, final paired barrage | 66 |

The Colossus's normal projectiles deal two hearts per miss; other normal projectiles and lava waves deal one. Each phase health pool is multiplied by `1 + 0.65 × (party size − 1)` and rounded up, while attacks rotate across the living party. Health remains at its original party scale if an ally leaves.

Read the warning shapes:

- **Solid path + arrow:** a real projectile will launch. Move the shield to catch it.
- **Hollow circle + faint broken line:** a decoy. It disappears without firing or damaging anyone.
- **Red lane with a green gap:** a lava wave. Put the shield inside the green gap before the warning expires; it is avoided, not parried.
- **A projectile surrounded by a hold ring:** it is temporarily suspended and will continue along its path. Track it rather than leaving the lane prematurely.

The HUD shows phase HP, five progression markers, the current tactic and recovery/attack cues. The menu previews every phase before starting. Mouse control, cursor lock (click to capture, Escape to release), W/S and network arrow keys continue to work.

## Pacing evidence

These durations are simulated combat time for a legal target-following defender that successfully completes the fight. They include recovery transitions and exclude the initial countdown. Human performance and network conditions vary.

| Boss | Solo | Four players |
| --- | --- | --- |
| Voltmaw | about 3 min 33 s | about 2 min 49 s |
| Void Watcher | about 3 min 41 s | about 2 min 55 s |
| Ember Colossus | about 4 min 14 s | about 3 min 22 s |

Regression tests require successful solo clears to last at least 180 simulated seconds and four-player clears at least 150 seconds. These are checks against accidentally shortening the design, not invulnerability timers: each stage ends when its health pool is depleted.

## Solo and cooperative play

Use Boss Battle on the home screen to select a monster. Play Solo runs locally. Co-op Raid creates a shared room for 2–4 players through the same LAN or Cloudflare address as duels. Invite everyone before pressing Ready. Late joining during a fight is disabled. All remaining connected players vote for a fresh raid, which resets all phase health, hearts and attack counters.

Losing all hearts eliminates a player until the next raid. Surviving allies can still win. An accidental disconnect pauses the encounter for the configured reconnect grace (30 seconds by default). After expiry the missing seat is eliminated and the party resumes. A server restart loses in-memory rooms.

The monsters, vector graphics and sounds are original. This is a 2D cooperative shield/parry mode within Neon Pong.
