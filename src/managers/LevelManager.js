/**
 * LevelManager.js
 * Gestiona la curva de experiencia y niveles del jugador.
 * Se apoya en los métodos de Player (gainExp / levelUp),
 * pero centraliza la lógica de progresión y las notificaciones.
 *
 * Curva de XP:
 *   Nivel 1  → 10 XP
 *   Nivel 2  → 16 XP
 *   Nivel 3  → 26 XP
 *   Nivel N  → floor(10 * 1.6^(N-1))
 */
export default class LevelManager {
    /**
     * @param {Phaser.Scene}                    scene  - Escena activa
     * @param {import('../objects/Player').default} player - Jugador
     */
    constructor(scene, player) {
        this._scene = scene;
        this._player = player;

        // Escuchar evento emitido por gemas de XP al ser recogidas
        scene.events.on('xp-gem-collected', this._onGemCollected, this);

        // Escuchar evento de level-up emitido por el propio Player
        scene.events.on('player-level-up', this._onLevelUp, this);
    }

    // ── Eventos ───────────────────────────────────────────────────────────────

    /**
     * Llamado cuando el jugador recoge una gema de XP.
     * @param {number} amount - XP de la gema
     * @private
     */
    _onGemCollected(amount) {
        this.addExp(amount);
    }

    /**
     * Llamado cuando el jugador sube de nivel.
     * Emite evento para que AudioManager reproduzca el SFX.
     * @param {number} newLevel
     * @private
     */
    _onLevelUp(newLevel) {
        console.log(`[LevelManager] ¡Nivel ${newLevel}!`);
        this._scene.events.emit('sfx-levelup');

        // Ofrecer selección de mejora cada 3 niveles (opcional, Persona B puede usar este evento)
        if (newLevel % 3 === 0) {
            this._scene.events.emit('show-upgrade-menu');
        }
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Añade experiencia al jugador y delega la lógica de subida de nivel
     * a la clase Player (que ya implementa el bucle de levelUp).
     * @param {number} amount - XP a añadir
     */
    addExp(amount) {
        if (!this._player || !this._player.isAlive()) return;
        this._player.gainExp(amount);
    }

    /**
     * Verifica manualmente si el jugador debe subir de nivel.
     * Útil si se modifica la XP del jugador desde otro lugar.
     */
    checkLevelUp() {
        while (
            this._player.exp >= this._player.expToNextLevel
        ) {
            this._player.levelUp();
        }
    }

    /**
     * Retorna la XP necesaria para el siguiente nivel.
     * @returns {number}
     */
    getExpToNextLevel() {
        return this._player.expToNextLevel;
    }

    /**
     * Retorna el porcentaje de progreso al siguiente nivel (0–1).
     * Útil para que Persona B dibuje la barra de XP.
     * @returns {number}
     */
    getExpProgress() {
        return Math.min(this._player.exp / this._player.expToNextLevel, 1);
    }

    // ── Limpieza ──────────────────────────────────────────────────────────────

    destroy() {
        this._scene.events.off('xp-gem-collected', this._onGemCollected, this);
        this._scene.events.off('player-level-up', this._onLevelUp, this);
    }
}