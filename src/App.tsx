import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { warmUp } from './companion/companion';
import { EventBus } from './game/EventBus';
import { LEVELS } from './levels/index';
import { readLevel } from './levels/level';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { PromptPanel } from './PromptPanel';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [index, setIndex] = useState(0);
    const level = LEVELS[index];
    const places = useMemo(() => readLevel(level).places, [level]);
    const levelRef = useRef(level);

    const showCurrentLevel = useCallback(() => EventBus.emit('show-level', levelRef.current), []);

    useEffect(() => { warmUp(); }, []);
    useEffect(() =>
    {
        levelRef.current = level;
        showCurrentLevel();
    }, [level, showCurrentLevel]);

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={showCurrentLevel} />
            <PromptPanel
                key={index}
                level={level}
                places={places}
                onNextLevel={index + 1 < LEVELS.length ? () => setIndex(index + 1) : undefined}
            />
        </div>
    )
}

export default App
