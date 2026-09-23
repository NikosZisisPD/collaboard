import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [prompt, setPrompt] = useState('');

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} />
            <section className="prompt">
                <label htmlFor="prompt">Prompt</label>
                <textarea
                    id="prompt"
                    rows={3}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Tell the Companion what to do…"
                />
            </section>
        </div>
    )
}

export default App
