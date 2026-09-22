# The Prompt Budget counts only the player's text

A Level's Prompt Budget meters only the tokens the player types, counted with a fixed tokenizer and shown live as they type; the game's hidden instructions and the Companion's replies never count. Metering real LLM usage would make the same Prompt cost different amounts on different runs or models, which feels unfair under a strict budget, while a fixed count is deterministic and known before any LLM call. There is deliberately no second, hidden cap on total LLM usage: the prototype runs on a free local model, so there is no cost to guard.
