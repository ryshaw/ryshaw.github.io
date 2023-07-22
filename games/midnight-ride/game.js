class MidnightRide extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  cursors;

  constructor(config) {
    super(config);
  }

  preload() {
    // load google's library for the font, Press Start 2P
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    // load the tilemap
    this.load.image("tiles", "./assets/tiled/test-tileset.png");
    this.load.tilemapTiledJSON("testMap", "./assets/test.json");

    this.load.image("player", "./assets/player.png");

    this.width = game.config.width;
    this.height = game.config.height;
  }

  create() {
    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => {
        //this.firstTimeLoad ? this.loadStartUI() : this.gameStart();
      },
    });

    const map = this.make.tilemap({ key: "testMap" });
    const tileset = map.addTilesetImage("test", "tiles");
    const groundLayer = map.createLayer("Ground", tileset).setScale(2);
    groundLayer.setPosition(this.width / 2 - groundLayer.width, this.height / 2 - groundLayer.height);
    const houseLayer = map.createLayer("House", tileset).setScale(2);
    houseLayer.setPosition(this.width / 2 - houseLayer.width, this.height / 2 - houseLayer.height);
  
    groundLayer.setCollisionByProperty({ collision: true });

    this.player = this.physics.add.sprite(this.width / 2, this.height / 2, "player");
    this.player.setScale(2);
    this.player.body.setSize(8, 8);

    this.physics.add.collider(this.player, groundLayer);
    /*const debugGraphics = this.add.graphics().setAlpha(0.75);
    groundLayer.renderDebug(debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    })*/


    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    this.player.body.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-100);
      this.player.setRotation(Math.PI * 3/2);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(100);
      this.player.setRotation(Math.PI * 1/2);
    }

    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-100);
      this.player.setRotation(0);
    } else if (this.cursors.down.isDown) {
      this.player.body.setVelocityY(100);
      this.player.setRotation(Math.PI);
    }

    this.player.body.velocity.normalize().scale(100);
    //this.player.body.updateFromGameObject();
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
    },
  },
  scaleMode: Phaser.Scale.FIT,
  pixelArt: true,
  backgroundColor: "#fff",
  scene: MidnightRide,
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
        font: size == "l" ? "24px" : size == "m" ? "16px" : "10px",
        fill: "#fff",
        align: "center",
        lineSpacing: 16,
      })
      .setFontFamily('"Press Start 2P"')
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setDepth(1);

    // if callback is given, assume it's a button and add callback
    if (callback) {
      cT.setInteractive()
        .on("pointerover", function () {
          this.setFill("#00ff00");
        })
        .on("pointerout", function () {
          this.setFill("#fff");
        })
        .on("pointerdown", callback, scene);
    }

    return cT;
  }
}

const game = new Phaser.Game(config);
