let gameScene = new Phaser.Scene("Game");

let config = {
  type: Phaser.AUTO,
  width: 640,
  height: 360,
  scene: gameScene,
};

let game = new Phaser.Game(config);

gameScene.init = function () {
  this.playerSpeed = 1.5;
  this.enemyMaxY = 280;
  this.enemyMinY = 80;
};

gameScene.preload = function () {};

gameScene.create = function () {
  this.graphics = new Phaser.GameObjects.Graphics(this);
};

gameScene.update = function () {
  this.graphics.lineStyle(5, 0xff00ff, 1.0);
  this.graphics.beginPath();
  this.graphics.moveTo(100, 100);
  this.graphics.lineTo(200, 200);
  this.graphics.closePath();
  this.graphics.strokePath();
  this.graphics.lineStyle(5, 0xff00ff, 1.0);
  this.graphics.fillStyle(0xffffff, 1.0);
  this.graphics.fillRect(50, 50, 400, 200);
  this.graphics.strokeRect(50, 50, 400, 200);
};

gameScene.gameOver = function () {};
