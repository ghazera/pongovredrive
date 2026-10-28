export const BOSSES = {
  voltmaw: {
    name: "VOLTMAW",
    phases: ["Charged bolt", "Twin arc", "Storm barrage"],
    subtitle: "The storm beast",
    description:
      "Lightning volleys become a three-lane storm. Return its charged orbs.",
    color: "#ffd166",
    hp: 12,
    speed: 560,
    interval: 2.4,
    damage: 1,
  },
  watcher: {
    name: "VOID WATCHER",
    phases: ["Seeking eye", "Twin drift", "Void swarm"],
    subtitle: "Eye of the abyss",
    description:
      "Curving void orbs drift inside your lane. Track the final approach.",
    color: "#b68cff",
    hp: 14,
    speed: 470,
    interval: 2.5,
    damage: 1,
  },
  colossus: {
    name: "EMBER COLOSSUS",
    phases: ["Molten shot", "Furnace volley", "Meteor barrage"],
    subtitle: "Heart of the furnace",
    description:
      "Heavy molten orbs hit for two hearts. Phase three brings a meteor barrage.",
    color: "#ff8059",
    hp: 10,
    speed: 430,
    interval: 2.8,
    damage: 2,
  },
} as const;
export type BossId = keyof typeof BOSSES;
export const bossIds = Object.keys(BOSSES) as BossId[];
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
