import type { Level } from './level.ts';

export default {
    name: 'Put It Together',
    promptBudget: 24,
    grid: [
        'C.S..D.....F',
        '########..##',
    ],
    clears: [
        'Walk to the switch, use it, walk to the edge, jump, then walk to the flag',
        'Walk to the switch, use it, walk to the edge, jump, walk to the flag',
    ],
    fails: ['Get to the flag', 'Use the switch, walk to the edge, jump, then walk to the flag'],
} satisfies Level;
