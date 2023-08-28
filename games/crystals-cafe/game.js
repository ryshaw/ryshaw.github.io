class Game extends Phaser.Scene {
  w; // width of game (1280 as of alpha version)
  h; // height of game (720 as of alpha version)
  holding; // reference to cup player is currently holding
  sounds;
  zoneObjects;
  dragObjects;
  clickObjects;

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.image("layout", "assets/layout.png");

    this.load.spritesheet("fs", "assets/fullscreen.png", {
      frameWidth: 8,
      frameHeight: 8,
    });

    this.w = game.config.width;
    this.h = game.config.height;
    this.holding = null;
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

    this.input.setTopOnly(false);
  }

  update() {
    if (this.holding) {
      this.tweens.add({
        targets: this.holding,
        x: this.input.activePointer.x,
        y: this.input.activePointer.y,
        duration: 15,
      });
    }
  }

  createLayout() {
    this.add.image(0, 0, "layout").setOrigin(0, 0);

    this.zoneObjects = this.add.container();

    this.zoneObjects.add(
      new ZoneObject(
        this,
        "table",
        this.w / 2,
        610,
        this.w,
        this.h * 0.04,
        0x78586f
      )
    );

    this.zoneObjects.add(
      new ZoneObject(
        this,
        "cupDropoff",
        this.w * 0.5,
        this.h * 0.17,
        this.w * 0.34,
        this.h * 0.04,
        0x1b263b,
        (dragObject) => {
          if (dragObject.name == "cup") {
            this.tweens.add({
              targets: dragObject,
              alpha: 0,
              duration: 1500,
              ease: "sine.in",
            });
          }
        }
      )
    );

    this.dragObjects = this.add.container();

    this.dragObjects.add(
      new DragObject(this, "cup", 404, 190, 100, 100, 0xf4a261)
    );

    /*const pickup = this.add
      .rectangle(404, 190, 100, 100, 0x1b263b)
      .setInteractive()
      .on("pointerdown", () => console.log("hit"));*/
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
    const b1 = new CustomButton(this, this.w - 5, 5, "fs")
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
      debug: true,
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
  attachedToZone; // list of all objects on the zone

  constructor(scene, name, x, y, w, h, c, callback = null) {
    super(scene, x, y, w, h, c, 1).setName(name);

    this.zone = scene.add
      .zone(x, this.getTopCenter().y, w, 70)
      .setDropZone()
      .setInteractive()
      .setOrigin(0.5, 1)
      .setName(name);

    scene.physics.add.existing(this.zone);

    this.zone.body.debugBodyColor = 0x00ffff;

    this.label = new CustomText(scene, x, y, name);

    this.callback = callback ? callback : () => {};

    this.attachedToZone = [];

    this.zone.on("pointerup", (p) => {
      // if you're holding something, either you just picked it up
      // or you want to put it down on this zone
      if (scene.holding) {
        // if you just picked this up from this zone...
        if (this.attachedToZone.includes(scene.holding)) {
          // let you have it
          const index = this.attachedToZone.indexOf(scene.holding);
          this.attachedToZone.splice(index, 1);
        } else {
          // otherwise, add it to the list attached to the zone
          // and move it onto the zone
          const obj = scene.holding;
          scene.tweens.add({
            targets: scene.holding,
            y: this.zone.y - scene.holding.height / 2,
            scale: 1,
            duration: 50,
            onComplete: () => this.callback(obj),
          });
          this.attachedToZone.push(scene.holding);
          scene.holding = null;
        }
      }
    });

    return this;
  }
}

class DragObject extends Phaser.GameObjects.Rectangle {
  constructor(scene, name, x, y, w, h, c) {
    super(scene, x, y, w, h, c, 0.05)
      .setName(name)
      .setInteractive()
      .setDepth(1);
    this.setStrokeStyle(5, c);

    scene.physics.add.existing(this);

    this.on("pointerup", () => (scene.holding = this));

    return this;
  }
}

class ClickObject extends Phaser.GameObjects.Rectangle {
  label; // text label
  downCallback; // optional function that runs when pointer down
  upCallback; // optional function that runs when pointer up

  constructor(
    scene,
    name,
    x,
    y,
    w,
    h,
    c,
    downCallback = null,
    upCallback = null
  ) {
    super(scene, x, y, w, h, c, 1).setName(name);

    this.zone = scene.add
      .zone(x, this.getTopCenter().y, w, 75)
      .setDropZone()
      .setOrigin(0.5, 1)
      .setName(name);

    scene.physics.add.existing(this.zone);

    this.zone.body.debugBodyColor = 0x0000ff;

    this.label = new CustomText(scene, x, y, name);

    this.downCallback = downCallback ? downCallback : () => {};

    this.upCallback = upCallback ? upCallback : () => {};

    return this;
  }
}

const game = new Phaser.Game(config);
