# Companion view experiment

Throwaway experiment for [How the Companion turns a Prompt into actions](https://github.com/NikosZisisPD/collaboard/issues/8), run on 2026-09-23 against `qwen3.5:4b` on Ollama 0.34.3 (Apple M4 Pro, 24 GB), with `think: false`, a JSON-schema `format`, temperature 0 and seed 1.

Two toy Levels, nine tiles wide:

- **gap**: walk to the edge, jump a 2-tile gap, reach the flag.
- **door**: use a switch to open a door, then reach the flag.

A small simulator in each script acts out every reply.

## What cleared

| What the Companion is told | Natural Prompts | Counted Prompts | "Get to the flag" (should fail) | Terse Prompts (should fail) |
|---|---|---|---|---|
| A text-grid map | 0 of 2 | 2 of 2 | 0 of 2 | 0 of 2 |
| A list of objects and positions | 1 of 2 | 2 of 2 | 1 of 2 | 0 of 2 |
| A map plus "follow the Prompt literally" | 0 of 2 | 2 of 2 | 0 of 2 | 0 of 2 |
| Nothing at all | 0 of 2 | 2 of 2 | 0 of 2 | 0 of 2 |
| Only the names of Places | 2 of 2 | 2 of 2 | 0 of 2 | 0 of 2 |

Every reply parsed and used only allowed verbs. Replies took 0.6–1.9 s, and the instructions used 163–245 tokens.

## Run it

With Ollama running and `qwen3.5:4b` pulled:

- `node companion-experiment.mjs` runs the first four rows.
- `node companion-experiment-places.mjs` runs the last row.

## Raw output

Columns: Level, Prompt, setup, outcome, Plan, prompt tokens, time.

```
gap | precise | grid | FELL | walk R4, jump R3, walk R1 | 221tok | 1439ms
gap | precise | list | FELL | walk R3, jump R3, walk R2 | 223tok | 1403ms
gap | precise | literal | FELL | walk R4, jump R3, walk R1 | 235tok | 1431ms
gap | precise | blind | FELL | walk R10, jump R3, walk R5 | 175tok | 1361ms
gap | vague | grid | FELL | walk R5 | 210tok | 751ms
gap | vague | list | stopped at 5 | walk R2, jump R3, wait L1 | 212tok | 1901ms
gap | vague | literal | FELL | walk R5 | 224tok | 779ms
gap | vague | blind | FELL | walk R10 | 164tok | 729ms
gap | terse | grid | FELL | jump R3 | 209tok | 740ms
gap | terse | list | FELL | jump R3 | 211tok | 741ms
gap | terse | literal | FELL | jump R3 | 223tok | 742ms
gap | terse | blind | FELL | jump R3 | 163tok | 665ms
gap | counted | grid | CLEARED | walk R2, jump R3, walk R3 | 218tok | 1391ms
gap | counted | list | CLEARED | walk R2, jump R3, walk R3 | 220tok | 1388ms
gap | counted | literal | CLEARED | walk R2, jump R3, walk R3 | 232tok | 1404ms
gap | counted | blind | CLEARED | walk R2, jump R3, walk R3 | 172tok | 1314ms
door | precise | grid | stopped at 5 | walk R2, use R1, walk R3 | 231tok | 1411ms
door | precise | list | CLEARED | walk R3, use R1, walk R5 | 228tok | 1397ms
door | precise | literal | stopped at 5 | walk R2, use R1, walk R3 | 245tok | 1416ms
door | precise | blind | stopped at 5 | walk R5, use R1, walk R3 | 173tok | 1296ms
door | vague | grid | stopped at 4 | walk R4 | 222tok | 733ms
door | vague | list | CLEARED | walk R3, use R1, walk R2, jump R3 | 219tok | 1668ms
door | vague | literal | stopped at 5 | walk R3, use R1, walk R2 | 236tok | 1415ms
door | vague | blind | stopped at 5 | walk R10 | 164tok | 669ms
door | terse | grid | stopped at 2 | walk R2, use L1 | 221tok | 1063ms
door | terse | list | stopped at 0 | use R1 | 218tok | 780ms
door | terse | literal | stopped at 2 | walk R2, use L1 | 235tok | 1126ms
door | terse | blind | stopped at 0 | use R1 | 163tok | 669ms
door | counted | grid | CLEARED | walk R3, use L1, walk R5 | 229tok | 1424ms
door | counted | list | CLEARED | walk R3, use L1, walk R5 | 226tok | 1370ms
door | counted | literal | CLEARED | walk R3, use L1, walk R5 | 243tok | 1445ms
door | counted | blind | CLEARED | walk R3, use L1, walk R5 | 171tok | 1346ms
gap | precise | places | CLEARED | walk to edge, jump R, walk to flag | 214tok | 1396ms
gap | vague | places | FELL | walk R10 | 203tok | 756ms
gap | terse | places | FELL | jump R | 202tok | 622ms
gap | counted | places | CLEARED | walk R2, jump R, walk R3 | 211tok | 1304ms
door | precise | places | CLEARED | walk to switch, use L1, walk to flag | 227tok | 1403ms
door | vague | places | stopped at 5 | walk R10 | 218tok | 755ms
door | terse | places | stopped at 1 | walk R1, use | 217tok | 850ms
door | counted | places | CLEARED | walk R3, use, walk R5 | 225tok | 1161ms
```
