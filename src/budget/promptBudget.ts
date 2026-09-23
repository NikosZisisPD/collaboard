// The Prompt Budget state machine, lifted from the prototype settled in
// https://github.com/NikosZisisPD/collaboard/issues/5. Pure: no React, no Phaser.

export type Phase = 'writing' | 'waiting' | 'acting' | 'cleared' | 'lost';

export interface Attempt
{
    number: number;
    prompt: string;
    tokens: number;
    outcome: 'cleared' | 'failed' | 'voided';
    stopped: boolean;
}

export interface LevelState
{
    phase: Phase;
    budget: number;
    left: number;
    spent: number;
    draft: string;
    draftTokens: number;
    current: Pick<Attempt, 'number' | 'prompt' | 'tokens'> | null;
    attempts: Attempt[];
}

export type LevelEvent =
    | { type: 'TYPE'; text: string; tokens: number }
    | { type: 'SEND' }
    | { type: 'REPLY_READY' }
    | { type: 'CLEARED' }
    | { type: 'FAILED' }
    | { type: 'MODEL_ERROR' }
    | { type: 'STOP' }
    | { type: 'RESTART' };

export interface StepResult
{
    level: LevelState;
    accepted: boolean;
    note: string;
}

const EVENTS: LevelEvent['type'][] = ['TYPE', 'SEND', 'REPLY_READY', 'CLEARED', 'FAILED', 'MODEL_ERROR', 'STOP', 'RESTART'];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function newLevel(budget: number): LevelState
{
    return { phase: 'writing', budget, left: budget, spent: 0, draft: '', draftTokens: 0, current: null, attempts: [] };
}

// Why an event is refused right now, in plain words; null when it's allowed.
function refusal(level: LevelState, type: LevelEvent['type']): string | null
{
    const over = level.phase === 'cleared' || level.phase === 'lost';
    const busy = level.phase === 'waiting' || level.phase === 'acting';
    switch (type)
    {
        case 'RESTART':
            return null;
        case 'TYPE':
            return over ? 'The Level is over. Restart it to write a new Prompt.' : null;
        case 'SEND':
            if (over) return 'The Level is over. Restart it to try again.';
            if (busy) return 'An Attempt is already under way.';
            if (level.draftTokens === 0) return 'Write a Prompt first.';
            if (level.draftTokens > level.left) return `The Prompt is ${level.draftTokens} tokens, but only ${level.left} are left. Shorten it.`;
            return null;
        case 'REPLY_READY':
            return level.phase === 'waiting' ? null : 'No reply is expected right now.';
        case 'CLEARED':
        case 'FAILED':
            if (level.phase === 'acting') return null;
            return level.phase === 'waiting' ? 'The Companion hasn’t started acting yet.' : 'The Companion isn’t acting right now.';
        case 'MODEL_ERROR':
            return busy ? null : 'No model call is in flight.';
        case 'STOP':
            return busy ? null : 'There’s no Attempt to stop.';
    }
}

function endAttempt(level: LevelState, outcome: Attempt['outcome'], stopped = false): LevelState
{
    const attempt: Attempt = { ...level.current!, outcome, stopped };
    const refund = outcome === 'voided' ? attempt.tokens : 0;
    const left = level.left + refund;
    const phase: Phase = outcome === 'cleared' ? 'cleared' : left === 0 ? 'lost' : 'writing';
    return { ...level, phase, left, spent: level.spent - refund, current: null, attempts: [...level.attempts, attempt] };
}

export function step(level: LevelState, event: LevelEvent): StepResult
{
    const why = refusal(level, event.type);
    if (why) return { level, accepted: false, note: why };

    switch (event.type)
    {
        case 'RESTART':
            return { level: newLevel(level.budget), accepted: true, note: 'Level restarted with the full budget.' };
        case 'TYPE':
            return { level: { ...level, draft: event.text, draftTokens: event.tokens }, accepted: true, note: '' };
        case 'SEND': {
            const current = { number: level.attempts.length + 1, prompt: level.draft, tokens: level.draftTokens };
            return {
                level: { ...level, phase: 'waiting', left: level.left - current.tokens, spent: level.spent + current.tokens, current },
                accepted: true,
                note: `Sent. ${plural(current.tokens, 'token')} spent.`,
            };
        }
        case 'REPLY_READY':
            return { level: { ...level, phase: 'acting' }, accepted: true, note: 'The reply arrived.' };
        case 'CLEARED':
            return {
                level: endAttempt(level, 'cleared'),
                accepted: true,
                note: `The Companion reached the flag. Level cleared using ${plural(level.spent, 'token')}.`,
            };
        case 'MODEL_ERROR':
            return {
                level: endAttempt(level, 'voided'),
                accepted: true,
                note: `The model failed. The ${plural(level.current!.tokens, 'token')} came back, and the Attempt doesn’t count.`,
            };
        case 'FAILED':
        case 'STOP': {
            const next = endAttempt(level, 'failed', event.type === 'STOP');
            const what = event.type === 'STOP'
                ? 'You stopped the Companion. That counts as a failed Attempt, and the tokens stay spent.'
                : 'The Companion fell short.';
            return { level: next, accepted: true, note: what + (next.phase === 'lost' ? ' No tokens are left: Level lost.' : '') };
        }
    }
}

export function allowed(level: LevelState): LevelEvent['type'][]
{
    return EVENTS.filter((type) => refusal(level, type) === null);
}
