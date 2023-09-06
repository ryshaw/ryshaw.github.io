class Game extends Phaser.Scene {
  w; // width of game
  h; // height of game
  UICamera;
  UIContainer;
  player;
  arrowKeys;
  sounds;
  cursors;

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.image("car", "assets/car.png");
    this.w = game.config.width;
    this.h = game.config.height;
  }

  create() {
    this.createLayout();

    this.UICamera = this.cameras.add(-this.w, -this.h, this.w * 2, this.h * 2);

    this.UIContainer = this.add.container().setPosition(this.w, this.h);

    this.cameras.main.setZoom(3);
    this.physics.world.setBounds(
      this.w / 2 - this.w / 4,
      this.h / 2 - this.h / 4,
      this.w / 4,
      this.h / 4
    );

    WebFont.load({
      google: {
        families: ["IBM Plex Mono", "Finger Paint", "Anonymous Pro"],
      },
      active: () => {
        this.loadGameUI();
      },
    });

    this.add.rectangle(
      this.w / 2,
      this.h / 2,
      this.w / 4,
      this.h / 4,
      0x0000ff,
      0.8
    );
  }

  createLayout() {
    //this.physics.world.setBounds();
    console.log(this.physics.world.bounds);
    this.player = this.physics.add.sprite(this.w * 0.6, this.h * 0.5, "car");
    this.player.body.setSize(8, 8);
    this.player.body.isCircle = true;
    this.player.body.setCollideWorldBounds = true;

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  /*
  createAudio() {
    this.sounds = {
      Day: this.sound.add("Day"),
      Night: this.sound.add("Night"),
      hit: this.sound.add("hit"),
      lose: this.sound.add("lose"),
      sfx: this.sound.add("sfx"),
    };

    this.sound.add("sea").play({
      volume: 0.8,
      loop: true,
    });

    this.sounds["Day"].play({
      volume: 0.15,
      loop: true,
    });
  }*/

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
    this.input.keyboard.removeAllListeners();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.sound.stopAll();
    this.sound.removeAll();
    this.anims.resumeAll();
    this.physics.resume();
    this.create();
  }

  update() {
    const mouseX = this.input.activePointer.x;
    const mouseY = this.input.activePointer.y;
    this.player.setVelocity(0);
    this.player.setAngularVelocity(0);

    if (this.cursors.left.isDown && !this.cursors.right.isDown) {
      this.player.setAngularVelocity(-120);
    }
    if (this.cursors.right.isDown && !this.cursors.left.isDown) {
      this.player.setAngularVelocity(120);
    }

    if (this.cursors.up.isDown && !this.cursors.down.isDown) {
      this.physics.velocityFromAngle(
        this.player.angle,
        100,
        this.player.body.velocity
      );
    }
    if (this.cursors.down.isDown && !this.cursors.up.isDown) {
      this.physics.velocityFromAngle(
        this.player.angle,
        -100,
        this.player.body.velocity
      );
    }
  }

  loadGameUI() {
    new CustomText(this, 5, 5, "le fishe", "m").setOrigin(0, 0);
    new CustomText(this, this.w * 0.5, 5, "STAY DEAD", "m")
      .setFontFamily("Finger Paint")
      .setOrigin(0.5, 0)
      .setColor("#9e2a2b");
  }

  gameOver() {
    this.sound.stopAll();

    this.sounds["lose"].play({
      volume: 0.4,
    });

    this.physics.pause();
    this.tweens.killAll();
    clearInterval(this.interval);
    this.anims.pauseAll();

    const t = new CustomText(
      this,
      this.w / 2,
      this.h / 2,
      `game over!\nyou lasted ${this.days} days\nclick to play again`,
      "g",
      "c"
    )
      .setColor("#000")
      .setPadding(20)
      .setBackgroundColor("#fff")
      .setLineSpacing(16)
      .setDepth(2);

    if (this.days == 1) {
      t.setText(
        `game over!\nyou lasted ${this.days} day...\nclick to play again`
      );
    }

    this.time.delayedCall(500, () =>
      this.input.once("pointerdown", () => this.restartGame())
    );
  }
}

class Start extends Phaser.Scene {
  width;
  height;

  constructor() {
    super({ key: "Start" });
  }

  preload() {
    // load google's library for the font, GFS Didot
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.audio("sea", "assets/audio/sea.mp3");

    this.width = game.config.width;
    this.height = game.config.height;
  }

  create() {
    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => {
        this.loadText();
      },
    });

    const sea = this.sound.add("sea");
    sea.play({
      volume: 0.8,
      loop: true,
    });
  }

  loadText() {
    this.add
      .rectangle(0, 0, this.width, this.height / 2, 0xffffff)
      .setOrigin(0, 0);
    this.add
      .rectangle(0, this.height / 2, this.width, this.height / 2, 0x000000)
      .setOrigin(0, 0);

    const t1 = new CustomText(
      this,
      this.width / 2,
      this.height * 0.08,
      "the fishy sea",
      "g",
      "c"
    ).setFill("#000");

    this.tweens.add({
      targets: t1,
      y: t1.y + 10,
      yoyo: true,
      duration: 1600,
      loop: -1,
      ease: "sine.inout",
    });

    const t2 = new CustomText(
      this,
      this.width / 2,
      this.height * 0.25,
      "how many nights can you last\nout on the wine-dark sea?",
      "l",
      "c"
    ).setFill("#000");

    const t3 = new CustomText(
      this,
      this.width / 2,
      this.height * 0.42,
      "during the day, use your mouse\nto send out hooks and collect fish",
      "l",
      "c"
    ).setFill("#000");

    const t4 = new CustomText(
      this,
      this.width / 2,
      this.height * 0.62,
      "during the night, use your mouse\nto send out your caught fish\nand protect yourself from lurking sharks",
      "l",
      "c"
    ).setFill("#fff");

    const t5 = new CustomText(
      this,
      this.width / 2,
      this.height * 0.8,
      "if too many sharks get to your ship...\nyou'll be sleeping with the fishes!",
      "l",
      "c"
    ).setFill("#fff");

    const t6 = new CustomText(
      this,
      this.width / 2,
      this.height * 0.92,
      "click me to start!",
      "g",
      "c",
      () => {
        this.sound.stopAll();
        this.sound.removeAll();
        this.scene.start("Game");
      }
    ).setFill("#fff");

    this.tweens.add({
      targets: t6,
      y: t6.y + 10,
      yoyo: true,
      duration: 1600,
      loop: -1,
      ease: "sine.inout",
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  backgroundColor: "#9badb7",
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
            ? "96px"
            : size == "l"
            ? "64px"
            : size == "m"
            ? "32px"
            : "16px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily("Anonymous Pro")
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setLineSpacing(16);

    // if callback is given, assume it's a button and add callback
    if (callback) {
      cT.setInteractive()
        .on("pointerover", function () {
          //this.setTint(0xffffcc);
        })
        .on("pointerout", function () {
          //this.setTint(0xffffff);
        })
        .on("pointerdown", callback, scene);
    }

    scene.UIContainer.add(cT);

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
