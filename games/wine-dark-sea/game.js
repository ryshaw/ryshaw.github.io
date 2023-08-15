class Game extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;
  playerSpeed;
  timerInterval; // counts down the seconds
  timer; // from 0 to 1, tracks how much day or night has passed
  sun; // da sun
  moon; // da moon
  sky; // rectangle representing the sky
  sea; // rectangle representing the sea
  daytime; // true = day, false = night
  pointerLine; // line that follows p
  spears;

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.image("ship", "assets/ship.png");
    this.load.image("spear", "assets/spear.png");
    this.load.spritesheet("sun", "assets/sun.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.spritesheet("moon", "assets/moon.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.width = game.config.width;
    this.height = game.config.height;
    this.timer = 0;
    this.daytime = true;
  }

  create() {
    this.createLayout();

    // add UI stuff at the very end so it's above everything
    this.UICamera = this.cameras.add(
      this.cameras.main.x,
      this.cameras.main.y,
      this.cameras.main.width,
      this.cameras.main.height
    );

    this.children.getAll().forEach((object) => {
      this.UICamera.ignore(object);
    });

    this.addKeyboardControls();

    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => {
        //this.loadGameUI();
      },
    });
  }

  createLayout() {
    this.sky = this.add
      .rectangle(0, 0, this.width, this.height / 2, 0xffffff)
      .setOrigin(0, 0);
    this.sea = this.add
      .rectangle(0, this.height / 2, this.width, this.height / 2, 0x000000)
      .setOrigin(0, 0);

    this.pointerLine = this.add
      .rectangle(this.width / 2, this.height / 2, 2, 80, 0xffffff, 1)
      .setOrigin(0.5, 0);

    this.input.on("pointermove", (p) => {
      const angle = Phaser.Math.Angle.Between(
        this.width / 2,
        this.height / 2,
        p.x,
        p.y
      );
      if (angle >= 0) this.pointerLine.setRotation(angle - Math.PI / 2);
    });

    this.player = this.physics.add
      .sprite(this.width / 2, this.height / 2 - 20, "ship")
      .setScale(2);
    this.player.body.isCircle = true;

    this.tweens.add({
      targets: this.player,
      y: this.height / 2 - 14,
      yoyo: true,
      duration: 1600,
      loop: -1,
      ease: "sine.inout",
    });

    this.anims.create({
      key: "sunAnim",
      repeat: -1,
      frames: this.anims.generateFrameNumbers("sun", { frames: [0, 1] }),
      duration: 3100,
    });

    this.anims.create({
      key: "moonAnim",
      repeat: -1,
      frames: this.anims.generateFrameNumbers("moon", { frames: [0, 1] }),
      duration: 3100,
    });

    this.sun = this.add
      .sprite(this.width / 2, 100, "sun", 0)
      .play("sunAnim")
      .setScale(2);

    this.moon = this.add
      .sprite(this.width / 2, 100, "moon", 0)
      .play("moonAnim")
      .setScale(2);
    this.moon.setVisible(false);

    const circle = new Phaser.Geom.Circle(
      this.width / 2,
      this.height / 2,
      this.height * 0.45
    );

    Phaser.Actions.PlaceOnCircle(
      [this.sun, this.moon],
      circle,
      Math.PI,
      -Math.PI
    );

    // from sunrise to sunset
    setInterval(() => {
      let change = Math.PI * 0.02;
      Phaser.Actions.RotateAroundDistance(
        [this.sun, this.moon],
        { x: circle.x, y: circle.y },
        change,
        circle.radius
      );
      this.timer += change / Math.PI;
      if (this.timer >= 1) {
        this.timer = 0;
        this.switchToDayOrNight();
      }
    }, 500);

    this.spears = this.physics.add.group();
  }

  switchToDayOrNight() {
    if (this.daytime) {
      // switch to night
      this.sky.setFillStyle(0x000000, 1);
      this.sea.setFillStyle(0xffffff, 1);
      this.sun.setVisible(false);
      this.moon.setVisible(true);
      this.pointerLine.setFillStyle(0x000000, 1);
    } else {
      // switch to day
      this.sky.setFillStyle(0xffffff, 1);
      this.sea.setFillStyle(0x000000, 1);
      this.sun.setVisible(true);
      this.moon.setVisible(false);
      this.pointerLine.setFillStyle(0xffffff, 1);
    }

    this.daytime = !this.daytime;
  }

  // function that goes off every second, for timers
  timerTick() {}

  addKeyboardControls() {
    this.input.on("pointerdown", (p) => {
      if (p.y >= this.height / 2) {
        const spear = this.physics.add.sprite(
          this.width / 2,
          this.height / 2,
          "spear"
        );
        this.spears.add(spear);

        this.physics.moveTo(spear, p.x, p.y, 180);
        spear.body.setSize(16);
        spear.body.isCircle = true;
        spear.rotation = spear.body.velocity.angle();
      }
    });

    /*
    this.input.keyboard.on("keydown-M", () => {
      const track1 = this.sound.get("track1");
      track1.isPlaying ? track1.pause() : track1.resume();
    });

    this.input.keyboard.on("keydown-N", () => {
      this.soundVolume > 0 ? (this.soundVolume = 0) : (this.soundVolume = 0.8);
      Object.values(this.soundEffects).forEach((sound) => sound.stop());
    });*/
  }

  restartGame() {
    this.children.getAll().forEach((object) => {
      object.destroy();
    });
    this.lights.shutdown();
    this.input.keyboard.removeAllListeners();
    this.cameras.remove(this.UICamera);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.sound.stopAll();
    this.sound.removeAll();
    this.create();
  }

  update() {
    this.player.setDepth(2);
    this.spears.setDepth(1);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  pixelArt: true,
  backgroundColor: "#fff",
  scene: [Game],
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
        font:
          size == "g"
            ? "48px"
            : size == "l"
            ? "30px"
            : size == "m"
            ? "18px"
            : "12px",
        fill: "#fff",
        align: "center",
        lineSpacing: 16,
      })
      .setDepth(2)
      .setFontFamily('"GFS Didot"')
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setScrollFactor(0)
      .setBackgroundColor("#1f1a1b")
      .setPadding(10)
      .setColor("#dad3d3");

    // if callback is given, assume it's a button and add callback
    if (callback) {
      cT.setInteractive()
        .on("pointerover", function () {
          this.setTint(0xffffcc);
        })
        .on("pointerout", function () {
          this.setTint(0xffffff);
        })
        .on("pointerdown", callback, scene);
    }

    return cT;
  }
}

class CustomButton extends Phaser.GameObjects.Image {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    key,
    callback = null // provided only for buttons
  ) {
    super(scene);

    const cT = scene.add.image(x, y, key).setDepth(2);

    // if callback is given, assume it's a button and add callback
    if (callback) {
      cT.setInteractive()
        .on("pointerover", function () {
          this.setTint(0xffffcc);
        })
        .on("pointerout", function () {
          this.setTint(0xffffff);
        })
        .on("pointerdown", callback, scene);
    }

    return cT;
  }
}
const game = new Phaser.Game(config);
