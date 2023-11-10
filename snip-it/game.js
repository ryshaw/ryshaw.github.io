const VERSION = "Snip It! v0.1";

class Background extends Phaser.Scene {
  constructor() {
    super("Background");
  }

  create() {
    // add gradient background. this is stolen from a phaser example
    // https://labs.phaser.io/view.html?src=src/fx\gradient\gradient%20fx.js
    const num1 = 0.1;
    const num2 = 0.9;
    const top = "0x023e8a";
    const bottom = "0x457b9d";
    const w = window.innerWidth; // take up the full browser window
    const h = window.innerHeight;
    this.add
      .image(w / 2, h / 2, "__WHITE")
      .setDisplaySize(w, h)
      .preFX.addGradient(top, bottom, 0.16, num1, num1, num2, num2, 18);

    this.scene.launch("Game");
  }
}

class Game extends Phaser.Scene {
  gameW = 640;
  gameH = 960;
  keysDown;
  graphics;
  boundsPath; // path covering the perimeter of the "canvas"
  player;
  bounds; // big rectangle that is the "canvas"
  side; // where is the player if on the perimeter? top, bottom, left, or right?
  points; // points in the path that player is drawing
  direction; // what direction is player going in?

  constructor() {
    super("Game");
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    // resolution, resizing, camera code stolen from
    // https://labs.phaser.io/view.html?src=src/scalemanager\mobile%20game%20example.js
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    this.parent = new Phaser.Structs.Size(width, height);
    this.sizer = new Phaser.Structs.Size(
      this.gameW,
      this.gameH,
      Phaser.Structs.Size.FIT,
      this.parent
    );

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();

    this.scale.on("resize", this.resize, this);

    this.createLayout();
    this.createControls();

    WebFont.load({
      google: {
        families: [
          "IBM Plex Mono",
          "Finger Paint",
          "Anonymous Pro",
          "Roboto Mono",
          "PT Sans",
          "Quicksand",
          "IBM Plex Sans",
          "Titillium Web",
        ],
      },
      active: () => {
        this.loadGameUI();
      },
    });
  }

  createLayout() {
    // show the "game window" while in development
    this.add.rectangle(
      this.gameW * 0.5,
      this.gameH * 0.5,
      this.gameW,
      this.gameH,
      0x000000,
      0.04
    );

    this.graphics = this.add.graphics();

    this.bounds = this.add
      .rectangle(
        this.gameW * 0.5,
        this.gameH * 0.49,
        this.gameW * 0.8,
        this.gameH * 0.7,
        0xffc8dd,
        0.2
      )
      .setStrokeStyle(6, 0x023047);

    this.createPathAndPlayer(
      this.gameW * 0.1,
      this.gameH * 0.14,
      this.gameW * 0.8,
      this.gameH * 0.7
    );
  }

  createPathAndPlayer(x, y, width, length) {
    this.boundsPath = this.add
      .path(x, y)
      .lineTo(x + width, y)
      .lineTo(x + width, y + length)
      .lineTo(x, y + length)
      .lineTo(x, y);

    // create simple rectangle texture for player
    const rectangleDrawer = this.make.graphics(); // disposable graphics obj
    const playerW = 16;
    rectangleDrawer.fillStyle(0xffb703, 1);
    rectangleDrawer.fillRect(0, 0, playerW, playerW);
    rectangleDrawer.generateTexture("rect", playerW, playerW);
    this.player = this.physics.add
      .sprite(x + width / 2, y, "rect")
      .setName("player");
    this.player.setCollideWorldBounds(true);
    this.player.body.onWorldBounds = true;

    this.side = "top";

    this.physics.world.setBounds(
      x - playerW / 2,
      y - playerW / 2,
      width + playerW,
      length + playerW
    );

    this.physics.world.on("worldbounds", (body, up, down, left, right) => {
      if (body.gameObject.name == "player") {
        this.points = new Phaser.Structs.List(); // reset drawing
        if (up && this.side != "top") this.side = "top";
        if (down && this.side != "bottom") this.side = "bottom";
        if (left && this.side != "left") this.side = "left";
        if (right && this.side != "right") this.side = "right";
      }
    });
  }

  loadGameUI() {
    new CustomText(this, this.gameW * 0.5, 20, "snip it!", "g", "l")
      .setOrigin(0.5, 0)
      .postFX.addGlow(0xffffff, 0.45);

    new CustomText(
      this,
      this.gameW * 0.5,
      this.gameH - 20,
      "a game by ryshaw\nmade in phaser 3",
      "m",
      "c"
    )
      .setOrigin(0.5, 1)
      .postFX.addGlow(0xffffff, 0.3);
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
    const scaleX = this.sizer.width / this.gameW;
    const scaleY = this.sizer.height / this.gameH;

    // offset is comparing the game's height to the window's height,
    // and centering the game in the middle of the window.
    const offset = 1; //this.parent.height / this.sizer.height;

    camera.setViewport(x, y, this.sizer.width, this.sizer.height * offset);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(this.gameW / 2, this.gameH / 2);
  }

  createControls() {
    this.keysDown = new Phaser.Structs.List();

    this.input.keyboard.on("keydown-W", (event) => {
      this.keysDown.add("up");
    });

    this.input.keyboard.on("keyup-W", (event) => {
      this.keysDown.remove("up");
    });

    this.input.keyboard.on("keydown-UP", (event) => {
      this.keysDown.add("up");
    });

    this.input.keyboard.on("keyup-UP", (event) => {
      this.keysDown.remove("up");
    });

    this.input.keyboard.on("keydown-S", (event) => {
      this.keysDown.add("down");
    });

    this.input.keyboard.on("keyup-S", (event) => {
      this.keysDown.remove("down");
    });

    this.input.keyboard.on("keydown-DOWN", (event) => {
      this.keysDown.add("down");
    });

    this.input.keyboard.on("keyup-DOWN", (event) => {
      this.keysDown.remove("down");
    });

    this.input.keyboard.on("keydown-A", (event) => {
      this.keysDown.add("left");
    });

    this.input.keyboard.on("keyup-A", (event) => {
      this.keysDown.remove("left");
    });

    this.input.keyboard.on("keydown-LEFT", (event) => {
      this.keysDown.add("left");
    });

    this.input.keyboard.on("keyup-LEFT", (event) => {
      this.keysDown.remove("left");
    });

    this.input.keyboard.on("keydown-D", (event) => {
      this.keysDown.add("right");
    });

    this.input.keyboard.on("keyup-D", (event) => {
      this.keysDown.remove("right");
    });

    this.input.keyboard.on("keydown-RIGHT", (event) => {
      this.keysDown.add("right");
    });

    this.input.keyboard.on("keyup-RIGHT", (event) => {
      this.keysDown.remove("right");
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
    this.input.removeAllListeners();
    //this.input.keyboard.removeAllListeners();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.sound.stopAll();
    this.sound.removeAll();
    this.anims.resumeAll();
    this.matter.resume();
    this.create();
  }

  update() {
    this.graphics.clear();
    /*if (this.rectangle) {
      this.rectangle.setPosition(
        (this.lineStartPos.x + this.player.x) / 2,
        (this.lineStartPos.y + this.player.y) / 2
      );

      if (this.player.body.velocity.x != 0) {
        this.rectangle.setSize(this.lineStartPos.x - this.player.x, 6);
        this.rectangle.body.setSize(this.lineStartPos.x - this.player.x, 6);
      } else if (this.player.body.velocity.y != 0) {
        this.rectangle.setSize(6, this.lineStartPos.y - this.player.y);
        this.rectangle.body.setSize(6, this.lineStartPos.y - this.player.y);
      }
    }*/

    this.updatePlayerMovement();
  }

  updatePlayerMovement() {
    const speed = 200;

    // player speed is only dictated by the last key held down
    switch (this.keysDown.last) {
      case "up":
        this.player.setVelocity(0, -speed);
        if (this.side == "bottom") {
          // player was on bottom wall
          this.points.add(
            new Phaser.Math.Vector2(this.player.x, this.player.y)
          );
          this.side = "none";
          this.rectangle = this.add
            .rectangle(0, 0, 0, 0, 0xffffff, 1)
            .setDepth(-1);
          this.physics.add.existing(this.rectangle);
        }
        break;
      case "down":
        this.player.setVelocity(0, speed);
        if (this.side == "top") {
          // player was on top wall
          this.points = new Phaser.Math.Vector2(this.player.x, this.player.y);
          this.side = "none";
          this.rectangle = this.add
            .rectangle(0, 0, 0, 0, 0xffffff, 1)
            .setDepth(-1);
          this.physics.add.existing(this.rectangle);
        }
        break;
      case "left":
        this.player.setVelocity(-speed, 0);
        if (this.side == "right") {
          // player was on right wall
          this.points = new Phaser.Math.Vector2(this.player.x, this.player.y);
          this.side = "none";
          this.rectangle = this.add
            .rectangle(0, 0, 0, 0, 0xffffff, 1)
            .setDepth(-1);
          this.physics.add.existing(this.rectangle);
        }
        break;
      case "right":
        this.player.setVelocity(speed, 0);
        if (this.side == "left") {
          // player was on left wall
          this.points = new Phaser.Math.Vector2(this.player.x, this.player.y);
          this.side = "none";
          this.rectangle = this.add
            .rectangle(0, 0, 0, 0, 0xffffff, 1)
            .setDepth(-1);
          this.physics.add.existing(this.rectangle);
        }
        break;
      default:
        // no keys down
        this.player.setVelocity(0, 0);
        break;
    }
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

// game configuration also stolen from
// https://labs.phaser.io/100.html?src=src\scalemanager\mobile%20game%20example.js
const config = {
  type: Phaser.AUTO,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 640,
    height: 960,
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 1400,
      height: 1200,
    },
  },
  scene: [Background, Game],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: true,
    },
  },
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

    this.clickedOn = false;

    const cT = scene.add
      .text(x, y, text, {
        font:
          size == "g"
            ? "64px"
            : size == "l"
            ? "48px"
            : size == "m"
            ? "32px"
            : "16px",
        fill: "#fff",
        align: "left",
      })
      .setFontFamily("Roboto Mono")
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setLineSpacing(16);

    //"IBM Plex Mono", "Finger Paint", "Anonymous Pro"]
    //"Roboto Mono", "PT Sans", "Quicksand", "IBM Plex Sans", "Titillium Web"

    // if callback is given, assume it's a button and add callback.
    // fine-tuned this code so button only clicks if player
    // emits both pointerdown and pointerup events on it
    if (callback) {
      cT.setInteractive({ useHandCursor: true })
        .setBackgroundColor("#3c6e71")
        .setPadding(6)
        .on("pointerover", function () {
          this.setTint(0xeeeeee);
        })
        .on("pointerout", function () {
          this.setTint(0xffffff).off("pointerup", callback, scene);
        })
        .on("pointerdown", function () {
          this.setTint(0xdddddd);
          if (this.listenerCount("pointerup") < 2) {
            this.on("pointerup", callback, scene);
          }
        })
        .on("pointerup", function () {
          this.setTint(0xeeeeee);
        });

      // create dark green outline.
      // i don't know how this works.
      const bounds = cT.getBounds();
      const rect = scene.add.rectangle(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height,
        bounds.width + 6,
        bounds.height + 6,
        0x284b63,
        1
      );
    }
    return cT;
  }
}

const game = new Phaser.Game(config);
