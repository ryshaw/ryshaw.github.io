class Game extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;
  playerSpeed;
  timerInterval; // counts down the seconds
  daytime; // from 0 to 1, tracks how much day has passed
  sun; // da sun
  sky; // rectangle representing the sky
  sea; // rectangle representing the sea

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.image("ship", "assets/ship.png");
    this.load.spritesheet("sun", "assets/sun.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.width = game.config.width;
    this.height = game.config.height;
    this.daytime = 0;
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

    //this.addKeyboardControls();

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
      key: "sun_anim",
      repeat: -1,
      frames: this.anims.generateFrameNumbers("sun", { frames: [0, 1] }),
      duration: 1600,
    });

    this.sun = this.add
      .sprite(this.width / 2, 100, "sun", 0)
      .play("sun_anim")
      .setScale(2);

    const circle = new Phaser.Geom.Circle(
      this.width / 2,
      this.height / 2,
      this.width * 0.45
    );

    Phaser.Actions.PlaceOnCircle([this.sun], circle, Math.PI);

    // from sunrise to sunset
    setInterval(() => {
      let change = Math.PI * 0.2;
      Phaser.Actions.RotateAroundDistance(
        [this.sun],
        { x: circle.x, y: circle.y },
        change,
        circle.radius
      );
      this.daytime += change / Math.PI;
      if (this.daytime >= 1) {
        this.switchToDayOrNight();
      }
    }, 400);
  }

  switchToDayOrNight() {
    if (this.daytime >= 1) {
      this.sky.setFillStyle(0x000000, 1);
      this.sea.setFillStyle(0xffffff, 1);
    }
  }

  // function that goes off every second, for timers
  timerTick() {}

  addKeyboardControls() {
    this.input.keyboard.on("keydown-SPACE", () => {});

    this.input.keyboard.on("keydown-LEFT", () => {
      this.player.body.setVelocity(-this.playerSpeed, 0);
      this.player.angle = 180;
    });

    this.input.keyboard.on("keydown-RIGHT", () => {
      this.player.body.setVelocity(this.playerSpeed, 0);
      this.player.angle = 0;
    });

    this.input.keyboard.on("keydown-UP", () => {
      this.player.body.setVelocity(0, -this.playerSpeed);
      this.player.angle = 270;
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      this.player.body.setVelocity(0, this.playerSpeed);
      this.player.angle = 90;
    });

    this.input.keyboard.on("keydown-A", () => {
      this.player.body.setVelocity(-this.playerSpeed, 0);
      this.player.angle = 180;
    });

    this.input.keyboard.on("keydown-D", () => {
      this.player.body.setVelocity(this.playerSpeed, 0);
      this.player.angle = 0;
    });

    this.input.keyboard.on("keydown-W", () => {
      this.player.body.setVelocity(0, -this.playerSpeed);
      this.player.angle = 270;
    });

    this.input.keyboard.on("keydown-S", () => {
      this.player.body.setVelocity(0, this.playerSpeed);
      this.player.angle = 90;
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

  update() {}
}

const config = {
  type: Phaser.AUTO,
  width: 600,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
    },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
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
