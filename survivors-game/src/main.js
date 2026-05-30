/**
 * main.js
 * Punto de entrada de la aplicación.
 * Configura Phaser y registra las escenas de ambas personas.
 *
 * PERSONA A provee:  GameScene
 * PERSONA B provee:  MenuScene, PauseScene, GameOverScene, VictoryScene
 *                    + HUD (se lanza en paralelo con GameScene)
 */
import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

// ── Importaciones de Persona B (placeholders hasta que las entregue) ────────
// Si los archivos no existen aún, comentar las líneas correspondientes.
// import MenuScene    from './scenes/MenuScene.js';
// import PauseScene   from './scenes/PauseScene.js';
// import GameOverScene from './scenes/GameOverScene.js';
// import VictoryScene from './scenes/VictoryScene.js';
// import HUDScene     from './ui/HUD.js';

// ── Escenas de Persona A en modo standalone (para pruebas sin Persona B) ──
// Escenas mínimas de relleno hasta integrar el trabajo de Persona B
class MenuScenePlaceholder extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x0f0f23);
    this.add.text(W / 2, H / 2 - 60, 'SURVIVORS', {
      fontSize: '52px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const btn = this.add.text(W / 2, H / 2 + 40, '▶  JUGAR', {
      fontSize: '28px', color: '#00ff88',
      backgroundColor: '#1a1a3e', padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#00ff88' }));
    btn.on('pointerdown', () => this.scene.start('GameScene'));

    this.add.text(W / 2, H - 40, 'WASD / Flechas para moverse  •  ESC para pausar', {
      fontSize: '14px', color: '#888888'
    }).setOrigin(0.5);
  }
}

class PauseScenePlaceholder extends Phaser.Scene {
  constructor() { super({ key: 'PauseScene' }); }
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7);
    this.add.text(W / 2, H / 2 - 80, 'PAUSA', {
      fontSize: '44px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const resume = this.add.text(W / 2, H / 2, '▶  CONTINUAR', {
      fontSize: '24px', color: '#00ff88',
      backgroundColor: '#1a1a3e', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resume.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });

    const menu = this.add.text(W / 2, H / 2 + 70, '⏏  MENÚ', {
      fontSize: '20px', color: '#ff6666',
      backgroundColor: '#1a1a3e', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menu.on('pointerdown', () => {
      this.scene.stop();
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });
  }
}

class GameOverScenePlaceholder extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }
  init(data) { this._data = data || {}; }
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a0a);
    this.add.text(W / 2, H / 2 - 120, 'GAME OVER', {
      fontSize: '52px', color: '#ff4444', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 - 40,
      `Puntaje: ${this._data.score ?? 0}`, {
      fontSize: '26px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2,
      `Nivel: ${this._data.level ?? 1}`, {
      fontSize: '22px', color: '#aaaaaa'
    }).setOrigin(0.5);

    const retry = this.add.text(W / 2, H / 2 + 80, '↺  REINTENTAR', {
      fontSize: '24px', color: '#00ff88',
      backgroundColor: '#1a1a3e', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retry.on('pointerdown', () => this.scene.start('GameScene'));

    const menu = this.add.text(W / 2, H / 2 + 150, '⏏  MENÚ', {
      fontSize: '20px', color: '#888888',
      backgroundColor: '#1a1a3e', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menu.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}

class VictoryScenePlaceholder extends Phaser.Scene {
  constructor() { super({ key: 'VictoryScene' }); }
  init(data) { this._data = data || {}; }
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1a0a);
    this.add.text(W / 2, H / 2 - 120, '¡VICTORIA!', {
      fontSize: '52px', color: '#00ff88', fontStyle: 'bold'
    }).setOrigin(0.5);

    const mins = Math.floor((this._data.elapsedSeconds ?? 0) / 60)
      .toString().padStart(2, '0');
    const secs = ((this._data.elapsedSeconds ?? 0) % 60)
      .toString().padStart(2, '0');

    this.add.text(W / 2, H / 2 - 40,
      `Tiempo: ${mins}:${secs}`, {
      fontSize: '26px', color: '#ffffff'
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2,
      `Puntaje: ${this._data.score ?? 0}  |  Nivel: ${this._data.level ?? 1}`, {
      fontSize: '22px', color: '#aaaaaa'
    }).setOrigin(0.5);

    const menu = this.add.text(W / 2, H / 2 + 90, '⏏  MENÚ', {
      fontSize: '24px', color: '#00ff88',
      backgroundColor: '#1a1a3e', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menu.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}

// ── Configuración de Phaser ──────────────────────────────────────────────────

const config = {
  type: Phaser.AUTO,

  // Resolución base; el CSS hace el escalado responsivo
  width: 960,
  height: 540,

  backgroundColor: '#0f0f23',

  // Escalar al contenedor manteniendo relación de aspecto
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },   // Top-down: sin gravedad
      debug: false,       // Cambiar a true para depurar hitboxes
    },
  },

  // Todas las escenas registradas
  // Orden: el primero en el array es la escena de arranque
  scene: [
    MenuScenePlaceholder,
    GameScene,
    PauseScenePlaceholder,
    GameOverScenePlaceholder,
    VictoryScenePlaceholder,
    // Persona B reemplazará los Placeholder por sus escenas reales:
    // MenuScene, PauseScene, GameOverScene, VictoryScene, HUDScene
  ],
};

// ── Arrancar el juego ────────────────────────────────────────────────────────
const game = new Phaser.Game(config);

export default game;