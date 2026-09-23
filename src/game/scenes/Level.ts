import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Level extends Scene
{
    constructor ()
    {
        super('Level');
    }

    create ()
    {
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height - 48, width, 96, 0x5b8c3a);
        this.add.text(width / 2, height / 2, 'Empty Level', {
            fontFamily: 'system-ui, sans-serif', fontSize: 32, color: '#1f2330'
        }).setOrigin(0.5);

        EventBus.emit('current-scene-ready', this);
    }
}
