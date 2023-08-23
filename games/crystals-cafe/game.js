class Game extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;
  sounds;

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.width = game.config.width;
    this.height = game.config.height;
  }

  create() {
    this.createLayout();

    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => {
        this.loadGameUI();
      },
    });
  }

  update() {}

  createLayout() {
    this.table = this.add
      .rectangle(
        this.width / 2,
        this.height * 0.92,
        this.width * 0.98,
        this.height * 0.08,
        0x3a86ff
      )
      .setOrigin(0.5, 0);

    const z = this.add
      .zone(
        this.width / 2,
        this.table.getTopCenter().y,
        this.table.width - 100,
        100
      )
      .setDropZone();

    const zoneDrawing = this.add.rectangle(
      z.x,
      z.y,
      z.width,
      z.height,
      0xe2e2df,
      0.3
    );

    this.ledge = this.add
      .rectangle(
        this.width / 2,
        this.height * 0.15,
        this.width,
        this.height * 0.05,
        0x78586f
      )
      .setOrigin(0.5, 0);

    const z2 = this.add
      .zone(this.ledge.x, this.ledge.y, this.ledge.width, this.ledge.height * 2)
      .setDropZone()
      .setName("ledge");

    const zoneDrawing2 = this.add.rectangle(
      z2.x,
      z2.y,
      z2.width,
      z2.height,
      0xe2e2df,
      0.3
    );

    this.coffeeCup = this.add
      .rectangle(this.width / 2, this.height / 2, 160, 160, 0xf4a261)
      .setInteractive();

    this.physics.add.existing(this.coffeeCup);

    this.input.setDraggable(this.coffeeCup);

    this.input.on("gameobjectdown", (p, obj) => {
      if (obj.input.draggable) {
        /*this.tweens.add({
          targets: obj,
          x: p.x,
          y: p.y,
          duration: 50,
        });*/

        this.tweens.add({
          targets: obj,
          scale: 1.05,
          duration: 50,
        });
      }
    });

    this.input.on("gameobjectup", (p, obj) => {
      if (obj.input.draggable) {
        this.tweens.add({
          targets: obj,
          scale: 1,
          duration: 50,
        });
      }
    });

    this.input.on("drag", (p, obj, dX, dY) => obj.setPosition(dX, dY));

    this.input.on("drop", (pointer, obj, z) => {
      this.tweens.add({
        targets: obj,
        y: z.y - obj.height / 2,
        duration: 50,
      });
      if (z.name == "ledge" && obj.body) {
        obj.body.setAcceleration(-1500, 0);
        //obj.disableInteractive();
      }
    });
  }

  addKeyboardControls() {
    //this.input.on("pointerdown", (p) => (this.mouseDown = true));
    // this.input.on("pointerup", (p) => (this.mouseDown = false));
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

  loadGameUI() {
    const t1 = new CustomText(this, 100, this.height * 0.13, "serve", "l", "c");
    const t2 = new CustomText(this, 100, this.height * 0.9, "table", "l", "c");
  }

  gameOver() {}
}

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  backgroundColor: "#fff1e6",
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
            ? "32px"
            : size == "l"
            ? "16px"
            : size == "m"
            ? "8px"
            : "8px",
        fill: "#000",
        align: "center",
      })
      .setFontFamily('"Press Start 2P"')
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
