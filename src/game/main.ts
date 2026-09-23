import { AUTO, Game } from 'phaser';
import { Level } from './scenes/Level';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 576,
    parent: 'game-container',
    backgroundColor: '#8fd3ff',
    scene: [
        Level
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
