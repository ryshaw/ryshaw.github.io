const VERSION = "Snip It! v0.1";

class Game extends Phaser.Scene {
  // window resolution is 1280x720.
  // game resolution is 320x180.
  windowW;
  windowH;
  gameW;
  gameH;
  UICamera;
  UIContainer;
  player; // container with the car and the mounted gun
  arrowKeys;
  sounds;
  keys;
  mouseDown;
  graphics;
  reloadTime;
  bullets; // GameObject group
  zombos; // GameObject group
  food;
  days;
  wave;
  nightTime; // timer that ticks during nighttime, goes from 0 to 36
  timeInterval; // controls timeText and switching states
  waveInterval; // spawns zombos throughout the night
  isGameOver;
  money; // every zombo killed adds to money

  boundsGroup; // player and bounds collide, nothing else collides with bounds

  constructor() {
    super({ key: "Night" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.windowW = game.config.width;
    this.windowH = game.config.height;
    this.gameW = this.windowW / 4;
    this.gameH = this.windowH / 4;
  }

  create() {
    this.graphics = this.add.graphics({
      lineStyle: { width: 0.2, color: 0xffd166 },
      fillStyle: { color: 0xff00ff },
    });

    // zoom in camera and reset position
    // bounds of the world are [0, 0, gameW, gameH]
    this.cameras.main.setZoom(4);
    this.cameras.main.centerOn(this.gameW / 2, this.gameH / 2);
    this.cameras.main.setBackgroundColor("#9badb7");

    this.createLayout();
    this.createControls();

    // get this all the way off the screen
    // so the UI isn't duplicated on the main camera
    this.UICamera = this.cameras.add(
      -this.windowW,
      -this.windowH,
      this.windowW * 2,
      this.windowH * 2
    );

    // adjust position of all UI to match the offset cam
    this.UIContainer = this.add
      .container()
      .setPosition(this.windowW, this.windowH);

    WebFont.load({
      google: {
        families: ["IBM Plex Mono", "Finger Paint", "Anonymous Pro"],
      },
      active: () => {
        this.loadGameUI();
      },
    });

    console.log(this.windowW, this.windowH, this.gameW, this.gameH);

    //this.cameras.main.fadeIn(800);
    //this.UICamera.fadeIn(800);
  }

  createLayout() {}

  loadGameUI() {}

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

  createControls() {
    this.input.on("pointerdown", (p) => (this.mouseDown = true));
    this.input.on("pointerup", (p) => (this.mouseDown = false));

    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
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

  update() {}

  /*gameOver() {
    /*
    this.sound.stopAll();

    this.sounds["lose"].play({
      volume: 0.4,
    });

    this.matter.pause();
    this.tweens.killAll();
    this.anims.pauseAll();
    this.isGameOver = true;
    clearInterval(this.timeInterval);
    clearInterval(this.waveInterval);

    const t = new CustomText(
      this,
      this.windowW / 2,
      this.windowH / 2,
      `game over!\nyou lasted ${this.days} days\nclick to play again`,
      "l",
      "c"
    )
      .setColor("#9e2a2b")
      .setPadding(15)
      .setBackgroundColor("#f5ebe0")
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
  }*/
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
  physics: {
    default: "arcade",
    matter: {
      debug: false,
      gravity: {
        x: 0,
        y: 0,
      },
    },
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  backgroundColor: "#000000",
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

    this.clickedOn = false;

    const cT = scene.add
      .text(x, y, text, {
        font:
          size == "g"
            ? "48px"
            : size == "l"
            ? "32px"
            : size == "m"
            ? "24px"
            : "16px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily("Anonymous Pro")
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setLineSpacing(16);

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
      scene.UIContainer.add(rect);
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
