# Boss Battle

A cooperative arcade encounter built around the Pong shield: intercept a hostile orb in your lane to reflect it into the monster. No separate attack key is needed. Each party member has a personal shield and five hearts; orbs targeted at another lane cannot be reflected by you.

| Boss | Identity | Attack progression | Base HP | Damage per miss |
| --- | --- | --- | --- | --- |
| Voltmaw | Electric horned beast | Charged bolt → twin arc → storm barrage | 12 | 1 heart |
| Void Watcher | Floating cyclops | Seeking eye → twin drift → void swarm; orbs curve inside their lane | 14 | 1 heart |
| Ember Colossus | Lava golem | Molten shot → furnace volley → meteor barrage; heavy projectiles | 10 | 2 hearts |

Each additional party member adds 6 boss HP. Phases change at 2/3 and 1/3 remaining health. Later phases send more projectiles and increase speed; warning timing and solo volley spacing keep the pattern readable. Health never depends on rendering or effects.

To move, use W/S, the mouse, or arrow keys in network play. Click the arena for cursor lock and relative movement; Escape releases it. Your shield stays within its assigned lane. The renderer marks incoming paths before each launch. Catch an orb to return fire automatically. A reflected hit removes one boss HP. A miss removes your hearts, never an ally's. When eliminated, you spectate until a new raid. Surviving allies can still defeat the boss.

Use Boss Battle on the home screen to select a monster. Play Solo runs locally. Co-op Raid creates a shared room for 2–4 players, accessible through the same LAN address or Cloudflare Tunnel as duels. Invite everyone before pressing Ready; all joined players must be ready. Late joining during a fight is disabled. All remaining connected players vote for a rematch, which restores health, phases and attack counters.

An accidental disconnect pauses the encounter and reserves the player's token/health for the configured grace period (30 seconds by default). After expiry the missing player is eliminated and the party resumes with the existing boss HP. Restarting the server loses in-memory rooms.

The bosses, sounds and vector graphics are original. This is a 2D cooperative shield/parry mode within Neon Pong; it does not reproduce Roblox maps, assets or character movement.
