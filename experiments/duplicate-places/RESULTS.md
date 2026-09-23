# Duplicate Places check

Throwaway check for [Level file format: Tiled or a plain-text grid?](https://github.com/NikosZisisPD/collaboard/issues/12), run on 2026-09-23 against `qwen3.5:4b` on Ollama 0.34.3, at temperature 0 and seed 1. The question: when a Level has two Places of the same kind, what should they be called so the Companion can tell them apart?

- `places.mjs` uses the frozen hidden instructions from the [demo Levels check](https://github.com/NikosZisisPD/collaboard/tree/research/demo-levels-check/experiments/demo-levels), with each Place note naming its partner ("the last tile before gap 1"). It tries ordinal names ("first gap") and numbered names ("gap 1").
- `client.mjs` runs numbered names through the real Companion client in `src/companion/companion.ts`, whose notes don't name a partner ("the last tile before the gap").

Run them with Ollama running: `node places.mjs` and `node --no-warnings client.mjs`.

## The Level shapes

```
Two gaps          Two switches      Switch + two gaps
C..........F      C.S.D.S.D..F      C.S.D........F
###.###..###      ############      #######.##..##
```

Switch 1 opens Door 1, and Switch 2 opens Door 2.

## Results

Every run was identical to the ones before it. Columns: Level, naming, Prompt kind, outcome, Prompt, Plan.

```
two gaps | ordinal | intended | CLEARED | "Walk to the first edge, jump, walk to the second edge, jump, then walk to the flag" | walk to first edge, jump R, walk to second edge, jump R, walk to flag
two gaps | ordinal | bare | CLEARED | "Walk to the edge, jump, walk to the edge, jump, then walk to the flag" | walk to first edge, jump R, walk to second edge, jump R, walk to flag
two gaps | ordinal | twice | CLEARED | "Walk to the edge and jump, twice, then walk to the flag" | walk to first edge, jump R3, walk to second edge, jump R3, walk to flag
two gaps | ordinal | skip | FELL | "Walk to the second edge, jump, then walk to the flag" | walk to second edge, jump, walk to flag
two gaps | ordinal | vague | FELL | "Get to the flag" | walk to flag
two gaps | numbered | intended | CLEARED | "Walk to edge 1, jump, walk to edge 2, jump, then walk to the flag" | walk to edge 1, jump, walk to edge 2, jump, walk to flag
two gaps | numbered | bare | CLEARED | "Walk to the edge, jump, walk to the edge, jump, then walk to the flag" | walk to edge 1, jump R3, walk to edge 2, jump R3, walk to flag
two gaps | numbered | twice | CLEARED | "Walk to the edge and jump, twice, then walk to the flag" | walk to edge 1, jump R3, walk to edge 2, jump R3, walk to flag
two gaps | numbered | skip | FELL | "Walk to edge 2, jump, then walk to the flag" | walk to edge 2, jump, walk to flag
two gaps | numbered | vague | FELL | "Get to the flag" | walk to flag
two switches | ordinal | intended | stopped at 3 | "Walk to the first switch, use it, walk to the second switch, use it, then walk to the flag" | walk R5, use, walk R10, use, walk to flag
two switches | ordinal | bare | stopped at 3 | "Walk to the switch, use it, walk to the switch, use it, then walk to the flag" | walk R5, use, walk R5, use, walk to flag
two switches | ordinal | twice | stopped at 3 | "Walk to the switch and use it, twice, then walk to the flag" | walk R5, use, wait, walk R5, use, wait, walk R10, wait
two switches | ordinal | skip | stopped at 3 | "Walk to the second switch, use it, then walk to the flag" | walk R5, use, walk to flag
two switches | ordinal | vague | stopped at 3 | "Get to the flag" | walk R10, use to first switch, walk R5, use to second switch, walk R10
two switches | numbered | intended | CLEARED | "Walk to switch 1, use it, walk to switch 2, use it, then walk to the flag" | walk to switch 1, use, walk to switch 2, use, walk to flag
two switches | numbered | bare | stopped at 3 | "Walk to the switch, use it, walk to the switch, use it, then walk to the flag" | walk R5, use, walk R5, use, walk to flag
two switches | numbered | twice | stopped at 3 | "Walk to the switch and use it, twice, then walk to the flag" | walk R5, use, wait, use, walk to flag
two switches | numbered | skip | stopped at 3 | "Walk to switch 2, use it, then walk to the flag" | walk to switch 2, use L1, walk to flag
two switches | numbered | vague | stopped at 3 | "Get to the flag" | walk R10
switch + two gaps | ordinal | intended | CLEARED | "Walk to the switch, use it, walk to the first edge, jump, walk to the second edge, jump, then walk to the flag" | walk to switch, use, walk to first edge, jump, walk to second edge, jump, walk to flag
switch + two gaps | ordinal | twice | CLEARED | "Walk to the switch, use it, then walk to the edge and jump, twice, then walk to the flag" | walk to switch, use, walk to first edge, jump, walk to second edge, jump, walk to flag
switch + two gaps | ordinal | skip | FELL | "Walk to the switch, use it, walk to the second edge, jump, then walk to the flag" | walk to switch, use, walk to second edge, jump, walk to flag
switch + two gaps | ordinal | vague | stopped at 3 | "Get to the flag" | walk R10, use, jump R3, walk R5
switch + two gaps | numbered | intended | CLEARED | "Walk to the switch, use it, walk to edge 1, jump, walk to edge 2, jump, then walk to the flag" | walk to switch, use, walk to edge 1, jump, walk to edge 2, jump, walk to flag
switch + two gaps | numbered | twice | CLEARED | "Walk to the switch, use it, then walk to the edge and jump, twice, then walk to the flag" | walk to switch, use L1, walk to edge 1, jump R3, jump R3, walk to flag
switch + two gaps | numbered | skip | FELL | "Walk to the switch, use it, walk to edge 2, jump, then walk to the flag" | walk to switch, use L1, walk to edge 2, jump R3, walk to flag
switch + two gaps | numbered | vague | stopped at 3 | "Get to the flag" | walk R10, use, jump R3, walk R5
```

Through the real Companion client, with numbered names:

```
two gaps | intended | CLEARED | "Walk to edge 1, jump, walk to edge 2, jump, then walk to the flag" | walk to edge 1, jump, walk to edge 2, jump, walk to flag
two gaps | bare | CLEARED | "Walk to the edge, jump, walk to the edge, jump, then walk to the flag" | walk to edge 1, jump R3, walk to edge 2, jump R3, walk to flag
two gaps | twice | CLEARED | "Walk to the edge and jump, twice, then walk to the flag" | walk to edge 1, jump R3, walk to edge 2, jump R3, walk to flag
two gaps | skip | FELL | "Walk to edge 2, jump, then walk to the flag" | walk to edge 2, jump, walk to flag
two gaps | vague | FELL | "Get to the flag" | walk to flag
two switches | intended | CLEARED | "Walk to switch 1, use it, walk to switch 2, use it, then walk to the flag" | walk to switch 1, use, walk to switch 2, use, walk to flag
two switches | skip | stopped at 3 | "Walk to switch 2, use it, then walk to the flag" | walk to switch 2, use L1, walk to flag
two switches | vague | stopped at 3 | "Get to the flag" | walk R5, use R1, walk R3, jump R2, walk R5
switch + two gaps | intended | CLEARED | "Walk to the switch, use it, walk to edge 1, jump, walk to edge 2, jump, then walk to the flag" | walk to switch, use, walk to edge 1, jump, walk to edge 2, jump, walk to flag
switch + two gaps | twice | CLEARED | "Walk to the switch, use it, then walk to the edge and jump, twice, then walk to the flag" | walk to switch, use, walk to edge 1, jump R, walk to edge 2, jump R, walk to flag
switch + two gaps | skip | FELL | "Walk to the switch, use it, walk to edge 2, jump, then walk to the flag" | walk to switch, use, walk to edge 2, jump, walk to flag
switch + two gaps | vague | stopped at 3 | "Get to the flag" | walk R10, use, jump R3, walk R5
```

## What it shows

- **Ordinal names break two switches.** With "first switch" and "second switch", the Companion stops naming Places and counts tiles instead ("walk R5"), so even the intended Prompt fails. Numbered names clear it.
- **Gaps work either way.** With two gaps, both schemes clear the intended Prompt, the bare "walk to the edge" twice, and "Walk to the edge and jump, twice, then walk to the flag".
- **Two switches need exact names.** The bare and "twice" Prompts fail on that shape even with numbered names.
- **Vague and step-skipping Prompts fail everywhere**, so the Prompt stays the puzzle.
- **The real client needs no change.** Its fixed Place notes give the same outcomes as notes that name a partner.
