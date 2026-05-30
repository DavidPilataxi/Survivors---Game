/**
 * GameScene.js
 * Escena principal del juego. Orquesta todos los sistemas de Persona A:
 * jugador, arma, enemigos, colisiones, XP y power-ups.
 *
 * Expone al jugador con las variables de convención compartida:
 *   player.health / player.maxHealth
 *   player.level / player.exp / player.expToNextLevel
 *   player.score
 *   player.damage / player.moveSpeed
 *
 * Emite los eventos que Persona B escucha:
 *   'player-health-changed' (health, maxHealth)
 *   'player-exp-changed'    (exp, expToNextLevel, level)
 *   'player-level-up'       (level)
 *   'player-dead'           ({ score, level })
 *   'enemy-died'            ({ x, y, expReward, type })
 *   'sfx-shoot' / 'sfx-hit' / 'sfx-pickup' / 'sfx-levelup' / 'sfx-powerup'
 *   'damage-number'         (x, y, amount)
 *   'wave-started'          (waveIndex)
 *   'show-upgrade-menu'     ()
 */
import Player from '../objects/Player.js';
import Weapon from '../objects/Weapon.js';
import PowerUp from '../objects/PowerUp.js';
import EnemyManager from '../managers/EnemyManager.js';
import LevelManager from '../managers/LevelManager.js';
import CollisionManager from '../physics/CollisionManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    // ── Inicialización ────────────────────────────────────────────────────────

    init() {
        // Resetear contadores de tiempo
        this._elapsedSeconds = 0;
        this._paused = false;
        this._gameOver = false;
        this._victory = false;
    }

    // ── Precarga ──────────────────────────────────────────────────────────────

    preload() {
        // ── Jugador ────────────────────────────────────────────────────────────
        this.load.image('player', 'assets/sprites/player.png');

        // ── Enemigos ───────────────────────────────────────────────────────────
        this.load.image('enemy_basic', 'assets/sprites/enemy_basic.png');
        this.load.image('enemy_fast', 'assets/sprites/enemy_fast.png');
        this.load.image('enemy_tank', 'assets/sprites/enemy_tank.png');
        this.load.image('enemy_elite', 'assets/sprites/enemy_elite.png');

        // ── Proyectil ──────────────────────────────────────────────────────────
        this.load.image('projectile', 'assets/sprites/projectile.png');

        // ── Gemas de XP ───────────────────────────────────────────────────────
        this.load.image('xp_gem', 'assets/sprites/xp_gem.png');

        // ── Power-ups ──────────────────────────────────────────────────────────
        this.load.image('pu_damage', 'assets/sprites/pu_damage.png');
        this.load.image('pu_speed', 'assets/sprites/pu_speed.png');
        this.load.image('pu_health', 'assets/sprites/pu_health.png');
        this.load.image('pu_range', 'assets/sprites/pu_range.png');
        this.load.image('pu_firerate', 'assets/sprites/pu_firerate.png');

        // ── Tilemap / fondo ────────────────────────────────────────────────────
        this.load.image('tiles', 'assets/tilemaps/tiles.png');
        this.load.tilemapTiledJSON('map', 'assets/tilemaps/map.json');
    }

    // ── Creación ──────────────────────────────────────────────────────────────

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ── Mundo (mayor que la pantalla para scroll) ─────────────────────────
        const WORLD_W = 3200;
        const WORLD_H = 3200;
        this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

        // ── Fondo / tilemap ────────────────────────────────────────────────────
        this._buildBackground(WORLD_W, WORLD_H);

        // ── Jugador ────────────────────────────────────────────────────────────
        this.player = new Player(this, WORLD_W / 2, WORLD_H / 2);

        // ── Arma ──────────────────────────────────────────────────────────────
        this._weapon = new Weapon(this, this.player, {
            damage: 20,
            fireRate: 800,
            range: 300,
            type: 'basic',
        });

        // ── Grupos de objetos del mundo ───────────────────────────────────────
        this._xpGems = this.physics.add.group();
        this._powerUps = this.physics.add.group();

        // ── Managers ──────────────────────────────────────────────────────────
        this._enemyManager = new EnemyManager(this, this.player);
        this._levelManager = new LevelManager(this, this.player);

        // ── Colisiones ────────────────────────────────────────────────────────
        new CollisionManager(
            this,
            this.player,
            this._enemyManager.enemies,
            this.projectiles,    // expuesto por Weapon en scene.projectiles
            this._xpGems,
            this._powerUps,
            this._weapon
        );

        // ── Cámara: seguir al jugador ─────────────────────────────────────────
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setZoom(1);

        // ── Eventos del ciclo de vida ─────────────────────────────────────────
        this.events.on('player-dead', this._onPlayerDead, this);
        this.events.on('enemy-died', this._onEnemyDied, this);

        // ── Timer de tiempo de juego ──────────────────────────────────────────
        this._gameTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: this._onSecondElapsed,
            callbackScope: this,
        });

        // ── Pausa con tecla ESC ───────────────────────────────────────────────
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.launch('PauseScene');
            this.scene.pause();
        });

        // ── Tecla P como alternativa de pausa ─────────────────────────────────
        this.input.keyboard.on('keydown-P', () => {
            this.scene.launch('PauseScene');
            this.scene.pause();
        });

        // ── Notificar a HUD (Persona B) del estado inicial ────────────────────
        this._emitInitialState();

        console.log('[GameScene] Escena creada correctamente.');
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(time, delta) {
        if (this._gameOver || this._victory) return;

        // Actualizar jugador
        this.player.update();

        // Actualizar arma (disparo automático)
        this._weapon.update(time, this._enemyManager.enemies);

        // Actualizar enemigos
        this._enemyManager.update();

        // Dificultad dinámica
        this._enemyManager.increaseDifficulty(this._elapsedSeconds);
    }

    // ── Fondo ─────────────────────────────────────────────────────────────────

    /**
     * Genera el fondo del mundo.
     * Intenta usar tilemap; si no existe, usa un rectángulo de color.
     * @param {number} w - Ancho del mundo
     * @param {number} h - Alto del mundo
     * @private
     */
    _buildBackground(w, h) {
        try {
            const map = this.make.tilemap({ key: 'map' });
            const tiles = map.addTilesetImage('tiles', 'tiles');
            map.createLayer('Ground', tiles, 0, 0);
        } catch {
            // Fallback: fondo plano con cuadrícula simple
            this.add.rectangle(w / 2, h / 2, w, h, 0x1a1a2e).setDepth(-10);

            // Líneas de cuadrícula para dar sensación de mapa
            const graphics = this.add.graphics().setDepth(-9);
            graphics.lineStyle(1, 0x2a2a4e, 0.5);
            for (let x = 0; x < w; x += 64) {
                graphics.lineBetween(x, 0, x, h);
            }
            for (let y = 0; y < h; y += 64) {
                graphics.lineBetween(0, y, w, y);
            }
        }
    }

    // ── Callbacks de eventos ──────────────────────────────────────────────────

    /**
     * Llamado cada segundo para actualizar el temporizador de juego.
     * @private
     */
    _onSecondElapsed() {
        this._elapsedSeconds++;

        // Emitir para el HUD de tiempo (Persona B)
        this.events.emit('game-time-update', this._elapsedSeconds);

        // Condición de victoria: sobrevivir 600 segundos (10 minutos)
        if (this._elapsedSeconds >= 600 && !this._victory) {
            this._triggerVictory();
        }
    }

    /**
     * El jugador ha muerto.
     * @param {{ score: number, level: number }} data
     * @private
     */
    _onPlayerDead(data) {
        if (this._gameOver) return;
        this._gameOver = true;

        this._enemyManager.stop();
        this._gameTimer.remove(false);

        // Transición a GameOverScene tras una pausa dramática
        this.time.delayedCall(800, () => {
            this.scene.start('GameOverScene', {
                score: data.score,
                level: data.level,
                elapsedSeconds: this._elapsedSeconds,
            });
        });
    }

    /**
     * Un enemigo ha muerto: soltar gema de XP y, con cierta probabilidad, un power-up.
     * @param {{ x: number, y: number, expReward: number, type: string }} data
     * @private
     */
    _onEnemyDied(data) {
        this._spawnXpGem(data.x, data.y, data.expReward);

        // 8% de probabilidad de soltar un power-up
        if (Math.random() < 0.08) {
            this._spawnPowerUp(data.x, data.y);
        }
    }

    // ── Spawners de recogibles ────────────────────────────────────────────────

    /**
     * Genera una gema de XP en la posición indicada.
     * @param {number} x
     * @param {number} y
     * @param {number} expAmount - XP que entrega la gema
     * @private
     */
    _spawnXpGem(x, y, expAmount) {
        const gem = this.physics.add.image(x, y, 'xp_gem');
        gem.setDepth(7);
        gem.body.setAllowGravity(false);
        gem.setData('exp', expAmount);

        // Pequeño impulso de salida
        const angle = Math.random() * Math.PI * 2;
        gem.setVelocity(
            Math.cos(angle) * 60,
            Math.sin(angle) * 60
        );

        // Frenar gradualmente
        this.time.delayedCall(300, () => {
            if (gem.active) gem.setVelocity(0, 0);
        });

        this._xpGems.add(gem);
    }

    /**
     * Genera un power-up aleatorio en la posición indicada.
     * @param {number} x
     * @param {number} y
     * @private
     */
    _spawnPowerUp(x, y) {
        const type = PowerUp.randomType();
        const pu = new PowerUp(this, x, y, type);
        this._powerUps.add(pu);
    }

    // ── Victoria ──────────────────────────────────────────────────────────────

    /**
     * Activa la pantalla de victoria.
     * @private
     */
    _triggerVictory() {
        this._victory = true;
        this._enemyManager.stop();
        this._gameTimer.remove(false);

        this.time.delayedCall(500, () => {
            this.scene.start('VictoryScene', {
                score: this.player.score,
                level: this.player.level,
                elapsedSeconds: this._elapsedSeconds,
            });
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Emite el estado inicial del jugador para que el HUD lo pinte de entrada.
     * @private
     */
    _emitInitialState() {
        this.events.emit('player-health-changed', this.player.health, this.player.maxHealth);
        this.events.emit('player-exp-changed', this.player.exp, this.player.expToNextLevel, this.player.level);
    }
}