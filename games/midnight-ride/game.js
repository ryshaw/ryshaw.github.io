class MidnightRide extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;
  houseLayer; // containing all house tiles
  spaceKeyHeldDown; // checks if space key is being held down, which is not what we want
  numHousesLeft; // keeps track of how many houses have not been delivered to
  housesRemainingText; // Ui that displays how many houses have not been delivered to
  gameWin; // boolean that checks if game has been won

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
    this.load.image("message", "./assets/message.png");

    this.width = game.config.width;
    this.height = game.config.height;
    this.gameWin = false;
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

    this.player = this.physics.add
      .sprite(this.width / 2, this.height / 2 - 32, "player")
      .setScale(4)
      .setDepth(1);
    this.player.body.setSize(8, 8);
    this.player.body.isCircle = true;

    this.createTilemap();

    this.arrowKeys = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.physics.world.fixedStep = false;

    // "hitbox" around player to visualize when close enough to house
    /*this.circle = this.add
      .circle(this.player.x, this.player.y, 80)
      .setStrokeStyle(2, Phaser.Display.Color.GetColor(255, 255, 0));*/
  }

  update() {
    // if game is won and player presses space, restart game
    if (this.gameWin && this.spaceKey.isDown && !this.spaceKeyHeldDown) {
      this.gameWin = false;
      this.children.getAll().forEach((object) => {
        object.destroy();
      });
      this.player = undefined;
      this.create();
    }

    this.updatePlayerMovement();

    this.houseLayer.forEachTile((tile) => (tile.tint = 0xffffff));

    // houses within player that they can deliver message to
    const tiles = this.houseLayer.getTilesWithinShape(
      new Phaser.Geom.Circle(this.player.x, this.player.y, 80),
      { isNotEmpty: true }
    );

    // give them a highlight so player knows they can deliver
    tiles.forEach((tile) => {
      if (!tile.properties.delivered) tile.tint = 0xefcd00;
    });

    // if there's a deliverable house nearby,
    // and the space key is pressed,
    // and the space key is not being held down (i.e. was just pressed),
    // deliver message
    if (tiles.length > 0 && this.spaceKey.isDown && !this.spaceKeyHeldDown) {
      tiles.forEach((tile) => {
        // only deliver msg if player hasn't delivered to this house
        if (!tile.properties.delivered) {
          const msg = this.add
            .sprite(this.player.x, this.player.y, "message")
            .setScale(1)
            .setDepth(1);

          // add animation of moving msg from player to house
          this.tweens.add({
            targets: msg,
            x: tile.getCenterX() - 16, // offset to left
            y: tile.getCenterY() + 16, // offset to bottom
            duration: 600,
            ease: "Power1",
            scale: 3,
          });

          // house has been delivered to
          tile.properties.delivered = true;
          // fire off event to the "houses left" text object
          this.numHousesLeft--;
          this.housesRemainingText.setText(
            `houses left: ${this.numHousesLeft}`
          );

          if (this.numHousesLeft <= 0) this.loadGameWin();
        }
      });
    }

    if (this.circle) this.circle.setPosition(this.player.x, this.player.y);

    // if space key is being held down, we don't want to deliver message
    this.spaceKeyHeldDown = this.spaceKey.isDown;
  }

  createTilemap() {
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

    this.physics.add.collider(this.player, groundLayer);

    // add "delivered" property to all houses, to keep track if player delivered msg to them already
    this.houseLayer.forEachTile((tile) => {
      tile.properties = { delivered: false };
    });

    // get the number of houses on this map, to keep track
    this.numHousesLeft = this.houseLayer.getTilesWithin(
      0,
      0,
      this.houseLayer.width,
      this.houseLayer.height,
      { isNotEmpty: true }
    ).length;

    /*const debugGraphics = this.add.graphics().setAlpha(0.75);
    groundLayer.renderDebug(debugGraphics, {
      tileColor: new Phaser.Display.Color(25, 25, 255, 50),
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    })*/
  }

  updatePlayerMovement() {
    if (this.gameWin) return; // game is over, don't move player any more

    const speed = 300;
    if (this.arrowKeys.left.isDown || this.wasdKeys.left.isDown) {
      this.player.body.setVelocity(-speed, 0);
      this.player.setRotation((Math.PI * 3) / 2);
    } else if (this.arrowKeys.right.isDown || this.wasdKeys.right.isDown) {
      this.player.body.setVelocity(speed, 0);
      this.player.setRotation((Math.PI * 1) / 2);
    } else if (this.arrowKeys.up.isDown || this.wasdKeys.up.isDown) {
      this.player.body.setVelocity(0, -speed);
      this.player.setRotation(0);
    } else if (this.arrowKeys.down.isDown || this.wasdKeys.down.isDown) {
      this.player.body.setVelocity(0, speed);
      this.player.setRotation(Math.PI);
    }
  }

  loadGameUI() {
    const t1 = new CustomText(this, 5, 15, "wasd/arrow keys to move", "m", "l")
      .setBackgroundColor("#000")
      .setPadding(5);

    const t2 = new CustomText(
      this,
      this.width - 5,
      15,
      "space to warn house",
      "m",
      "r"
    )
      .setBackgroundColor("#000")
      .setPadding(5);

    this.housesRemainingText = new CustomText(
      this,
      this.width / 2,
      15,
      `houses left: ${this.numHousesLeft}`,
      "m",
      "c"
    )
      .setBackgroundColor("#000")
      .setPadding(5);

    // this.loadGameWin();
  }

  loadGameWin() {
    this.gameWin = true;
    this.player.body.moves = false;

    const t1 = new CustomText(
      this,
      this.width / 2,
      this.height / 3,
      "you win!!",
      "l",
      "c"
    )
      .setBackgroundColor("#000")
      .setPadding(10);

    const t2 = new CustomText(
      this,
      this.width / 2,
      (this.height * 2) / 3,
      "press space\nto play again",
      "m",
      "c"
    )
      .setBackgroundColor("#000")
      .setPadding(10);
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
