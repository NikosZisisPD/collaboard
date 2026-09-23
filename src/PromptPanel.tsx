import { useEffect, useReducer, useRef, useState } from 'react';
import { allowed, Attempt, LevelEvent, LevelState, newLevel, Phase, step } from './budget/promptBudget';
import { countTokens } from './budget/tokens';
import { requestPlan } from './companion/companion';
import { EventBus } from './game/EventBus';
import type { Level, LevelPlace } from './levels/level';
import type { Playthrough } from './levels/play';

const STATUS: Record<Phase, string> = {
    writing: 'Write a Prompt for the Companion.',
    waiting: 'The Companion is thinking…',
    acting: 'The Companion is acting…',
    cleared: 'Level cleared!',
    lost: 'Out of tokens: Level lost.',
};

const HINTS = {
    error: 'Is Ollama running? `npm run check:model` checks it.',
    timeout: 'The model took longer than 15 seconds to reply.',
    unreadable: 'The model’s reply couldn’t be read.',
};

interface Panel
{
    level: LevelState;
    note: string;
    refused: boolean;
}

function reducePanel(panel: Panel, event: LevelEvent): Panel
{
    const result = step(panel.level, event);
    if (event.type === 'TYPE')
    {
        return { level: result.level, note: panel.refused ? '' : panel.note, refused: false };
    }
    return { level: result.level, note: result.note, refused: !result.accepted };
}

function describe(attempt: Attempt): string
{
    if (attempt.outcome === 'cleared') return 'cleared the Level';
    if (attempt.outcome === 'voided') return `voided, ${attempt.tokens} tokens refunded`;
    return attempt.stopped ? 'stopped, counts as failed' : 'fell short';
}

interface Props
{
    level: Level;
    places: LevelPlace[];
    onNextLevel?: () => void;
}

export function PromptPanel({ level, places, onNextLevel }: Props)
{
    const [{ level: state, note, refused }, dispatch] = useReducer(reducePanel, level.promptBudget, (budget) => ({
        level: newLevel(budget), note: '', refused: false,
    }));
    const [hint, setHint] = useState('');
    // Bumped by every Send, Stop and Restart, so a reply from an abandoned Attempt is ignored.
    const attempt = useRef(0);

    useEffect(() =>
    {
        const onAttemptEnded = (playthrough: Playthrough) => dispatch({ type: playthrough.outcome === 'cleared' ? 'CLEARED' : 'FAILED' });
        EventBus.on('attempt-ended', onAttemptEnded);
        return () => { EventBus.off('attempt-ended', onAttemptEnded); };
    }, []);

    const can = new Set(allowed(state));
    const overBudget = state.phase === 'writing' && state.draftTokens > state.left;

    async function send()
    {
        const mine = ++attempt.current;
        setHint('');
        dispatch({ type: 'SEND' });
        const result = await requestPlan(state.draft, places);
        if (mine !== attempt.current) return;
        if (result.voided)
        {
            setHint(HINTS[result.reason]);
            dispatch({ type: 'MODEL_ERROR' });
            return;
        }
        dispatch({ type: 'REPLY_READY' });
        EventBus.emit('act-out', result.plan);
    }

    function stop()
    {
        attempt.current++;
        EventBus.emit('stop-acting');
        dispatch({ type: 'STOP' });
    }

    function restart()
    {
        attempt.current++;
        setHint('');
        EventBus.emit('show-level', level);
        dispatch({ type: 'RESTART' });
    }

    return (
        <section className="prompt">
            <label htmlFor="prompt">Prompt</label>
            <textarea
                id="prompt"
                rows={3}
                value={state.draft}
                disabled={!can.has('TYPE')}
                onChange={(event) => dispatch({ type: 'TYPE', text: event.target.value, tokens: countTokens(event.target.value) })}
                placeholder="Tell the Companion what to do…"
            />
            <div className="budget-line">
                <span className={overBudget ? 'over' : ''}>
                    {state.draftTokens} tokens · {state.left} of {state.budget} left
                </span>
                <button className="send" disabled={!can.has('SEND')} onClick={send}>Send</button>
            </div>

            <p className="status">
                {STATUS[state.phase]} {note && <span className={refused ? 'refused' : ''}>{note}</span>}
                {hint && <span className="refused"> {hint}</span>}
            </p>

            <div className="controls">
                {can.has('STOP') && <button onClick={stop}>Stop the Companion</button>}
                <button onClick={restart}>Restart Level</button>
                {state.phase === 'cleared' && (onNextLevel
                    ? <button className="send" onClick={onNextLevel}>Next Level</button>
                    : <span>You cleared every Level!</span>)}
            </div>

            {state.attempts.length > 0 && (
                <ol className="attempts">
                    {state.attempts.map((attempt) => (
                        <li key={attempt.number}>“{attempt.prompt}” · {attempt.tokens} tokens · {describe(attempt)}</li>
                    ))}
                </ol>
            )}
        </section>
    );
}
