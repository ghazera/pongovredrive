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
            PHASE {b.phase} / {cfg.phases.length} ·{" "}
            {cfg.phases[b.phase - 1].name}
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
        <div className="boss-phase-track" aria-label="Phase progression">
          {cfg.phases.map((p, i) => (
            <span
              key={p.name}
              className={
                i + 1 < b.phase ? "cleared" : i + 1 === b.phase ? "active" : ""
              }
              title={p.name}
            >
              {i + 1 < b.phase ? "✓" : i + 1}
            </span>
          ))}
        </div>
        <div className="boss-phase-health">
          <span>PHASE SHIELD</span>
          <strong data-testid="boss-phase-health">
            {b.phaseHp} / {b.phaseMaxHp}
          </strong>
          <div>
            <i
              style={{
                width: `${(b.phaseHp / b.phaseMaxHp) * 100}%`,
                background: cfg.color,
              }}
            />
          </div>
        </div>
        <p className="boss-tactic">{cfg.phases[b.phase - 1].tactic}</p>
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
            : b.transition > 0
              ? `PHASE ${b.phase} · REFORMATION ${b.transition.toFixed(1)}s · +1 HEART TO SURVIVING ALLIES`
              : b.warnings.some((w) => w.kind === "blast")
                ? "LAVA WAVE · MOVE INTO THE GREEN SAFE GAP"
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
