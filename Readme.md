# Survivors – División de Trabajo

## Estructura del proyecto

```
src/
├── scenes/
│   └── GameScene.js          ← PERSONA A ✅
├── objects/
│   ├── Player.js             ← PERSONA A ✅
│   ├── Weapon.js             ← PERSONA A ✅
│   ├── Enemy.js              ← PERSONA A ✅
│   └── PowerUp.js            ← PERSONA A ✅
├── managers/
│   ├── EnemyManager.js       ← PERSONA A ✅
│   ├── LevelManager.js       ← PERSONA A ✅
│   ├── AudioManager.js       ← PERSONA B ⏳
│   └── StorageManager.js     ← PERSONA B ⏳
├── physics/
│   └── CollisionManager.js   ← PERSONA A ✅
├── ui/
│   ├── HUD.js                ← PERSONA B ⏳
│   ├── HealthBar.js          ← PERSONA B ⏳
│   ├── XPBar.js              ← PERSONA B ⏳
│   └── MobileControls.js     ← PERSONA B ⏳
├── assets/                   ← COMPARTIDO
│   ├── sprites/
│   └── tilemaps/
└── main.js                   ← PERSONA A ✅ (añadir escenas de B aquí)
```

---

## Convención de variables (RESPETAR)

### Jugador (`player.*`)
```js
player.health
player.maxHealth
player.level
player.exp
player.expToNextLevel
player.score
player.damage
player.moveSpeed
```

### Enemigos (`enemy.*`)
```js
enemy.health
enemy.damage
enemy.speed
enemy.expReward
```

---

## Eventos que emite Persona A (escuchar con `this.scene.get('GameScene').events.on(...)`)

| Evento | Parámetros | Uso |
|--------|-----------|-----|
| `player-health-changed` | `(health, maxHealth)` | Actualizar HealthBar |
| `player-exp-changed` | `(exp, expToNextLevel, level)` | Actualizar XPBar |
| `player-level-up` | `(level)` | SFX nivel, mostrar nivel |
| `player-dead` | `{ score, level }` | Ir a GameOverScene |
| `enemy-died` | `{ x, y, expReward, type }` | (ya gestionado internamente) |
| `game-time-update` | `(elapsedSeconds)` | Actualizar cronómetro HUD |
| `damage-number` | `(x, y, amount)` | Mostrar número flotante |
| `sfx-shoot` | — | Sonido disparo |
| `sfx-hit` | — | Sonido impacto |
| `sfx-pickup` | — | Sonido recoger XP |
| `sfx-levelup` | — | Sonido subir nivel |
| `sfx-powerup` | — | Sonido power-up |
| `wave-started` | `(waveIndex)` | Mostrar banner de oleada |
| `show-upgrade-menu` | — | Mostrar menú de mejora (cada 3 niveles) |

---

## Cómo lee el HUD los datos del jugador

```js
// En HUD.js (Persona B):
create() {
  const gameScene = this.scene.get('GameScene');

  gameScene.events.on('player-health-changed', (hp, maxHp) => {
    this.healthBar.update(hp, maxHp);
  });

  gameScene.events.on('player-exp-changed', (exp, expNext, level) => {
    this.xpBar.update(exp, expNext);
    this.levelText.setText(`Nivel ${level}`);
  });

  gameScene.events.on('game-time-update', (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    this.timeText.setText(`${m}:${s}`);
  });
}

// O acceso directo a las propiedades si el HUD corre en la misma escena:
update() {
  const player = this.scene.get('GameScene').player;
  this.hud.update(
    player.health,
    player.maxHealth,
    player.level,
    player.exp,
    player.score
  );
}
```

---

## Escenas de Persona B a registrar en `main.js`

Cuando Persona B entregue sus escenas, reemplazar los Placeholder en `main.js`:

```js
// Descomentar en main.js:
import MenuScene     from './scenes/MenuScene.js';
import PauseScene    from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import VictoryScene  from './scenes/VictoryScene.js';
import HUDScene      from './ui/HUD.js';

// Y actualizar el array scene:
scene: [
  MenuScene,
  GameScene,
  PauseScene,
  GameOverScene,
  VictoryScene,
  HUDScene,
]
```

---

## Assets necesarios (descargar de Kenney.nl)

Colocar en `src/assets/sprites/`:
- `player.png`
- `enemy_basic.png`, `enemy_fast.png`, `enemy_tank.png`, `enemy_elite.png`
- `projectile.png`
- `xp_gem.png`
- `pu_damage.png`, `pu_speed.png`, `pu_health.png`, `pu_range.png`, `pu_firerate.png`

Recomendado: [Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon)

---

## Ejecutar el proyecto

```bash
npm install
npm run dev
```