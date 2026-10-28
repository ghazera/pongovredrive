import type { State } from "../../shared/game";
import { BOSSES } from "../../shared/bosses";
export default function BossHUD({
  state,
  names,
  side,
}: {
  state: State;
  names: string[];
  side: number;
}) {
  const b = state.boss!;
  const cfg = BOSSES[b.id];
  return (
    <div className="boss-hud">
      <div className="boss-health">
        <div>
          <span>{cfg.subtitle}</span>
          <strong>{cfg.name}</strong>
          <b>
            PHASE {b.phase} / 3 · {cfg.phases[b.phase - 1]}
          </b>
        </div>
        <div
          className="boss-hp-track"
          role="progressbar"
          aria-label="Boss health"
          aria-valuenow={b.hp}
          aria-valuemin={0}
          aria-valuemax={b.maxHp}
        >
          <i
            style={{
              width: `${(b.hp / b.maxHp) * 100}%`,
              background: cfg.color,
            }}
          />
        </div>
        <small data-testid="boss-health">
          {b.hp} / {b.maxHp} HP
        </small>
      </div>
      <div className="raid-cue" role="status">
        {state.phase === "countdown"
          ? `GET READY · ${Math.ceil(Math.max(0, state.timer))}`
          : state.phase === "finished"
            ? state.winner === 0
              ? "BOSS DEFEATED"
              : "RAID ENDED"
            : b.warnings.length
              ? `INCOMING · ${Math.min(...b.warnings.map((w) => w.timer)).toFixed(1)}s · FOLLOW THE MARKED LANE`
              : "INTERCEPT THE ORBS · RETURN FIRE"}
      </div>
      <div className="raid-party">
        {b.players.map((hp, i) => (
          <div
            key={i}
            className={hp <= 0 ? "down" : ""}
            style={{
              borderColor: ["#00e5ff", "#ff3d9a", "#5bffb0", "#b68cff"][i],
            }}
          >
            <strong>
              {names[i] || `Player ${i + 1}`} {i === side ? "(YOU)" : ""}
            </strong>
            <span>{hp > 0 ? "♥".repeat(hp) : "ELIMINATED"}</span>
            <small>LANE {i + 1}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
