import { GameObjects, Scene, Scenes } from 'phaser';
import type { Action } from '../../companion/companion.ts';
import { Layout, Level, readLevel } from '../../levels/level.ts';
import { playPlan, Step } from '../../levels/play.ts';
import { EventBus } from '../EventBus';

const TILE = 64;
const GROUND_Y = 400;
const STEP_MS = 170;
const COLORS = { ground: 0x5b8c3a, groundTop: 0x3f6b24, companion: 0x4f46e5, switch: 0xf5b700, pressed: 0x9a7400, door: 0x7a4a24, flag: 0xe0413c };

const INLINE_LEVEL: Level = { name: 'Mind the Gap', promptBudget: 30, grid: ['C........F', '####..####'] };

export class LevelPlayer extends Scene
{
    private layout: Layout;
    private originX = 0;
    private companion: GameObjects.Rectangle;
    private switches: GameObjects.Rectangle[] = [];
    private doors: GameObjects.Rectangle[] = [];
    private acting = false;

    constructor ()
    {
        super('LevelPlayer');
    }

    create ()
    {
        EventBus.on('show-level', this.showLevel, this);
        EventBus.on('act-out', this.actOut, this);
        // React's development mode mounts the game twice, and the destroyed copy must stop listening.
        const stopListening = () =>
        {
            EventBus.off('show-level', this.showLevel, this);
            EventBus.off('act-out', this.actOut, this);
        };
        this.events.once(Scenes.Events.SHUTDOWN, stopListening);
        this.events.once(Scenes.Events.DESTROY, stopListening);

        this.showLevel(INLINE_LEVEL);
        EventBus.emit('current-scene-ready', this);
    }

    showLevel (level: Level)
    {
        this.children.removeAll(true);
        this.layout = readLevel(level);
        const { width, gaps, flag, places } = this.layout;
        this.originX = (this.scale.width - width * TILE) / 2;

        this.add.text(this.scale.width / 2, 48, level.name, {
            fontFamily: 'system-ui, sans-serif', fontSize: 30, color: '#1f2330', fontStyle: 'bold'
        }).setOrigin(0.5);

        for (let tile = 0; tile < width; tile++)
        {
            if (gaps.includes(tile)) continue;
            this.add.rectangle(this.left(tile), GROUND_Y, TILE, this.scale.height - GROUND_Y, COLORS.ground).setOrigin(0);
            this.add.rectangle(this.left(tile), GROUND_Y, TILE, 8, COLORS.groundTop).setOrigin(0);
        }

        this.add.rectangle(this.centre(flag) + 10, GROUND_Y, 4, 96, 0x1f2330).setOrigin(0.5, 1);
        this.add.triangle(this.centre(flag) + 12, GROUND_Y - 96, 0, 0, 30, 12, 0, 24, COLORS.flag).setOrigin(0);

        this.switches = this.layout.switches.map((tile) =>
            this.add.rectangle(this.centre(tile), GROUND_Y, 36, 10, COLORS.switch).setOrigin(0.5, 1));
        this.doors = this.layout.doors.map((tile) =>
            this.add.rectangle(this.centre(tile), GROUND_Y, 44, 104, COLORS.door).setOrigin(0.5, 1));

        this.companion = this.add.rectangle(this.centre(this.layout.start), GROUND_Y, 34, 44, COLORS.companion).setOrigin(0.5, 1);

        places.forEach((place) =>
        {
            const stacked = places.filter((other) => other.tile === place.tile).indexOf(place);
            this.add.text(this.centre(place.tile), GROUND_Y - 140 - stacked * 24, place.name, {
                fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#1f2330',
                backgroundColor: '#ffffffcc', padding: { x: 5, y: 2 }
            }).setOrigin(0.5, 1);
        });
    }

    async actOut (plan: Action[])
    {
        if (this.acting) return;
        this.acting = true;
        this.resetLevel();

        const playthrough = playPlan(this.layout, plan);
        for (const step of playthrough.steps)
        {
            await this.animate(step);
        }
        if (playthrough.outcome === 'cleared')
        {
            await this.tween({ targets: this.companion, y: GROUND_Y - 24, duration: 140, yoyo: true, repeat: 1 });
        }

        this.acting = false;
        EventBus.emit('attempt-ended', playthrough);
    }

    private resetLevel ()
    {
        this.tweens.killAll();
        this.companion.setPosition(this.centre(this.layout.start), GROUND_Y).setAlpha(1).setScale(1);
        this.switches.forEach((sw) => sw.setFillStyle(COLORS.switch).setScale(1));
        this.doors.forEach((door) => door.setAlpha(1));
    }

    private animate (step: Step): Promise<void>
    {
        const c = this.companion;
        switch (step.kind)
        {
            case 'step':
                return this.tween({ targets: c, x: this.centre(step.to), duration: STEP_MS });
            case 'jump': {
                const tiles = Math.abs(step.to - Math.round((c.x - this.originX - TILE / 2) / TILE));
                const duration = STEP_MS * Math.max(tiles, 1) * 1.2;
                this.tween({ targets: c, y: GROUND_Y - 72, duration: duration / 2, yoyo: true, ease: 'Sine.easeOut' });
                return this.tween({ targets: c, x: this.centre(step.to), duration });
            }
            case 'bump': {
                const towards = Math.sign(this.centre(step.at) - c.x) * 12;
                return this.tween({ targets: c, x: c.x + towards, duration: 90, yoyo: true });
            }
            case 'fall':
                return this.tween({ targets: c, y: this.scale.height + 60, alpha: 0.3, duration: 520, ease: 'Quad.easeIn' });
            case 'use': {
                if (step.opens !== null)
                {
                    this.switches[step.opens].setFillStyle(COLORS.pressed).setScale(1, 0.5);
                    this.tween({ targets: this.doors[step.opens], alpha: 0.15, duration: 300 });
                }
                return this.tween({ targets: c, scaleY: 0.8, duration: 110, yoyo: true });
            }
            case 'wait':
                return new Promise((resolve) => this.time.delayedCall(300, resolve));
        }
    }

    private tween (config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void>
    {
        return new Promise((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() }));
    }

    private left (tile: number)
    {
        return this.originX + tile * TILE;
    }

    private centre (tile: number)
    {
        return this.left(tile) + TILE / 2;
    }
}
