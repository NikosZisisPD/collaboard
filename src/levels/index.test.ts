import { describe, expect, it } from 'vitest';
import { countTokens } from '../budget/tokens.ts';
import { LEVELS } from './index.ts';
import { readLevel } from './level.ts';

describe('the demo Levels', () => {
    it('come in play order', () => {
        expect(LEVELS.map((level) => level.name)).toEqual(['Mind the Gap', 'Switch It On', 'Put It Together']);
    });

    it.each(LEVELS)('$name can be played, and each Prompt that clears it fits its Prompt Budget', (level) => {
        expect(() => readLevel(level)).not.toThrow();
        for (const prompt of level.clears ?? [])
        {
            expect(countTokens(prompt)).toBeLessThanOrEqual(level.promptBudget);
        }
    });
});
