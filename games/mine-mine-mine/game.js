class Game extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;

  constructor() {
    super({ key: "Game" });
  }

  preload() {
    // load google's library for the font, Press Start 2P
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    // load the tilesets and the tilemap
    this.load.image("dirt-tiles", "./assets/tiled/tilesets/dirt-tiles.png");

    this.load.tilemapTiledJSON("map", "./assets/tiled/map.json");
  }

  create() {
    this.addKeyboardControls();

    this.createMapAndObjects();

    // add UI stuff at the very end so it's above everything
    this.UICamera = this.cameras.add(
      this.cameras.main.x,
      this.cameras.main.y,
      this.cameras.main.width,
      this.cameras.main.height
    );

    this.children.getAll().forEach((object) => {
      this.UICamera.ignore(object);
    });

    this.cameras.main.setZoom(4);

    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => {
        //this.loadGameUI();
      },
    });
  }

  createMapAndObjects() {
    const map = this.make.tilemap({ key: "map" });
    const groundLayer = map.createLayer(
      "Ground",
      map.addTilesetImage("dirt-tiles", "dirt-tiles")
    );

    //const gemsLayer = map.createLayer("Gems");

    map.objects[0].objects.forEach((object) => {
      if (object.name == "Player") {
        this.player = this.physics.add.sprite(object.x, object.y, "paul_side");
        this.player.body.setSize(64, 64);
        this.player.body.isCircle = true;
        this.physics.add.collider(this.player, groundLayer);
        this.playerAngle = 0;
      }
    });

    /*const debugGraphics = this.add.graphics().setAlpha(0.75);
    groundLayer.renderDebug(debugGraphics, {
      tileColor: new Phaser.Display.Color(25, 25, 255, 50),
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });*/
  }

  addKeyboardControls() {
    this.input.keyboard.on("keydown-SPACE", () => {});

    this.input.keyboard.on("keydown-LEFT", () => {
      if (this.playerDirection != Phaser.Math.Vector2.LEFT) {
        this.playerDirection = Phaser.Math.Vector2.LEFT;
        this.updateMovement(Phaser.Math.Vector2.LEFT);
      }
    });

    this.input.keyboard.on("keydown-RIGHT", () => {
      if (this.playerDirection != Phaser.Math.Vector2.RIGHT) {
        this.playerDirection = Phaser.Math.Vector2.RIGHT;
        this.updateMovement(Phaser.Math.Vector2.RIGHT);
      }
    });

    this.input.keyboard.on("keydown-UP", () => {
      if (this.playerDirection != Phaser.Math.Vector2.UP) {
        this.playerDirection = Phaser.Math.Vector2.UP;
        this.updateMovement(Phaser.Math.Vector2.UP);
      }
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      if (this.playerDirection != Phaser.Math.Vector2.DOWN) {
        this.playerDirection = Phaser.Math.Vector2.DOWN;
        this.updateMovement(Phaser.Math.Vector2.DOWN);
      }
    });

    this.input.keyboard.on("keydown-A", () => {
      if (this.playerDirection != Phaser.Math.Vector2.LEFT) {
        this.playerDirection = Phaser.Math.Vector2.LEFT;
        this.updateMovement(Phaser.Math.Vector2.LEFT);
      }
    });

    this.input.keyboard.on("keydown-D", () => {
      if (this.playerDirection != Phaser.Math.Vector2.RIGHT) {
        this.playerDirection = Phaser.Math.Vector2.RIGHT;
        this.updateMovement(Phaser.Math.Vector2.RIGHT);
      }
    });

    this.input.keyboard.on("keydown-W", () => {
      if (this.playerDirection != Phaser.Math.Vector2.UP) {
        this.playerDirection = Phaser.Math.Vector2.UP;
        this.updateMovement(Phaser.Math.Vector2.UP);
      }
    });

    this.input.keyboard.on("keydown-S", () => {
      if (this.playerDirection != Phaser.Math.Vector2.DOWN) {
        this.playerDirection = Phaser.Math.Vector2.DOWN;
        this.updateMovement(Phaser.Math.Vector2.DOWN);
      }
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

  /*
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
  }*/

  update() {}
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scaleMode: Phaser.Scale.FIT,
  pixelArt: true,
  backgroundColor: "#000",
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
            ? "48px"
            : size == "l"
            ? "30px"
            : size == "m"
            ? "18px"
            : "12px",
        fill: "#fff",
        align: "center",
        lineSpacing: 16,
      })
      .setDepth(2)
      .setFontFamily('"GFS Didot"')
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setScrollFactor(0)
      .setBackgroundColor("#1f1a1b")
      .setPadding(10)
      .setColor("#dad3d3");

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
