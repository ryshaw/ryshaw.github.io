class BouncyBalls extends Phaser.Scene {
  circles; // the circles the player will collect
  player; // the player is a polygon and can move using pointer
  isPointerDown; // checks if mouse input or touch input
  scoreText; // text that displays how many balls are left
  numCircles; // keeps track of score
  level; // the level of the game
  levelText; // displaying the current level
  scaleRatio; // the minimum of Device Pixel Ratio (1 for desktops, 2-4 for phones) and 2
  width; // width of canvas
  height; // height of canvas
  startMenu; // container for all start menu UI objects
  titleText; // title of game, only shows up when game starts
  colorPalettes; // object containing the color palettes for the themes
  colorTheme; // string representing the current color theme

  preload() {
    this.isPointerDown = false;
    this.numCircles = 0;
    this.level = 1;
    this.scaleRatio = Math.min(window.devicePixelRatio, 2);
    this.width = game.config.width;
    this.height = game.config.height;
    this.colorTheme = "rgb";
    // each palette has one background color at index 0,
    // and seven primary colors from indices 1-7
    this.colorPalettes = {
      forest: [
        "#344e41",
        "#a5a58d",
        "#b7b7a4",
        "#aaae7f",
        "#ddbea9",
        "#cb997e",
        "#52b788",
        "#7f4f24",
      ],
      beach: [
        "#e29578",
        "#8ecae6",
        "#023047",
        "#ffb703",
        "#f7c59f",
        "#004e89",
        "#c0fdfb",
        "#33a9ff",
      ],
      space: [
        "#161e3c",
        "#9bf6ff",
        "#fca311",
        "#f5f5f5",
        "#f15bb5",
        "#ffc8dd",
        "#cdb4db",
        "#bde0fe",
      ],
    };
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    // player instantiates in the gameStart function

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
      const circle = this.add.arc(
        randomPos.x,
        randomPos.y,
        Phaser.Math.Between(10, 18)
      );
      circle.setFillStyle(Phaser.Display.Color.RandomRGB().color);
      circle.trail = []; // a trail of transparent circles behind the ball
      circle.alive = true; // alive until hit by player

      this.physics.add.existing(circle);
      const minMaxVelocity = [25 * this.scaleRatio, 250 * this.scaleRatio];
      circle.body
        .setVelocity(
          Phaser.Math.Between(minMaxVelocity[0], minMaxVelocity[1]),
          Phaser.Math.Between(minMaxVelocity[0], minMaxVelocity[1])
        )
        .setBounce(1)
        .setCollideWorldBounds(true);
      circle.body.isCircle = true;

      if (Math.random() > 0.5) {
        circle.body.velocity.x *= -1;
      } else {
        circle.body.velocity.y *= -1;
      }

      this.circles.push(circle);
      this.numCircles++;
    }

    // upon balls bouncing, switch both to random colors
    this.physics.add.collider(
      this.circles,
      this.circles,
      this.circleCollider,
      null,
      this
    );

    this.circles.forEach((circle) => {
      circle.scale = this.scaleRatio;
    });

    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => this.loadUI(),
    });
  }

  loadUI() {
    this.score = this.add
      .text(this.width - 10, 10, `balls left: ${this.numCircles}`, {
        font: "16px",
        fill: "#fff",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(1, 0)
      .setDepth(1)
      .setScale(this.scaleRatio);

    this.levelText = this.add
      .text(10, 10, `lvl: ${this.level}`, {
        font: "16px",
        fill: "#fff",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0, 0)
      .setDepth(1)
      .setScale(this.scaleRatio);

    this.titleText = this.add
      .text(this.width * 0.5, 8, "bouncy balls!", {
        font: "16px",
        fill: "#fff",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 0)
      .setDepth(1)
      .setVisible(false)
      .setScale(this.scaleRatio);

    const startText = this.add
      .text(0, 140, "start", {
        font: "24px",
        fill: "#fff",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 1)
      .setInteractive()
      .on("pointerover", function () {
        this.setFill("#00ff00");
      })
      .on("pointerout", function () {
        this.setFill("#fff");
      })
      .on("pointerdown", this.gameStart, this);

    const startBox = this.add
      .rectangle(0, 0, 420, 400)
      .setStrokeStyle(4, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setFillStyle(0x0, 0.8);

    const gameTitle = this.add
      .text(0, -150, "bouncy balls!", {
        font: "24px",
        fill: "#fff",
      })
      .setFontFamily('"Press Start 2P"')
      .setActive(false)
      .setOrigin(0.5, 1);

    const t1 = this.add
      .text(
        0,
        -80,
        "collect all bouncy balls\nmouse/touch to control\nselect a theme:",
        {
          font: "16px",
          fill: "#fff",
          align: "center",
          lineSpacing: 16,
        }
      )
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 0.5);

    const theme1 = this.add
      .text(-75, 15, "RGB", {
        font: "20px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 1)
      .setInteractive()
      .on("pointerover", function () {
        this.setFill("#00ff00");
      })
      .on("pointerout", function () {
        this.setFill("#fff");
      })
      .on("pointerdown", () => this.chooseTheme("rgb"));

    const theme2 = this.add
      .text(75, 15, "beach", {
        font: "20px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 1)
      .setInteractive()
      .on("pointerover", function () {
        this.setFill("#00ff00");
      })
      .on("pointerout", function () {
        this.setFill("#fff");
      })
      .on("pointerdown", () => this.chooseTheme("beach"));

    const theme3 = this.add
      .text(-75, 75, "forest", {
        font: "20px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 1)
      .setInteractive()
      .on("pointerover", function () {
        this.setFill("#00ff00");
      })
      .on("pointerout", function () {
        this.setFill("#fff");
      })
      .on("pointerdown", () => this.chooseTheme("forest"));

    const theme4 = this.add
      .text(75, 75, "space", {
        font: "20px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 1)
      .setInteractive()
      .on("pointerover", function () {
        this.setFill("#00ff00");
      })
      .on("pointerout", function () {
        this.setFill("#fff");
      })
      .on("pointerdown", () => this.chooseTheme("space"));

    const t2 = this.add
      .text(0, 180, "a game by ryshaw, made w/ phaser 3", {
        font: "10px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(0.5, 0.5);

    this.startMenu = this.add
      .container(this.width * 0.5, this.height * 0.5, [
        startBox,
        startText,
        gameTitle,
        t1,
        theme1,
        theme2,
        theme3,
        theme4,
        t2,
      ])
      .setDepth(1)
      .setScale(this.scaleRatio);
  }

  update() {
    // whether player is alive or not, have a trail behind the balls
    // add or maintain trail behind the moving ball
    this.circles.forEach((circle) => {
      // if circle is alive and doesn't have a long enough trail
      if (circle.alive && circle.trail.length < 7) {
        circle.trail.push(
          this.add
            .arc(circle.x, circle.y, circle.radius)
            .setFillStyle(circle.fillColor)
            .setAlpha(0.1)
            .setScale(this.scaleRatio)
        );
      } else if (!circle.alive && circle.trail.length > 0) {
        // if circle is dead, remove a piece of trail every frame
        circle.trail.shift().destroy();
      }
      // if circle has a long enough trail, remove the oldest (farthest) part of trail
      if (circle.trail.length == 7) {
        circle.trail.shift().destroy();
      }
    });

    // now check for player, if game hasn't started yet, don't do anything else
    if (this.player == undefined) {
      return;
    }

    // otherwise, if pointer is down, move player towards pointer
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
          Phaser.Math.Linear(this.player.body.velocity.x, 0, 0.3),
          Phaser.Math.Linear(this.player.body.velocity.y, 0, 0.3)
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

  gameStart() {
    // if game has started, don't do anything
    if (this.player) {
      return;
    }

    const r = 12; // radius of hexagon

    this.player = this.add
      .polygon(this.width * 0.5, this.height * 0.6, [
        [r * Math.cos(Math.PI / 3), r * Math.sin(Math.PI / 3)],
        [r * Math.cos((2 * Math.PI) / 3), r * Math.sin((2 * Math.PI) / 3)],
        [r * Math.cos(Math.PI), r * Math.sin(Math.PI)],
        [r * Math.cos((4 * Math.PI) / 3), r * Math.sin((4 * Math.PI) / 3)],
        [r * Math.cos((5 * Math.PI) / 3), r * Math.sin((5 * Math.PI) / 3)],
        [r * Math.cos(2 * Math.PI), r * Math.sin(2 * Math.PI)],
        [r * Math.cos(Math.PI / 3), r * Math.sin(Math.PI / 3)],
      ])
      .setStrokeStyle(2, 0xffffff)
      .setDisplayOrigin(0, 0);
    this.physics.add.existing(this.player);
    this.player.body
      .setCircle(r, -r, -r)
      .setBounce(1, 1)
      .setCollideWorldBounds(true)
      .setMaxSpeed(350);

    this.physics.add.overlap(
      this.player,
      this.circles,
      function (player, circle) {
        circle.alive = false; // switch to dead so we can eliminate trail
        circle.destroy();
        this.numCircles--;
        this.score.setText(`balls left: ${this.numCircles}`);
      },
      null,
      this
    );

    this.player.scale = this.scaleRatio;

    // detect if mouse or touch input is happening
    this.input.on("pointerdown", () => (this.isPointerDown = true), this);
    this.input.on("pointerup", () => (this.isPointerDown = false), this);

    this.startMenu.destroy();
    // if we have enough space, display title during game
    if (this.scaleRatio == 1) {
      this.titleText.setVisible(true);
    }
  }

  chooseTheme(theme) {
    this.colorTheme = theme;
    if (theme == "rgb") {
      this.cameras.main.setBackgroundColor("#000");
      this.circles.forEach((circle) => {
        circle.setFillStyle(Phaser.Display.Color.RandomRGB().color);
      });
    } else {
      this.cameras.main.setBackgroundColor(this.colorPalettes[theme][0]);

      this.circles.forEach((circle) => {
        const hexColor = this.colorPalettes[theme][Phaser.Math.Between(1, 7)];
        circle.setFillStyle(
          Phaser.Display.Color.HexStringToColor(hexColor).color
        );
      });
    }
  }

  circleCollider(circle1, circle2) {
    if (this.colorTheme == "rgb") {
      circle1.setFillStyle(Phaser.Display.Color.RandomRGB().color);
      circle2.setFillStyle(Phaser.Display.Color.RandomRGB().color);
    } else {
      let hexColor =
        this.colorPalettes[this.colorTheme][Phaser.Math.Between(1, 7)];
      circle1.setFillStyle(
        Phaser.Display.Color.HexStringToColor(hexColor).color
      );
      hexColor = this.colorPalettes[this.colorTheme][Phaser.Math.Between(1, 7)];
      circle2.setFillStyle(
        Phaser.Display.Color.HexStringToColor(hexColor).color
      );
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scaleMode: Phaser.Scale.FIT,
  pixelArt: true,
  backgroundColor: "#000000",
  scene: BouncyBalls,
};

const game = new Phaser.Game(config);
