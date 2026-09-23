import { describe, expect, it } from 'vitest';
import { allowed, LevelEvent, newLevel, step } from './promptBudget';

function play(budget: number, events: LevelEvent[])
{
    let level = newLevel(budget);
    const results = events.map((event) =>
    {
        const result = step(level, event);
        level = result.level;
        return result;
    });
    return { level, results };
}

const type = (text: string, tokens: number): LevelEvent => ({ type: 'TYPE', text, tokens });
const SEND: LevelEvent = { type: 'SEND' };
const REPLY_READY: LevelEvent = { type: 'REPLY_READY' };
const CLEARED: LevelEvent = { type: 'CLEARED' };
const FAILED: LevelEvent = { type: 'FAILED' };
const STOP: LevelEvent = { type: 'STOP' };
const MODEL_ERROR: LevelEvent = { type: 'MODEL_ERROR' };
const RESTART: LevelEvent = { type: 'RESTART' };

describe('Prompt Budget', () => {
    it('spends a Prompt\'s tokens on Send and clears the Level when the Companion reaches the flag', () => {
        const { level, results } = play(24, [type('Walk right and jump the gap', 6), SEND]);
        expect(results[1].accepted).toBe(true);
        expect(level).toMatchObject({ phase: 'waiting', left: 18, spent: 6 });

        const cleared = play(24, [type('Walk right and jump the gap', 6), SEND, REPLY_READY, CLEARED]).level;
        expect(cleared).toMatchObject({ phase: 'cleared', left: 18, spent: 6 });
        expect(cleared.attempts).toEqual([
            { number: 1, prompt: 'Walk right and jump the gap', tokens: 6, outcome: 'cleared', stopped: false },
        ]);
    });

    it('drains across Attempts and loses the Level only when a failed Attempt leaves no tokens', () => {
        const attempt = (text: string, tokens: number) => [type(text, tokens), SEND, REPLY_READY, FAILED];
        const afterTwo = play(12, [...attempt('Walk right to the edge', 5), ...attempt('Walk right to the flag now', 6)]).level;
        expect(afterTwo).toMatchObject({ phase: 'writing', left: 1, spent: 11 });

        const afterThree = play(12, [
            ...attempt('Walk right to the edge', 5), ...attempt('Walk right to the flag now', 6), ...attempt('Go', 1),
        ]).level;
        expect(afterThree).toMatchObject({ phase: 'lost', left: 0, spent: 12 });
        expect(afterThree.attempts.map((a) => a.outcome)).toEqual(['failed', 'failed', 'failed']);
    });

    it('counts a Level cleared with its very last token as cleared, not lost', () => {
        const { level } = play(12, [
            type('Walk right to the edge', 5), SEND, REPLY_READY, FAILED,
            type('Walk right, jump the gap now', 7), SEND, REPLY_READY, CLEARED,
        ]);
        expect(level).toMatchObject({ phase: 'cleared', left: 0, spent: 12 });
    });

    it('counts stopping the Companion as a failed Attempt, and the tokens stay spent', () => {
        const { level } = play(24, [type('Walk left', 2), SEND, REPLY_READY, STOP]);
        expect(level).toMatchObject({ phase: 'writing', left: 22, spent: 2 });
        expect(level.attempts).toEqual([{ number: 1, prompt: 'Walk left', tokens: 2, outcome: 'failed', stopped: true }]);
    });

    it('voids an Attempt on a model error and refunds its tokens, so resending costs them only once', () => {
        const voided = play(24, [type('Walk right and jump the gap', 6), SEND, MODEL_ERROR]).level;
        expect(voided).toMatchObject({ phase: 'writing', left: 24, spent: 0 });
        expect(voided.attempts[0]).toMatchObject({ outcome: 'voided', tokens: 6 });

        const resent = play(24, [type('Walk right and jump the gap', 6), SEND, MODEL_ERROR, SEND, REPLY_READY, CLEARED]).level;
        expect(resent).toMatchObject({ phase: 'cleared', left: 18, spent: 6 });
    });

    it('voids an Attempt on a model error while the Companion is acting', () => {
        const { level } = play(24, [type('Walk right and jump the gap', 6), SEND, REPLY_READY, MODEL_ERROR]);
        expect(level).toMatchObject({ phase: 'writing', left: 24, spent: 0 });
    });

    it('blocks Send for a Prompt that is over budget, without spending anything', () => {
        const { level, results } = play(12, [type('Please walk carefully to the right edge of the platform and then jump', 14), SEND]);
        expect(results[1]).toMatchObject({ accepted: false, note: 'The Prompt is 14 tokens, but only 12 are left. Shorten it.' });
        expect(level).toMatchObject({ phase: 'writing', left: 12, spent: 0, attempts: [] });
    });

    it('refuses actions that make no sense right now, each with a reason', () => {
        const { level, results } = play(24, [SEND, type('Jump over the gap', 4), SEND, SEND, CLEARED]);
        expect(results.map((r) => r.accepted)).toEqual([false, true, true, false, false]);
        expect(results[0].note).toBe('Write a Prompt first.');
        expect(results[3].note).toBe('An Attempt is already under way.');
        expect(results[4].note).toBe('The Companion hasn’t started acting yet.');
        expect(level).toMatchObject({ phase: 'waiting', left: 20, spent: 4 });
    });

    it('refuses typing once the Level is over, and restarts it with the full budget', () => {
        const attempt = (text: string, tokens: number) => [type(text, tokens), SEND, REPLY_READY, FAILED];
        const lost = play(12, [...attempt('Walk right to the edge', 5), ...attempt('Walk right to the flag now', 6), ...attempt('Go', 1)]);
        expect(step(lost.level, type('Jump', 1)).accepted).toBe(false);
        expect(step(lost.level, RESTART).level).toEqual(newLevel(12));
    });

    it('lists what the player can do right now', () => {
        expect(allowed(newLevel(10))).toEqual(['TYPE', 'RESTART']);
        expect(allowed(play(10, [type('Jump', 1)]).level)).toEqual(['TYPE', 'SEND', 'RESTART']);
        expect(allowed(play(10, [type('Jump', 1), SEND]).level)).toEqual(['TYPE', 'REPLY_READY', 'MODEL_ERROR', 'STOP', 'RESTART']);
        expect(allowed(play(10, [type('Jump', 1), SEND, REPLY_READY]).level))
            .toEqual(['TYPE', 'CLEARED', 'FAILED', 'MODEL_ERROR', 'STOP', 'RESTART']);
    });
});
