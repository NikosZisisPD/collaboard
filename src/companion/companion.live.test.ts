import { describe, expect, it } from 'vitest';
import { Action, Place, requestPlan } from './companion';

// Runs against the real local model (Ollama with qwen3.5:4b): `npm run test:live`.
// The expected Plans are the ones recorded by the demo Levels check on the
// research/demo-levels-check branch, which the Levels were tuned against.
const live = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.OLLAMA_LIVE;

const place = (kind: Place['kind']): Place => ({ name: kind, kind });

const LEVELS: { name: string; places: Place[]; prompts: [string, string][] }[] = [
    {
        name: 'Mind the Gap',
        places: [place('edge'), place('gap'), place('flag')],
        prompts: [
            ['Walk to the edge, jump, then walk to the flag', 'walk to edge, jump R, walk to flag'],
            ['Edge, jump, flag', 'walk R1, jump, walk to flag'],
            ['Get to the flag', 'walk R10'],
            ['Jump the gap and walk to the flag', 'jump R, walk to flag'],
        ],
    },
    {
        name: 'Switch It On',
        places: [place('switch'), place('door'), place('flag')],
        prompts: [
            ['Walk to the switch, use it, then walk to the flag', 'walk to switch, use L1, walk to flag'],
            ['Switch, use, flag', 'use to switch, walk R1, jump R3'],
            ['Get to the flag', 'walk R10'],
            ['Walk to the door, use the switch, then walk to the flag', 'walk to door, use R1, walk to flag'],
        ],
    },
    {
        name: 'Put It Together',
        places: [place('switch'), place('door'), place('edge'), place('gap'), place('flag')],
        prompts: [
            ['Walk to the switch, use it, walk to the edge, jump, then walk to the flag', 'walk to switch, use R1, walk to edge, jump R3, walk to flag'],
            ['Walk to the switch, use it, walk to the edge, jump, walk to the flag', 'walk to switch, use R1, walk to edge, jump R3, walk to flag'],
            ['Get to the flag', 'walk R10'],
            ['Use the switch, walk to the edge, jump, then walk to the flag', 'use to switch, walk to edge, jump to gap, walk to flag'],
        ],
    },
];

const short = (a: Action) =>
    `${a.verb}${a.to ? ` to ${a.to}` : ''}${!a.to && a.direction ? ` ${a.direction[0].toUpperCase()}` : ''}${!a.to && a.tiles ? a.tiles : ''}`;

describe.skipIf(!live)('requestPlan against the local model', () => {
    for (const level of LEVELS)
    {
        for (const [prompt, expected] of level.prompts)
        {
            it(`${level.name}: plans "${prompt}" as the Levels were tuned`, async () => {
                const result = await requestPlan(prompt, level.places);
                expect(result.voided).toBe(false);
                expect(result.voided ? '' : result.plan.map(short).join(', ')).toBe(expected);
            }, 20_000);
        }
    }
});
