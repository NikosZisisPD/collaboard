// Acts out a Plan on a Level, tile by tile, as decided in
// https://github.com/NikosZisisPD/collaboard/issues/8. Pure and deterministic: the same Plan
// always ends the same way on the same Level, and the Phaser scene only animates the steps.
import type { Action } from '../companion/companion.ts';
import type { Layout } from './level.ts';

export type Step =
    | { kind: 'step'; to: number }
    | { kind: 'jump'; to: number }
    | { kind: 'bump'; at: number }
    | { kind: 'fall'; at: number }
    | { kind: 'use'; at: number; opens: number | null }
    | { kind: 'wait' };

export interface Playthrough
{
    outcome: 'cleared' | 'failed';
    endedAt: number;
    fell: boolean;
    steps: Step[];
}

const JUMP_TILES = 3;

export function playPlan(layout: Layout, plan: Action[]): Playthrough
{
    const steps: Step[] = [];
    const open = new Set<number>();
    const isGap = (tile: number) => layout.gaps.includes(tile);
    const blocked = (tile: number) =>
        tile < 0 || tile >= layout.width || (layout.doors.includes(tile) && !open.has(layout.doors.indexOf(tile)));
    const end = (outcome: Playthrough['outcome'], fell = false): Playthrough => ({ outcome, endedAt: pos, fell, steps });

    let pos = layout.start;
    for (const action of plan)
    {
        let dir = action.direction === 'left' ? -1 : 1;
        let moves = action.verb === 'jump' ? JUMP_TILES : action.verb === 'walk' ? (action.tiles ?? 1) : 0;
        if (action.verb === 'walk' && action.to)
        {
            const target = layout.places.find((place) => place.name === action.to)!.tile;
            dir = Math.sign(target - pos) || 1;
            moves = Math.abs(target - pos);
        }

        for (let i = 0; i < moves; i++)
        {
            const next = pos + dir;
            if (blocked(next))
            {
                if (action.verb === 'jump') steps.push({ kind: 'jump', to: pos });
                steps.push({ kind: 'bump', at: next });
                break;
            }
            pos = next;
            if (action.verb === 'walk')
            {
                steps.push({ kind: 'step', to: pos });
                if (isGap(pos)) { steps.push({ kind: 'fall', at: pos }); return end('failed', true); }
                if (pos === layout.flag) return end('cleared');
            }
            else if (i === moves - 1)
            {
                steps.push({ kind: 'jump', to: pos });
            }
        }

        if (action.verb === 'jump')
        {
            if (isGap(pos)) { steps.push({ kind: 'fall', at: pos }); return end('failed', true); }
            if (pos === layout.flag) return end('cleared');
        }
        if (action.verb === 'use')
        {
            const k = layout.switches.indexOf(pos);
            if (k >= 0) open.add(k);
            steps.push({ kind: 'use', at: pos, opens: k >= 0 ? k : null });
        }
        if (action.verb === 'wait') steps.push({ kind: 'wait' });
    }
    return end(pos === layout.flag ? 'cleared' : 'failed');
}
