import { SPRITES, drawSprite } from './sprites.js';
import { playShootSound } from './audio.js';

export class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = 40;
    this.height = 40;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - this.height - 30; // Acima da barra de energia
    this.speed = 300; // pixels per second
    this.color = SPRITES.player.color;
    this.bullets = [];
    this.lastShotTime = 0;
    this.shootCooldown = 0.2; // segundos
    this.hitsTaken = 0;
  }

  update(dt, input) {
    if (input.left) {
      this.x -= this.speed * dt;
    }
    if (input.right) {
      this.x += this.speed * dt;
    }

    // Limit to canvas
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > this.canvas.width) this.x = this.canvas.width - this.width;

    if (input.space && performance.now() / 1000 - this.lastShotTime > this.shootCooldown) {
      this.shoot();
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].update(dt);
      if (this.bullets[i].y < 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  shoot() {
    this.bullets.push(new Bullet(this.x + this.width / 2 - 2, this.y, -500, '#0f0'));
    this.lastShotTime = performance.now() / 1000;
    playShootSound();
  }

  draw(ctx) {
    // Draw bullets
    this.bullets.forEach(b => b.draw(ctx));

    // Blink if hit once (for levels 1-4)
    if (this.hitsTaken === 1) {
      if (Math.floor(performance.now() / 100) % 2 === 0) return;
    }

    // Draw player
    drawSprite(ctx, SPRITES.player.data, this.x, this.y, this.width, this.height, this.color);
  }
}

export class Enemy {
  constructor(x, y, waveType, speedMultiplier) {
    this.width = 30;
    this.height = 30;
    this.x = x;
    this.y = y;
    this.waveType = waveType; // 1 to 5
    
    // Configurações por tipo
    const types = ['hamburger', 'cookie', 'iron', 'bowtie', 'diamond'];
    this.spriteName = types[(this.waveType - 1) % 5];
    this.color = SPRITES[this.spriteName].color;
    this.spriteData = SPRITES[this.spriteName].data;
    
    this.speedX = 100 * speedMultiplier;
    this.speedY = 10 * speedMultiplier;
    this.direction = 1; // 1 = right, -1 = left
    
    // Zigzag param
    this.startX = x;
    this.moveRange = 50;
    
    // Diamond moves differently or just faster? 
    if (this.waveType === 5) {
      this.speedX *= 1.5;
      this.speedY *= 1.5;
    }
  }

  update(dt, canvas) {
    // Movimento Zigue-zague ou descendo
    this.x += this.speedX * this.direction * dt;
    this.y += this.speedY * dt;

    if (this.x > this.startX + this.moveRange || this.x + this.width > canvas.width) {
      this.direction = -1;
    } else if (this.x < this.startX - this.moveRange || this.x < 0) {
      this.direction = 1;
    }
  }

  draw(ctx) {
    drawSprite(ctx, this.spriteData, this.x, this.y, this.width, this.height, this.color);
  }
}

export class Bullet {
  constructor(x, y, speed, color) {
    this.x = x;
    this.y = y;
    this.width = 4;
    this.height = 10;
    this.speed = speed;
    this.color = color;
  }

  update(dt) {
    this.y += this.speed * dt;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}
