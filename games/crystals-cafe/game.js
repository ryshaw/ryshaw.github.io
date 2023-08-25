class Game extends Phaser.Scene {
  width; // width of game
  height; // height of game
  sounds;
  zoneObjects;
  dragObjects;

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.spritesheet("fs", "assets/fullscreen.png", {
      frameWidth: 8,
      frameHeight: 8,
    });

    this.width = game.config.width;
    this.height = game.config.height;
  }

  create() {
    this.scale.lockOrientation("landscape");

    WebFont.load({
      google: {
        families: ["Press Start 2P", "Roboto Mono"],
      },
      active: () => {
        this.createLayout();
        this.loadGameUI();
      },
    });
  }

  update() {}

  createLayout() {
    this.zoneObjects = this.add.container();

    this.zoneObjects.add(
      new ZoneObject(
        this,
        "table",
        this.width / 2,
        this.height * 0.96,
        this.width * 0.98,
        this.height * 0.08,
        0x3a86ff
      )
    );

    this.zoneObjects.add(
      new ZoneObject(
        this,
        "servingLedge",
        this.width / 2,
        this.height * 0.15,
        this.width,
        this.height * 0.05,
        0x78586f,
        (dragObject) => {
          if (dragObject.name == "cup") {
            dragObject.body.setAcceleration(-1500, 0);
            dragObject.label.setText("");
            this.input.setDraggable(dragObject, false);
          }
        }
      )
    );

    this.dragObjects = this.add.container();

    this.dragObjects.add(
      new DragObject(
        this,
        "cup",
        this.width / 2,
        this.height / 2,
        140,
        140,
        0xf4a261
      )
    );

    this.dragObjects.add(
      new DragObject(
        this,
        "cup",
        this.width / 4,
        this.height / 2,
        140,
        140,
        0xffafcc
      )
    );
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
    const b1 = new CustomButton(this, this.width - 5, 5, "fs")
      .setOrigin(1, 0)
      .setScale(4)
      .setFrame(0)
      .setInteractive()
      .on("pointerup", () => {
        this.scale.toggleFullscreen();
        b1.frame.name == 0 ? b1.setFrame(1) : b1.setFrame(0);
      });
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
            ? "64px"
            : size == "l"
            ? "32px"
            : size == "m"
            ? "16px"
            : "8px",
        fill: "#fff",
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

class ZoneObject extends Phaser.GameObjects.Rectangle {
  zone; // da zone
  label; // text label
  callback; // optional function that runs when zone is dropped on

  constructor(scene, name, x, y, w, h, c, callback = null) {
    super(scene, x, y, w, h, c, 1).setName(name);

    this.zone = scene.add
      .zone(x, this.getTopCenter().y, w, 75)
      .setDropZone()
      .setOrigin(0.5, 1)
      .setName(name);

    scene.physics.add.existing(this.zone);

    this.zone.body.debugBodyColor = 0x00ffff;

    this.label = new CustomText(scene, x, y, name);

    this.callback = callback ? callback : () => {};

    return this;
  }
}

class DragObject extends Phaser.GameObjects.Rectangle {
  label; // text label
  droppedOnZone; // objects must be placed in a zone when picked up
  lastPosition; // otherwise, they'll return to their last position

  constructor(scene, name, x, y, w, h, c) {
    super(scene, x, y, w, h, c, 0.1).setName(name).setInteractive().setDepth(1);

    this.setStrokeStyle(5, c);

    this.label = new CustomText(scene, x, y, name);

    scene.physics.add.existing(this);
    scene.input.setDraggable(this);

    this.droppedOnZone = false;
    this.lastPosition = new Phaser.Math.Vector2(x, y);

    this.on("pointerdown", (p) => {
      this.droppedOnZone = false;
      this.lastPosition = new Phaser.Math.Vector2(this.x, this.y);

      scene.tweens.add({
        targets: [this, this.label],
        x: p.x,
        y: p.y,
        scale: 0.7,
        duration: 15,
      });
    });

    this.on("pointerup", () => {
      scene.tweens.add({
        targets: [this, this.label],
        scale: 1,
        duration: 50,
      });

      if (!this.droppedOnZone) {
        scene.tweens.add({
          targets: [this, this.label],
          x: this.lastPosition.x,
          y: this.lastPosition.y,
          duration: 100,
        });
      }
    });

    this.on("drag", (p) => {
      scene.tweens.add({
        targets: [this, this.label],
        x: p.x,
        y: p.y,
        duration: 15,
      });
    });

    this.on("drop", (p, z) => {
      this.droppedOnZone = true;
      this.lastPosition = new Phaser.Math.Vector2(this.x, this.y);

      scene.tweens.add({
        targets: [this, this.label],
        y: z.y - this.height / 2,
        scale: 1,
        duration: 50,
        onComplete: () =>
          (this.lastPosition = new Phaser.Math.Vector2(this.x, this.y)),
      });

      scene.zoneObjects.getByName(z.name).callback(this);
    });

    return this;
  }
}

const game = new Phaser.Game(config);
