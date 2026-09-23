import { describe, expect, it } from 'vitest';
import { countTokens } from './tokens';

describe('countTokens', () => {
    it('counts a Prompt the way the Prompt Budget was designed with', () => {
        expect(countTokens('Walk to the edge, jump, then walk to the flag')).toBe(12);
    });

    it('counts an empty Prompt as zero tokens', () => {
        expect(countTokens('')).toBe(0);
    });

    it('counts text that looks like a special token as ordinary text instead of throwing', () => {
        expect(countTokens('<|endoftext|>')).toBe(7);
    });
});
