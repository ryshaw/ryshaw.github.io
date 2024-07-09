const VERSION = "Infiniclimb v0.1";

const DEV_MODE = false; // turns on physics debug mode

const gameW = 800;
const gameH = 960;

const FONTS = ["Red Hat Display", "Josefin Sans"];

const COLORS = {
  topGradient: 0x9bf6ff, // for background//
  bottomGradient: 0xc2f8cb, // for background
  //fillColor: 0xedf2fb, // colors UI
  highlightColor: 0xffef9f, // for highlighting text
  clickColor: 0xbfbdc1, // when text is clicked
  buttonColor: 0xe0fbfc, // for coloring buttons and the title
  white: 0xffffff,
  black: 0x000000,
  gray: 0xd2d2cf,
  shipColors: [0xcdb4db, 0xffc8dd, 0xffafcc, 0xbde0fe, 0xa2d2ff, 0x8affc1],
  stationColor: 0x98f5e1,
  fillColor: 0x14213d,
  strokeColor: 0x6bbaec,
};

class Background extends Phaser.Scene {
  graphics;

  constructor() {
    super("Background");
  }

  // initiate all custom objects
  init() {
    Phaser.GameObjects.GameObjectFactory.register(
      "gameText",
      function (x, y, text, size, width, callback) {
        let t = new GameText(this.scene, x, y, text, size, width, callback);

        this.displayList.add(t);
        this.updateList.add(t);

        return t;
      }
    );
  }

  // preload everything for the game
  preload() {
    // load google's library for the various fonts we want to use
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    this.graphics = this.add.graphics();

    this.graphics.fillGradientStyle(
      COLORS.topGradient,
      COLORS.topGradient,
      COLORS.bottomGradient,
      COLORS.bottomGradient,
      0.9
    );
    this.graphics.fillRect(0, 0, window.innerWidth, window.innerHeight * 1.5);

    this.scene.launch("Game");
    this.scene.launch("HUD");

    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize) {
    this.graphics.clear();
    this.graphics.fillGradientStyle(
      COLORS.topGradient,
      COLORS.topGradient,
      COLORS.bottomGradient,
      COLORS.bottomGradient,
      0.9
    );
    this.graphics.fillRect(0, 0, gameSize.width, gameSize.height * 1.5);
  }
}

class Game extends Phaser.Scene {
  player;
  keysDown;
  arrow;

  constructor() {
    super("Game");
  }

  create() {
    this.createResolution();

    this.createTextures();

    this.createPlayer();
    this.createLayout();

    this.createPhysics();

    this.createKeyboardControls();
    this.createMouseControls();

    this.startGame();
  }

  createResolution() {
    // I don't know how this code works but it's magic. I also stole it from here:
    // https://labs.phaser.io/view.html?src=src/scalemanager\mobile%20game%20example.js
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    this.parent = new Phaser.Structs.Size(width, height);

    this.sizer = new Phaser.Structs.Size(
      gameW,
      gameH,
      Phaser.Structs.Size.FIT,
      this.parent
    );

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
    this.cameras.main.centerOn(gameW / 2, gameH / 2);

    this.scale.on("resize", this.resize, this);
  }

  createTextures() {
    this.make
      .graphics()
      .fillStyle(0x000000)
      .fillRoundedRect(0, 0, 50, 50, 12)
      .fillStyle(0xee4266)
      .fillRoundedRect(3.6, 3.6, 42, 42, 8)
      .generateTexture("rect", 50, 50)
      .clear()
      .fillStyle(0x000000)
      .fillRoundedRect(0, 0, gameW, gameH * 0.4, 20)
      .fillStyle(0x3da35d)
      .fillRoundedRect(6, 4, gameW - 16, gameH * 0.4 - 16, 12)
      .generateTexture("ground", gameW, gameH * 0.4)
      .destroy();
  }

  createLayout() {
    this.ground = this.matter.add.image(
      gameW * 0.5,
      gameH * 0.8,
      "ground",
      null,
      { isStatic: true }
    );
  }

  createPhysics() {
    this.matter.world.setBounds(0, 0, gameW, gameH, 64, true, true, true, true);
  }

  createPlayer() {
    this.player = this.matter.add.image(
      gameW * 0.5,
      gameH * 0.52,
      "rect",
      null,
      {
        restitution: 0.5,
        chamfer: { radius: 10 },
        density: 0.005,
        friction: 0.2,
      }
    );

    const arrowScale = 16;

    const arrowPoints = [
      [0, 6],
      [10, 6],
      [9, 10],
      [22, 3],
      [9, -4],
      [10, 0],
      [0, 0],
    ];

    // scale up the arrow (too lazy to hardcode it)
    arrowPoints.forEach((coord) => {
      coord[0] *= arrowScale;
      coord[1] *= arrowScale;
    });

    this.arrow = this.add
      .polygon(0, 0, arrowPoints, 0x83b0e1, 0.8)
      .setOrigin(0, 0.5)
      .setDepth(1)
      .setDisplayOrigin(0, 3 * arrowScale) // align polygon shape
      .setScale(0.1) // scaleY is [0.1, 0.2]
      .setStrokeStyle(20, 0x000000)
      .setVisible(false);
  }

  createMouseControls() {
    this.input.on("pointerdown", (p) => {
      const d =
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          p.worldX,
          p.worldY
        ) * 0.4;

      const a = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        p.worldX,
        p.worldY
      );

      this.tweens.add({
        targets: this.arrow.setVisible(true), // bruh
        scaleY: 0.2,
        scaleX: 0.25,
        duration: 1800,
      });
    });

    this.input.on("pointerup", (p) => {
      const a = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        p.worldX,
        p.worldY
      );

      const force = new Phaser.Math.Vector2(Math.cos(a), Math.sin(a));

      // calculate how far we are through the player holding down
      // convert scaleY to t; t is an interval from 0 to 1
      const t = this.arrow.scaleY * 10 - 1;

      this.player.applyForce(force.scale(t));

      this.tweens.killTweensOf(this.arrow);
      this.arrow.setScale(0.1).setVisible(false);
    });
  }

  startGame() {
    //this.scene.get("HUD").cameras.main.fadeIn();
  }

  update() {
    if (!this.arrow.visible) return;

    const p = this.input.activePointer.updateWorldPoint(this.cameras.main);

    const a = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      p.worldX,
      p.worldY
    );

    this.arrow
      .setPosition(
        this.player.x + 40 * Math.cos(a),
        this.player.y + 40 * Math.sin(a)
      )
      .setRotation(a);
  }

  createKeyboardControls() {
    this.keysDown = new Phaser.Structs.List();

    this.input.keyboard.on("keydown-W", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keyup-W", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keydown-UP", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keyup-UP", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keydown-S", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keyup-S", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keydown-DOWN", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keyup-DOWN", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keydown-A", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keyup-A", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keydown-LEFT", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keyup-LEFT", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keydown-D", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.RIGHT);
    });

    this.input.keyboard.on("keyup-D", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.RIGHT);
    });

    this.input.keyboard.on("keydown-RIGHT", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.RIGHT);
    });

    this.input.keyboard.on("keyup-RIGHT", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.RIGHT);
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

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
  }

  updateCamera() {
    const camera = this.cameras.main;

    const x = Math.ceil((this.parent.width - this.sizer.width) * 0.5);
    const y = 0;
    const scaleX = this.sizer.width / gameW;
    const scaleY = this.sizer.height / gameH;

    // this offset was meant to move the game screen a little up
    // because it was being centered a little down when playing it on
    // my phone (iPhone 12). I'm going to remove it now because
    // I'm prioritizing a multi-platform game and the offset looks
    // weird on other platforms.

    // offset is comparing the game's height to the window's height,
    // and centering the game in (kind of) the middle of the window.
    // old line:
    //const offset = (1 + this.parent.height / this.sizer.height) / 2;
    // new line:
    const offset = this.parent.height / this.sizer.height;

    if (!camera) return;

    camera.setViewport(x, y, this.sizer.width, this.sizer.height * offset);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(camera.midPoint.x, camera.midPoint.y);
  }
}

class HUD extends Phaser.Scene {
  bounds;

  constructor() {
    super("HUD");
  }

  create() {
    this.createResolution();

    // show bounds of game while in dev
    this.bounds = this.add
      .rectangle(gameW / 2, gameH / 2, gameW, gameH)
      .setStrokeStyle(4, 0xffffff);

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.createText();
      },
    });
  }

  createText() {
    this.add.gameText(gameW * 0.5, 0, "infiniclimb", 8).setOrigin(0.5, 0);

    this.add.gameText(gameW, gameH, VERSION).setOrigin(1, 1);

    const fpsText = this.add.gameText(0, gameH).setOrigin(0, 1);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callbackScope: this,
      callback: () => {
        fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`);
      },
    });
  }

  createResolution() {
    // I don't know how this code works but it's magic. I also stole it from here:
    // https://labs.phaser.io/view.html?src=src/scalemanager\mobile%20game%20example.js
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    this.parent = new Phaser.Structs.Size(width, height);

    this.sizer = new Phaser.Structs.Size(
      gameW,
      gameH,
      Phaser.Structs.Size.FIT,
      this.parent
    );

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
    this.cameras.main.centerOn(gameW / 2, gameH / 2);

    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
  }

  updateCamera() {
    const camera = this.cameras.main;

    const x = Math.ceil((this.parent.width - this.sizer.width) * 0.5);
    const y = 0;
    const scaleX = this.sizer.width / gameW;
    const scaleY = this.sizer.height / gameH;

    if (!camera) return;
    camera.setViewport(x, y, this.sizer.width, this.parent.height);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(camera.midPoint.x, camera.midPoint.y);
  }
}

// game scale configuration also stolen from
// https://labs.phaser.io/100.html?src=src\scalemanager\mobile%20game%20example.js
const config = {
  type: Phaser.AUTO,
  backgroundColor: 0x000000,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: gameW,
    height: gameH,
  },
  scene: [Background, Game, HUD],
  physics: {
    default: "matter",
    matter: {
      gravity: {
        x: 0,
        y: 1,
      },
      debug: DEV_MODE,
      //fps: 300,
    },
  },
  title: VERSION,
  autoFocus: true,
};

class GameText extends Phaser.GameObjects.Text {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    text = "",
    size = 0,
    width = null,
    callback = null // provided only for buttons
  ) {
    super(scene, x, y, text, {
      font: `${size * 8 + 24}px`,
      padding: gameW * 0.005,
      lineSpacing: 32,
      fill: "#fff",
      align: "left",
      wordWrap: { width: width ? width : gameW, useAdvancedWrap: true },
      shadow: {
        offsetX: Math.max(1.5, 0.3 * (size + 1)),
        offsetY: Math.max(1.5, 0.3 * (size + 1)),
        color: "#9cadce",
        blur: 1,
        stroke: true,
        fill: true,
      },
    });

    this.setOrigin(0, 0).setFontFamily("Josefin Sans");

    // if callback is given, assume it's a button and add callback.
    // fine-tuned this code so button only clicks if player
    // emits both pointerdown and pointerup events on it
    if (callback) {
      this.setInteractive()
        .on("pointerover", function (pointer) {
          this.setTint(COLORS.highlightColor);
        })
        .on("pointerout", function (pointer) {
          this.setTint(COLORS.white);
          //this.setShadow(0, 0, "#99c1de", 0, true, true);
          this.off("pointerup", callback, scene);
        })
        .on("pointerdown", function () {
          this.setTint(COLORS.clickColor);
          if (this.listenerCount("pointerup") < 2) {
            this.on("pointerup", callback, scene);
          }
        })
        .on("pointerup", function () {
          this.setTint(COLORS.highlightColor);
          // this.setShadow(0, 0, "#fcf5c7", 4, false, true);
        });
    }
  }

  preUpdate(delta, time) {}
}

class GameButton extends Phaser.GameObjects.Image {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    key,
    callback
  ) {
    super(scene);

    const cB = scene.add
      .image(x, y, key)
      .setScale(0.75)
      .setTint(COLORS.buttonColor);

    // fx slow down phones, so only allow on desktop
    /*if (scene.sys.game.device.os.desktop) {
      cB.preFX.setPadding(32);
      cB.preFX.addShadow(-2, -2, 0.06, 0.75, 0x000000, 4, 0.8);
    }*/

    cB.setInteractive()
      .on("pointerover", function () {
        this.setTint(COLORS.highlightColor).setScale(0.82);
        scene.scene.get("MainUI").playSound("pointerover");
      })
      .on("pointerout", function () {
        this.setTint(COLORS.buttonColor).setScale(0.75);
      })
      .on("pointerdown", callback, scene)
      .on("pointerup", function () {
        scene.scene.get("MainUI").playSound("pointerup");
      });

    return cB;
  }
}

const game = new Phaser.Game(config);
