# Prompt-only puzzle platformer

A 2D puzzle platformer in which the player never controls a character: they clear each Level by writing Prompts that the Companion acts out, within the Level's Prompt Budget.

## Language

**Level**:
A single puzzle the player must clear, with its own Prompt Budget.
_Avoid_: Stage

**Companion**:
The AI-driven character that acts out the player's Prompts. The player never controls it, or any other character, directly.
_Avoid_: Agent, bot, sidekick, AI

**Prompt**:
The text the player writes to instruct the Companion.
_Avoid_: Command, instruction, message

**Prompt Budget**:
The limit, in tokens, that a Level sets on what the player types. Only the player's own text counts, never the game's hidden instructions or the Companion's replies.
_Avoid_: Token budget, energy, charge

**Place**:
A named spot in a Level, such as the edge, the switch or the flag, that the Companion knows by name but not by position. The game works out every Place from the Level's tiles. When a Level has more than one of a kind, they're numbered from the left: gap 1, gap 2.
_Avoid_: Landmark, waypoint, target

**Plan**:
The list of actions the Companion makes from a Prompt, acted out in one Attempt.
_Avoid_: Reply, script, action list

**Attempt**:
One try at a Level: the player submits a Prompt and the Companion acts it out. An Attempt ends cleared, failed or voided.
_Avoid_: Run, turn, try

**Voided Attempt**:
An Attempt ended by a model error or a reply the game can't read, rather than by the Companion's play. Its tokens are refunded and it doesn't count.
_Avoid_: Glitch, error Attempt

### Level elements

**Start**:
The tile where the Companion begins each Attempt: the Level's first tile.
_Avoid_: Spawn

**Flag**:
The tile the Companion must reach to clear a Level.
_Avoid_: Goal, exit, finish

**Gap**:
A hole in the ground that the Companion falls into unless it jumps over it.
_Avoid_: Pit, hole, chasm

**Edge**:
The last tile of ground before a Gap.
_Avoid_: Ledge, cliff, brink

**Switch**:
A tile that opens its Door when the Companion uses it while standing on it. Switch 1 opens Door 1, and so on.
_Avoid_: Button, lever, plate

**Door**:
A tile that blocks the way until its Switch is used.
_Avoid_: Gate, barrier
