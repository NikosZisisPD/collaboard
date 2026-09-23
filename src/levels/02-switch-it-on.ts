import type { Level } from './level.ts';

export default {
    name: 'Switch It On',
    promptBudget: 26,
    grid: [
        'C..S...D.F',
        '##########',
    ],
    clears: ['Walk to the switch, use it, then walk to the flag'],
    fails: ['Switch, use, flag', 'Get to the flag', 'Walk to the door, use the switch, then walk to the flag'],
} satisfies Level;
