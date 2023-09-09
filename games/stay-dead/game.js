class Game extends Phaser.Scene {
  // window resolution is 1280x720.
  // game resolution is 320x180.
  windowW;
  windowH;
  gameW;
  gameH;
  UICamera;
  UIContainer;
  player;
  gun;
  arrowKeys;
  sounds;
  keys;
  mouseDown;
  graphics;
  reloadTime;

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    // load tilesets and tilemap
    this.load.image("tileset", "assets/tiled/tileset.png");
    this.load.tilemapTiledJSON("map", "assets/tiled/map.json");

    // load sprites
    this.load.image("car", "assets/car.png");
    this.windowW = game.config.width;
    this.windowH = game.config.height;
    this.gameW = this.windowW / 4;
    this.gameH = this.windowH / 4;

    this.mouseDown = false;
    this.reloadTime = 0;
  }

  create() {
    this.graphics = this.add.graphics({
      lineStyle: { width: 0.2, color: 0xffd166 },
    });

    // zoom in camera and reset position
    // bounds of the world are [0, 0, gameW, gameH]
    this.cameras.main.setZoom(4);
    this.cameras.main.centerOn(this.gameW / 2, this.gameH / 2);
    this.physics.world.setBounds(0, 0, this.gameW, this.gameH);

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
  }

  createLayout() {
    const map = this.make.tilemap({ key: "map" });

    const backgroundLayer = map.createLayer(
      "Background",
      map.addTilesetImage("tileset", "tileset")
    );

    const fortLayer = map
      .createLayer("Fort", map.addTilesetImage("tileset", "tileset"))
      .setDepth(1); // to be above car

    map.setCollisionByExclusion([-1], true, true, fortLayer);

    this.player = this.physics.add.sprite(
      this.gameW * 0.1,
      this.gameH * 0.5,
      "car"
    );
    this.player.body.setSize(8, 8);
    this.player.body.isCircle = true;
    this.player.body.collideWorldBounds = true;
    this.player.speed = 0;

    this.physics.add.collider(this.player, fortLayer);

    // gun is given the exact same body as player,
    // so it mimics all movement. this is a workaround
    // rather than throwing both of them in a Container.
    this.gun = this.add
      .rectangle(this.player.x, this.player.y, 1, 10, 0xffffff, 1)
      .setOrigin(0.5, 0)
      .setRotation(-Math.PI / 2);

    this.physics.add.existing(this.gun);
    this.gun.body.setSize(8, 8);
    this.gun.body.isCircle = true;
    this.gun.body.collideWorldBounds = true;
    this.gun.body.setOffset(-4, -4);

    this.physics.add.collider(this.gun, fortLayer);
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
    this.graphics.clear();
    this.updatePlayerMovement();

    if (this.mouseDown && this.reloadTime <= 0) {
      const v = this.input.activePointer.positionToCamera(this.cameras.main);
      this.add.rectangle(v.x, v.y, 1, 1, 0xffd166, 1);
      const offset = new Phaser.Math.Vector2(
        Math.cos(this.gun.rotation + Math.PI / 2) * this.gun.height,
        Math.sin(this.gun.rotation + Math.PI / 2) * this.gun.height
      );
      const line = new Phaser.Geom.Line(
        this.player.x + offset.x,
        this.player.y + offset.y,
        v.x,
        v.y
      );
      this.graphics.strokeLineShape(line);
      this.reloadTime = 0.1;
      this.tweens.add({
        targets: this,
        reloadTime: 0,
        duration: this.reloadTime * 1000,
      });
    }
  }

  updatePlayerMovement() {
    // this is a long one :)

    let turnRadius = 220; // maximum turn radius of the car
    let maxSpeed = 100; // maximum speed of the car

    const forward = this.keys.up.isDown || this.keys.w.isDown;
    const backward = this.keys.down.isDown || this.keys.s.isDown;
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;

    // if we're moving forward but not fully at maxSpeed, scale down turnRadius
    // so you can't spin around going at low speeds, similar to cars irl
    if (
      // this.player.speed >= 0 &&
      Math.abs(this.player.speed) <
      maxSpeed * 0.8
    ) {
      turnRadius *= this.player.speed / (maxSpeed * 0.8);
    }

    // if we're backing up, turn down the turnRadius
    //if (this.player.speed < 0) turnRadius *= -0.5;

    // turn left when we press left
    if (left && !right) {
      this.player.body.angularVelocity = Phaser.Math.Linear(
        this.player.body.angularVelocity,
        -turnRadius,
        0.04
      );
      // if we're turning right when we press left, turn left faster
      if (this.player.body.angularVelocity > 0) {
        this.player.body.angularVelocity = Phaser.Math.Linear(
          this.player.body.angularVelocity,
          -turnRadius,
          0.04
        );
      }
    }

    // turn right when press right
    if (right && !left) {
      this.player.body.angularVelocity = Phaser.Math.Linear(
        this.player.body.angularVelocity,
        turnRadius,
        0.04
      );
      // if we're turning left when we press right, turn right faster
      if (this.player.body.angularVelocity < 0) {
        this.player.body.angularVelocity = Phaser.Math.Linear(
          this.player.body.angularVelocity,
          turnRadius,
          0.04
        );
      }
    }

    // if we don't press left or right, stop turning
    if (!left && !right) {
      this.player.body.angularVelocity = Phaser.Math.Linear(
        this.player.body.angularVelocity,
        0,
        0.3
      );
      if (Math.abs(this.player.body.angularVelocity) < 0.01) {
        this.player.body.angularVelocity = 0;
      }
    }

    // if we press up, move forward
    if (forward && !backward) {
      this.player.speed = Phaser.Math.Linear(this.player.speed, maxSpeed, 0.02);
    }

    // if we press down, go backward
    if (backward && !forward) {
      this.player.speed = Phaser.Math.Linear(
        this.player.speed,
        -maxSpeed * 0.4,
        0.02
      );
      // if going forward, brake faster
      if (this.player.speed > 0) {
        this.player.speed = Phaser.Math.Linear(
          this.player.speed,
          -maxSpeed * 0.4,
          0.02
        );
      }
    }

    // if we press neither up nor right, slow down
    if (!backward && !forward) {
      this.player.speed = Phaser.Math.Linear(this.player.speed, 0, 0.04);
      if (Math.abs(this.player.speed) < 0.01) {
        this.player.speed = 0;
      }
    }

    // set body velocity according to speed and angle
    this.player.body.velocity = this.physics
      .velocityFromAngle(this.player.angle, 1)
      .scale(this.player.speed);

    // set gun velocity to the exact same,
    // so it looks like it's attached to the car
    this.gun.body.velocity = this.physics
      .velocityFromAngle(this.player.angle, 1)
      .scale(this.player.speed);

    const v = this.input.activePointer.positionToCamera(this.cameras.main);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      v.x,
      v.y
    );
    this.gun.setRotation(angle - Math.PI / 2);
  }

  loadGameUI() {
    new CustomText(this, 5, 5, "wasd or arrow keys to move", "s").setOrigin(
      0,
      0
    );
    new CustomText(this, this.windowW * 0.5, 5, "STAY DEAD", "m")
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
      this.windowW / 2,
      this.windowH / 2,
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
