import { describe, expect, it } from 'vitest';
import type { Action } from '../companion/companion.ts';
import { Level, readLevel } from './level.ts';
import { playPlan } from './play.ts';

const layout = (grid: string[]) => readLevel({ name: 'Test Level', promptBudget: 20, grid } satisfies Level);

const MIND_THE_GAP = layout(['C........F', '####..####']);
const SWITCH_IT_ON = layout(['C..S...D.F', '##########']);
const PUT_IT_TOGETHER = layout(['C.S..D.....F', '########..##']);

const walkTo = (to: string): Action => ({ verb: 'walk', to });
const walk = (direction: 'left' | 'right', tiles: number): Action => ({ verb: 'walk', direction, tiles });

describe('playPlan', () => {
    // Plans and outcomes recorded by the demo Levels check (research/demo-levels-check).
    it.each([
        ['Mind the Gap, intended', MIND_THE_GAP, [walkTo('edge'), { verb: 'jump', direction: 'right' }, walkTo('flag')], 'cleared', 9, false],
        ['Mind the Gap, "Edge, jump, flag"', MIND_THE_GAP, [walk('right', 1), { verb: 'jump' }, walkTo('flag')], 'failed', 4, true],
        ['Mind the Gap, vague', MIND_THE_GAP, [walk('right', 10)], 'failed', 4, true],
        ['Mind the Gap, "Jump the gap…"', MIND_THE_GAP, [{ verb: 'jump', direction: 'right' }, walkTo('flag')], 'failed', 4, true],
        ['Switch It On, intended', SWITCH_IT_ON, [walkTo('switch'), { verb: 'use', direction: 'left', tiles: 1 }, walkTo('flag')], 'cleared', 9, false],
        ['Switch It On, "Switch, use, flag"', SWITCH_IT_ON, [{ verb: 'use', to: 'switch' }, walk('right', 1), { verb: 'jump', direction: 'right', tiles: 3 }], 'failed', 4, false],
        ['Switch It On, vague', SWITCH_IT_ON, [walk('right', 10)], 'failed', 6, false],
        ['Switch It On, wrong order', SWITCH_IT_ON, [walkTo('door'), { verb: 'use', direction: 'right', tiles: 1 }, walkTo('flag')], 'failed', 6, false],
        ['Put It Together, intended', PUT_IT_TOGETHER, [walkTo('switch'), { verb: 'use', direction: 'right', tiles: 1 }, walkTo('edge'), { verb: 'jump', direction: 'right', tiles: 3 }, walkTo('flag')], 'cleared', 11, false],
        ['Put It Together, vague', PUT_IT_TOGETHER, [walk('right', 10)], 'failed', 4, false],
        ['Put It Together, skipping the walk to the switch', PUT_IT_TOGETHER, [{ verb: 'use', to: 'switch' }, walkTo('edge'), { verb: 'jump', to: 'gap' }, walkTo('flag')], 'failed', 4, false],
    ] as [string, ReturnType<typeof layout>, Action[], string, number, boolean][])('%s', (_name, level, plan, outcome, endedAt, fell) => {
        expect(playPlan(level, plan)).toMatchObject({ outcome, endedAt, fell });
    });

    it('opens only the Door that matches the Switch: Switch 1 opens Door 1', () => {
        const twoDoors = layout(['CS.S.D.D.F', '##########']);
        expect(playPlan(twoDoors, [walkTo('switch 2'), { verb: 'use' }, walkTo('flag')]))
            .toMatchObject({ outcome: 'failed', endedAt: 4 });
        expect(playPlan(twoDoors, [walkTo('switch 1'), { verb: 'use' }, walkTo('switch 2'), { verb: 'use' }, walkTo('flag')]))
            .toMatchObject({ outcome: 'cleared', endedAt: 9 });
    });

    it('plays the same Plan the same way every time', () => {
        const plan: Action[] = [walkTo('switch'), { verb: 'use' }, { verb: 'wait' }, walk('right', 10)];
        expect(playPlan(SWITCH_IT_ON, plan)).toEqual(playPlan(SWITCH_IT_ON, plan));
        expect(playPlan(SWITCH_IT_ON, plan)).toMatchObject({ outcome: 'cleared', endedAt: 9 });
    });

    it('acts out a Plan tile by tile, so each step can be animated', () => {
        const { steps } = playPlan(MIND_THE_GAP, [walkTo('edge'), { verb: 'jump', direction: 'right' }, walkTo('flag')]);
        expect(steps).toEqual([
            { kind: 'step', to: 1 }, { kind: 'step', to: 2 }, { kind: 'step', to: 3 },
            { kind: 'jump', to: 6 },
            { kind: 'step', to: 7 }, { kind: 'step', to: 8 }, { kind: 'step', to: 9 },
        ]);
    });
});
