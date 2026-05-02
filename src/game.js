import { Player, Enemy, Bullet } from './entities.js';
import { playExplosionSound, playEnemyShootSound } from './audio.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = new Player(canvas);
    this.enemies = [];
    this.enemyBullets = [];
    
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    
    this.energy = 100;
    this.energyDrainRate = 2; // per second
    
    this.state = 'start'; // start, playing, gameover
    this.lastTime = 0;
    
    this.enemyShootTimer = 0;
    
    this.uiScore = document.getElementById('score');
    this.uiLives = document.getElementById('lives');
    this.uiWave = document.getElementById('wave');
    this.uiEnergyBar = document.getElementById('energy-bar');
    this.uiStartScreen = document.getElementById('start-screen');
    this.uiGameOverScreen = document.getElementById('game-over-screen');
    
    this.input = {
      left: false,
      right: false,
      space: false
    };
    
    this.setupInput();
  }

  setupInput() {
    // Keyboard Input
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowLeft') this.input.left = true;
      if (e.code === 'ArrowRight') this.input.right = true;
      if (e.code === 'Space') {
        this.input.space = true;
      }
      if (e.code === 'KeyN') {
        this.handleActionInput();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft') this.input.left = false;
      if (e.code === 'ArrowRight') this.input.right = false;
      if (e.code === 'Space') this.input.space = false;
    });

    // Touch Input
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnAction = document.getElementById('btn-action');

    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.left = true; });
    btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); this.input.left = false; });
    
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.right = true; });
    btnRight.addEventListener('touchend', (e) => { e.preventDefault(); this.input.right = false; });
    
    btnAction.addEventListener('touchstart', (e) => { 
      e.preventDefault(); 
      this.input.space = true; // Tiro
      this.handleActionInput(); // Iniciar/Reiniciar
    });
    btnAction.addEventListener('touchend', (e) => { e.preventDefault(); this.input.space = false; });

    // Mouse support for buttons (optional but helpful for testing)
    btnLeft.addEventListener('mousedown', () => { this.input.left = true; });
    btnLeft.addEventListener('mouseup', () => { this.input.left = false; });
    btnLeft.addEventListener('mouseleave', () => { this.input.left = false; });

    btnRight.addEventListener('mousedown', () => { this.input.right = true; });
    btnRight.addEventListener('mouseup', () => { this.input.right = false; });
    btnRight.addEventListener('mouseleave', () => { this.input.right = false; });

    btnAction.addEventListener('mousedown', () => { 
      this.input.space = true; 
      this.handleActionInput(); 
    });
    btnAction.addEventListener('mouseup', () => { this.input.space = false; });
  }

  handleActionInput() {
    if (this.state === 'start') {
      this.startPlaying();
    } else if (this.state === 'gameover') {
      this.resetGame();
    }
  }

  startPlaying() {
    this.state = 'playing';
    this.uiStartScreen.style.display = 'none';
    this.spawnWave();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resetGame() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.energy = 100;
    this.player = new Player(this.canvas);
    this.enemies = [];
    this.enemyBullets = [];
    this.uiGameOverScreen.style.display = 'none';
    this.updateUI();
    this.spawnWave();
    this.state = 'playing';
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  spawnWave() {
    this.enemies = [];
    this.enemyBullets = [];
    this.player.bullets = [];
    const rows = 3;
    const cols = 8;
    const speedMultiplier = 1 + (this.wave - 1) * 0.2;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // distribute evenly
        const x = 50 + c * 60;
        const y = 30 + r * 50;
        this.enemies.push(new Enemy(x, y, this.wave, speedMultiplier));
      }
    }
  }

  update(dt) {
    if (this.state !== 'playing') return;

    // Drain Energy
    this.energy -= this.energyDrainRate * dt;
    if (this.energy <= 0) {
      this.loseLife();
      return;
    }

    this.player.update(dt, this.input);

    // Enemy shooting logic (one random enemy shoots periodically)
    this.enemyShootTimer += dt;
    const shootInterval = Math.max(0.5, 2 - this.wave * 0.2);
    if (this.enemyShootTimer > shootInterval && this.enemies.length > 0) {
      this.enemyShootTimer = 0;
      const randomEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      this.enemyBullets.push(new Bullet(randomEnemy.x + randomEnemy.width / 2 - 2, randomEnemy.y + randomEnemy.height, 200 + this.wave * 20, '#f00'));
      playEnemyShootSound();
    }

    // Update enemies
    let hitBottom = false;
    this.enemies.forEach(enemy => {
      enemy.update(dt, this.canvas);
      if (enemy.y + enemy.height > this.canvas.height - 50) {
        hitBottom = true;
      }
    });

    if (hitBottom) {
      this.loseLife();
      return;
    }

    // Update enemy bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      this.enemyBullets[i].update(dt);
      if (this.enemyBullets[i].y > this.canvas.height) {
        this.enemyBullets.splice(i, 1);
      }
    }

    this.checkCollisions();

    // Check wave clear
    if (this.enemies.length === 0) {
      this.wave++;
      this.energy = 100;
      this.spawnWave();
    }

    this.updateUI();
  }

  checkCollisions() {
    // Player bullets hitting enemies
    for (let i = this.player.bullets.length - 1; i >= 0; i--) {
      let hit = false;
      const pb = this.player.bullets[i];
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (pb.x < e.x + e.width && pb.x + pb.width > e.x &&
            pb.y < e.y + e.height && pb.y + pb.height > e.y) {
          
          this.enemies.splice(j, 1);
          hit = true;
          this.score += 10 * this.wave;
          playExplosionSound();
          break;
        }
      }
      
      if (hit) {
        this.player.bullets.splice(i, 1);
      }
    }

    // Enemy bullets hitting player
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      const p = this.player;
      
      if (eb.x < p.x + p.width && eb.x + eb.width > p.x &&
          eb.y < p.y + p.height && eb.y + eb.height > p.y) {
        
        this.enemyBullets.splice(i, 1);
        this.takeDamage();
        break;
      }
    }
    
    // Enemies hitting player
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      const p = this.player;
      if (e.x < p.x + p.width && e.x + e.width > p.x &&
          e.y < p.y + p.height && e.y + e.height > p.y) {
        this.enemies.splice(j, 1);
        this.takeDamage();
        break;
      }
    }
  }

  takeDamage() {
    // Qualquer inimigo ou tiro inimigo agora destrói a nave instantaneamente
    this.loseLife();
  }

  loseLife() {
    this.lives--;
    playExplosionSound();
    if (this.lives <= 0) {
      this.state = 'gameover';
      this.uiGameOverScreen.style.display = 'flex';
    } else {
      // Reset player and energy for the current wave
      this.player = new Player(this.canvas);
      this.energy = 100;
      this.enemyBullets = [];
    }
    this.updateUI();
  }

  updateUI() {
    this.uiScore.innerText = `Score: ${this.score}`;
    this.uiLives.innerText = `Lives: ${this.lives}`;
    this.uiWave.innerText = `Wave: ${this.wave}`;
    this.uiEnergyBar.style.width = `${Math.max(0, this.energy)}%`;
    
    // Mudar cor da energia se estiver acabando
    if (this.energy < 30) {
      this.uiEnergyBar.style.backgroundColor = '#f00';
    } else if (this.energy < 60) {
      this.uiEnergyBar.style.backgroundColor = '#fa0';
    } else {
      this.uiEnergyBar.style.backgroundColor = '#0f0';
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.state === 'playing') {
      this.player.draw(this.ctx);
      this.enemies.forEach(e => e.draw(this.ctx));
      this.enemyBullets.forEach(b => b.draw(this.ctx));
    }
  }

  loop(timestamp) {
    if (this.state === 'playing') {
      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      
      // Limit dt to avoid huge jumps if tab was inactive
      if (dt < 0.1) {
        this.update(dt);
        this.draw();
      }
      
      requestAnimationFrame((t) => this.loop(t));
    }
  }
}
