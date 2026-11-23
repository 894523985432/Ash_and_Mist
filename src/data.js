// Усі ігрові дані — з data/*.json. Числа балансу міняй тільки там.
import RES from '../data/resources.json' with { type: 'json' };
import WPN from '../data/weapons.json' with { type: 'json' };
import ARM from '../data/armor.json' with { type: 'json' };
import MON from '../data/monsters.json' with { type: 'json' };
import RARE from '../data/rare.json' with { type: 'json' };
import LOCATIONS from '../data/locations.json' with { type: 'json' };
import BLD from '../data/buildings.json' with { type: 'json' };
import NPCS from '../data/npcs.json' with { type: 'json' };
import ART_DATA from '../data/art.json' with { type: 'json' };
import BAL from '../data/balance.json' with { type: 'json' };
import EVENTS from '../data/events.json' with { type: 'json' };
import TUTORIAL from '../data/tutorial.json' with { type: 'json' };
import PETS from '../data/pets.json' with { type: 'json' };
import CODEX from '../data/codex.json' with { type: 'json' };
import STORY from '../data/story.json' with { type: 'json' };

export { RES, WPN, ARM, MON, RARE, BLD, NPCS, ART_DATA, BAL, EVENTS, TUTORIAL, PETS, CODEX, STORY };
export const ZONE = LOCATIONS.zones;
export const LOCS = LOCATIONS.locations;
export const RAR = BAL.rarity;
export const NAMES = NPCS.names;

/** Вартість будівлі на рівні l: base + perLvl × l */
export function bldCost(k, l) {
  const { base, perLvl = {} } = BLD[k].cost, o = {};
  for (const r of new Set([...Object.keys(base), ...Object.keys(perLvl)])) o[r] = (base[r] || 0) + (perLvl[r] || 0) * l;
  return o;
}
