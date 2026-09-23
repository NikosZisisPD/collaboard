import type { Level } from './level.ts';

export default {
    name: 'Mind the Gap',
    promptBudget: 30,
    grid: [
        'C........F',
        '####..####',
    ],
    clears: ['Walk to the edge, jump, then walk to the flag'],
    fails: ['Edge, jump, flag', 'Get to the flag', 'Jump the gap and walk to the flag'],
} satisfies Level;
