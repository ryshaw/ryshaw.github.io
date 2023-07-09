class BouncyBalls extends Phaser.Scene {
  circles; // the circles the player will collect
  player; // the player is a rectangle and can move using pointer
  isPointerDown; // checks if mouse input or touch input
  scoreText; // text that displays how many balls are left
  numCircles; // keeps track of score

  preload() {
    this.isPointerDown = false;
    this.numCircles = 0;
  }

  create() {
    // player is a rectangle
    this.player = this.add
      .rectangle(100, 100, 20, 20)
      .setStrokeStyle(2, 0xffffff);
    this.physics.add.existing(this.player);
    this.player.body
      .setBounce(1, 1)
      .setCollideWorldBounds(true)
      .setMaxSpeed(200);

    // create many circles that bounce around and change colors upon collision
    this.circles = [];

    for (let i = 0; i < 40; i++) {
      // assign a random point for circle to appear
      const boundsOffset = 20; // so circles don't start outside bounds
      const bounds = new Phaser.Geom.Rectangle(
        boundsOffset,
        boundsOffset,
        game.config.width - boundsOffset * 2,
        game.config.height - boundsOffset * 2
      );
      const randomPos = Phaser.Geom.Rectangle.Random(bounds);

      // basic circle
      const circle = this.add.arc(randomPos.x, randomPos.y, 10);
      circle.setFillStyle(Phaser.Display.Color.RandomRGB().color);
      circle.trail = []; // a trail of transparent circles behind the ball
      circle.alive = true; // alive until hit by player

      this.physics.add.existing(circle);
      const minMaxVelocity = [25, 250];
      circle.body
        .setVelocity(
          Phaser.Math.Between(minMaxVelocity[0], minMaxVelocity[1]),
          Phaser.Math.Between(minMaxVelocity[0], minMaxVelocity[1])
        )
        .setBounce(1)
        .setCollideWorldBounds(true);

      if (Math.random() > 0.5) {
        circle.body.velocity.x *= -1;
      } else {
        circle.body.velocity.y *= -1;
      }

      this.circles.push(circle);
      this.numCircles++;
    }

    this.score = this.add.text(5, 5, `circles left: ${this.numCircles}`, {
      font: "24px Courier",
      fill: "#00ff00",
    });

    this.add.text(
      game.config.width - 100,
      5,
      `dpr: ${window.devicePixelRatio}`,
      {
        font: "24px Courier",
        fill: "#00ff00",
      }
    );

    // remove circle if player touches
    this.physics.add.overlap(
      this.player,
      this.circles,
      function (player, circle) {
        circle.alive = false; // switch to dead so we can eliminate trail
        circle.destroy();
        this.numCircles--;
        this.score.setText(`circles left: ${this.numCircles}`);
      },
      null,
      this
    );

    // upon balls bouncing, switch both to random colors
    this.physics.add.collider(
      this.circles,
      this.circles,
      function (circle1, circle2) {
        circle1.setFillStyle(Phaser.Display.Color.RandomRGB().color);
        circle2.setFillStyle(Phaser.Display.Color.RandomRGB().color);
      }
    );

    // detect if mouse or touch input is happening
    this.input.on("pointerdown", () => (this.isPointerDown = true), this);
    this.input.on("pointerup", () => (this.isPointerDown = false), this);
  }

  update() {
    // if pointer is down, move player towards pointer
    if (this.isPointerDown) {
      // get player and mouse positions
      const playerPos = new Phaser.Math.Vector2(this.player.x, this.player.y);
      const pointerPos = this.input.activePointer.position;

      // if player is far enough away from pointer, move player towards pointer
      if (playerPos.distance(pointerPos) > 10) {
        // time for trig
        const angle = Phaser.Math.Angle.BetweenPoints(playerPos, pointerPos);
        const speed = this.player.body.speed;
        const maxSpeed = this.player.body.maxSpeed;

        // use linear interpolation to make it feel like acceleration
        this.player.body.setVelocity(
          Math.cos(angle) * Phaser.Math.Linear(speed, maxSpeed, 0.05),
          Math.sin(angle) * Phaser.Math.Linear(speed, maxSpeed, 0.05)
        );
      } else {
        // player is close enough, decelerate quickly
        this.player.body.setVelocity(
          Phaser.Math.Linear(this.player.body.velocity.x, 0, 0.2),
          Phaser.Math.Linear(this.player.body.velocity.y, 0, 0.2)
        );
      }
    } else {
      // if pointer is not down, have the player decelerate
      this.player.body.setVelocity(
        Phaser.Math.Linear(this.player.body.velocity.x, 0, 0.05),
        Phaser.Math.Linear(this.player.body.velocity.y, 0, 0.05)
      );
    }

    // add or maintain trail behind the moving ball
    this.circles.forEach((circle) => {
      // if circle is alive and doesn't have a long enough trail
      if (circle.alive && circle.trail.length < 4) {
        circle.trail.push(
          this.add
            .arc(circle.x, circle.y, 10)
            .setFillStyle(circle.fillColor)
            .setAlpha(0.7)
        );
      } else if (!circle.alive && circle.trail.length > 0) {
        // if circle is dead, remove a piece of trail every frame
        circle.trail.shift().destroy();
      }
      // if circle has a long enough trail, remove the oldest (farthest) part of trail
      if (circle.trail.length == 4) {
        circle.trail.shift().destroy();
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth * window.devicePixelRatio - 4,
  height: window.innerHeight * window.devicePixelRatio - 4,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  pixelArt: true,
  scaleMode: Phaser.Scale.ScaleModes.FIT,
  backgroundColor: "#000000",
  scene: BouncyBalls,
};

const game = new Phaser.Game(config);
