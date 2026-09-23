// Scratch check for "Design the demo Levels": does each draft Level's
// intended Prompt clear it with the real model, and does a vague one fail?
import { encode } from 'gpt-tokenizer/encoding/cl100k_base';

const OLLAMA = 'http://127.0.0.1:11434/api/chat';
const MODEL = 'qwen3.5:4b';

const LEVELS = [
  {
    name: '1 Mind the Gap',
    sim: { width: 10, flag: 9, gaps: [4, 5] },
    places: { edge: 3, gap: 4, flag: 9 },
    about: 'edge (the last tile before the gap), gap, flag',
    prompts: {
      intended: 'Walk to the edge, jump, then walk to the flag',
      shorter: 'Edge, jump, flag',
      vague: 'Get to the flag',
      wrong: 'Jump the gap and walk to the flag',
    },
  },
  {
    name: '2 Switch It On',
    sim: { width: 10, flag: 9, gaps: [], sw: 3, door: 7 },
    places: { switch: 3, door: 6, flag: 9 },
    about: 'switch (use it while standing on it to open the door), door (you stop in front of it while it is closed), flag',
    prompts: {
      intended: 'Walk to the switch, use it, then walk to the flag',
      shorter: 'Switch, use, flag',
      vague: 'Get to the flag',
      wrong: 'Walk to the door, use the switch, then walk to the flag',
    },
  },
  {
    name: '3 Put It Together',
    sim: { width: 12, flag: 11, gaps: [8, 9], sw: 2, door: 5 },
    places: { switch: 2, door: 4, edge: 7, gap: 8, flag: 11 },
    about: 'switch (use it while standing on it to open the door), door (you stop in front of it while it is closed), edge (the last tile before the gap), gap, flag',
    prompts: {
      intended: 'Walk to the switch, use it, walk to the edge, jump, then walk to the flag',
      trimmed: 'Walk to the switch, use it, walk to the edge, jump, walk to the flag',
      vague: 'Get to the flag',
      wrong: 'Use the switch, walk to the edge, jump, then walk to the flag',
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

const instructions = level => [
  'You are the Companion in a 2D puzzle platformer, seen from the side. The player writes a Prompt, and you turn it into actions.',
  'Reply only with JSON: {"actions": [{"verb": "walk" | "jump" | "use" | "wait", "direction": "left" | "right", "tiles": 1-10, "to": "<place>"}]}.',
  'walk moves a number of tiles in a direction, or, with "to", walks until it reaches a named place; walking into a box pushes it. jump leaps 3 tiles in a direction, clearing a gap up to 2 tiles wide. use presses a switch you are standing on. wait passes one moment.',
  `You cannot see the Level. Its places are: ${level.about}.`,
  'Do exactly what the Prompt says, and nothing it does not.',
].join('\n');

function simulate({ width, flag, gaps, sw = null, door = null, box = null }, places, actions) {
  let pos = 0;
  let open = false;
  let boxAt = box;
  const filled = new Set();
  const isGap = t => gaps.includes(t) && !filled.has(t);
  const blocked = t => t < 0 || t >= width || (t === door && !open);
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
      if (a.verb === 'walk' && next === boxAt) {
        const boxNext = next + dir;
        if (blocked(boxNext)) break;
        if (isGap(boxNext)) { filled.add(boxNext); boxAt = null; } else boxAt = boxNext;
      }
      pos = next;
      if (a.verb === 'walk' && isGap(pos)) return 'FELL';
      if (a.verb === 'walk' && pos === flag) return 'CLEARED';
    }
    if (a.verb === 'jump' && isGap(pos)) return 'FELL';
    if (a.verb === 'jump' && pos === flag) return 'CLEARED';
    if (a.verb === 'use' && pos === sw) open = true;
  }
  return pos === flag ? 'CLEARED' : `stopped at ${pos}`;
}

const short = a => `${a.verb}${a.to ? ' to ' + a.to : ''}${!a.to && a.direction ? ' ' + a.direction[0].toUpperCase() : ''}${!a.to && a.tiles ? a.tiles : ''}`;

for (const level of LEVELS) {
  for (const [kind, prompt] of Object.entries(level.prompts)) {
    const res = await fetch(OLLAMA, {
      method: 'POST',
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: instructions(level) }, { role: 'user', content: prompt }],
        think: false, format: format(level.places), stream: false, keep_alive: '5m', options: { temperature: 0, seed: 1 },
      }),
    });
    const actions = JSON.parse((await res.json()).message.content).actions;
    console.log([level.name, kind, `${encode(prompt).length} tokens`, simulate(level.sim, level.places, actions),
      `"${prompt}"`, actions.map(short).join(', ')].join(' | '));
  }
}
