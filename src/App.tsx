import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { PromptPanel } from './PromptPanel';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} />
            <PromptPanel />
        </div>
    )
}

export default App
