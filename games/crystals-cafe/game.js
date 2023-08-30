class Game extends Phaser.Scene {
  w; // width of game (1280 as of alpha version)
  h; // height of game (720 as of alpha version)
  holding; // reference to cup player is currently holding
  justDroppedOnZone;
  sounds;
  zoneObjects;
  dragObjects;
  clickObjects;
  cupColors;

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
    this.justDroppedOnZone = false;
    this.cupColors = [
      0x219ebc, 0xffafcc, 0x344e41, 0xffb4a2, 0xc9ada7, 0xf4a261,
    ];
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
            const t = this.tweens.add({
              targets: dragObject,
              delay: 1200,
              y: dragObject.y - this.h,
              duration: 1000,
              ease: "sine.in",
              onComplete: () => {
                console.log("sent");
              },
            });
            dragObject.once("pointerdown", () => {
              this.tweens.killTweensOf(dragObject);
            });
          }
        }
      )
    );

    this.clickObjects = this.add.container();

    this.clickObjects.add([
      new ClickObject(
        this,
        "cupPickup",
        404,
        192,
        100,
        100,
        0x8ecae6,
        null,
        () => {
          if (this.holding) return;
          const c = Phaser.Utils.Array.GetRandom(this.cupColors);
          this.dragObjects.add(
            new DragObject(this, "cup", 404, 190, 100, 100, c)
          );
          this.holding = this.dragObjects.getAt(this.dragObjects.length - 1);
        }
      ),
      new ClickObject(this, "ticket1", 72, 54, 100, 80, 0xe4c1f9, null, () => {
        const obj = this.clickObjects.getByName("ticket1");
        if (obj.scale == 3) return;
        this.clickObjects.bringToTop(obj);
        this.tweens.addCounter({
          from: 10,
          to: 30,
          onUpdate: function (tween) {
            obj.label.setFontSize(tween.getValue());
          },
          duration: 200,
        });
        this.tweens.add({
          targets: obj.label,
          x: 192,
          y: 200,
          duration: 200,
        });
        this.tweens.add({
          targets: obj,
          scale: 3,
          x: 192,
          y: 200,
          duration: 200,
          onComplete: () => {
            this.input.once("pointerup", () => {
              this.tweens.add({
                targets: [obj, obj.label],
                scale: 1,
                x: 72,
                y: 54,
                duration: 200,
              });
              this.tweens.addCounter({
                from: 30,
                to: 10,
                onUpdate: function (tween) {
                  obj.label.setFontSize(tween.getValue());
                },
                duration: 200,
              });
            });
          },
        });
      }),
      new ClickObject(this, "ticket2", 192, 54, 100, 80, 0x06d6a0, null, () => {
        const obj = this.clickObjects.getByName("ticket2");
        if (obj.scale == 3) return;
        this.clickObjects.bringToTop(obj);
        this.tweens.addCounter({
          from: 10,
          to: 30,
          onUpdate: function (tween) {
            obj.label.setFontSize(tween.getValue());
          },
          duration: 200,
        });
        this.tweens.add({
          targets: obj.label,
          x: 192,
          y: 200,
          duration: 200,
        });
        this.tweens.add({
          targets: obj,
          scale: 3,
          x: 192,
          y: 200,
          duration: 200,
          onComplete: () => {
            this.input.once("pointerup", () => {
              this.tweens.add({
                targets: [obj, obj.label],
                scale: 1,
                x: 192,
                y: 54,
                duration: 200,
              });
              this.tweens.addCounter({
                from: 30,
                to: 10,
                onUpdate: function (tween) {
                  obj.label.setFontSize(tween.getValue());
                },
                duration: 200,
              });
            });
          },
        });
      }),
      new ClickObject(this, "ticket3", 312, 54, 100, 80, 0x800e13, null, () => {
        const obj = this.clickObjects.getByName("ticket3");
        if (obj.scale == 3) return;
        this.clickObjects.bringToTop(obj);
        this.tweens.addCounter({
          from: 10,
          to: 30,
          onUpdate: function (tween) {
            obj.label.setFontSize(tween.getValue());
          },
          duration: 200,
        });
        this.tweens.add({
          targets: obj.label,
          x: 192,
          y: 200,
          duration: 200,
        });
        this.tweens.add({
          targets: obj,
          scale: 3,
          x: 192,
          y: 200,
          duration: 200,
          onComplete: () => {
            this.input.once("pointerup", () => {
              this.tweens.add({
                targets: [obj, obj.label],
                scale: 1,
                x: 312,
                y: 54,
                duration: 200,
              });
              this.tweens.addCounter({
                from: 30,
                to: 10,
                onUpdate: function (tween) {
                  obj.label.setFontSize(tween.getValue());
                },
                duration: 200,
              });
            });
          },
        });
      }),
    ]);

    this.dragObjects = this.add.container();
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
      .setDepth(2)
      .setName(name);

    scene.physics.add.existing(this.zone);

    this.zone.body.debugBodyColor = 0x00ffff;

    this.label = new CustomText(scene, x, y, name).setFontSize("10px");

    this.callback = callback ? callback : () => {};

    this.attachedToZone = [];

    this.zone.on("pointerup", (p) => {
      const obj = scene.holding;
      if (scene.holding) {
        scene.tweens.add({
          targets: scene.holding,
          y: this.zone.y - scene.holding.height / 2,
          scale: 1,
          duration: 50,
          onComplete: () => {
            this.callback(obj);
            scene.justDroppedOnZone = false;
          },
        });
        scene.justDroppedOnZone = true;
        scene.holding = null;
      }
    });

    return this;
  }
}

class DragObject extends Phaser.GameObjects.Rectangle {
  constructor(scene, name, x, y, w, h, c) {
    super(scene, x, y, w, h, c, 0.1).setName(name).setInteractive().setDepth(1);
    this.setStrokeStyle(5, c);

    this.on("pointerup", () => {
      if (!scene.holding && !scene.justDroppedOnZone) {
        scene.holding = this;
      }
    });

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
    super(scene, x, y, w, h, c, 1).setName(name).setInteractive().setDepth(1);

    this.label = new CustomText(scene, x, y, name).setFontSize("10px");

    this.downCallback = downCallback ? downCallback : () => {};

    this.upCallback = upCallback ? upCallback : () => {};

    this.on("pointerdown", this.downCallback);
    this.on("pointerup", this.upCallback);

    return this;
  }
}

const game = new Phaser.Game(config);
