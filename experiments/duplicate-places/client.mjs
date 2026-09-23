// The same Level shapes with numbered names, through the real Companion client. Its Place
// notes don't name a partner ("the last tile before the gap"), unlike those in places.mjs.
import { requestPlan } from '../../src/companion/companion.ts';
import { simulate, short } from './places.mjs';

const CASES = [
  {
    level: 'two gaps',
    sim: { width: 12, flag: 11, gaps: [3, 7, 8], switches: [], doors: [] },
    places: [['edge 1', 'edge', 2], ['gap 1', 'gap', 3], ['edge 2', 'edge', 6], ['gap 2', 'gap', 7], ['flag', 'flag', 11]],
    prompts: {
      intended: 'Walk to edge 1, jump, walk to edge 2, jump, then walk to the flag',
      bare: 'Walk to the edge, jump, walk to the edge, jump, then walk to the flag',
      twice: 'Walk to the edge and jump, twice, then walk to the flag',
      skip: 'Walk to edge 2, jump, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
  {
    level: 'two switches',
    sim: { width: 12, flag: 11, gaps: [], switches: [2, 6], doors: [4, 8] },
    places: [['switch 1', 'switch', 2], ['door 1', 'door', 3], ['switch 2', 'switch', 6], ['door 2', 'door', 7], ['flag', 'flag', 11]],
    prompts: {
      intended: 'Walk to switch 1, use it, walk to switch 2, use it, then walk to the flag',
      skip: 'Walk to switch 2, use it, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
  {
    level: 'switch + two gaps',
    sim: { width: 14, flag: 13, gaps: [7, 10, 11], switches: [2], doors: [4] },
    places: [['switch', 'switch', 2], ['door', 'door', 3], ['edge 1', 'edge', 6], ['gap 1', 'gap', 7], ['edge 2', 'edge', 9], ['gap 2', 'gap', 10], ['flag', 'flag', 13]],
    prompts: {
      intended: 'Walk to the switch, use it, walk to edge 1, jump, walk to edge 2, jump, then walk to the flag',
      twice: 'Walk to the switch, use it, then walk to the edge and jump, twice, then walk to the flag',
      skip: 'Walk to the switch, use it, walk to edge 2, jump, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
];

for (const c of CASES) {
  const places = c.places.map(([name, kind]) => ({ name, kind }));
  const at = Object.fromEntries(c.places.map(([name, , tile]) => [name, tile]));
  for (const [kind, prompt] of Object.entries(c.prompts)) {
    const result = await requestPlan(prompt, places);
    const outcome = result.voided ? `VOIDED ${result.reason}` : simulate(c.sim, at, result.plan);
    const plan = result.voided ? '' : result.plan.map(short).join(', ');
    console.log([c.level, kind, outcome, `"${prompt}"`, plan].join(' | '));
  }
}
