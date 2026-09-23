// A Level file and the reader that turns its grid into tiles and Places, as settled in
// https://github.com/NikosZisisPD/say-less/issues/12. Data and logic only: no Phaser,
// so Node can load Levels too.
import type { Place, PlaceKind } from '../companion/companion.ts';

export interface Level
{
    name: string;
    promptBudget: number;
    grid: string[];
    clears?: string[];
    fails?: string[];
}

export interface LevelPlace extends Place
{
    tile: number;
}

export interface Layout
{
    width: number;
    start: number;
    flag: number;
    gaps: number[];
    switches: number[];
    doors: number[];
    places: LevelPlace[];
}

const tilesOf = (row: string, char: string) => [...row].flatMap((c, tile) => (c === char ? [tile] : []));

// What makes a Level unplayable, in plain words; null when it can be played.
function problemWith(grid: string[]): string | null
{
    if (grid.length !== 2) return 'a grid needs exactly two rows: what stands on each tile, then the ground.';
    const [top, ground] = grid;
    if (top.length !== ground.length) return `the rows are ${top.length} and ${ground.length} tiles long; they must match.`;

    for (const [row, name, allowed] of [[top, 'top', 'CSDF.'], [ground, 'ground', '#.']] as const)
    {
        const tile = [...row].findIndex((c) => !allowed.includes(c));
        if (tile >= 0) return `unknown character "${row[tile]}" at tile ${tile} of the ${name} row.`;
    }

    const last = top.length - 1;
    if (tilesOf(top, 'C').join() !== '0') return 'the Start (C) must be the first tile, and only there.';
    if (tilesOf(top, 'F').join() !== `${last}`) return 'the Flag (F) must be the last tile, and only there.';

    const overGap = [...top].findIndex((c, tile) => c !== '.' && ground[tile] === '.');
    if (overGap >= 0) return `something stands over the gap at tile ${overGap}.`;

    for (const gap of ground.matchAll(/\.+/g))
    {
        const start = gap.index;
        if (gap[0].length > 2)
        {
            return `the gap at tiles ${start} to ${start + gap[0].length - 1} is ${gap[0].length} tiles wide, but the Companion can only jump 2.`;
        }
    }

    const switches = tilesOf(top, 'S');
    for (const [k, door] of tilesOf(top, 'D').entries())
    {
        if (switches[k] === undefined || switches[k] > door) return `door ${k + 1} at tile ${door} has no switch to its left.`;
    }
    return null;
}

export function readLevel(level: Level): Layout
{
    const problem = problemWith(level.grid);
    if (problem) throw new Error(`${level.name}: ${problem}`);

    const [top, ground] = level.grid;
    const width = top.length;
    const gaps = tilesOf(ground, '.');
    const switches = tilesOf(top, 'S');
    const doors = tilesOf(top, 'D');

    const found: { kind: PlaceKind; tile: number }[] = [];
    gaps.filter((tile) => !gaps.includes(tile - 1)).forEach((tile) =>
    {
        found.push({ kind: 'edge', tile: tile - 1 }, { kind: 'gap', tile });
    });
    switches.forEach((tile) => found.push({ kind: 'switch', tile }));
    doors.forEach((tile) => found.push({ kind: 'door', tile: tile - 1 }));
    found.push({ kind: 'flag', tile: width - 1 });
    found.sort((a, b) => a.tile - b.tile);

    const count = (kind: PlaceKind) => found.filter((p) => p.kind === kind).length;
    const seen = new Map<PlaceKind, number>();
    const places = found.map(({ kind, tile }) =>
    {
        const n = (seen.get(kind) ?? 0) + 1;
        seen.set(kind, n);
        return { name: count(kind) > 1 ? `${kind} ${n}` : kind, kind, tile };
    });

    return { width, start: 0, flag: width - 1, gaps, switches, doors, places };
}
