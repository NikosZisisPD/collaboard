// Plays every demo Level's `clears` and `fails` Prompts through the real Companion client and
// the Level player's rules. Needs Ollama running with qwen3.5:4b.
//
//   npm run check:levels
import { countTokens } from '../src/budget/tokens.ts';
import { requestPlan } from '../src/companion/companion.ts';
import { LEVELS } from '../src/levels/index.ts';
import { readLevel } from '../src/levels/level.ts';
import { playPlan } from '../src/levels/play.ts';

let failures = 0;
let modelErrors = 0;

for (const level of LEVELS)
{
    const layout = readLevel(level);
    console.log(`\n${level.name} (Prompt Budget: ${level.promptBudget} tokens)`);
    const checks: [string, 'cleared' | 'failed'][] = [
        ...(level.clears ?? []).map((prompt): [string, 'cleared'] => [prompt, 'cleared']),
        ...(level.fails ?? []).map((prompt): [string, 'failed'] => [prompt, 'failed']),
    ];

    for (const [prompt, expected] of checks)
    {
        const tokens = countTokens(prompt);
        const result = await requestPlan(prompt, layout.places);
        if (result.voided && result.reason === 'error') modelErrors++;
        const outcome = result.voided ? `voided (${result.reason})` : playPlan(layout, result.plan).outcome;
        const overBudget = expected === 'cleared' && tokens > level.promptBudget;
        const ok = outcome === expected && !overBudget;
        if (!ok) failures++;
        console.log(`  ${ok ? '✓' : '✗'} ${outcome.padEnd(8)} ${String(tokens).padStart(2)} tokens  "${prompt}"`
            + (ok ? '' : `  (expected ${expected}${overBudget ? ', within budget' : ''})`));
    }
}

if (modelErrors) console.log('\nThe model couldn’t be reached. Is Ollama running? `npm run check:model` checks it.');
console.log(failures ? `\n${failures} check(s) failed.` : '\nEvery Level clears and fails as it was tuned.');
process.exitCode = failures ? 1 : 0;
