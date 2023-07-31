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
  musicVolume; // sets volume for music
  soundVolume; // sets volume for all sound effects
  soundEffects; // object containing all sound effects to be played
  playerSpeed; // max speed of player
  playerAngle; // player's angle (using sprite angle would rotate the textures)

  constructor() {
    super({ key: "MidnightRide" });
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

    this.load.image("player", "./assets/player.png");
    this.load.image("message", "./assets/Scroll.png");
    this.load.image("redcoat", "./assets/redcoat.png");
    this.load.image("patrol1", "./assets/Patrols/patrol.png");
    this.load.image("patrol2", "./assets/Patrols/patrol2.png");
    this.load.image("patrol3", "./assets/Patrols/patrol3.png");
    this.load.image("paul_back", "./assets/Paulie/paul_back.png");
    this.load.image("paul_front", "./assets/Paulie/paul_front.png");
    this.load.image("paul_side", "./assets/Paulie/paul_side.png");

    this.load.image("UIFrame_game", "./assets/User Interface/UIFrame_game.png");
    this.load.image("UI_halt", "./assets/User Interface/UI_halt.png");

    this.load.audio("track1", [
      "./assets/audio/ogg/track1.ogg",
      "./assets/audio/mp3/track1.mp3",
    ]);
    this.load.audio("caught", [
      "./assets/audio/ogg/caught.ogg",
      "./assets/audio/mp3/caught.mp3",
    ]);
    this.load.audio("delivery", [
      "./assets/audio/ogg/delivery.ogg",
      "./assets/audio/mp3/delivery.mp3",
    ]);
    this.load.audio("horse", [
      "./assets/audio/ogg/horse.ogg",
      "./assets/audio/mp3/horse.mp3",
    ]);
    this.load.audio("win", [
      "./assets/audio/ogg/win.ogg",
      "./assets/audio/mp3/win.mp3",
    ]);

    this.width = game.config.width;
    this.height = game.config.height;
    this.gameWin = false;
    this.gameOver = false;
    this.redcoatSpeed = 120;
    this.playerSpeed = 350;
    // housesDelivered is an array where each element is a Vector2
    // the Vector2 is the coordinates of the houses that have already been delivered to
    this.housesDelivered = [];
    this.lives = 3;
    this.musicVolume = 0.8;
    this.soundVolume = 0.8;
  }

  create() {
    this.cameras.main.fadeIn(2000, 0, 0, 0);

    this.createMapAndObjects();

    this.cameras.main.startFollow(this.player, false, 0.2, 0.2);
    this.physics.world.fixedStep = false; // fixes startFollow stuttering bug

    this.createAudio();

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
        families: ["GFS Didot"],
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

  createAudio() {
    const track1 = this.sound.add("track1");
    track1.play({
      volume: this.musicVolume,
      loop: true,
    });

    this.soundEffects = {
      caught: this.sound.add("caught"),
      delivery: this.sound.add("delivery"),
      horse: this.sound.add("horse"),
      win: this.sound.add("win"),
    };

    this.sound.pauseOnBlur = true;
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

    this.input.keyboard.on("keydown-M", () => {
      const track1 = this.sound.get("track1");
      track1.isPlaying ? track1.pause() : track1.resume();
    });

    this.input.keyboard.on("keydown-N", () => {
      this.soundVolume > 0 ? (this.soundVolume = 0) : (this.soundVolume = 0.8);
      Object.values(this.soundEffects).forEach((sound) => sound.stop());
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
    this.sound.stopAll();
    this.sound.removeAll();
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

    if (this.player.body.speed >= this.playerSpeed * 0.8) {
      if (!this.soundEffects.horse.isPlaying) {
        this.soundEffects.horse.play({ volume: this.soundVolume });
      }
    } else {
      if (this.soundEffects.horse.isPlaying) {
        this.soundEffects.horse.stop();
      }
    }

    if (this.gameOver || this.gameWin) this.soundEffects.horse.stop();
  }

  deliverMessage(tile, playerDelivered) {
    // if there's a deliverable house nearby, deliver message
    // if playerDelivered, player delivered the message
    // if not playerDelivered, then we're just loading it from a game over state
    const msg = this.add
      .sprite(this.player.x, this.player.y, "message")
      .setScale(0.1)
      .setPipeline("Light2D");

    // add animation of moving msg from player to house
    this.tweens.add({
      targets: msg,
      x: tile.getCenterX() - 32, // offset to left
      y: tile.getCenterY() + 32, // offset to  bottom
      duration: 600,
      ease: "Power1",
      scale: 0.8,
    });

    this.UICamera.ignore(msg);

    // house has been delivered to
    tile.properties.delivered = true;
    // if playerDelivered, it's not in housesDelivered yet, so add it
    this.numHousesLeft--;
    if (playerDelivered) {
      this.housesDelivered.push(new Phaser.Math.Vector2(tile.x, tile.y));
      //      this.housesRemainingText.setText(`houses left: ${this.numHousesLeft}`);
      this.soundEffects.delivery.play({
        volume: this.soundVolume,
      });
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
        const num = Phaser.Math.Between(1, 3);
        const key = "patrol" + num;
        const r = this.physics.add.sprite(object.x, object.y, key);
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
        this.player = this.physics.add.sprite(object.x, object.y, "paul_side");
        this.player.body.setSize(64, 64);
        this.player.body.isCircle = true;
        this.physics.add.collider(this.player, groundLayer);
        this.playerAngle = 0;
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
    if (Math.abs(a - redcoat.vision.angle) > 180) {
      newRotation -= 360;
    }

    switch (redcoat.texture.key) {
      case "patrol1":
      case "patrol3":
        if ((a == 0 || a == 90) && !redcoat.flipX) {
          redcoat.setFlipX(true);
        } else if ((a == 180 || a == 270) && redcoat.flipX) {
          redcoat.setFlipX(false);
        }
        break;
      case "patrol2":
        if ((a == 0 || a == 90) && redcoat.flipX) {
          redcoat.setFlipX(false);
        } else if ((a == 180 || a == 270) && !redcoat.flipX) {
          redcoat.setFlipX(true);
        }
        break;
    }

    redcoat.vision.body.setSize(0, 0);
    redcoat.vision.body.setOffset(o.x, o.y);
    this.tweens.add({
      targets: redcoat.vision,
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
    const maxSpeed = this.playerSpeed; // max speed of player
    const duration = 1000; // how long it takes to turn and build up to speed
    this.tweens.add({
      targets: this.player.body.velocity,
      x: direction.x * maxSpeed,
      y: direction.y * maxSpeed,
      duration: duration,
    });

    const a = (direction.angle() * 180) / Math.PI;
    // I just like degrees better
    switch (a) {
      case 0:
        this.player.setTexture("paul_side");
        this.player.setFlipX(false);
        break;
      case 90:
        this.player.setTexture("paul_front");
        this.player.setFlipX(false);
        break;
      case 180:
        this.player.setTexture("paul_side");
        this.player.setFlipX(true);
        break;
      case 270:
        this.player.setTexture("paul_back");
        this.player.setFlipX(false);
        break;
    }
  }

  loadGameUI() {
    /*const im1 = this.add
      .image(this.UICamera.centerX, this.UICamera.centerY, "UIFrame_game")
      .setScale(this.width / 1707, this.height / 860);*/
    /*
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

    const t3 = new CustomText(
      this,
      this.width / 2,
      this.height - 20,
      "n to mute sfx, m to mute music",
      "s",
      "c"
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

    this.cameras.main.ignore([t1, t2, t3, this.housesRemainingText]);*/
    //this.cameras.main.ignore([im1]);
  }

  loadGameWin() {
    if (this.gameWin) return;

    if (this.soundEffects.horse.isPlaying) {
      this.soundEffects.horse.stop();
    }

    this.soundEffects.win.play({
      volume: this.soundVolume,
    });

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

    this.soundEffects.caught.play({
      volume: this.soundVolume,
    });

    this.gameOver = true;
    this.player.body.moves = false;
    this.lives--;
    this.redcoats.forEach((redcoat) => {
      redcoat.body.moves = false;
    });

    const im1 = this.add.image(
      this.UICamera.centerX,
      this.UICamera.centerY,
      "UI_halt"
    );
    //.setScale(this.width / 1707, this.width / 1707);
    //.setScale(this.width / 1707, this.height / 860);

    this.cameras.main.ignore([im1]);

    /*
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

    this.cameras.main.ignore([t1, t2]);*/
  }
}

class Menu extends Phaser.Scene {
  width;
  height;
  startMenu;
  creditsMenu;
  storyMenu;
  tutorialMenu;
  difficultyMenu;
  musicVolume; // sets volume for music
  soundVolume; // sets volume for all sound effects

  constructor() {
    super({ key: "Menu" });
  }

  preload() {
    // load google's library for the font, GFS Didot
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.width = game.config.width;
    this.height = game.config.height;

    this.load.setPath("./assets/User Interface/");
    this.load.image("start", "Start.png");
    this.load.image("credits", "Credits.png");
    this.load.image("frame", "UIFrame_title.png");
    this.load.image("title", "Title.png");
    this.load.image("left upper", "Left Upper.png");
    this.load.image("left lower", "Left_Lower.png");
    this.load.image("right upper", "Right Upper.png");
    this.load.image("right lower", "Right_Lower.png");
    this.load.image("left top", "Left Top.png");
    this.load.image("right top", "Right Top.png");

    this.load.setPath("./");
    this.load.audio("proj1", ["assets/audio/mp3/proj1.mp3"]);
    this.load.image("painting", "assets/Midnight_Ride_of_Paul_Revere.jpg");
    this.musicVolume = 0.2;
    this.soundVolume = 0.4;
  }

  create() {
    WebFont.load({
      google: {
        families: ["GFS Didot"],
      },
      active: () => {
        this.loadText();
      },
    });

    const proj1 = this.sound.add("proj1");
    proj1.play({
      volume: this.musicVolume,
      loop: true,
    });

    const painting = this.add.image(
      this.width * 0.5,
      this.height * 0.5,
      "painting"
    );
    if (this.width / this.height > 2632 / 1954) {
      painting.setScale((this.width / 2632) * 1.008);
    } else {
      painting.setScale((this.height / 1954) * 1.008);
    }

    this.add.image(0, 0, "left upper").setOrigin(0, 0);
    this.add.image(0, this.height, "left lower").setOrigin(0, 1);
    this.add.image(this.width, 0, "right upper").setOrigin(1, 0);
    this.add.image(this.width, this.height, "right lower").setOrigin(1, 1);
    this.add
      .image(this.width * 0.48, this.height * 0.01, "left top")
      .setOrigin(0, 0);
    this.add
      .image(this.width * 0.52, this.height * 0.01, "right top")
      .setOrigin(1, 0);

    const title = this.add.image(this.width * 0.6, this.height * 0.35, "title");

    const start = this.add
      .image(this.width * 0.6, this.height * 0.63, "start")
      .setInteractive()
      .on("pointerover", () => start.setTint(0xffffcc))
      .on("pointerout", () => start.setTint(0xffffff))
      .on("pointerdown", () => start.setTint(0xddddaa))
      .on("pointerup", () => {
        this.startMenu.setVisible(false);
        this.storyMenu.setVisible(true);
      });

    const credits = this.add
      .image(this.width * 0.6, this.height * 0.71, "credits")
      .setInteractive()
      .on("pointerover", () => credits.setTint(0xffffcc))
      .on("pointerout", () => credits.setTint(0xffffff))
      .on("pointerdown", () => credits.setTint(0xddddaa))
      .on("pointerup", () => {
        this.startMenu.setVisible(false);
        this.creditsMenu.setVisible(true);
      });

    this.startMenu = this.add.container(0, 0, [title, start, credits]);

    this.addKeyboardControls();
  }

  addKeyboardControls() {
    this.input.keyboard.on("keydown-M", () => {
      const proj1 = this.sound.get("proj1");
      proj1.isPlaying ? proj1.pause() : proj1.resume();
    });

    this.input.keyboard.on("keydown-N", () => {
      this.soundVolume > 0 ? (this.soundVolume = 0) : (this.soundVolume = 0.8);
    });
  }
  loadText() {
    this.loadCredits();
    this.loadStory();
    this.loadTutorial();
    this.loadDifficulty();
  }

  loadCredits() {
    const t1 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.45,
      "Developed by ryshaw\nArt by HelloCrystxl\nMusic by Gabyyu",
      "g",
      "c"
    ).setPadding(20);

    const t2 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.7,
      "Painting: The Midnight Ride of Paul Revere (1931) by Grant Wood",
      "l",
      "c"
    );

    const t3 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.8,
      "Historical references: paulreverehouse.org & en.wikipedia.org",
      "l",
      "c"
    );

    const returnButton = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.92,
      "Return",
      "l",
      "c",
      () => {
        this.startMenu.setVisible(true);
        this.creditsMenu.setVisible(false);
      }
    );

    this.creditsMenu = this.add.container(0, 0, [t1, t2, t3, returnButton]);

    this.creditsMenu.setVisible(false);
  }

  loadStory() {
    const t1 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.12,
      "Historical Background",
      "g",
      "c"
    );

    const t2 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.2,
      this.getStoryText1(),
      "m",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const t3 = new CustomText(
      this,
      this.width * 0.5,
      t2.getBottomLeft().y + 20,
      this.getStoryText2(),
      "m",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const t4 = new CustomText(
      this,
      this.width * 0.5,
      t3.getBottomLeft().y + 20,
      this.getStoryText3(),
      "m",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const nextButton = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.92,
      "Next",
      "l",
      "c",
      () => {
        this.tutorialMenu.setVisible(true);
        this.storyMenu.setVisible(false);
      }
    );

    this.storyMenu = this.add.container(0, 0, [t1, t2, t3, t4, nextButton]);
    this.storyMenu.setVisible(false);
  }

  //separate functions so we can easily collapse it and not have it clutter up
  getStoryText1() {
    const str =
      "The British colony of Massachusetts. The night of April 18, 1775. " +
      "Tensions were at a boiling point, and British soldiers were preparing to take action. " +
      "Paul Revere, a member of the Sons of Liberty, was informed of British plans to arrest " +
      "John Hancock and Samuel Adams in Lexington as well as seize the military stores stockpiled in Concord. " +
      "While the rumor of arrest was not accurate, British troops were about to embark from Boston.";
    return str;
  }

  getStoryText2() {
    const str =
      "Revere contacted a friend to light up two lanterns in a church tower, to indicate to the " +
      "other Sons of Liberty that the British planned to travel by sea, not by land. He then " +
      "departed and rowed across the river under cover of darkness, borrowing a horse and setting off to " +
      "alert as many militia and Patriots as he could from Boston until Lexington.";
    return str;
  }

  getStoryText3() {
    const str =
      "History tells us the rest of the story. The early morning of April 19, 1775, Patriot militias had " +
      "gathered in Lexington to oppose the British army. Gunshots were fired, " +
      "in what Ralph Waldo Emerson calls 'the shot heard round the world', " +
      "and the American Revolutionary War had erupted. The United States of America as we know it  " +
      "would be established in Philadelphia a year later, and it all started with a midnight ride.";
    return str;
  }

  loadTutorial() {
    const t1 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.12,
      "How to Play",
      "g",
      "c"
    );

    const t2 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.2,
      "You'll be playing as Paul Revere on his famous adventure through the town and countryside.",
      "l",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const t3 = new CustomText(
      this,
      this.width * 0.5,
      t2.getBottomLeft().y + 20,
      "Use the WASD or arrow keys to move, and press the space bar near a house " +
        "to alert the citizens of incoming British troops.",
      "l",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const t4 = new CustomText(
      this,
      this.width * 0.5,
      t3.getBottomLeft().y + 20,
      "The houses will light up as you approach them, " +
        "and a scroll will show you have delivered the message.",
      "l",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const t5 = new CustomText(
      this,
      this.width * 0.5,
      t4.getBottomLeft().y + 20,
      "Be discreet, and avoid capture by British patrols! " +
        "Deliver messages to every house in the town to win.",
      "l",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const nextButton = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.92,
      "Next",
      "l",
      "c",
      () => {
        this.tutorialMenu.setVisible(false);
        this.difficultyMenu.setVisible(true);
      }
    );

    this.tutorialMenu = this.add.container(0, 0, [
      t1,
      t2,
      t3,
      t4,
      t5,
      nextButton,
    ]);
    this.tutorialMenu.setVisible(false);
  }

  loadDifficulty() {
    const t1 = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.12,
      "Select a Difficulty",
      "g",
      "c"
    );

    const t3 = new CustomText(
      this,
      this.width * 0.5,
      t1.getBottomLeft().y + 100,
      "Give Me Liberty",
      "l",
      "c",
      () => {
        t2.setFontSize("30px");
        t3.setFontSize("38px");
        t4.setFontSize("30px");
        sessionStorage.setItem("difficulty", "medium");
        t5.setText("Three lives. Normal amount of British patrols.");
      }
    )
      .setOrigin(0.5, 0.5)
      .on("pointerover", function () {
        t5.setText("Three lives. Normal amount of British patrols.");
      });

    const t2 = new CustomText(
      this,
      t3.getBottomCenter().x - 190,
      t1.getBottomLeft().y + 100,
      "Easy Mode",
      "l",
      "c",
      () => {
        t2.setFontSize("38px");
        t3.setFontSize("30px");
        t4.setFontSize("30px");
        sessionStorage.setItem("difficulty", "easy");
        t5.setText("Five lives. Fewer British patrols around the town.");
      }
    )
      .setOrigin(1, 0.5)
      .on("pointerover", function () {
        t5.setText("Five lives. Fewer British patrols around the town.");
      });

    const t4 = new CustomText(
      this,
      t3.getBottomCenter().x + 180,
      t1.getBottomLeft().y + 100,
      "Give Me Death!",
      "l",
      "c",
      () => {
        t2.setFontSize("30px");
        t3.setFontSize("30px");
        t4.setFontSize("38px");
        sessionStorage.setItem("difficulty", "hard");
        t5.setText("One life to live. Normal amount of British patrols.");
      }
    )
      .setOrigin(0, 0.5)
      .on("pointerover", function () {
        t5.setText("One life to live. Normal amount of British patrols.");
      });

    const t5 = new CustomText(
      this,
      this.width * 0.5,
      t4.getBottomLeft().y + 100,
      "Hover over an option to see details",
      "l",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const t6 = new CustomText(
      this,
      this.width * 0.5,
      t5.getBottomLeft().y + 160,
      "Controls:",
      "l",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const t7 = new CustomText(
      this,
      this.width * 0.5,
      t6.getBottomLeft().y,
      "WASD/arrow keys to move, Space to alert house\nM to mute music, N to mute sound effects",
      "l",
      "c"
    )
      .setOrigin(0.5, 0)
      .setWordWrapWidth(730, true);

    const startButton = new CustomText(
      this,
      this.width * 0.5,
      this.height * 0.92,
      "Start!",
      "l",
      "c",
      () => {
        if (sessionStorage.getItem("difficulty")) {
          this.sound.stopAll();
          this.sound.removeAll();
          this.cameras.main.fadeOut(2000, 0, 0, 0);
          this.cameras.main.once(
            Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            (cam, effect) => {
              this.scene.start("MidnightRide");
            }
          );
        } else {
          t5.setText("Select a difficulty option before starting game");
        }
      }
    );

    this.difficultyMenu = this.add.container(0, 0, [
      t1,
      t2,
      t3,
      t4,
      t5,
      t6,
      t7,
      startButton,
    ]);
    this.difficultyMenu.setVisible(false);
  }

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
  scene: [Menu, MidnightRide],
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

const game = new Phaser.Game(config);
