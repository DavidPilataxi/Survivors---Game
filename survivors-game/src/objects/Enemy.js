/**
 * Enemy.js
 * Clase base de enemigo para el Survivors-like.
 * Los enemigos persiguen al jugador, reciben daño y al morir
 * sueltan gemas de experiencia.
 *
 * Tipos soportados mediante config:
 *   'basic'  → HP bajo,  velocidad media, daño bajo
 *   'fast'   → HP bajo,  velocidad alta,  daño medio
 *   'tank'   → HP alto,  velocidad baja,  daño alto
 *   'elite'  → HP medio, velocidad media, daño alto, escala grande
 */
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene  - Escena activa
     * @param {number}       x      - Posición inicial X
     * @param {number}       y      - Posición inicial Y
     * @param {string}       type   - Tipo de enemigo
     */
    constructor(scene, x, y, type = 'basic') {
        // Usar textura según tipo
        const textureMap = {
            basic: 'enemy_basic',
            fast: 'enemy_fast',
            tank: 'enemy_tank',
            elite: 'enemy_elite',
        };
        super(scene, x, y, textureMap[type] ?? 'enemy_basic');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this._scene = scene;
        this._type = type;

        // ── Estadísticas según tipo (convención compartida) ───────────────────
        const stats = Enemy.STATS[type] ?? Enemy.STATS.basic;
        this.health = stats.health;
        this.maxHealth = stats.health;
        this.damage = stats.damage;
        this.speed = stats.speed;
        this.expReward = stats.expReward;

        // ── Física ────────────────────────────────────────────────────────────
        this.setCollideWorldBounds(false); // Los enemigos pueden generarse fuera
        this.setDepth(8);
        this.setScale(stats.scale ?? 1);

        // ── Estado interno ────────────────────────────────────────────────────
        this._dead = false;
        this._knockbackVx = 0;
        this._knockbackVy = 0;

        // ── Barra de vida visual (pequeña, sobre el enemigo) ─────────────────
        this._buildHealthBar();
    }

    // ── Estadísticas por tipo ─────────────────────────────────────────────────

    static STATS = {
        basic: { health: 30, damage: 8, speed: 80, expReward: 5, scale: 1 },
        fast: { health: 20, damage: 12, speed: 150, expReward: 8, scale: 0.85 },
        tank: { health: 120, damage: 20, speed: 50, expReward: 20, scale: 1.4 },
        elite: { health: 80, damage: 18, speed: 100, expReward: 15, scale: 1.2 },
    };

    // ── Ciclo de actualización ─────────────────────────────────────────────────

    /**
     * Llamar desde EnemyManager o GameScene.update().
     * @param {Player} player - Referencia al jugador para seguirlo
     */
    update(player) {
        if (this._dead || !this.active) return;
        if (!player || !player.isAlive()) {
            this.setVelocity(0, 0);
            return;
        }
        this.followPlayer(player);
        this._updateHealthBar();
    }

    // ── Seguimiento ───────────────────────────────────────────────────────────

    /**
     * Mueve al enemigo directamente hacia el jugador.
     * @param {Player} player
     */
    followPlayer(player) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;
        this.setVelocity(vx, vy);

        // Voltear sprite
        this.setFlipX(vx < 0);
    }

    // ── Daño ──────────────────────────────────────────────────────────────────

    /**
     * Aplica daño al enemigo.
     * Si llega a 0 HP llama a die().
     * @param {number} amount   - Daño recibido
     * @param {number} [kbVx=0] - Velocidad de knockback X
     * @param {number} [kbVy=0] - Velocidad de knockback Y
     */
    takeDamage(amount, kbVx = 0, kbVy = 0) {
        if (this._dead) return;

        this.health -= amount;

        // Efecto visual de golpe (parpadeo rojo)
        this.setTint(0xff4444);
        this._scene.time.delayedCall(120, () => {
            if (this.active) this.clearTint();
        });

        // Knockback leve
        if (kbVx !== 0 || kbVy !== 0) {
            this.setVelocity(kbVx, kbVy);
            this._scene.time.delayedCall(100, () => {
                if (this.active) this.setVelocity(0, 0);
            });
        }

        // Emitir número de daño flotante (Persona B puede capturar este evento)
        this._scene.events.emit('damage-number', this.x, this.y - 20, amount);

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    // ── Muerte ────────────────────────────────────────────────────────────────

    /**
     * Lógica de muerte: animación, soltar gema de XP y desactivar.
     */
    die() {
        if (this._dead) return;
        this._dead = true;

        this.setVelocity(0, 0);

        // Emitir evento para que EnemyManager/GameScene suelten la gema de XP
        this._scene.events.emit('enemy-died', {
            x: this.x,
            y: this.y,
            expReward: this.expReward,
            type: this._type,
        });

        // Efecto de muerte: desvanecerse hacia arriba
        this._scene.tweens.add({
            targets: this,
            alpha: 0,
            y: this.y - 20,
            duration: 300,
            onComplete: () => {
                this._destroyHealthBar();
                this.setActive(false).setVisible(false);
                this.setAlpha(1); // Resetear para reutilización del pool
            },
        });
    }

    // ── Barra de vida visual ──────────────────────────────────────────────────

    /**
     * Crea la barra de vida sobre el sprite del enemigo.
     * @private
     */
    _buildHealthBar() {
        const barW = 28;
        const barH = 4;

        // Fondo gris
        this._hpBg = this._scene.add.rectangle(
            this.x, this.y - 22, barW, barH, 0x333333
        ).setDepth(9);

        // Barra roja de HP
        this._hpBar = this._scene.add.rectangle(
            this.x, this.y - 22, barW, barH, 0xff3333
        ).setDepth(9);
    }

    /**
     * Actualiza posición y ancho de la barra de vida.
     * @private
     */
    _updateHealthBar() {
        if (!this._hpBg || !this._hpBar) return;
        const barW = 28;
        const ratio = Math.max(0, this.health / this.maxHealth);

        this._hpBg.setPosition(this.x, this.y - 22);
        this._hpBar.setPosition(
            this.x - barW * (1 - ratio) / 2,
            this.y - 22
        );
        this._hpBar.setSize(barW * ratio, 4);
    }

    /**
     * Destruye los gráficos de la barra de vida.
     * @private
     */
    _destroyHealthBar() {
        if (this._hpBg) this._hpBg.destroy();
        if (this._hpBar) this._hpBar.destroy();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Reinicia el enemigo para reutilizarlo en el pool. */
    reset(x, y, type = 'basic') {
        this._dead = false;
        const stats = Enemy.STATS[type] ?? Enemy.STATS.basic;
        this.health = stats.health;
        this.maxHealth = stats.health;
        this.damage = stats.damage;
        this.speed = stats.speed;
        this.expReward = stats.expReward;
        this._type = type;
        this.setPosition(x, y);
        this.setActive(true).setVisible(true);
        this.setAlpha(1);
        this.setScale(stats.scale ?? 1);
        this._buildHealthBar();
    }

    /** @returns {boolean} */
    isDead() { return this._dead; }
}