/**
 * Player.js
 * Clase principal del jugador.
 * Maneja movimiento (WASD / flechas), estadísticas,
 * daño recibido, curación, experiencia y nivel.
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene  - Escena que contiene al jugador
     * @param {number}       x      - Posición inicial X
     * @param {number}       y      - Posición inicial Y
     */
    constructor(scene, x, y) {
        super(scene, x, y, 'player');

        // ── Añadir a la escena y habilitar física ──────────────────────────────
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setDepth(10);

        // ── Estadísticas base (convención compartida) ──────────────────────────
        this.health = 100;
        this.maxHealth = 100;

        this.damage = 20;
        this.moveSpeed = 180;

        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 10;   // XP necesaria para pasar al siguiente nivel

        this.score = 0;

        // ── Estado interno ─────────────────────────────────────────────────────
        this._invincible = false;   // true durante el parpadeo post-daño
        this._invincibleTime = 800;     // ms de invencibilidad tras recibir daño
        this._dead = false;

        // ── Controles ──────────────────────────────────────────────────────────
        this._cursors = scene.input.keyboard.createCursorKeys();
        this._wasd = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });

        // ── Referencia a la escena para emitir eventos ─────────────────────────
        this._scene = scene;
    }

    // ── Ciclo de actualización ───────────────────────────────────────────────

    /**
     * Llamar desde GameScene.update() en cada frame.
     */
    update() {
        if (this._dead) return;
        this._handleMovement();
    }

    // ── Movimiento ───────────────────────────────────────────────────────────

    /**
     * Lee teclado (WASD + flechas) y aplica velocidad al cuerpo físico.
     * La velocidad diagonal se normaliza para mantener consistencia.
     * @private
     */
    _handleMovement() {
        const cursors = this._cursors;
        const wasd = this._wasd;

        let vx = 0;
        let vy = 0;

        // Horizontal
        if (cursors.left.isDown || wasd.left.isDown) vx = -1;
        if (cursors.right.isDown || wasd.right.isDown) vx = 1;

        // Vertical
        if (cursors.up.isDown || wasd.up.isDown) vy = -1;
        if (cursors.down.isDown || wasd.down.isDown) vy = 1;

        // Normalizar diagonal
        if (vx !== 0 && vy !== 0) {
            const factor = 0.7071; // 1 / √2
            vx *= factor;
            vy *= factor;
        }

        this.setVelocity(vx * this.moveSpeed, vy * this.moveSpeed);

        // Voltear sprite según dirección horizontal
        if (vx < 0) this.setFlipX(true);
        else if (vx > 0) this.setFlipX(false);
    }

    // ── Daño y curación ──────────────────────────────────────────────────────

    /**
     * Aplica daño al jugador.
     * Ignora el golpe si está en periodo de invencibilidad.
     * @param {number} amount - Cantidad de daño a recibir
     */
    takeDamage(amount) {
        if (this._invincible || this._dead) return;

        this.health -= amount;

        // Emitir evento para que el HUD (Persona B) actualice la barra de vida
        this._scene.events.emit('player-health-changed', this.health, this.maxHealth);

        if (this.health <= 0) {
            this.health = 0;
            this._die();
            return;
        }

        // Efecto visual de parpadeo + periodo de invencibilidad
        this._startInvincibility();
    }

    /**
     * Cura al jugador. No puede superar maxHealth.
     * @param {number} amount - Cantidad de salud a recuperar
     */
    heal(amount) {
        if (this._dead) return;
        this.health = Math.min(this.health + amount, this.maxHealth);
        this._scene.events.emit('player-health-changed', this.health, this.maxHealth);
    }

    /**
     * Activa el parpadeo e invencibilidad temporal tras recibir daño.
     * @private
     */
    _startInvincibility() {
        this._invincible = true;

        // Parpadeo mediante tween
        this._scene.tweens.add({
            targets: this,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: 3,
            onComplete: () => { this.setAlpha(1); },
        });

        // Terminar invencibilidad después del tiempo definido
        this._scene.time.delayedCall(this._invincibleTime, () => {
            this._invincible = false;
        });
    }

    // ── Experiencia y nivel ──────────────────────────────────────────────────

    /**
     * Añade experiencia al jugador y verifica si sube de nivel.
     * @param {number} amount - XP ganada
     */
    gainExp(amount) {
        if (this._dead) return;
        this.exp += amount;
        this.score += amount; // El puntaje también sube con la XP recogida

        // Emitir evento para que el HUD actualice la barra de XP
        this._scene.events.emit('player-exp-changed', this.exp, this.expToNextLevel, this.level);

        // Verificar nivel
        while (this.exp >= this.expToNextLevel) {
            this.levelUp();
        }
    }

    /**
     * Sube de nivel al jugador.
     * Ajusta la XP restante y calcula el umbral del próximo nivel.
     * Fórmula: expToNextLevel = Math.floor(10 * 1.6^(nivel-1))
     */
    levelUp() {
        this.exp -= this.expToNextLevel;
        this.level += 1;

        // Escalar XP requerida (curva exponencial suave)
        this.expToNextLevel = Math.floor(10 * Math.pow(1.6, this.level - 1));

        // Bonificaciones al subir de nivel
        this.maxHealth += 10;
        this.health = this.maxHealth;   // curación completa al subir nivel
        this.damage += 3;

        // Notificar al sistema (HUD, AudioManager, LevelManager)
        this._scene.events.emit('player-level-up', this.level);
        this._scene.events.emit('player-health-changed', this.health, this.maxHealth);

        console.log(`[Player] Nivel ${this.level} | XP siguiente: ${this.expToNextLevel}`);
    }

    // ── Muerte ───────────────────────────────────────────────────────────────

    /**
     * Lógica de muerte del jugador.
     * Emite el evento 'player-dead' para que GameScene lo gestione.
     * @private
     */
    _die() {
        if (this._dead) return;
        this._dead = true;

        this.setVelocity(0, 0);
        this.setActive(false);

        // Animación de desvanecimiento
        this._scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 600,
            onComplete: () => {
                this._scene.events.emit('player-dead', {
                    score: this.score,
                    level: this.level,
                });
            },
        });
    }

    // ── Getters de estado ─────────────────────────────────────────────────────

    /** @returns {boolean} true si el jugador está vivo */
    isAlive() { return !this._dead; }

    /** @returns {boolean} true si está en periodo de invencibilidad */
    isInvincible() { return this._invincible; }
}