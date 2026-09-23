# Demo Levels check

Throwaway check for [Design the demo Levels](https://github.com/NikosZisisPD/collaboard/issues/9), run on 2026-09-23 against `qwen3.5:4b` on Ollama 0.34.3, with the Place-based Companion from [How the Companion turns a Prompt into actions](https://github.com/NikosZisisPD/collaboard/issues/8). Token counts use `gpt-tokenizer` 4.0.0 with `cl100k_base`, the game's Prompt Budget tokenizer.

`levels.mjs` holds:
- the three Levels and their Places;
- the Prompts tried on each;
- a small simulator;
- the exact hidden instructions the Levels were tuned with.

Run it with Ollama running: `npm install gpt-tokenizer@4.0.0 && node levels.mjs`.

## The Levels

```
Level 1: Mind the Gap          Level 2: Switch It On          Level 3: Put It Together
C..e.....F                     C..s..dD.F                     C.s.dD.e...F
####..####                     ##########                     ########..##
```

How to read the sketches:
- The top row shows what stands on each tile: C is the Companion's start and F the flag.
- Lower-case letters mark Places: e edge, s switch, d door (the tile in front of it).
- D is the closed door itself.
- The bottom row is the ground; a gap in it is a hole.

| Level | Prompt Budget | Places | Intended Prompt |
|---|---|---|---|
| 1. Mind the Gap | 30 | edge, gap, flag | "Walk to the edge, jump, then walk to the flag" (12 tokens) |
| 2. Switch It On | 26 | switch, door, flag | "Walk to the switch, use it, then walk to the flag" (13 tokens) |
| 3. Put It Together | 24 | switch, door, edge, gap, flag | "Walk to the switch, use it, walk to the edge, jump, then walk to the flag" (20 tokens) |

## Results

These were identical on every run. Columns: Level, Prompt kind, tokens, outcome, Prompt, Plan.

```
1 Mind the Gap | intended | 12 tokens | CLEARED | "Walk to the edge, jump, then walk to the flag" | walk to edge, jump R, walk to flag
1 Mind the Gap | shorter | 5 tokens | FELL | "Edge, jump, flag" | walk R1, jump, walk to flag
1 Mind the Gap | vague | 4 tokens | FELL | "Get to the flag" | walk R10
1 Mind the Gap | wrong | 8 tokens | FELL | "Jump the gap and walk to the flag" | jump R, walk to flag
2 Switch It On | intended | 13 tokens | CLEARED | "Walk to the switch, use it, then walk to the flag" | walk to switch, use L1, walk to flag
2 Switch It On | shorter | 5 tokens | stopped at 4 | "Switch, use, flag" | use to switch, walk R1, jump R3
2 Switch It On | vague | 4 tokens | stopped at 6 | "Get to the flag" | walk R10
2 Switch It On | wrong | 14 tokens | stopped at 6 | "Walk to the door, use the switch, then walk to the flag" | walk to door, use R1, walk to flag
3 Put It Together | intended | 20 tokens | CLEARED | "Walk to the switch, use it, walk to the edge, jump, then walk to the flag" | walk to switch, use R1, walk to edge, jump R3, walk to flag
3 Put It Together | trimmed | 19 tokens | CLEARED | "Walk to the switch, use it, walk to the edge, jump, walk to the flag" | walk to switch, use R1, walk to edge, jump R3, walk to flag
3 Put It Together | vague | 4 tokens | stopped at 4 | "Get to the flag" | walk R10
3 Put It Together | wrong | 16 tokens | stopped at 4 | "Use the switch, walk to the edge, jump, then walk to the flag" | use to switch, walk to edge, jump to gap, walk to flag
```

## Why boxes were dropped

The first Level 3, "Box Bridge", had a box that the Companion pushes into a 3-tile gap by walking into it.

- **The natural Prompt failed.** "Push the box into the gap, stand on it, jump, then walk to the flag" (18 tokens) became `walk R1, use, jump R, walk to flag`.
- **Only a trick phrasing worked.** "Walk to the gap, jump, then walk to the flag" cleared it.
- **A hint made it worse.** Adding "so to push a box somewhere, walk toward that place" to the hidden instructions broke that working Prompt as well (`walk R3, jump, walk to flag`).

So the demo uses gaps, switches and doors only, and the hidden instructions stay frozen once the Levels are tuned.
