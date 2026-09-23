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
- `npm run check:model` checks that the local model answers a localhost page. It needs Ollama running with `qwen3.5:4b`; see [Local model answering from a localhost page](https://github.com/NikosZisisPD/collaboard/issues/6).

## Where things are

- `src/App.tsx`: the React page around the game, with the Prompt box.
- `src/PhaserGame.tsx` and `src/game/EventBus.ts`: how the React page and Phaser talk to each other.
- `src/game/scenes/Level.ts`: the Phaser scene that shows a Level, empty for now.
- `CONTEXT.md` and `docs/adr/`: the game's vocabulary and its decisions.

Scaffolded from Phaser's [template-react-ts](https://github.com/phaserjs/template-react-ts) (MIT, see `docs/licenses/template-react-ts.txt`), with its usage-stats ping and demo scenes removed.
