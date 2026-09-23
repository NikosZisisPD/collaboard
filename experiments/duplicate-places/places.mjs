// Scratch check for "Level file format: Tiled or a plain-text grid?": when a Level has two
// Places of the same kind, should they be called "first gap" or "gap 1"? Uses the frozen
// hidden instructions from the demo Levels check, with each Place note naming its partner.

const OLLAMA = 'http://127.0.0.1:11434/api/chat';
const MODEL = 'qwen3.5:4b';

// Three Level shapes, each under both naming schemes. Place positions are tile indexes.
const CASES = [
  {
    level: 'two gaps',
    scheme: 'ordinal',
    sim: { width: 12, flag: 11, gaps: [3, 7, 8], switches: [], doors: [] },
    places: { 'first edge': 2, 'first gap': 3, 'second edge': 6, 'second gap': 7, flag: 11 },
    about: 'first edge (the last tile before the first gap), first gap, second edge (the last tile before the second gap), second gap, flag',
    prompts: {
      intended: 'Walk to the first edge, jump, walk to the second edge, jump, then walk to the flag',
      bare: 'Walk to the edge, jump, walk to the edge, jump, then walk to the flag',
      twice: 'Walk to the edge and jump, twice, then walk to the flag',
      skip: 'Walk to the second edge, jump, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
  {
    level: 'two gaps',
    scheme: 'numbered',
    sim: { width: 12, flag: 11, gaps: [3, 7, 8], switches: [], doors: [] },
    places: { 'edge 1': 2, 'gap 1': 3, 'edge 2': 6, 'gap 2': 7, flag: 11 },
    about: 'edge 1 (the last tile before gap 1), gap 1, edge 2 (the last tile before gap 2), gap 2, flag',
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
    scheme: 'ordinal',
    sim: { width: 12, flag: 11, gaps: [], switches: [2, 6], doors: [4, 8] },
    places: { 'first switch': 2, 'first door': 3, 'second switch': 6, 'second door': 7, flag: 11 },
    about: 'first switch (use it while standing on it to open the first door), first door (you stop in front of it while it is closed), second switch (use it while standing on it to open the second door), second door (you stop in front of it while it is closed), flag',
    prompts: {
      intended: 'Walk to the first switch, use it, walk to the second switch, use it, then walk to the flag',
      bare: 'Walk to the switch, use it, walk to the switch, use it, then walk to the flag',
      twice: 'Walk to the switch and use it, twice, then walk to the flag',
      skip: 'Walk to the second switch, use it, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
  {
    level: 'two switches',
    scheme: 'numbered',
    sim: { width: 12, flag: 11, gaps: [], switches: [2, 6], doors: [4, 8] },
    places: { 'switch 1': 2, 'door 1': 3, 'switch 2': 6, 'door 2': 7, flag: 11 },
    about: 'switch 1 (use it while standing on it to open door 1), door 1 (you stop in front of it while it is closed), switch 2 (use it while standing on it to open door 2), door 2 (you stop in front of it while it is closed), flag',
    prompts: {
      intended: 'Walk to switch 1, use it, walk to switch 2, use it, then walk to the flag',
      bare: 'Walk to the switch, use it, walk to the switch, use it, then walk to the flag',
      twice: 'Walk to the switch and use it, twice, then walk to the flag',
      skip: 'Walk to switch 2, use it, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
  {
    level: 'switch + two gaps',
    scheme: 'ordinal',
    sim: { width: 14, flag: 13, gaps: [7, 10, 11], switches: [2], doors: [4] },
    places: { switch: 2, door: 3, 'first edge': 6, 'first gap': 7, 'second edge': 9, 'second gap': 10, flag: 13 },
    about: 'switch (use it while standing on it to open the door), door (you stop in front of it while it is closed), first edge (the last tile before the first gap), first gap, second edge (the last tile before the second gap), second gap, flag',
    prompts: {
      intended: 'Walk to the switch, use it, walk to the first edge, jump, walk to the second edge, jump, then walk to the flag',
      twice: 'Walk to the switch, use it, then walk to the edge and jump, twice, then walk to the flag',
      skip: 'Walk to the switch, use it, walk to the second edge, jump, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
  {
    level: 'switch + two gaps',
    scheme: 'numbered',
    sim: { width: 14, flag: 13, gaps: [7, 10, 11], switches: [2], doors: [4] },
    places: { switch: 2, door: 3, 'edge 1': 6, 'gap 1': 7, 'edge 2': 9, 'gap 2': 10, flag: 13 },
    about: 'switch (use it while standing on it to open the door), door (you stop in front of it while it is closed), edge 1 (the last tile before gap 1), gap 1, edge 2 (the last tile before gap 2), gap 2, flag',
    prompts: {
      intended: 'Walk to the switch, use it, walk to edge 1, jump, walk to edge 2, jump, then walk to the flag',
      twice: 'Walk to the switch, use it, then walk to the edge and jump, twice, then walk to the flag',
      skip: 'Walk to the switch, use it, walk to edge 2, jump, then walk to the flag',
      vague: 'Get to the flag',
    },
  },
];

const format = places => ({
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          verb: { type: 'string', enum: ['walk', 'jump', 'use', 'wait'] },
          direction: { type: 'string', enum: ['left', 'right'] },
          tiles: { type: 'integer', minimum: 1, maximum: 10 },
          to: { type: 'string', enum: Object.keys(places) },
        },
        required: ['verb'],
      },
    },
  },
  required: ['actions'],
});

const instructions = about => [
  'You are the Companion in a 2D puzzle platformer, seen from the side. The player writes a Prompt, and you turn it into actions.',
  'Reply only with JSON: {"actions": [{"verb": "walk" | "jump" | "use" | "wait", "direction": "left" | "right", "tiles": 1-10, "to": "<place>"}]}.',
  'walk moves a number of tiles in a direction, or, with "to", walks until it reaches a named place; walking into a box pushes it. jump leaps 3 tiles in a direction, clearing a gap up to 2 tiles wide. use presses a switch you are standing on. wait passes one moment.',
  `You cannot see the Level. Its places are: ${about}.`,
  'Do exactly what the Prompt says, and nothing it does not.',
].join('\n');

// Switch n opens Door n.
export function simulate({ width, flag, gaps, switches, doors }, places, actions) {
  let pos = 0;
  const open = new Set();
  const isGap = t => gaps.includes(t);
  const blocked = t => t < 0 || t >= width || (doors.includes(t) && !open.has(t));
  for (const a of actions) {
    let dir = a.direction === 'left' ? -1 : 1;
    let moves = a.verb === 'jump' ? 3 : a.verb === 'walk' ? (a.tiles ?? 1) : 0;
    if (a.verb === 'walk' && a.to) {
      dir = Math.sign(places[a.to] - pos) || 1;
      moves = Math.abs(places[a.to] - pos);
    }
    for (let i = 0; i < moves; i++) {
      const next = pos + dir;
      if (blocked(next)) break;
      pos = next;
      if (a.verb === 'walk' && isGap(pos)) return 'FELL';
      if (a.verb === 'walk' && pos === flag) return 'CLEARED';
    }
    if (a.verb === 'jump' && isGap(pos)) return 'FELL';
    if (a.verb === 'jump' && pos === flag) return 'CLEARED';
    if (a.verb === 'use' && switches.includes(pos)) open.add(doors[switches.indexOf(pos)]);
  }
  return pos === flag ? 'CLEARED' : `stopped at ${pos}`;
}

export const short = a => `${a.verb}${a.to ? ' to ' + a.to : ''}${!a.to && a.direction ? ' ' + a.direction[0].toUpperCase() : ''}${!a.to && a.tiles ? a.tiles : ''}`;

if (import.meta.main) {
  for (const c of CASES) {
    for (const [kind, prompt] of Object.entries(c.prompts)) {
      const res = await fetch(OLLAMA, {
        method: 'POST',
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: instructions(c.about) }, { role: 'user', content: prompt }],
          think: false, format: format(c.places), stream: false, keep_alive: '5m', options: { temperature: 0, seed: 1 },
        }),
      });
      const actions = JSON.parse((await res.json()).message.content).actions;
      console.log([c.level, c.scheme, kind, simulate(c.sim, c.places, actions), `"${prompt}"`, actions.map(short).join(', ')].join(' | '));
    }
  }
}
