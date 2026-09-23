// The Companion client: turns a Prompt into a Plan with the local model, as decided in
// https://github.com/NikosZisisPD/say-less/issues/8.

export type PlaceKind = 'edge' | 'gap' | 'switch' | 'door' | 'flag';

export interface Place
{
    name: string;
    kind: PlaceKind;
}

export interface Action
{
    verb: 'walk' | 'jump' | 'use' | 'wait';
    direction?: 'left' | 'right';
    tiles?: number;
    to?: string;
}

export type PlanResult =
    | { voided: false; plan: Action[] }
    | { voided: true; reason: 'error' | 'timeout' | 'unreadable' };

export interface ChatRequest
{
    model: string;
    messages: { role: 'system' | 'user'; content: string }[];
    think: false;
    format: ReturnType<typeof actionFormat>;
    stream: false;
    keep_alive: number;
    options: { temperature: number; seed: number };
}

export type Chat = (request: ChatRequest, signal: AbortSignal) => Promise<{ message: { content: string } }>;

const PLACE_NOTES: Record<PlaceKind, string> = {
    edge: 'the last tile before the gap',
    gap: '',
    switch: 'use it while standing on it to open the door',
    door: 'you stop in front of it while it is closed',
    flag: '',
};

// The demo Levels were tuned with this exact wording: one extra sentence broke a working
// Prompt. Re-run the Level check before changing a word, even the sentence about boxes.
function hiddenInstructions(places: Place[]): string
{
    const described = places.map(({ name, kind }) => (PLACE_NOTES[kind] ? `${name} (${PLACE_NOTES[kind]})` : name)).join(', ');
    return [
        'You are the Companion in a 2D puzzle platformer, seen from the side. The player writes a Prompt, and you turn it into actions.',
        'Reply only with JSON: {"actions": [{"verb": "walk" | "jump" | "use" | "wait", "direction": "left" | "right", "tiles": 1-10, "to": "<place>"}]}.',
        'walk moves a number of tiles in a direction, or, with "to", walks until it reaches a named place; walking into a box pushes it. jump leaps 3 tiles in a direction, clearing a gap up to 2 tiles wide. use presses a switch you are standing on. wait passes one moment.',
        `You cannot see the Level. Its places are: ${described}.`,
        'Do exactly what the Prompt says, and nothing it does not.',
    ].join('\n');
}

function actionFormat(placeNames: string[])
{
    return {
        type: 'object',
        properties: {
            actions: {
                type: 'array',
                maxItems: 12,
                items: {
                    type: 'object',
                    properties: {
                        verb: { type: 'string', enum: ['walk', 'jump', 'use', 'wait'] },
                        direction: { type: 'string', enum: ['left', 'right'] },
                        tiles: { type: 'integer', minimum: 1, maximum: 10 },
                        to: { type: 'string', enum: placeNames },
                    },
                    required: ['verb'],
                },
            },
        },
        required: ['actions'],
    };
}

const VERBS: readonly string[] = ['walk', 'jump', 'use', 'wait'];
const TIMEOUT_MS = 15_000;
const MODEL = 'qwen3.5:4b';
const CHAT_URL = 'http://127.0.0.1:11434/api/chat';

// Loads the model before the first Attempt, which would otherwise wait for it.
export async function warmUp(): Promise<void>
{
    await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [], keep_alive: -1 }),
    }).catch(() => undefined);
}

export const ollamaChat: Chat = async (request, signal) =>
{
    const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
    });
    const reply = await response.json();
    if (!response.ok || reply.error) throw new Error(reply.error ?? `HTTP ${response.status}`);
    return reply;
};

function readPlan(content: string, placeNames: string[]): Action[] | null
{
    let data;
    try { data = JSON.parse(content); } catch { return null; }
    if (!Array.isArray(data?.actions) || data.actions.length > 12) return null;
    const valid = data.actions.every((action: Action) =>
        VERBS.includes(action?.verb)
        && (action.direction === undefined || action.direction === 'left' || action.direction === 'right')
        && (action.tiles === undefined || (Number.isInteger(action.tiles) && action.tiles >= 1 && action.tiles <= 10))
        && (action.to === undefined || placeNames.includes(action.to)));
    return valid ? data.actions : null;
}

export async function requestPlan(prompt: string, places: Place[], chat: Chat = ollamaChat): Promise<PlanResult>
{
    const placeNames = places.map((place) => place.name);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try
    {
        const reply = await chat({
            model: MODEL,
            messages: [
                { role: 'system', content: hiddenInstructions(places) },
                { role: 'user', content: prompt },
            ],
            think: false,
            format: actionFormat(placeNames),
            stream: false,
            keep_alive: -1,
            options: { temperature: 0, seed: 1 },
        }, controller.signal);
        const plan = readPlan(reply.message.content, placeNames);
        return plan ? { voided: false, plan } : { voided: true, reason: 'unreadable' };
    }
    catch
    {
        return { voided: true, reason: controller.signal.aborted ? 'timeout' : 'error' };
    }
    finally
    {
        clearTimeout(timer);
    }
}
