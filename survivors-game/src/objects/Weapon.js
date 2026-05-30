/**
 * Weapon.js
 * Sistema de armas del jugador.
 * El arma dispara automáticamente al enemigo más cercano dentro del rango.
 * Soporta múltiples tipos de arma (básica, dispersión, órbita).
 */
export default class Weapon {
    /**
     * @param {Phaser.Scene} scene    - Escena activa
     * @param {Player}       player   - Referencia al jugador dueño del arma
     * @param {object}       config   - Configuración inicial del arma
     */
    constructor(scene, player, config = {}) {
        this._scene = scene;
        this._player = player;

        // ── Estadísticas del arma ─────────────────────────────────────────────
        this.damage = config.damage ?? 20;
        this.fireRate = config.fireRate ?? 800;   // ms entre disparos
        this.range = config.range ?? 300;   // píxeles de alcance
        this.type = config.type ?? 'basic'; // 'basic' | 'spread' | 'orbit'

        // ── Estado interno ────────────────────────────────────────────────────
        this._lastFired = 0;  // timestamp del último disparo
        this._level = 1;

        // ── Pool de proyectiles ───────────────────────────────────────────────
        // Se llena con instancias de Projectile y se reutilizan
        this._projectileGroup = scene.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 50,
            runChildUpdate: false,
        });

        // Guardar referencia global en la escena para que CollisionManager acceda
        scene.projectiles = this._projectileGroup;
    }

    // ── Ciclo de actualización ────────────────────────────────────────────────

    /**
     * Llamar desde GameScene.update().
     * @param {number}               time     - Tiempo actual (ms)
     * @param {Phaser.GameObjects.Group} enemies - Grupo de enemigos activos
     */
    update(time, enemies) {
        if (time - this._lastFired >= this.fireRate) {
            const target = this._findNearestEnemy(enemies);
            if (target) {
                this.attack(target);
                this._lastFired = time;
            }
        }
    }

    // ── Ataque ───────────────────────────────────────────────────────────────

    /**
     * Dispara uno o varios proyectiles dependiendo del tipo de arma.
     * @param {Phaser.GameObjects.Sprite} target - Enemigo objetivo
     */
    attack(target) {
        const px = this._player.x;
        const py = this._player.y;

        switch (this.type) {
            case 'spread':
                // 3 proyectiles en abanico
                for (let angle = -20; angle <= 20; angle += 20) {
                    this._fireAt(px, py, target.x, target.y, angle);
                }
                break;

            case 'orbit':
                // 4 proyectiles en cruz (efecto orbital básico)
                const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                offsets.forEach(([ox, oy]) => {
                    this._fireAt(px, py, px + ox * 100, py + oy * 100, 0);
                });
                break;

            case 'basic':
            default:
                this._fireAt(px, py, target.x, target.y, 0);
                break;
        }

        // Emitir evento de sonido para AudioManager (Persona B)
        this._scene.events.emit('sfx-shoot');
    }

    /**
     * Crea y lanza un proyectil desde (ox,oy) hacia (tx,ty) con rotación extra.
     * @param {number} ox          - Origen X
     * @param {number} oy          - Origen Y
     * @param {number} tx          - Target X
     * @param {number} ty          - Target Y
     * @param {number} angleOffset - Desviación angular en grados
     * @private
     */
    _fireAt(ox, oy, tx, ty, angleOffset) {
        const speed = 420;

        // Calcular ángulo hacia el objetivo + desviación
        const baseAngle = Phaser.Math.Angle.Between(ox, oy, tx, ty);
        const finalAngle = baseAngle + Phaser.Math.DegToRad(angleOffset);

        const vx = Math.cos(finalAngle) * speed;
        const vy = Math.sin(finalAngle) * speed;

        // Obtener proyectil del pool o crear uno nuevo
        const bullet = this._projectileGroup.get(ox, oy, 'projectile');
        if (!bullet) return; // pool lleno

        bullet.setActive(true)
            .setVisible(true)
            .setDepth(5)
            .setPosition(ox, oy);

        // Guardar daño en el proyectil para que CollisionManager lo use
        bullet.damage = this.damage + this._player.damage - 20; // base + bonus del jugador

        this._scene.physics.velocityFromRotation(finalAngle, speed, bullet.body.velocity);

        // Destruir el proyectil tras recorrer cierto tiempo (evita acumulación)
        this._scene.time.delayedCall(1200, () => {
            if (bullet.active) {
                bullet.setActive(false).setVisible(false);
                bullet.body.stop();
            }
        });
    }

    // ── Búsqueda de objetivo ──────────────────────────────────────────────────

    /**
     * Encuentra el enemigo activo más cercano al jugador dentro del rango.
     * @param   {Phaser.GameObjects.Group} enemies
     * @returns {Phaser.GameObjects.Sprite|null}
     * @private
     */
    _findNearestEnemy(enemies) {
        if (!enemies) return null;

        let nearest = null;
        let minDist = this.range;

        enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            const dist = Phaser.Math.Distance.Between(
                this._player.x, this._player.y,
                enemy.x, enemy.y
            );
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });

        return nearest;
    }

    // ── Mejoras ───────────────────────────────────────────────────────────────

    /**
     * Sube el nivel del arma y aplica mejoras.
     * Se puede llamar desde PowerUp o al subir de nivel.
     * @param {string} stat - 'damage' | 'fireRate' | 'range' | 'type'
     */
    upgrade(stat) {
        this._level++;

        switch (stat) {
            case 'damage':
                this.damage += 10;
                console.log(`[Weapon] Daño mejorado → ${this.damage}`);
                break;

            case 'fireRate':
                // Reducir cooldown (mínimo 200ms)
                this.fireRate = Math.max(200, this.fireRate - 100);
                console.log(`[Weapon] FireRate mejorado → ${this.fireRate}ms`);
                break;

            case 'range':
                this.range += 60;
                console.log(`[Weapon] Rango mejorado → ${this.range}px`);
                break;

            case 'type':
                if (this.type === 'basic') this.type = 'spread';
                else if (this.type === 'spread') this.type = 'orbit';
                console.log(`[Weapon] Tipo mejorado → ${this.type}`);
                break;
        }
    }

    /** @returns {number} Nivel actual del arma */
    getLevel() { return this._level; }
}