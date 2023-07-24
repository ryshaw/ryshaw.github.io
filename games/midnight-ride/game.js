class MidnightRide extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;
  houseLayer; // containing all house tiles
  numHousesLeft; // keeps track of how many houses have not been delivered to
  housesRemainingText; // UI that displays how many houses have not been delivered to
  gameWin; // boolean that checks if game has been won
  housesWithinRange; // array of houses within range of player, that they can deliver to
  playerLight; // light object that follows player around so they can see

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
      "./testingAssets/tiled/tilesets/GB-LandTileset.png"
    );
    this.load.image(
      "houseTileset",
      "./testingAssets/tiled/tilesets/Universal-Buildings-and-walls.png"
    );
    this.load.image(
      "roadTileset",
      "./testingAssets/tiled/tilesets/Universal-Road-Tileset.png"
    );
    this.load.tilemapTiledJSON("map", "./testingAssets/tiled/map.json");

    this.load.image("player", "./testingAssets/player.png");
    this.load.image("message", "./testingAssets/message.png");

    this.width = game.config.width;
    this.height = game.config.height;
    this.gameWin = false;
  }

  create() {
    this.createMapAndPlayer();

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.physics.world.fixedStep = false; // fixes startFollow stuttering bug

    this.createLights();

    this.addKeyboardControls();

    // add UI at the very end so it's above everything
    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => {
        this.loadGameUI();
      },
    });

    this.cameras.main.setZoom(1);

    // "hitbox" around player to visualize when close enough to house
    /*this.circle = this.add
      .circle(this.player.x, this.player.y, 80)
      .setStrokeStyle(2, Phaser.Display.Color.GetColor(255, 255, 0));*/
  }

  addKeyboardControls() {
    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.gameWin) {
        // restart game
        this.gameWin = false;
        this.children.getAll().forEach((object) => {
          object.destroy();
        });
        this.lights.shutdown();
        this.input.keyboard.removeAllListeners();
        this.player = undefined;
        this.create();
      } else {
        this.deliverMessage();
      }
    });

    this.input.keyboard.on("keydown-LEFT", () =>
      this.updateMovement(Phaser.Math.Vector2.LEFT)
    );

    this.input.keyboard.on("keydown-RIGHT", () =>
      this.updateMovement(Phaser.Math.Vector2.RIGHT)
    );

    this.input.keyboard.on("keydown-UP", () =>
      this.updateMovement(Phaser.Math.Vector2.UP)
    );

    this.input.keyboard.on("keydown-DOWN", () =>
      this.updateMovement(Phaser.Math.Vector2.DOWN)
    );

    this.input.keyboard.on("keydown-A", () =>
      this.updateMovement(Phaser.Math.Vector2.LEFT)
    );

    this.input.keyboard.on("keydown-D", () =>
      this.updateMovement(Phaser.Math.Vector2.RIGHT)
    );

    this.input.keyboard.on("keydown-W", () =>
      this.updateMovement(Phaser.Math.Vector2.UP)
    );

    this.input.keyboard.on("keydown-S", () =>
      this.updateMovement(Phaser.Math.Vector2.DOWN)
    );
  }

  createLights() {
    const black = Phaser.Display.Color.GetColor(0, 0, 0);
    const white = Phaser.Display.Color.GetColor(255, 255, 255);
    const yellow = Phaser.Display.Color.GetColor(255, 255, 0);
    const blue = Phaser.Display.Color.GetColor(0, 0, 255);
    this.lights.enable().setAmbientColor(black);
    this.children.getAll().forEach((object) => {
      object.setPipeline("Light2D");
    });

    // add "delivered" property to all houses, to keep track if player delivered msg to them already. also add a dim light to each house
    this.houseLayer.forEachTile((tile) => {
      if (tile.index != -1) {
        tile.properties = {
          delivered: false,
          light: this.add
            .pointlight(
              tile.getCenterX(),
              tile.getCenterY(),
              0xefcd99,
              120,
              0.02
            )
            .setDepth(1),
        };
      }
    });

    this.playerLight = this.lights.addLight(
      this.player.x,
      this.player.y,
      600,
      0xefcd99,
      1.2
    );
  }

  update() {
    this.houseLayer.forEachTile((tile) => {
      if (tile.index != -1 && !tile.properties.delivered) {
        tile.properties.light.intensity = 0.01;
      }
    });

    // update houses within player that they can deliver message to
    this.housesWithinRange = this.houseLayer.getTilesWithinShape(
      new Phaser.Geom.Circle(this.player.x, this.player.y, 90),
      { isNotEmpty: true }
    );

    // give them a yellow highlight so player knows they can deliver
    this.housesWithinRange.forEach((tile) => {
      if (!tile.properties.delivered) tile.properties.light.intensity = 0.06;
    });

    // delivery is handled in deliverMessage function
    // player movement is handled in updateMovement function

    if (this.circle) this.circle.setPosition(this.player.x, this.player.y);

    this.playerLight.x = this.player.x;
    this.playerLight.y = this.player.y;
  }

  deliverMessage() {
    // if there's a deliverable house nearby, deliver message
    if (this.housesWithinRange.length > 0) {
      this.housesWithinRange.forEach((tile) => {
        // only deliver msg if player hasn't delivered to this house
        if (!tile.properties.delivered) {
          const msg = this.add
            .sprite(this.player.x, this.player.y, "message")
            .setScale(1)
            .setPipeline("Light2D");

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
          tile.properties.light.intensity = 0.1;
          this.numHousesLeft--;
          this.housesRemainingText.setText(
            `houses left: ${this.numHousesLeft}`
          );

          if (this.numHousesLeft <= 0) this.loadGameWin();
        }
      });
    }
  }

  createMapAndPlayer() {
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

    this.player = this.physics.add
      .sprite(this.width / 2, this.height / 2 - 32, "player")
      .setScale(4);
    this.player.body.setSize(8, 8);
    this.player.body.isCircle = true;

    this.physics.add.collider(this.player, groundLayer);

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

  updateMovement(direction) {
    if (this.gameWin) return; // game is over, don't move player any more

    // direction is a Vector2. e.g. left is <-1, 0>. up would be <0, -1>

    // plays by snake rules:
    // when you press a key, you'll start building up to speed in that direction
    // no need to hold down the key, you'll move automatically
    // when you press another key, you'll transition to that speed in that direction
    const maxSpeed = 250; // max speed of player
    const duration = 1000; // how long it takes to turn and build up to speed
    this.tweens.add({
      targets: this.player.body.velocity,
      x: direction.x * maxSpeed,
      y: direction.y * maxSpeed,
      duration: duration,
    });

    // fixes issue where player would rotate 270 degrees which looks silly
    let newRotation = direction.angle();
    if (direction.angle() - this.player.rotation > Math.PI) {
      newRotation -= 2 * Math.PI;
    }

    this.tweens.add({
      targets: this.player,
      rotation: newRotation,
      duration: duration * 0.7, // finely tuned
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
      .setDepth(2)
      .setFontFamily('"Press Start 2P"')
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
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
