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
  fishes;
  canThrowSpear;
  mouseDown;
  maxFish;

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
    this.load.image("fish", "assets/fish.png");
    this.load.image("fish-dark", "assets/fish-dark.png");
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
    this.canThrowSpear = true;
    this.mouseDown = false;
    this.maxFish = 20;
  }

  create() {
    this.createLayout();

    this.createFish();

    this.createPhysics();

    this.addKeyboardControls();

    // starts the fish respawn cycle
    // every so often (~1 second), check if less than max fish
    // if so, add a new fish, and repeat the cycle
    this.time.delayedCall(1000, () => this.checkFish());

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
      let change = Math.PI * 0.25;
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
  }

  switchToDayOrNight() {
    if (this.daytime) {
      // switch to night
      this.sky.setFillStyle(0x000000, 1);
      this.sea.setFillStyle(0xffffff, 1);
      this.sun.setVisible(false);
      this.moon.setVisible(true);
      this.pointerLine.setFillStyle(0x000000, 1);

      // I do not know why it won't remove all fishes in one go
      // but apparently it takes multiple loops to remove all fish
      let iterations = 10;
      do {
        iterations--;
        this.fishes
          .getChildren()
          .forEach((fish) => this.fishes.remove(fish, true, true));
      } while (this.fishes.getLength() > 0 && iterations > 0);
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

  createFish() {
    const bounds = new Phaser.Geom.Rectangle(
      0 + 16,
      this.height / 2 + 32,
      this.width - 32,
      this.height / 2 - 48
    );
    this.fishes = this.physics.add.group({
      key: "fish",
      quantity: this.maxFish,
    });
    Phaser.Actions.RandomRectangle(this.fishes.getChildren(), bounds);

    this.fishes.getChildren().forEach((fish) => {
      this.physics.add.existing(fish);
      fish.body.setSize(12, 10);
      let v = this.getFishVelocity();
      if (Math.random() > 0.5) {
        v *= -1;
        fish.setFlipX(true);
      }
      fish.body.setVelocity(v, 0);
      fish.body.setCollideWorldBounds(true);
      fish.body.onWorldBounds = true;
      fish.setName("fish");

      this.tweens.chain({
        targets: fish.body.velocity,
        tweens: [
          {
            y: Phaser.Math.Between(2, 15),
            duration: Phaser.Math.Between(600, 1800),
          },
          {
            y: Phaser.Math.Between(-2, -15),
            duration: Phaser.Math.Between(600, 1800),
          },
        ],
        loop: -1,
      });
    });
  }

  createPhysics() {
    this.spears = this.physics.add.group();

    this.physics.add.overlap(this.spears, this.fishes, (obj1, obj2) => {
      this.hitFish(obj1, obj2);
    });

    this.physics.world.on("worldbounds", (body) => {
      switch (body.gameObject.name) {
        case "fish":
          this.fishes.remove(body.gameObject, true, true);
          break;
        case "spear":
          this.spears.remove(body.gameObject, true, true);
          break;
      }
    });

    this.physics.world.setBounds(-32, 0, this.width + 64, this.height + 16);
    //this.physics.world.setBounds(0, 0, this.width, this.height + 16);

    this.physics.add.existing(this.sky, true);
    this.physics.add.collider(this.sky, this.fishes);
  }

  hitFish(spear, fish) {
    const t = new CustomText(this, fish.x + 8, fish.y, "+1", "l");
    this.tweens.add({
      targets: t,
      y: t.y - 10,
      duration: 300,
      onComplete: () => t.destroy(),
    });

    this.fishes.remove(fish, true, true);
  }

  checkFish() {
    if (this.daytime && this.fishes.getLength() < this.maxFish) {
      let x = -16;
      if (Math.random() < 0.5) {
        x = this.width + 16;
      }
      let y = Phaser.Math.Between(this.height / 2 + 32, this.height - 32);
      const fish = this.physics.add.sprite(x, y, "fish");

      fish.body.setSize(12, 10);
      let v = this.getFishVelocity();
      if (x == this.width + 16) {
        v *= -1;
        fish.setFlipX(true);
      }
      fish.setName("fish");
      this.fishes.add(fish);
      fish.body.setCollideWorldBounds(true);
      fish.body.onWorldBounds = true;
      fish.body.setVelocity(v, 0);
      this.tweens.chain({
        targets: fish.body.velocity,
        tweens: [
          {
            y: Phaser.Math.Between(2, 15),
            duration: Phaser.Math.Between(800, 1600),
          },
          {
            y: Phaser.Math.Between(-2, -15),
            duration: Phaser.Math.Between(800, 1600),
          },
        ],
        loop: -1,
      });
    }
    const t = Phaser.Math.Between(300, 800);
    this.time.delayedCall(t, () => this.checkFish());
  }

  addKeyboardControls() {
    this.input.on("pointerdown", (p) => (this.mouseDown = true));
    this.input.on("pointerup", (p) => (this.mouseDown = false));

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

  getFishVelocity() {
    return Phaser.Math.Between(20, 80);
  }

  update() {
    const mouseX = this.input.activePointer.x;
    const mouseY = this.input.activePointer.y;
    if (this.mouseDown && mouseY >= this.height / 2 && this.canThrowSpear) {
      if (!this.daytime) {
      }
      this.canThrowSpear = false;
      const spear = this.physics.add.sprite(
        this.width / 2,
        this.height / 2,
        "spear"
      );
      if (!this.daytime) {
        spear.setTexture("fish-dark");
      }

      this.spears.add(spear);

      this.physics.moveTo(spear, mouseX, mouseY, 180);
      spear.body.setSize(12);
      spear.body.isCircle = true;
      spear.rotation = spear.body.velocity.angle();
      spear.body.setCollideWorldBounds(true);
      spear.body.onWorldBounds = true;
      spear.setName("spear");

      this.time.delayedCall(800, () => (this.canThrowSpear = true));
    }

    this.fishes.getChildren().forEach((fish) => {
      if (fish.body.velocity.y == 0) {
        //fish.body.velocity.y = 10;
      }
    });
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
            ? "64px"
            : size == "l"
            ? "32px"
            : size == "m"
            ? "16px"
            : "10px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setScale(0.3);

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
