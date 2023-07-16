class BouncyBalls extends Phaser.Scene {
  circles; // the circles the player will collect
  player; // the player is a polygon and can move using pointer
  isPointerDown; // checks if mouse input or touch input
  scoreText; // text that displays how many balls are left
  numCircles; // keeps track of score
  level; // the level of the game
  levelText; // displaying the current level
  scaleRatio; // desktop = 1, mobile = 2
  width; // width of game
  height; // height of game
  startMenu; // container for all start menu UI objects
  timerText; // displays timer to player, must collect balls before timer runs out
  timer; // time left until game over
  timeInterval; // javascript interval that tracks how much time has passed
  colorPalettes; // object containing the color palettes for the themes
  colorTheme; // string representing the current color theme

  preload() {
    this.isPointerDown = false;
    this.numCircles = 0;
    this.level = 1;
    this.scaleRatio = Math.min(window.devicePixelRatio, 2);
    this.width = game.config.width;
    this.height = game.config.height;
    this.timer = 20;
    this.colorTheme = "rgb"; // default
    // each custom palette has the background color at index 0,
    // and seven primary colors from indices 1-7
    this.colorPalettes = {
      forest: [
        "#04471c", // background color
        "#588157",
        "#b5ffe1",
        "#84a98c",
        "#dde5b6",
        "#dda15e",
        "#52b788",
        "#7f4f24",
      ],
      sea: [
        "#0081af",
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
    // load google's library for the font, Press Start 2P
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    // player instantiates in the gameStart function
    this.createCircles(20); // circles instantiate here

    // upon balls bouncing, switch both to random colors
    this.physics.add.collider(
      this.circles,
      this.circles,
      this.circleCollider,
      null,
      this
    );

    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => this.loadStartUI(),
    });
  }

  // creates all text objects and a menu container
  loadStartUI() {
    this.scoreText = new CustomText(
      this,
      this.width - 10,
      25,
      `balls: ${this.numCircles}`,
      "m",
      "r"
    ).setVisible(false); // invisible until game starts

    this.levelText = new CustomText(
      this,
      10,
      25,
      `lvl: ${this.level}`,
      "m",
      "l"
    ).setVisible(false); // invisible until game starts

    this.timerText = new CustomText(
      this,
      this.width * 0.5 - 10,
      20,
      `time: ${this.timer}`
    ).setVisible(false);

    // container for start menu UI
    const startBox = this.add
      .rectangle(0, 0, 420, 400)
      .setStrokeStyle(4, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setFillStyle(0x0, 0.8);

    const startText = new CustomText(
      this,
      0,
      130,
      "start",
      "l",
      "c",
      this.gameStart
    );

    const gameTitle = new CustomText(this, 0, -160, "bouncy balls!", "l", "c");

    const t1 = new CustomText(
      this,
      0,
      -80,
      "collect all bouncy balls\nmouse/touch to control\nselect a theme:"
    );

    const theme1 = new CustomText(this, -90, 5, "RGB", "l", "c", () =>
      this.chooseTheme("rgb")
    );
    const theme2 = new CustomText(this, 90, 5, "sea", "l", "c", () =>
      this.chooseTheme("sea")
    );
    const theme3 = new CustomText(this, -90, 70, "forest", "l", "c", () =>
      this.chooseTheme("forest")
    );
    const theme4 = new CustomText(this, 90, 70, "space", "l", "c", () =>
      this.chooseTheme("space")
    );

    const t2 = new CustomText(
      this,
      0,
      180,
      "a game by ryshaw, made w/ phaser 3",
      "s",
      "c"
    );

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
      .setDepth(1);

    // upscale all objects currently created, if on mobile
    this.children.getChildren().forEach((object) => {
      object.scale = this.scaleRatio;
    });
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
    if (this.player == undefined || !this.player.alive) {
      return;
    }

    // otherwise, if pointer is down and player is alive, move player towards pointer
    if (this.isPointerDown && this.player.alive) {
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

    const r = 12; // radius of player hexagon

    // build hexagon with some trigonometry
    const points = [];
    for (let index = 1; index < 8; index++) {
      points.push([
        r * Math.cos((index * Math.PI) / 3),
        r * Math.sin((index * Math.PI) / 3),
      ]);
    }

    this.player = this.add
      .polygon(this.width * 0.5, this.height * 0.6, points)
      .setStrokeStyle(2, 0xffffff)
      .setDisplayOrigin(0, 0);
    this.player.scale = this.scaleRatio;
    this.physics.add.existing(this.player);
    this.player.body
      .setCircle(r, -r, -r)
      .setBounce(1, 1)
      .setCollideWorldBounds(true)
      .setMaxSpeed(350);

    this.player.alive = true; // checks whether game is over or not

    this.physics.add.overlap(
      this.player,
      this.circles,
      function (player, circle) {
        if (!player.alive) {
          return;
        }
        circle.alive = false; // switch to dead so we can eliminate trail
        circle.destroy();
        this.numCircles--;
        this.scoreText.setText(`balls: ${this.numCircles}`);

        if (this.numCircles <= 0) {
          this.levelClear();
        }
      },
      null,
      this
    );

    // detect if mouse or touch input is happening
    this.input.on("pointerdown", () => (this.isPointerDown = true), this);
    this.input.on("pointerup", () => (this.isPointerDown = false), this);

    // remove start text
    this.startMenu.destroy();

    // show game text
    this.levelText.setVisible(true);
    this.scoreText.setVisible(true);
    this.timerText.setVisible(true);

    // to control the time
    // arrow function must be used... I still don't understand why but MDN says so
    this.timeInterval = setInterval(() => this.timeHandler(), 1000);
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

  // instantiates #num circles
  createCircles(num) {
    // create many circles that bounce around and change colors upon collision
    this.circles = [];

    const offset = 20; // so circles don't start outside bounds
    const bounds = new Phaser.Geom.Rectangle(
      offset,
      offset,
      this.width - offset * 2,
      this.height - offset * 2
    );

    for (let i = 0; i < num; i++) {
      // assign a random point for circle to appear
      const p = bounds.getRandomPoint();

      // basic circle, size between 10 and 18
      const circle = this.add
        .arc(p.x, p.y, Phaser.Math.Between(10, 18))
        .setFillStyle(Phaser.Display.Color.RandomRGB().color);
      circle.trail = []; // a trail of transparent circles behind the ball
      circle.alive = true; // alive until hit by player
      circle.scale = this.scaleRatio;
      this.physics.add.existing(circle);

      // choose somewhere slowest speed and largest speed
      const minMaxVelocity = [25 * this.scaleRatio, 250 * this.scaleRatio];
      circle.body
        .setVelocity(
          Phaser.Math.Between(minMaxVelocity[0], minMaxVelocity[1]),
          Phaser.Math.Between(minMaxVelocity[0], minMaxVelocity[1])
        )
        .setBounce(1)
        .setCollideWorldBounds(true);
      circle.body.isCircle = true;

      // random direction
      if (Math.random() > 0.5) {
        circle.body.velocity.x *= -1;
      } else {
        circle.body.velocity.y *= -1;
      }

      this.circles.push(circle);
      this.numCircles++;
    }
  }

  timeHandler() {
    this.timer--;
    this.timerText.setText(`time: ${this.timer}`);
    if (this.timer <= 5) {
      this.timerText.setFill("#ff0000");
    }

    if (this.timer < 0) {
      clearInterval(this.timeInterval);
      this.timerText.setText("game over!");
      this.gameOver();
    }
  }

  gameOver() {
    // if game is already over, don't do this again
    if (!this.player.alive) {
      return;
    }

    this.player.alive = false;
    this.tweens.add({
      targets: this.player,
      scale: 0,
      angle: 720,
      ease: "Sine.InOut",
      duration: 800,
      onComplete: () => {
        const x = this.player.body.x;
        const y = this.player.body.y;
        const l1 = this.add
          .line(x, y, 0, 0, 32, 0)
          .setStrokeStyle(2, "0xffffff", 1);
        const l2 = this.add
          .line(x, y, 0, 0, 0, 32)
          .setStrokeStyle(2, "0xffffff", 1);
        this.tweens.add({
          targets: [l1, l2],
          scale: 0,
          angle: 180,
          ease: "Sine.Out",
          duration: 400,
          completeDelay: 1000,
          onComplete: () => this.loadGameOverUI(),
        });
      },
    });
  }

  loadGameOverUI() {
    const box = this.add
      .rectangle(0, 0, 350, 200)
      .setStrokeStyle(4, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setFillStyle(0x0, 0.8);

    const restartText = new CustomText(this, 0, 60, "restart", "l", "c", () => {
      this.children.getAll().forEach((object) => {
        object.destroy();
      });

      this.player = undefined;
      this.preload();
      this.create();
    });

    const gameOverText = new CustomText(
      this,
      0,
      -40,
      "game over!\ntry again?",
      "l",
      "c"
    ).setLineSpacing(24);

    this.add
      .container(this.width * 0.5, this.height * 0.5, [
        box,
        restartText,
        gameOverText,
      ])
      .setDepth(1)
      .setScale(this.scaleRatio);
  }

  levelClear() {
    clearInterval(this.timeInterval);
    this.timerText.setText("level cleared!");
    this.timerText.setFill("#00ff00");
    this.time.delayedCall(1000, () => {
      this.player.alive = false;
      this.tweens.add({
        targets: this.player,
        alpha: 0,
        angle: 360,
        scale: 1.5,
        ease: "Sine.InOut",
        duration: 1600,
      });
      this.loadLevelClearUI();
    });
  }

  loadLevelClearUI() {
    const box = this.add
      .rectangle(0, 0, 350, 200)
      .setStrokeStyle(4, 0xffffff)
      .setOrigin(0.5, 0.5)
      .setFillStyle(0x0, 0.8);

    const continueText = new CustomText(
      this,
      0,
      60,
      "continue",
      "l",
      "c",
      () => {
        this.children.getAll().forEach((object) => {
          object.destroy();
        });

        this.player = undefined;
        this.preload();
        this.create();
      }
    );

    const levelClearText = new CustomText(
      this,
      0,
      -40,
      "level clear!!\nnext level?",
      "l",
      "c"
    ).setLineSpacing(24);

    this.add
      .container(this.width * 0.5, this.height * 0.5, [
        box,
        continueText,
        levelClearText,
      ])
      .setDepth(1)
      .setScale(this.scaleRatio);
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

class CustomText extends Phaser.GameObjects.Text {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    text,
    size = "m", // s, m, or l for small, medium, or large
    align = "c", // l, c, or r for left, center, or right
    callback = null // provided only for buttons
  ) {
    super(scene);

    const cT = scene.add
      .text(x, y, text, {
        font: size == "l" ? "24px" : size == "m" ? "16px" : "10px",
        fill: "#fff",
        align: "center",
        lineSpacing: 16,
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setDepth(1);

    // if callback is given, assume it's a button and add callback
    if (callback) {
      cT.setInteractive()
        .on("pointerover", function () {
          this.setFill("#00ff00");
        })
        .on("pointerout", function () {
          this.setFill("#fff");
        })
        .on("pointerdown", callback, scene);
    }

    return cT;
  }
}

const game = new Phaser.Game(config);
