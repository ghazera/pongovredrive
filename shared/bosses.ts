export type AttackPattern =
  "aimed" | "sweep" | "mirror" | "feint" | "pause" | "blast" | "finale";
export type BossPhase = {
  name: string;
  tactic: string;
  hits: number;
  pattern: AttackPattern;
  rounds: number;
  cadence: number;
  speed: number;
  telegraph: number;
  curve: number;
  hold: number;
};
function phase(
  name: string,
  tactic: string,
  hits: number,
  pattern: AttackPattern,
  rounds: number,
  cadence: number,
  speed = 0,
  curve = 0,
  hold = 0,
  telegraph = 1.2,
): BossPhase {
  return {
    name,
    tactic,
    hits,
    pattern,
    rounds,
    cadence,
    speed,
    curve,
    hold,
    telegraph,
  };
}
function boss<
  T extends {
    name: string;
    subtitle: string;
    description: string;
    color: string;
    speed: number;
    damage: number;
    phases: BossPhase[];
  },
>(cfg: T) {
  return { ...cfg, hp: cfg.phases.reduce((sum, p) => sum + p.hits, 0) };
}
export const BOSSES = {
  voltmaw: boss({
    name: "VOLTMAW",
    subtitle: "The storm beast",
    description:
      "Five storm rituals: charged bolts, sweeping arcs, polarity and ghost signals.",
    color: "#ffd166",
    speed: 540,
    damage: 1,
    phases: [
      phase(
        "Charged awakening",
        "Read the amber line, then intercept the charged bolt.",
        12,
        "aimed",
        1,
        3.2,
      ),
      phase(
        "Arc procession",
        "Two sweeping bolts cross your lane. Follow their order.",
        14,
        "sweep",
        2,
        3.8,
        40,
      ),
      phase(
        "Polarity shift",
        "Charged orbs drift between polarities. Track the final approach.",
        14,
        "mirror",
        1,
        3.1,
        70,
        90,
      ),
      phase(
        "Ghost circuit",
        "Hollow circles are decoys. Guard the solid warning line.",
        14,
        "feint",
        1,
        3.8,
        100,
      ),
      phase(
        "Tempest crown",
        "Paired storm bolts alternate high and low. Stay composed.",
        16,
        "finale",
        2,
        4.8,
        150,
        35,
      ),
    ],
  }),
  watcher: boss({
    name: "VOID WATCHER",
    subtitle: "Eye of the abyss",
    description:
      "Five illusions: drifting orbs, mirror signals, orbiting salvos and suspended time.",
    color: "#b68cff",
    speed: 470,
    damage: 1,
    phases: [
      phase(
        "The opening eye",
        "The void orb drifts. Follow it until the moment of contact.",
        12,
        "aimed",
        1,
        3.2,
        0,
        65,
      ),
      phase(
        "Mirror choir",
        "Ignore hollow mirror signals. Only solid lines launch an orb.",
        14,
        "feint",
        1,
        3.6,
        30,
        75,
      ),
      phase(
        "Orbital fracture",
        "Two orbiting orbs sweep your lane in a readable sequence.",
        12,
        "sweep",
        2,
        4.4,
        60,
        110,
      ),
      phase(
        "Suspended horizon",
        "Orbs freeze at the center, then resume. Do not leave too early.",
        14,
        "pause",
        1,
        3.8,
        90,
        80,
        0.7,
      ),
      phase(
        "The unblinking night",
        "Paired void orbs curve strongly. Watch the actual projectile.",
        16,
        "finale",
        2,
        4.9,
        130,
        125,
      ),
    ],
  }),
  colossus: boss({
    name: "EMBER COLOSSUS",
    subtitle: "Heart of the furnace",
    description:
      "Five furnace cycles: heavy shots, fractures, lava gaps and suspended meteors.",
    color: "#ff8059",
    speed: 430,
    damage: 2,
    phases: [
      phase(
        "Furnace ignition",
        "Heavy molten orbs cost two hearts. Read the long warning.",
        12,
        "aimed",
        1,
        3.5,
        0,
        0,
        0,
        1.4,
      ),
      phase(
        "Shattered mantle",
        "Catch the two heavy fragments in their marked order.",
        14,
        "sweep",
        2,
        4.5,
        40,
        0,
        0,
        1.35,
      ),
      phase(
        "Lava breathing",
        "Alternate shots and lava waves. Stand in the green safe gap.",
        10,
        "blast",
        1,
        3.8,
        50,
        0,
        0,
        1.3,
      ),
      phase(
        "Hanging embers",
        "A meteor hangs in midair before charging. Track its release.",
        14,
        "pause",
        1,
        3.9,
        90,
        0,
        0.65,
        1.3,
      ),
      phase(
        "Heart of catastrophe",
        "A final paired meteor assault. Protect each other to the end.",
        16,
        "finale",
        2,
        5.0,
        150,
        0,
        0,
        1.25,
      ),
    ],
  }),
};
export type BossId = keyof typeof BOSSES;
export const bossIds = Object.keys(BOSSES) as BossId[];
export const PHASE_TRANSITION = 3.2;
export const phaseHealth = (id: BossId, index: number, count: number) =>
  Math.ceil(BOSSES[id].phases[index].hits * (1 + (count - 1) * 0.65));
export const bossLane = (side: number, count: number) => ({
  top: (720 * side) / count,
  bottom: (720 * (side + 1)) / count,
});
export const raidHeight = (count: number) =>
  count === 1 ? 118 : count === 2 ? 96 : 76;
export function raidBounds(side: number, count: number): [number, number] {
  const lane = bossLane(side, count),
    half = raidHeight(count) / 2;
  return [lane.top + half, lane.bottom - half];
}
