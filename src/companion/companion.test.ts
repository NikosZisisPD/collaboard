import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chat, ChatRequest, Place, requestPlan } from './companion';

const MIND_THE_GAP: Place[] = [
    { name: 'edge', kind: 'edge' },
    { name: 'gap', kind: 'gap' },
    { name: 'flag', kind: 'flag' },
];

const replyWith = (content: string) => async () => ({ message: { content } });

describe('requestPlan', () => {
    it('asks the local model for a Plan with the frozen instructions, the Level\'s Places and repeatable settings', async () => {
        let sent: ChatRequest | undefined;
        const chat = async (request: ChatRequest) =>
        {
            sent = request;
            return { message: { content: '{"actions": [{"verb": "walk", "to": "edge"}, {"verb": "jump", "direction": "right"}, {"verb": "walk", "to": "flag"}]}' } };
        };

        const result = await requestPlan('Walk to the edge, jump, then walk to the flag', MIND_THE_GAP, chat);

        expect(result).toEqual({
            voided: false,
            plan: [{ verb: 'walk', to: 'edge' }, { verb: 'jump', direction: 'right' }, { verb: 'walk', to: 'flag' }],
        });
        expect(sent).toMatchObject({
            model: 'qwen3.5:4b',
            think: false,
            stream: false,
            keep_alive: -1,
            options: { temperature: 0, seed: 1 },
        });
        expect(sent!.messages).toEqual([
            {
                role: 'system',
                content: [
                    'You are the Companion in a 2D puzzle platformer, seen from the side. The player writes a Prompt, and you turn it into actions.',
                    'Reply only with JSON: {"actions": [{"verb": "walk" | "jump" | "use" | "wait", "direction": "left" | "right", "tiles": 1-10, "to": "<place>"}]}.',
                    'walk moves a number of tiles in a direction, or, with "to", walks until it reaches a named place; walking into a box pushes it. jump leaps 3 tiles in a direction, clearing a gap up to 2 tiles wide. use presses a switch you are standing on. wait passes one moment.',
                    'You cannot see the Level. Its places are: edge (the last tile before the gap), gap, flag.',
                    'Do exactly what the Prompt says, and nothing it does not.',
                ].join('\n'),
            },
            { role: 'user', content: 'Walk to the edge, jump, then walk to the flag' },
        ]);
        expect(sent!.format.properties.actions.items.properties.to.enum).toEqual(['edge', 'gap', 'flag']);
    });

    it('describes a switch and a door the way the demo Levels were tuned', async () => {
        let sent: ChatRequest | undefined;
        const chat = async (request: ChatRequest) =>
        {
            sent = request;
            return { message: { content: '{"actions": []}' } };
        };
        const switchItOn: Place[] = [
            { name: 'switch', kind: 'switch' },
            { name: 'door', kind: 'door' },
            { name: 'flag', kind: 'flag' },
        ];

        await requestPlan('Get to the flag', switchItOn, chat);

        expect(sent!.messages[0].content).toContain(
            'Its places are: switch (use it while standing on it to open the door), door (you stop in front of it while it is closed), flag.');
    });

    it('returns an empty Plan as a Plan, so the Attempt fails rather than being voided', async () => {
        expect(await requestPlan('Dance', MIND_THE_GAP, replyWith('{"actions": []}'))).toEqual({ voided: false, plan: [] });
    });

    describe('voids the Attempt', () => {
        afterEach(() => vi.useRealTimers());

        it('when the model call fails', async () => {
            const fails: Chat = async () => { throw new Error('connection refused'); };
            expect(await requestPlan('Walk to the edge', MIND_THE_GAP, fails)).toEqual({ voided: true, reason: 'error' });
        });

        it('when no reply arrives within 15 seconds', async () => {
            vi.useFakeTimers();
            const hangs: Chat = (_request, signal) => new Promise((_resolve, reject) =>
            {
                signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            });

            const pending = requestPlan('Walk to the edge', MIND_THE_GAP, hangs);
            await vi.advanceTimersByTimeAsync(15_000);

            expect(await pending).toEqual({ voided: true, reason: 'timeout' });
        });

        it.each([
            ['is not JSON', 'Sure! Walk to the edge.'],
            ['has no list of actions', '{"plan": []}'],
            ['uses a verb the Companion doesn\'t have', '{"actions": [{"verb": "fly"}]}'],
            ['names a Place this Level doesn\'t have', '{"actions": [{"verb": "walk", "to": "cliff"}]}'],
            ['asks for more tiles than a walk allows', '{"actions": [{"verb": "walk", "direction": "right", "tiles": 40}]}'],
        ])('when the reply %s', async (_case, content) => {
            expect(await requestPlan('Walk to the edge', MIND_THE_GAP, replyWith(content))).toEqual({ voided: true, reason: 'unreadable' });
        });
    });
});
