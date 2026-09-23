# Demo run sheet: Say Less and the wayfinder skill (30 minutes)

Settled in [Demo run sheet: the 30-minute walkthrough](https://github.com/NikosZisisPD/say-less/issues/17).

The story: one loose idea became a map on GitHub, the map was worked one ticket at a time, and the result is a game you can play. The audience then works the last ticket with you.

## Before going on stage (15 minutes before)

1. Check that Ollama is running: `brew services list` should show `ollama` as started.
2. Run `npm run check:model`. It loads the model and checks the page can reach it, in about 10 seconds.
3. Run `npm run check:levels`. All 12 checks should pass, in about 20 seconds.
4. Run `npm run dev` and open http://localhost:8080. Mind the Gap should be showing, with the full 30-token budget.
5. Open these tabs, in this order:
   - [the map](https://github.com/NikosZisisPD/say-less/issues/2);
   - [Engine facts: Phaser vs Godot](https://github.com/NikosZisisPD/say-less/issues/3);
   - [Prompt Budget state machine](https://github.com/NikosZisisPD/say-less/issues/5), plus the prototype file `.worktrees/prototype-prompt-budget-state-machine/prototypes/prompt-budget-state-machine.html`;
   - [Local model answering from a localhost page](https://github.com/NikosZisisPD/say-less/issues/6), with a terminal ready to run `npm run check:model`;
   - [How the Companion turns a Prompt into actions](https://github.com/NikosZisisPD/say-less/issues/8);
   - [Live demo: the audience designs and beats a bonus Level](https://github.com/NikosZisisPD/say-less/issues/11).
6. Close memory-hungry apps. The model needs about 3 GB.

## The 30 minutes

| Time | Segment | What to show |
|---|---|---|
| 0:00–2:00 | **Hook: play it** | Mind the Gap. Type "Get to the flag", and the Companion falls into the gap. Then type "Walk to the edge, jump, then walk to the flag", and it clears. Point at the tokens leaving the budget. "Agents built this overnight, one ticket at a time. Here's how." |
| 2:00–6:00 | **One idea becomes a map** | The original one-line idea. Then the map: Destination, Notes, Decisions so far (the story in one list), Out of scope. Then GitHub's sub-issue list and "blocked by" links: the frontier is whatever is open, unblocked and unclaimed. |
| 6:00–16:00 | **How each kind of ticket was approached** (about 2 minutes each) | **Research**, run by agents alone, two at once: Engine facts' resolution comment, with a citation on every claim.<br>**Prototype**, with a human: open the Prompt Budget state machine HTML and run "Over budget". Cutting a Prompt to fit drops "then jump", so blocking won.<br>**Grilling**, with a human: the Companion experiment table. With a map, the model miscounts tiles; with only Place names, it works. That became ADR-0005.<br>**Task**, run by an agent: Local model answering from a localhost page. Run `npm run check:model` live.<br>**The fog clearing**: the Companion ticket's resolution, under "What it changes on the map". When that decision closed, "The rest of the build" became four build tickets. |
| 16:00–18:00 | **Fairness** | Switch It On. "Get to the flag" stops at the closed Door and the tokens stay spent; then the intended Prompt clears it. Show the list of Attempts. |
| 18:00–28:00 | **Live: the audience's bonus Level** | Run `/wayfinder #2` naming the live ticket, and claim it on screen. Grill the room: which mechanics, what twist, what budget. The agent writes `src/levels/04-bonus.ts`, then `npm run check:levels`. Someone from the audience writes the Prompt. The resolution comment and the map update happen live. |
| 28:00–30:00 | **Wrap** | The finished map: every decision in one place, and nothing left under Not yet specified. Four takeaways: plan before you build; chart only what you can see; HITL tickets need a human, AFK ones don't; refer to tickets by name. |

## If something goes wrong

- **The model doesn't answer** (the page says "Is Ollama running?"): run `npm run check:model`, and if that fails, `brew services restart ollama`.
- **The live Level fails `check:levels`**: fix it live once. If it still fails, fall back to the prepared Level below.
- **You're running out of time**: skip Fairness (16:00–18:00), and cut the live segment to the design questions and one Attempt.

## Prepared fallback Level

Two gaps, with a switch and door before them. The grid passes the Level reader, but don't build or test it before the demo: that would work the live ticket early. Paste it on stage only if the audience's Level fails twice.

```
C.S..D.......F
#######..##..#
```

Places: switch, door, edge 1, gap 1, edge 2, gap 2, flag.
