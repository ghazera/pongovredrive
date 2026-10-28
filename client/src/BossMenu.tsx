import { BOSSES, bossIds, type BossId } from "../../shared/bosses";
export function BossIcon({ id }: { id: BossId }) {
  const color = BOSSES[id].color;
  return (
    <svg viewBox="0 0 160 140" aria-hidden="true" className="boss-icon">
      <circle
        cx="80"
        cy="70"
        r="55"
        fill="#11192b"
        stroke={color}
        strokeWidth="3"
      />
      {id === "voltmaw" ? (
        <>
          <path d="M35 40 20 5 65 20M125 40 140 5 95 20" fill={color} />
          <path d="m45 53 25 8-12 13m57-21-25 8 12 13" fill={color} />
          <path d="m58 90 22 21 22-21" fill={color} />
        </>
      ) : id === "watcher" ? (
        <>
          <path
            d="M12 70h20m96 0h20M80 2v16M80 122v16"
            stroke={color}
            strokeWidth="5"
          />
          <ellipse cx="80" cy="70" rx="38" ry="22" fill="#e4cfff" />
          <ellipse cx="80" cy="70" rx="11" ry="22" fill={color} />
          <ellipse cx="80" cy="70" rx="5" ry="16" fill="#050816" />
        </>
      ) : (
        <>
          <path d="m40 28 14-25 17 25m49 0L106 3 89 28" fill={color} />
          <path d="M45 57h24m22 0h24" stroke={color} strokeWidth="8" />
          <path d="M61 93h38" stroke={color} strokeWidth="12" />
          <path
            d="m80 25-8 17 10 16"
            fill="none"
            stroke={color}
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  );
}
export default function BossMenu({
  boss,
  onBoss,
  onSolo,
  onCoop,
  onBack,
}: {
  boss: BossId;
  onBoss: (id: BossId) => void;
  onSolo: () => void;
  onCoop: () => void;
  onBack: () => void;
}) {
  return (
    <main id="main-content" className="panel boss-menu">
      <p className="eyebrow">THE GRID HAS AWAKENED</p>
      <h2>Hunt the impossible.</h2>
      <p>
        Catch the monster’s orbs with your shield to reflect them. Protect your
        lane, break its heart.
      </p>
      <div className="boss-cards">
        {bossIds.map((id) => (
          <button
            key={id}
            aria-label={BOSSES[id].name}
            aria-pressed={id === boss}
            className={id === boss ? "selected" : ""}
            style={{ borderColor: id === boss ? BOSSES[id].color : undefined }}
            onClick={() => onBoss(id)}
          >
            <BossIcon id={id} />
            <small>{BOSSES[id].subtitle}</small>
            <strong>{BOSSES[id].name}</strong>
            <p>{BOSSES[id].description}</p>
            <span>
              3 PHASES ·{" "}
              {BOSSES[id].damage === 2 ? "HEAVY DAMAGE" : "PATTERN ATTACKS"}
            </span>
          </button>
        ))}
      </div>
      <div className="raid-actions">
        <button className="primary" onClick={onSolo}>
          PLAY SOLO
        </button>
        <button onClick={onCoop}>CO-OP RAID · 2–4 PLAYERS</button>
        <button onClick={onBack}>BACK</button>
      </div>
      <p className="subtle">
        Mouse or W/S to move. Click the arena to lock the cursor; Escape
        releases it. Each friend protects their own colored lane.
      </p>
    </main>
  );
}
