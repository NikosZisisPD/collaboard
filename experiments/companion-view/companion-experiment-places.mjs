// Scratch experiment, second setup: the Companion sees no map, only the
// names of the Level's places, and the game resolves where they are.
const OLLAMA = 'http://127.0.0.1:11434/api/chat';
const MODEL = 'qwen3.5:4b';

const LEVELS = {
  gap: {
    sim: { width: 9, flag: 8, gaps: [3, 4], sw: null, door: null },
    places: { edge: 2, gap: 3, flag: 8 },
    about: 'edge (the last tile before the gap), gap, flag',
    prompts: {
      precise: 'Walk right to the edge, jump the gap, then walk to the flag',
      vague: 'Get to the flag',
      terse: 'Jump the gap',
      counted: 'Walk 2 right, jump right, walk 3 right',
    },
  },
  door: {
    sim: { width: 9, flag: 8, gaps: [], sw: 3, door: 6 },
    places: { switch: 3, door: 5, flag: 8 },
    about: 'switch (use it while standing on it to open the door), door (you stop in front of it while it is closed), flag',
    prompts: {
      precise: 'Walk to the switch, use it, then walk to the flag',
      vague: 'Get to the flag',
      terse: 'Open the door',
      counted: 'Walk 3 right, use, walk 5 right',
    },
  },
};

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
  'walk moves a number of tiles in a direction, or, with "to", walks until it reaches a named place. jump leaps 3 tiles in a direction, clearing a gap up to 2 tiles wide. use presses a switch you are standing on. wait passes one moment.',
  `You cannot see the Level. Its places are: ${level.about}.`,
  'Do exactly what the Prompt says, and nothing it does not.',
].join('\n');

function simulate({ width, flag, gaps, sw, door }, places, actions) {
  let pos = 0;
  let open = false;
  for (const a of actions) {
    let dir = a.direction === 'left' ? -1 : 1;
    let moves = a.verb === 'jump' ? 3 : a.verb === 'walk' ? (a.tiles ?? 1) : 0;
    if (a.verb === 'walk' && a.to) {
      const target = places[a.to];
      dir = Math.sign(target - pos) || 1;
      moves = Math.abs(target - pos);
    }
    for (let i = 0; i < moves; i++) {
      const next = pos + dir;
      if (next < 0 || next >= width || (next === door && !open)) break;
      pos = next;
      if (a.verb === 'walk' && gaps.includes(pos)) return 'FELL';
      if (a.verb === 'walk' && pos === flag) return 'CLEARED';
    }
    if (a.verb === 'jump' && gaps.includes(pos)) return 'FELL';
    if (a.verb === 'jump' && pos === flag) return 'CLEARED';
    if (a.verb === 'use' && pos === sw) open = true;
  }
  return pos === flag ? 'CLEARED' : `stopped at ${pos}`;
}

const short = a => `${a.verb}${a.to ? ' to ' + a.to : ''}${!a.to && a.direction ? ' ' + a.direction[0].toUpperCase() : ''}${!a.to && a.tiles ? a.tiles : ''}`;

for (const [levelName, level] of Object.entries(LEVELS)) {
  for (const [promptName, prompt] of Object.entries(level.prompts)) {
    const started = performance.now();
    const res = await fetch(OLLAMA, {
      method: 'POST',
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: instructions(level) }, { role: 'user', content: prompt }],
        think: false, format: format(level.places), stream: false, keep_alive: '5m', options: { temperature: 0, seed: 1 },
      }),
    });
    const json = await res.json();
    const actions = JSON.parse(json.message.content).actions;
    console.log([levelName, promptName, 'places', simulate(level.sim, level.places, actions), actions.map(short).join(', '),
      `${json.prompt_eval_count}tok`, `${Math.round(performance.now() - started)}ms`].join(' | '));
  }
}
