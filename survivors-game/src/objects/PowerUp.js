/**
 * PowerUp.js
 * Objeto recogible que aplica una mejora al jugador al tocarlo.
 *
 * Tipos disponibles:
 *   'damage'    → +15 de daño
 *   'speed'     → +30 de velocidad de movimiento
 *   'health'    → +40 de vida (y aumenta maxHealth en 20)
 *   'range'     → +80 al rango del arma
 *   'fireRate'  → Reduce el cooldown del arma en 100ms
 */
export default class PowerUp extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene  - Escena activa
     * @param {number}       x      - Posición X
     * @param {number}       y      - Posición Y
     * @param {string}       type   - Tipo de power-up
     */
    constructor(scene, x, y, type = 'health') {
        const textureMap = {
            damage: 'pu_damage',
            speed: 'pu_speed',
            health: 'pu_health',
            range: 'pu_range',
            fireRate: 'pu_firerate',
        };
        super(scene, x, y, textureMap[type] ?? 'pu_health');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this._scene = scene;
        this.type = type;

        // Sin gravedad, flota en el mapa
        this.body.setAllowGravity(false);
        this.setDepth(6);

        // ── Animación de flotación ─────────────────────────────────────────────
        scene.tweens.add({
            targets: this,
            y: y - 8,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // ── Brillo / pulso de escala ──────────────────────────────────────────
        scene.tweens.add({
            targets: this,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Auto-destruir tras 12 segundos si no se recoge
        scene.time.delayedCall(12000, () => {
            if (this.active) this._fadeOut();
        });
    }

    // ── Aplicar efecto ────────────────────────────────────────────────────────

    /**
     * Aplica el efecto del power-up al jugador.
     * También notifica al arma si el tipo lo requiere.
     * Llamar desde CollisionManager al detectar overlap.
     *
     * @param {import('./Player').default} player  - Jugador que recoge el power-up
     * @param {import('./Weapon').default} weapon  - Arma del jugador
     */
    apply(player, weapon) {
        if (!this.active) return;

        switch (this.type) {
            case 'damage':
                player.damage += 15;
                if (weapon) weapon.upgrade('damage');
                break;

            case 'speed':
                player.moveSpeed = Math.min(player.moveSpeed + 30, 320);
                break;

            case 'health':
                player.maxHealth += 20;
                player.heal(40);
                break;

            case 'range':
                if (weapon) weapon.upgrade('range');
                break;

            case 'fireRate':
                if (weapon) weapon.upgrade('fireRate');
                break;
        }

        // Emitir evento para texto/SFX (Persona B los puede escuchar)
        this._scene.events.emit('powerup-collected', this.type);
        this._scene.events.emit('sfx-powerup');

        console.log(`[PowerUp] Recogido: ${this.type}`);

        this._fadeOut();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Desvanece y destruye el power-up.
     * @private
     */
    _fadeOut() {
        this.setActive(false);
        this._scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 1.6,
            scaleY: 1.6,
            duration: 250,
            onComplete: () => { this.destroy(); },
        });
    }

    // ── Factory estático ──────────────────────────────────────────────────────

    /**
     * Tipos disponibles de power-up para uso externo.
     * @type {string[]}
     */
    static TYPES = ['damage', 'speed', 'health', 'range', 'fireRate'];

    /**
     * Retorna un tipo aleatorio de power-up.
     * @returns {string}
     */
    static randomType() {
        return PowerUp.TYPES[Math.floor(Math.random() * PowerUp.TYPES.length)];
    }
}