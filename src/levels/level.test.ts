import { describe, expect, it } from 'vitest';
import { Level, readLevel } from './level.ts';

const level = (grid: string[]): Level => ({ name: 'Test Level', promptBudget: 20, grid });

describe('readLevel', () => {
    it('works out the Places of the demo Levels, in the order they were tuned with', () => {
        expect(readLevel(level(['C........F', '####..####'])).places).toEqual([
            { name: 'edge', kind: 'edge', tile: 3 },
            { name: 'gap', kind: 'gap', tile: 4 },
            { name: 'flag', kind: 'flag', tile: 9 },
        ]);
        expect(readLevel(level(['C..S...D.F', '##########'])).places).toEqual([
            { name: 'switch', kind: 'switch', tile: 3 },
            { name: 'door', kind: 'door', tile: 6 },
            { name: 'flag', kind: 'flag', tile: 9 },
        ]);
        expect(readLevel(level(['C.S..D.....F', '########..##'])).places).toEqual([
            { name: 'switch', kind: 'switch', tile: 2 },
            { name: 'door', kind: 'door', tile: 4 },
            { name: 'edge', kind: 'edge', tile: 7 },
            { name: 'gap', kind: 'gap', tile: 8 },
            { name: 'flag', kind: 'flag', tile: 11 },
        ]);
    });

    it('reads where the Gaps, Switches, Doors and Flag are', () => {
        expect(readLevel(level(['C.S..D.....F', '########..##']))).toMatchObject({
            width: 12, start: 0, flag: 11, gaps: [8, 9], switches: [2], doors: [5],
        });
    });

    it('numbers Places from the left when a kind repeats', () => {
        expect(readLevel(level(['C.........F', '##..##..###'])).places.map((p) => p.name))
            .toEqual(['edge 1', 'gap 1', 'edge 2', 'gap 2', 'flag']);
        expect(readLevel(level(['CS.S.D.D.F', '##########'])).places.map((p) => p.name))
            .toEqual(['switch 1', 'switch 2', 'door 1', 'door 2', 'flag']);
    });

    it.each([
        [['C........F'], 'a grid needs exactly two rows: what stands on each tile, then the ground.'],
        [['C........F', '####..###'], 'the rows are 10 and 9 tiles long; they must match.'],
        [['C...x....F', '##########'], 'unknown character "x" at tile 4 of the top row.'],
        [['C........F', '##=#######'], 'unknown character "=" at tile 2 of the ground row.'],
        [['.C.......F', '##########'], 'the Start (C) must be the first tile, and only there.'],
        [['C.......F.', '##########'], 'the Flag (F) must be the last tile, and only there.'],
        [['C...S....F', '####..####'], 'something stands over the gap at tile 4.'],
        [['C........F', '####...###'], 'the gap at tiles 4 to 6 is 3 tiles wide, but the Companion can only jump 2.'],
        [['C..D...S.F', '##########'], 'door 1 at tile 3 has no switch to its left.'],
    ])('refuses an unplayable Level: %j', (grid, problem) => {
        expect(() => readLevel(level(grid))).toThrow(`Test Level: ${problem}`);
    });
});
