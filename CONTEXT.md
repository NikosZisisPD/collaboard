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

**Attempt**:
One try at a Level: the player submits a Prompt and the Companion acts it out. An Attempt ends cleared, failed or voided.
_Avoid_: Run, turn, try

**Voided Attempt**:
An Attempt ended by a model error or a reply the game can't read, rather than by the Companion's play. Its tokens are refunded and it doesn't count.
_Avoid_: Glitch, error Attempt
