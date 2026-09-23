import { useReducer } from 'react';
import { allowed, Attempt, LevelEvent, LevelState, newLevel, Phase, step } from './budget/promptBudget';
import { countTokens } from './budget/tokens';

const MIND_THE_GAP_BUDGET = 30;

const STATUS: Record<Phase, string> = {
    writing: 'Write a Prompt for the Companion.',
    waiting: 'Waiting for the Companion’s reply…',
    acting: 'The Companion is acting…',
    cleared: 'Level cleared!',
    lost: 'Out of tokens: Level lost.',
};

const STUB_EVENTS: { type: LevelEvent['type']; label: string }[] = [
    { type: 'REPLY_READY', label: 'Reply arrives' },
    { type: 'CLEARED', label: 'Reaches the flag' },
    { type: 'FAILED', label: 'Falls short' },
    { type: 'MODEL_ERROR', label: 'Model error' },
    { type: 'STOP', label: 'Stop the Companion' },
];

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

export function PromptPanel()
{
    const [{ level, note, refused }, dispatch] = useReducer(reducePanel, {
        level: newLevel(MIND_THE_GAP_BUDGET), note: '', refused: false,
    });
    const can = new Set(allowed(level));
    const overBudget = level.phase === 'writing' && level.draftTokens > level.left;

    return (
        <section className="prompt">
            <label htmlFor="prompt">Prompt</label>
            <textarea
                id="prompt"
                rows={3}
                value={level.draft}
                disabled={!can.has('TYPE')}
                onChange={(event) => dispatch({ type: 'TYPE', text: event.target.value, tokens: countTokens(event.target.value) })}
                placeholder="Tell the Companion what to do…"
            />
            <div className="budget-line">
                <span className={overBudget ? 'over' : ''}>
                    {level.draftTokens} tokens · {level.left} of {level.budget} left
                </span>
                <button className="send" disabled={!can.has('SEND')} onClick={() => dispatch({ type: 'SEND' })}>Send</button>
            </div>

            <p className="status">
                {STATUS[level.phase]} {note && <span className={refused ? 'refused' : ''}>{note}</span>}
            </p>

            <div className="stub">
                <span>Companion stub:</span>
                {STUB_EVENTS.filter(({ type }) => can.has(type)).map(({ type, label }) => (
                    <button key={type} onClick={() => dispatch({ type } as LevelEvent)}>{label}</button>
                ))}
                <button onClick={() => dispatch({ type: 'RESTART' })}>Restart Level</button>
            </div>

            {level.attempts.length > 0 && (
                <ol className="attempts">
                    {level.attempts.map((attempt) => (
                        <li key={attempt.number}>“{attempt.prompt}” · {attempt.tokens} tokens · {describe(attempt)}</li>
                    ))}
                </ol>
            )}
        </section>
    );
}
