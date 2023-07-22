class MidnightRide extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;
  houseLayer; // containing all house tiles

  constructor(config) {
    super(config);
  }

  preload() {
    // load google's library for the font, Press Start 2P
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    // load the tilesets and the tilemap
    this.load.image(
      "landTileset",
      "./assets/tiled/tilesets/GB-LandTileset.png"
    );
    this.load.image(
      "houseTileset",
      "./assets/tiled/tilesets/Universal-Buildings-and-walls.png"
    );
    this.load.image(
      "roadTileset",
      "./assets/tiled/tilesets/Universal-Road-Tileset.png"
    );
    this.load.tilemapTiledJSON("map", "./assets/tiled/map.json");

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
        this.loadGameUI();
      },
    });

    // create tilemap
    const map = this.make.tilemap({ key: "map" });
    const groundLayer = map
      .createLayer("Ground", map.addTilesetImage("land", "landTileset"))
      .setScale(4);
    groundLayer.setPosition(
      this.width / 2 - groundLayer.width * 2,
      this.height / 2 - groundLayer.height * 2
    );

    const roadLayer = map
      .createLayer("Road", map.addTilesetImage("roads", "roadTileset"))
      .setScale(4);
    roadLayer.setPosition(
      this.width / 2 - roadLayer.width * 2,
      this.height / 2 - roadLayer.height * 2
    );

    this.houseLayer = map
      .createLayer("Houses", map.addTilesetImage("buildings", "houseTileset"))
      .setScale(4);
    this.houseLayer.setPosition(
      this.width / 2 - this.houseLayer.width * 2,
      this.height / 2 - this.houseLayer.height * 2
    );

    const decorLayer = map
      .createLayer("Decorations", map.addTilesetImage("land", "landTileset"))
      .setScale(4);
    decorLayer.setPosition(
      this.width / 2 - decorLayer.width * 2,
      this.height / 2 - decorLayer.height * 2
    );

    // this next line sets up collision: if there is a road tile built on top of a ground tile,
    // set collision to false so the player can walk on it. otherwise, it's just grass,
    // so set collision to true. the player can only walk on road tiles
    groundLayer.forEachTile((tile) => {
      roadLayer.hasTileAt(tile.x, tile.y)
        ? tile.setCollision(false)
        : tile.setCollision(true);
    });

    this.player = this.physics.add.sprite(
      this.width / 2,
      this.height / 2 - 32,
      "player"
    );
    this.player.setScale(4);
    this.player.body.setSize(8, 8);
    this.player.body.isCircle = true;

    this.physics.add.collider(this.player, groundLayer);

    /*const debugGraphics = this.add.graphics().setAlpha(0.75);
    groundLayer.renderDebug(debugGraphics, {
      tileColor: new Phaser.Display.Color(25, 25, 255, 50),
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    })*/

    this.arrowKeys = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.physics.world.fixedStep = false;

    const tiles = this.houseLayer.getTilesWithinShape(
      new Phaser.Geom.Circle(this.player.x, this.player.y, 200),
      { isNotEmpty: true }
    );
    console.log(tiles);
  }

  update() {
    if (this.arrowKeys.left.isDown || this.wasdKeys.left.isDown) {
      this.player.body.setVelocity(-250, 0);
      this.player.setRotation((Math.PI * 3) / 2);
    } else if (this.arrowKeys.right.isDown || this.wasdKeys.right.isDown) {
      this.player.body.setVelocity(250, 0);
      this.player.setRotation((Math.PI * 1) / 2);
    } else if (this.arrowKeys.up.isDown || this.wasdKeys.up.isDown) {
      this.player.body.setVelocity(0, -250);
      this.player.setRotation(0);
    } else if (this.arrowKeys.down.isDown || this.wasdKeys.down.isDown) {
      this.player.body.setVelocity(0, 250);
      this.player.setRotation(Math.PI);
    }

    const tiles = this.houseLayer.getTilesWithinShape(
      new Phaser.Geom.Circle(this.player.x, this.player.y, 200),
      { isNotEmpty: true }
    );
    tiles.forEach((tile) => {
      tile.setAlpha(0.5);
    });
  }

  loadGameUI() {
    const t1 = new CustomText(this, 5, 15, "wasd/arrow keys to move", "m", "l")
      .setBackgroundColor("#000")
      .setPadding(5);

    const t2 = new CustomText(
      this,
      this.width - 5,
      15,
      "space to deliver msg",
      "m",
      "r"
    )
      .setBackgroundColor("#000")
      .setPadding(5);
  }
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
      .setDepth(1)
      .setScrollFactor(0);

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
