/**
 * CollisionManager.js
 * Centraliza el registro de colisiones y overlaps usando Arcade Physics.
 *
 * Pares gestionados:
 *   • Jugador  ↔ Enemigos    → jugador recibe daño
 *   • Proyectil ↔ Enemigos   → enemigo recibe daño, proyectil se destruye
 *   • Jugador  ↔ Gemas XP    → jugador gana experiencia
 *   • Jugador  ↔ Power-ups   → se aplica la mejora
 */
export default class CollisionManager {
    /**
     * @param {Phaser.Scene}                        scene       - Escena activa
     * @param {import('../objects/Player').default}  player      - Jugador
     * @param {Phaser.GameObjects.Group}             enemies     - Grupo de enemigos
     * @param {Phaser.GameObjects.Group}             projectiles - Grupo de proyectiles
     * @param {Phaser.GameObjects.Group}             xpGems      - Grupo de gemas de XP
     * @param {Phaser.GameObjects.Group}             powerUps    - Grupo de power-ups
     * @param {import('../objects/Weapon').default}  weapon      - Arma del jugador
     */
    constructor(scene, player, enemies, projectiles, xpGems, powerUps, weapon) {
        this._scene = scene;
        this._player = player;
        this._weapon = weapon;

        // ── Registrar colisiones ──────────────────────────────────────────────
        this._registerPlayerVsEnemies(player, enemies);
        this._registerProjectileVsEnemies(projectiles, enemies);
        this._registerPlayerVsXpGems(player, xpGems);
        this._registerPlayerVsPowerUps(player, powerUps, weapon);
    }

    // ── Jugador vs Enemigos ───────────────────────────────────────────────────

    /**
     * Overlap: el jugador toca un enemigo → recibe daño del enemigo.
     * @private
     */
    _registerPlayerVsEnemies(player, enemies) {
        this._scene.physics.add.overlap(
            player,
            enemies,
            (p, enemy) => {
                if (!enemy.active || enemy.isDead()) return;
                p.takeDamage(enemy.damage);
            },
            null,
            this
        );
    }

    // ── Proyectil vs Enemigos ─────────────────────────────────────────────────

    /**
     * Overlap: un proyectil toca un enemigo → enemigo recibe daño y proyectil se destruye.
     * También añade un leve knockback al enemigo.
     * @private
     */
    _registerProjectileVsEnemies(projectiles, enemies) {
        this._scene.physics.add.overlap(
            projectiles,
            enemies,
            (bullet, enemy) => {
                if (!bullet.active || !enemy.active || enemy.isDead()) return;

                // Calcular dirección del knockback (proyectil → enemigo)
                const angle = Phaser.Math.Angle.Between(
                    bullet.x, bullet.y,
                    enemy.x, enemy.y
                );
                const kbForce = 120;
                const kbVx = Math.cos(angle) * kbForce;
                const kbVy = Math.sin(angle) * kbForce;

                enemy.takeDamage(bullet.damage ?? 20, kbVx, kbVy);

                // Desactivar proyectil (vuelve al pool)
                bullet.setActive(false).setVisible(false);
                bullet.body.stop();

                // SFX de impacto
                this._scene.events.emit('sfx-hit');
            },
            null,
            this
        );
    }

    // ── Jugador vs Gemas XP ───────────────────────────────────────────────────

    /**
     * Overlap: el jugador toca una gema de XP → gana experiencia.
     * @private
     */
    _registerPlayerVsXpGems(player, xpGems) {
        this._scene.physics.add.overlap(
            player,
            xpGems,
            (p, gem) => {
                if (!gem.active) return;
                const expAmount = gem.getData('exp') ?? 5;

                // Emitir evento para LevelManager
                this._scene.events.emit('xp-gem-collected', expAmount);

                // SFX recogida
                this._scene.events.emit('sfx-pickup');

                // Efecto visual pequeño antes de destruir
                this._scene.tweens.add({
                    targets: gem,
                    alpha: 0,
                    scaleX: 0,
                    scaleY: 0,
                    duration: 150,
                    onComplete: () => {
                        gem.setActive(false).setVisible(false);
                        // Si es de un pool, simplemente lo desactivamos
                    },
                });
            },
            null,
            this
        );
    }

    // ── Jugador vs Power-ups ──────────────────────────────────────────────────

    /**
     * Overlap: el jugador toca un power-up → se aplica la mejora.
     * @private
     */
    _registerPlayerVsPowerUps(player, powerUps, weapon) {
        this._scene.physics.add.overlap(
            player,
            powerUps,
            (p, pu) => {
                if (!pu.active) return;
                pu.apply(p, weapon);
            },
            null,
            this
        );
    }
}