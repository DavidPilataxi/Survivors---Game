/**
 * EnemyManager.js
 * Gestiona el spawn de enemigos, las oleadas y la dificultad progresiva.
 *
 * Tabla de oleadas (basada en tiempo de juego):
 *   0–60s   → básicos, spawn lento
 *   60–120s → más básicos + fast
 *   120–180s→ fast + básicos, spawn medio
 *   180–300s→ tanks + elite, spawn rápido
 *   300s+   → todo tipo, spawn muy rápido
 */
import Enemy from '../objects/Enemy.js';

export default class EnemyManager {
    /**
     * @param {Phaser.Scene} scene  - Escena activa
     * @param {Player}       player - Referencia al jugador (para spawn alrededor)
     */
    constructor(scene, player) {
        this._scene = scene;
        this._player = player;

        // ── Grupo de enemigos activos ─────────────────────────────────────────
        this.enemies = scene.physics.add.group();

        // Guardar referencia global para que CollisionManager y Weapon accedan
        scene.enemies = this.enemies;

        // ── Estado de oleadas ─────────────────────────────────────────────────
        this._waveIndex = 0;  // Índice de oleada actual
        this._spawnTimer = null;
        this._elapsedSeconds = 0;  // Se actualiza desde GameScene

        // ── Iniciar primera oleada ────────────────────────────────────────────
        this.startWave(0);
    }

    // ── Control de oleadas ────────────────────────────────────────────────────

    /**
     * Define y arranca una oleada según el índice recibido.
     * Cada oleada tiene intervalo de spawn y tipos de enemigos distintos.
     * @param {number} waveIndex
     */
    startWave(waveIndex) {
        this._waveIndex = waveIndex;

        // Cancelar timer anterior si existe
        if (this._spawnTimer) this._spawnTimer.remove(false);

        const config = EnemyManager.WAVES[waveIndex] ?? EnemyManager.WAVES[EnemyManager.WAVES.length - 1];

        this._spawnTimer = this._scene.time.addEvent({
            delay: config.interval,
            loop: true,
            callback: () => this.spawnEnemy(config.types),
        });

        this._scene.events.emit('wave-started', waveIndex);
        console.log(`[EnemyManager] Oleada ${waveIndex + 1} iniciada | Intervalo: ${config.interval}ms`);
    }

    /**
     * Tabla de oleadas.
     * interval → ms entre spawns
     * types    → tipos posibles (se elige al azar entre ellos)
     */
    static WAVES = [
        { interval: 1800, types: ['basic'] }, // 0–60s
        { interval: 1400, types: ['basic', 'basic', 'fast'] }, // 60–120s
        { interval: 1100, types: ['basic', 'fast', 'fast'] }, // 120–180s
        { interval: 900, types: ['fast', 'tank', 'elite'] }, // 180–300s
        { interval: 650, types: ['basic', 'fast', 'tank', 'elite'] }, // 300s+
    ];

    // ── Spawn ─────────────────────────────────────────────────────────────────

    /**
     * Genera un enemigo en el borde de la pantalla, lejos del jugador.
     * @param {string[]} types - Tipos posibles para esta oleada
     */
    spawnEnemy(types) {
        if (!this._player || !this._player.isAlive()) return;

        const type = types[Math.floor(Math.random() * types.length)];
        const { x, y } = this._randomSpawnPosition();

        const enemy = new Enemy(this._scene, x, y, type);
        this.enemies.add(enemy);
    }

    /**
     * Calcula una posición de spawn aleatoria fuera del área visible
     * pero cercana al jugador (para que siempre haya presión).
     * @returns {{ x: number, y: number }}
     * @private
     */
    _randomSpawnPosition() {
        const margin = 80;   // px fuera de la cámara
        const camW = this._scene.scale.width;
        const camH = this._scene.scale.height;
        const cx = this._player.x;
        const cy = this._player.y;

        // Elegir uno de los 4 bordes
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch (side) {
            case 0: // arriba
                x = cx + Phaser.Math.Between(-camW / 2, camW / 2);
                y = cy - camH / 2 - margin;
                break;
            case 1: // abajo
                x = cx + Phaser.Math.Between(-camW / 2, camW / 2);
                y = cy + camH / 2 + margin;
                break;
            case 2: // izquierda
                x = cx - camW / 2 - margin;
                y = cy + Phaser.Math.Between(-camH / 2, camH / 2);
                break;
            case 3: // derecha
            default:
                x = cx + camW / 2 + margin;
                y = cy + Phaser.Math.Between(-camH / 2, camH / 2);
                break;
        }

        return { x, y };
    }

    // ── Dificultad dinámica ───────────────────────────────────────────────────

    /**
     * Evalúa el tiempo de juego y sube de oleada si corresponde.
     * Llamar desde GameScene.update() pasando los segundos transcurridos.
     * @param {number} elapsedSeconds - Segundos desde que empezó la partida
     */
    increaseDifficulty(elapsedSeconds) {
        let targetWave = 0;

        if (elapsedSeconds >= 300) targetWave = 4;
        else if (elapsedSeconds >= 180) targetWave = 3;
        else if (elapsedSeconds >= 120) targetWave = 2;
        else if (elapsedSeconds >= 60) targetWave = 1;

        if (targetWave > this._waveIndex) {
            this.startWave(targetWave);
        }
    }

    // ── Limpieza ──────────────────────────────────────────────────────────────

    /**
     * Actualiza todos los enemigos activos.
     * Llamar desde GameScene.update().
     */
    update() {
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) enemy.update(this._player);
        });

        // Limpiar enemigos inactivos del grupo periódicamente
        this.enemies.getChildren()
            .filter(e => !e.active)
            .forEach(e => this.enemies.remove(e, true, true));
    }

    /**
     * Detiene todos los spawns y limpia el grupo de enemigos.
     */
    stop() {
        if (this._spawnTimer) this._spawnTimer.remove(false);
        this.enemies.clear(true, true);
    }
}