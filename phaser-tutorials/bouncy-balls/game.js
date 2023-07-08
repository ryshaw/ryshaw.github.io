class BouncyBalls extends Phaser.Scene {
  circles; // the circles the player will collect
  player; // the player is a rectangle and can move using pointer
  isPointerDown; // checks if mouse input or touch input
  score;

  preload() {
    this.isPointerDown = false;
  }

  create() {
    // player is a rectangle
    this.player = this.add.rectangle(100, 100, 20, 20, 0xff00ff);
    this.physics.add.existing(this.player);
    this.player.body
      .setBounce(1, 1)
      .setCollideWorldBounds(true)
      .setMaxSpeed(200);

    // create many circles that bounce around and change colors upon collision
    this.circles = [];

    for (let i = 0; i < 20; i++) {
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
      circle.setFillStyle(0xffffff);
      this.physics.add.existing(circle);

      const minMaxVelocity = [50, 250];
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
    }

    this.score = this.add.text(5, 5, `circles left: ${this.circles.length}`, {
      font: "24px Courier",
      fill: "#00ff00",
    });

    this.physics.add.overlap(
      this.player,
      this.circles,
      function (player, circle) {
        circle.destroy();
        console.log(this);
        //this.score.setText(`circles left: ${this.circles.length}`);
      }
    );

    this.physics.add.collider(this.circles, this.circles);

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
  }

  killCircle(player, circle) {
    console.log(this.score);

    circle.destroy(); // destroy the circle
    //this.score.setText(`balls left: ${this.circles.length}`);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
    },
  },
  backgroundColor: "#4488aa",
  scene: BouncyBalls,
};

const game = new Phaser.Game(config);
