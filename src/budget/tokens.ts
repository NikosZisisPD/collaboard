import { countTokens as countCl100k } from 'gpt-tokenizer/encoding/cl100k_base';

// The player can type anything, including text that looks like a special token,
// which gpt-tokenizer rejects by default.
const AS_PLAIN_TEXT = { disallowedSpecial: new Set<string>() };

export function countTokens(prompt: string): number
{
    return countCl100k(prompt, AS_PLAIN_TEXT);
}
