class MidnightRide extends Phaser.Scene {
  width; // width of game
  height; // height of game
  player;
  arrowKeys;
  houseLayer; // containing all house tiles
  numHousesLeft; // keeps track of how many houses have not been delivered to
  housesRemainingText; // UI that displays how many houses have not been delivered to
  gameWin; // boolean that checks if game has been won
  gameOver; // boolean that checks if game has been lost
  housesWithinRange; // array of houses within range of player, that they can deliver to
  playerLight; // light object that follows player around so they can see
  UICamera; // to display text separately so it ain't zoomed in
  redcoats; // array of all redcoat sprites
  playerDirection; // checks player direction before updating it
  redcoatSpeed; // how fast the patrols move
  redcoatVisionCones; // if player hits one of these, game over
  housesDelivered; // so it can track between lives
  lives; // how many tries the player has (3 on normal, 1 on hardcore)

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
    this.load.image("bush-tiles", "./assets/tilesets/bush-tiles.png");
    this.load.image("grass-tiles", "./assets/tilesets/grass-tiles.png");
    this.load.image("house-tiles", "./assets/tilesets/house-tiles.png");
    this.load.image("road-tiles", "./assets/tilesets/road-tiles.png");
    this.load.image("rock-tiles", "./assets/tilesets/rock-tiles.png");
    this.load.image("tree-tiles", "./assets/tilesets/tree-tiles.png");

    this.load.tilemapTiledJSON("map", "./assets/tiled/actualMap.json");

    this.load.image("player", "./testingAssets/player.png");
    this.load.image("message", "./testingAssets/message.png");
    this.load.image("redcoat", "./testingAssets/redcoat.png");

    this.width = game.config.width;
    this.height = game.config.height;
    this.gameWin = false;
    this.gameOver = false;
    this.redcoatSpeed = 120;
    // housesDelivered is an array where each element is a Vector2
    // the Vector2 is the coordinates of the houses that have already been delivered to
    this.housesDelivered = [];
    this.lives = 3;
  }

  create() {
    this.createMapAndObjects();

    this.cameras.main.startFollow(this.player, false, 0.2, 0.2);
    this.physics.world.fixedStep = false; // fixes startFollow stuttering bug

    this.createLights();

    this.addKeyboardControls();
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

    this.cameras.main.setZoom(0.7);

    WebFont.load({
      google: {
        families: ["Press Start 2P"],
      },
      active: () => {
        this.loadGameUI();
      },
    });

    // "hitbox" around player to visualize when close enough to house
    /*this.circle = this.add
      .circle(this.player.x, this.player.y, 80)
      .setStrokeStyle(2, Phaser.Display.Color.GetColor(255, 255, 0));*/
  }

  addKeyboardControls() {
    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.gameWin || this.gameOver) {
        this.restartGame();
      } else {
        // if there's a deliverable house nearby, deliver message
        if (this.housesWithinRange.length > 0) {
          this.housesWithinRange.forEach((tile) => {
            // only deliver msg if player hasn't delivered to this house
            if (!tile.properties.delivered) {
              this.deliverMessage(tile, true);
            }
          });
        }
      }
    });

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
  }

  restartGame() {
    if (this.lives <= 0 || this.gameWin) {
      this.housesDelivered = [];
      this.lives = 3;
    }
    this.gameWin = false;
    this.gameOver = false;
    this.children.getAll().forEach((object) => {
      object.destroy();
    });
    this.lights.shutdown();
    this.input.keyboard.removeAllListeners();
    this.player = undefined;
    this.redcoats = undefined;
    this.redcoatVisionCones = undefined;
    this.playerDirection = undefined;
    this.cameras.remove(this.UICamera);
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.create();
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
              200,
              0.2
            )
            .setDepth(1),
        };

        this.housesDelivered.forEach((houseDelivered) => {
          if (tile.x == houseDelivered.x && tile.y == houseDelivered.y) {
            this.deliverMessage(tile, false);
          }
        });
      }
    });

    this.redcoats.forEach((redcoat) => {
      redcoat.light = this.lights.addLight(
        redcoat.x,
        redcoat.y,
        300,
        0xefcd99,
        1
      );
    });

    this.playerLight = this.lights.addLight(
      this.player.x,
      this.player.y,
      3000,
      0xefcd99,
      2.5
    );
  }

  update() {
    this.houseLayer.forEachTile((tile) => {
      if (tile.index != -1 && !tile.properties.delivered) {
        tile.properties.light.intensity = 0.02;
      }
    });

    // update houses within player that they can deliver message to
    this.housesWithinRange = this.houseLayer.getTilesWithinShape(
      new Phaser.Geom.Circle(this.player.x, this.player.y, 120),
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

    this.redcoats.forEach((redcoat) => {
      redcoat.vision.setPosition(redcoat.x, redcoat.y);
      redcoat.light.x = redcoat.x;
      redcoat.light.y = redcoat.y;
    });
  }

  deliverMessage(tile, playerDelivered) {
    // if there's a deliverable house nearby, deliver message
    // if playerDelivered, player delivered the message
    // if not playerDelivered, then we're just loading it from a game over state
    const msg = this.add
      .sprite(this.player.x, this.player.y, "message")
      .setScale(1)
      .setPipeline("Light2D");

    // add animation of moving msg from player to house
    this.tweens.add({
      targets: msg,
      x: tile.getCenterX() - 32, // offset to left
      y: tile.getCenterY() + 32, // offset to  bottom
      duration: 600,
      ease: "Power1",
      scale: 4,
    });

    this.UICamera.ignore(msg);

    // house has been delivered to
    tile.properties.delivered = true;
    // if playerDelivered, it's not in housesDelivered yet, so add it
    this.numHousesLeft--;
    if (playerDelivered) {
      this.housesDelivered.push(new Phaser.Math.Vector2(tile.x, tile.y));
      this.housesRemainingText.setText(`houses left: ${this.numHousesLeft}`);
    }
    tile.properties.light.intensity = 0.1;

    if (this.numHousesLeft <= 0) this.loadGameWin();
  }

  createMapAndObjects() {
    const map = this.make.tilemap({ key: "map" });
    const groundLayer = map.createLayer(
      "Ground",
      map.addTilesetImage("grass-tiles", "grass-tiles")
    );

    const roadLayer = map.createLayer(
      "Road",
      map.addTilesetImage("road-tiles", "road-tiles")
    );

    this.houseLayer = map.createLayer(
      "House",
      map.addTilesetImage("house-tiles", "house-tiles")
    );

    const decorLayer = map.createLayer("Decor", [
      map.addTilesetImage("tree-tiles", "tree-tiles"),
      map.addTilesetImage("rock-tiles", "rock-tiles"),
    ]);

    // the next line sets up collision: if there is a road tile built on top of a ground tile,
    // set collision to false so the player can walk on it. otherwise, it's just grass,
    // so set collision to true. the player can only walk on road tiles
    groundLayer.forEachTile((tile) => {
      roadLayer.hasTileAt(tile.x, tile.y)
        ? tile.setCollision(false)
        : tile.setCollision(true);
    });

    // get the number of houses on this map, to keep track
    this.numHousesLeft = this.houseLayer.getTilesWithin(
      0,
      0,
      this.houseLayer.width,
      this.houseLayer.height,
      { isNotEmpty: true }
    ).length;

    this.redcoats = [];

    const intersections = [];

    this.redcoatVisionCones = this.add.group();

    map.objects[0].objects.forEach((object) => {
      if (object.name == "Redcoat") {
        const r = this.physics.add.sprite(object.x, object.y, "redcoat");
        r.body.setSize(128, 128);
        r.body.isCircle = true;
        r.vision = this.add
          .line(r.x, r.y, 230, 0, 640, 0, 0x9966ff)
          .setLineWidth(20, 60)
          .setAlpha(0.4);
        this.physics.add.existing(r.vision);
        r.vision.body.setSize(210, 100);
        r.vision.body.setOffset(30, -4);
        this.redcoatVisionCones.add(r.vision);

        this.turnRedcoat(r, Phaser.Math.Between(1, 4));

        this.redcoats.push(r);
        this.physics.add.collider(
          r,
          groundLayer,
          this.redcoatHitWall,
          null,
          this
        );
      }
      if (object.name == "Player") {
        this.player = this.physics.add.sprite(object.x, object.y, "player");
        this.player.body.setSize(64, 64);
        this.player.body.isCircle = true;
        this.physics.add.collider(this.player, groundLayer);
      }
      if (object.name == "Intersection") {
        const rect = this.add.rectangle(
          object.x,
          object.y,
          8,
          8,
          "0xff0000",
          0
        );
        this.physics.add.existing(rect);
        intersections.push(rect);
      }
    });

    this.physics.add.overlap(
      this.redcoats,
      intersections,
      this.redcoatHitIntersection,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.redcoatVisionCones,
      this.loadGameOver,
      null,
      this
    );

    /*const debugGraphics = this.add.graphics().setAlpha(0.75);
    groundLayer.renderDebug(debugGraphics, {
      tileColor: new Phaser.Display.Color(25, 25, 255, 50),
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });*/
  }

  redcoatHitIntersection(redcoat, intersection) {
    redcoat.body.setVelocity(0, 0);
    this.time.delayedCall(2000, () => {
      this.turnRedcoat(redcoat, Phaser.Math.Between(1, 4));
    });

    intersection.body.setEnable(false);
    this.time.delayedCall(4000, function () {
      intersection.body.setEnable(true);
    });
  }

  turnRedcoat(redcoat, direction) {
    if (!redcoat.vision.body) return;
    let v = Phaser.Math.Vector2.ZERO;
    let a = 0;
    let r = Phaser.Math.Vector2.ZERO;
    let o = Phaser.Math.Vector2.ZERO;
    let size = new Phaser.Math.Vector2(400, 80);
    switch (direction) {
      case 1: // CALIBRATED
        v = new Phaser.Math.Vector2(this.redcoatSpeed, 0);
        a = 0;
        r = new Phaser.Math.Vector2(size.x, size.y);
        o = new Phaser.Math.Vector2(240, -40);
        break;
      case 2: // CALIBRATED
        v = new Phaser.Math.Vector2(-this.redcoatSpeed, 0);
        a = 180;
        r = new Phaser.Math.Vector2(size.x, size.y);
        o = new Phaser.Math.Vector2(-230, -38);
        break;
      case 3: // CALIBRATED
        v = new Phaser.Math.Vector2(0, this.redcoatSpeed);
        a = 90;
        r = new Phaser.Math.Vector2(size.y, size.x);
        o = new Phaser.Math.Vector2(166, 30);
        break;
      case 4: // CALIBRATED
        v = new Phaser.Math.Vector2(0, -this.redcoatSpeed);
        a = 270;
        r = new Phaser.Math.Vector2(size.y, size.x);
        o = new Phaser.Math.Vector2(166, -435);
      default:
        break;
    }

    let newRotation = a;
    if (Math.abs(a - redcoat.angle) > 180) {
      newRotation -= 360;
    }

    redcoat.vision.body.setSize(0, 0);
    redcoat.vision.body.setOffset(o.x, o.y);
    this.tweens.add({
      targets: [redcoat, redcoat.vision],
      angle: newRotation,
      duration: 800,
    });

    this.tweens.add({
      targets: redcoat.body.velocity,
      x: v.x,
      y: v.y,
      duration: 1000,
      completeDelay: 100,
      onComplete: () => {
        this.tweens.add({
          targets: redcoat.vision.body.offset,
          x: o.x,
          y: o.y,
          duration: 100,
          onComplete: () =>
            this.tweens.add({
              targets: redcoat.vision.body,
              width: r.x,
              height: r.y,
              duration: 50,
            }),
        });
      },
    });
  }

  redcoatHitWall(redcoat, wall) {
    let dir = Phaser.Math.Between(1, 4);
    switch (redcoat.body.facing) {
      case Phaser.Physics.Arcade.FACING_DOWN:
      case Phaser.Physics.Arcade.FACING_UP:
        dir = Phaser.Math.Between(1, 2);
        break;
      case Phaser.Physics.Arcade.FACING_RIGHT:
      case Phaser.Physics.Arcade.FACING_LEFT:
        dir = Phaser.Math.Between(3, 4);
        break;
    }
    this.turnRedcoat(redcoat, dir);
  }

  updateMovement(direction) {
    if (this.gameWin || this.gameOver) return; // game is over, don't move any more

    // direction is a Vector2. e.g. left is <-1, 0>. up would be <0, -1>

    // plays by snake rules:
    // when you press a key, you'll start building up to speed in that direction
    // no need to hold down the key, you'll move automatically
    // when you press another key, you'll transition to that speed in that direction
    const maxSpeed = 350; // max speed of player
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

    this.cameras.main.ignore([t1, t2, this.housesRemainingText]);
  }

  loadGameWin() {
    this.gameWin = true;
    this.player.body.moves = false;
    this.redcoats.forEach((redcoat) => {
      redcoat.body.moves = false;
    });

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

    this.cameras.main.ignore([t1, t2]);
  }

  loadGameOver() {
    if (this.gameOver) return;

    this.gameOver = true;
    this.player.body.moves = false;
    this.lives--;
    this.redcoats.forEach((redcoat) => {
      redcoat.body.moves = false;
    });

    const t1 = new CustomText(
      this,
      this.width / 2,
      this.height / 3,
      `HALT! you have been\ncaptured by redcoats!!\nlives left: ${this.lives}`,
      "l",
      "c"
    )
      .setBackgroundColor("#000")
      .setPadding(10);

    const t2 = new CustomText(
      this,
      this.width / 2,
      (this.height * 2) / 3,
      "press space\nto try again",
      "m",
      "c"
    )
      .setBackgroundColor("#000")
      .setPadding(10);
    if (this.lives <= 0) {
      t2.setText("game over!!\npress space to restart");
    }

    this.cameras.main.ignore([t1, t2]);
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
