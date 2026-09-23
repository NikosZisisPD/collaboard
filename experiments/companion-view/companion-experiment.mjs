// Scratch experiment for "How the Companion turns a Prompt into actions":
// how does the local model's plan change with what it can see of the Level?
const OLLAMA = 'http://127.0.0.1:11434/api/chat';
const MODEL = 'qwen3.5:4b';

const FORMAT = {
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
        },
        required: ['verb'],
      },
    },
  },
  required: ['actions'],
};

const RULES = [
  'You are the Companion in a 2D puzzle platformer, seen from the side. The player writes a Prompt, and you turn it into actions.',
  'Reply only with JSON: {"actions": [{"verb": "walk" | "jump" | "use" | "wait", "direction": "left" | "right", "tiles": 1-10}]}.',
  'walk moves the given number of tiles in the direction. jump leaps 3 tiles in the direction, clearing a gap up to 2 tiles wide. use presses a switch you are standing on. wait passes one moment.',
].join('\n');

const LEVELS = {
  gap: {
    sim: { width: 9, flag: 8, gaps: [3, 4], sw: null, door: null },
    grid: 'Columns: 012345678\nObjects: C.......F\nGround:  ###..####\nLegend: C = you, F = flag, # = ground, . on the ground row = a gap (falling in fails).',
    list: 'Tiles are numbered 0 to 8, left to right. You stand on tile 0. There is ground on tiles 0-2 and 5-8; tiles 3-4 are a gap, and falling in fails. The flag is on tile 8.',
    prompts: {
      precise: 'Walk right to the edge, jump the gap, then walk to the flag',
      vague: 'Get to the flag',
      terse: 'Jump the gap',
      counted: 'Walk 2 right, jump right, walk 3 right',
    },
  },
  door: {
    sim: { width: 9, flag: 8, gaps: [], sw: 3, door: 6 },
    grid: 'Columns: 012345678\nObjects: C..S..D.F\nGround:  #########\nLegend: C = you, F = flag, S = switch (use it while standing on it to open the door), D = closed door (blocks the way), # = ground.',
    list: 'Tiles are numbered 0 to 8, left to right. You stand on tile 0, and there is ground everywhere. A switch is on tile 3: use it while standing on it to open the door. A closed door on tile 6 blocks the way. The flag is on tile 8.',
    prompts: {
      precise: 'Walk to the switch, use it, then walk to the flag',
      vague: 'Get to the flag',
      terse: 'Open the door',
      counted: 'Walk 3 right, use, walk 5 right',
    },
  },
};

const VIEWS = {
  grid: l => `The Level:\n${l.grid}\nFollow the player's Prompt.`,
  list: l => `The Level: ${l.list}\nFollow the player's Prompt.`,
  literal: l => `The Level:\n${l.grid}\nDo only what the Prompt asks. Never add steps it leaves out, even if they would help.`,
  blind: () => 'You cannot see the Level. Do exactly what the Prompt says, and nothing it does not.',
};

function simulate({ width, flag, gaps, sw, door }, actions) {
  let pos = 0;
  let open = false;
  for (const a of actions) {
    const dir = a.direction === 'left' ? -1 : 1;
    const moves = a.verb === 'walk' ? (a.tiles ?? 1) : a.verb === 'jump' ? 3 : 0;
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

const short = a => `${a.verb}${a.direction ? ' ' + a.direction[0].toUpperCase() : ''}${a.tiles ? a.tiles : ''}`;

await fetch(OLLAMA, { method: 'POST', body: JSON.stringify({ model: MODEL, messages: [], keep_alive: '5m' }) });

for (const [levelName, level] of Object.entries(LEVELS)) {
  for (const [promptName, prompt] of Object.entries(level.prompts)) {
    for (const [viewName, view] of Object.entries(VIEWS)) {
      const started = performance.now();
      const res = await fetch(OLLAMA, {
        method: 'POST',
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: `${RULES}\n${view(level)}` }, { role: 'user', content: prompt }],
          think: false, format: FORMAT, stream: false, keep_alive: '5m', options: { temperature: 0, seed: 1 },
        }),
      });
      const json = await res.json();
      const ms = Math.round(performance.now() - started);
      const actions = JSON.parse(json.message.content).actions;
      console.log([levelName, promptName, viewName, simulate(level.sim, actions), actions.map(short).join(', '),
        `${json.prompt_eval_count}tok`, `${ms}ms`].join(' | '));
    }
  }
}
