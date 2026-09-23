# Say Less

A prompt-only 2D puzzle platformer. You never control a character: you write Prompts that the Companion acts out, within each Level's Prompt Budget. It's the playable prototype for a 30-minute demo of the wayfinder skill, and the plan lives on the [map](https://github.com/NikosZisisPD/collaboard/issues/2).

## Run it

With Node 24:

```sh
npm install
npm run dev
```

Then open http://localhost:8080. `npm run dev` makes no network calls outside your machine, so it works offline on stage.

## Other scripts

- `npm run build` type-checks the code and builds the game into `dist/`.
- `npm test` runs the unit tests.
- `npm run test:live` checks that the local model still plans the demo Levels' Prompts exactly as they were tuned. It needs Ollama running with `qwen3.5:4b`. Run it after touching the Companion's hidden instructions.
- `npm run check:model` checks that the local model answers a localhost page. It needs Ollama running with `qwen3.5:4b`; see [Local model answering from a localhost page](https://github.com/NikosZisisPD/collaboard/issues/6).
- `npm run check:levels` plays every demo Level's `clears` and `fails` Prompts through the real Companion, and checks that each Level still clears and fails as it was tuned. It also needs Ollama.

Before a demo, run `npm run check:model` and `npm run check:levels`: together they load the model and prove the whole loop works.

## Where things are

- `src/App.tsx`: the React page around the game, which steps through the Levels.
- `src/PromptPanel.tsx`: the Prompt box, the Prompt Budget and the list of Attempts, which sends each Prompt to the Companion and the Plan to the scene.
- `src/budget/`: the Prompt Budget state machine and the token counter.
- `src/PhaserGame.tsx` and `src/game/EventBus.ts`: how the React page and Phaser talk to each other.
- `src/levels/`: the Level files, in play order in `index.ts`, plus the reader (`level.ts`) and the rules that play out a Plan (`play.ts`).
- `src/companion/companion.ts`: asks the local model to turn a Prompt into a Plan.
- `src/game/scenes/LevelPlayer.ts`: the Phaser scene that draws a Level and animates each Plan.
- `CONTEXT.md` and `docs/adr/`: the game's vocabulary and its decisions.

Scaffolded from Phaser's [template-react-ts](https://github.com/phaserjs/template-react-ts) (MIT, see `docs/licenses/template-react-ts.txt`), with its usage-stats ping and demo scenes removed.
