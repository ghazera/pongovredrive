import { MODES, modeKeys, type Mode } from "../../shared/modes";
export default function ModePicker({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="mode-picker">
      <div className="mode-buttons" aria-label="Game mode">
        {modeKeys.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={mode === key}
            className={mode === key ? "selected" : ""}
            onClick={() => onChange(key)}
          >
            {MODES[key].title}
            {!["classic", "overdrive"].includes(key) && <small>NEW</small>}
          </button>
        ))}
      </div>
      <p style={{ borderColor: MODES[mode].color }}>
        {MODES[mode].description}
      </p>
    </div>
  );
}
