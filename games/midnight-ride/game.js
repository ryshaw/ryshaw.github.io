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
  livesLeftText;
  musicVolume; // sets volume for music
  soundVolume; // sets volume for all sound effects
  soundEffects; // object containing all sound effects to be played
  playerSpeed; // max speed of player
  playerAngle; // player's angle (using sprite angle would rotate the textures)
  paused;
  firstTime; // first time starting from menu, or restarting game
  churchLights;

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
    this.load.image("decor-tiles", "./assets/tilesets/decor-tiles.png");
    this.load.image("grass-tiles", "./assets/tilesets/grass-tiles.png");
    this.load.image("house-tiles", "./assets/tilesets/house-tiles.png");
    this.load.image("road-tiles", "./assets/tilesets/road-tiles.png");
    this.load.image("church-tiles", "./assets/tilesets/church-tiles.png");
    this.load.image("tree-tiles", "./assets/tilesets/tree-tiles.png");
    this.load.image("water-tiles", "./assets/tilesets/water-tiles.png");
    this.load.image("big-tiles", "./assets/tilesets/big-tiles.png");

    this.load.tilemapTiledJSON("map", "./assets/tiled/actualMap.json");

    this.load.image("message", "./assets/Scroll.png");
    this.load.image("patrol1", "./assets/Patrols/patrol.png");
    this.load.image("patrol2", "./assets/Patrols/patrol2.png");
    this.load.image("patrol3", "./assets/Patrols/patrol3.png");
    this.load.image("paul_back", "./assets/Paulie/paul_back.png");
    this.load.image("paul_front", "./assets/Paulie/paul_front.png");
    this.load.image("paul_side", "./assets/Paulie/paul_side.png");

    this.load.image("poem1", "./assets/User Interface/Screens/Loading.png");

    this.load.image("UIFrame_game", "./assets/User Interface/UIFrame_game.png");
    this.load.image("UI_halt", "./assets/User Interface/UI_halt.png");
    this.load.image("UI_noLives", "./assets/User Interface/NoLives.png");
    this.load.image("housesLeft", "./assets/User Interface/HousesLeft2.png");
    this.load.image("livesLeft", "./assets/User Interface/Livesleft2.png");
    this.load.image("win", "./assets/User Interface/Screens/WinLoad.png");

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
    this.playerSpeed = 400;
    // housesDelivered is an array where each element is a Vector2
    // the Vector2 is the coordinates of the houses that have already been delivered to
    this.housesDelivered = [];
    switch (sessionStorage.getItem("difficulty")) {
      case "easy":
        this.lives = 5;
        break;
      case "medium":
        this.lives = 3;
        break;
      case "hard":
        this.lives = 1;
        break;
    }
    this.musicVolume = 0.8;
    this.soundVolume = 0.8;
    this.paused = true;
    this.physics.pause();
  }

  create() {
    const p = this.add.image(this.width * 0.5, this.height * 0.5, "poem1");

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

    this.cameras.main.setZoom(0.6);

    WebFont.load({
      google: {
        families: ["GFS Didot"],
      },
      active: () => {
        this.loadGameUI();
      },
    });

    const d = sessionStorage.getItem("difficulty");
    this.firstTime =
      (d == "easy" && this.lives == 5) ||
      (d == "medium" && this.lives == 3) ||
      (d == "hard" && this.lives == 1);

    if (this.firstTime) {
      //this.UICamera.fadeIn(220000, 0, 0, 0);
    }

    if (this.firstTime) {
      this.cameras.main.fadeIn(22000, 0, 0, 0);

      const p = this.add
        .image(this.width * 0.5, this.height * 0.5, "poem1")
        .setAlpha(0);
      this.tweens.add({
        targets: p,
        alpha: 1,
        duration: 400,
        completeDelay: 12000,
        onComplete: () => {
          this.paused = false;
          this.physics.resume();
          this.tweens.add({
            targets: p,
            alpha: 0,
            duration: 1500,
          });
        },
      });
    } else {
      this.paused = false;
      this.physics.resume();
    }
  }

  createAudio() {
    this.soundEffects = {
      caught: this.sound.add("caught"),
      delivery: this.sound.add("delivery"),
      horse: this.sound.add("horse"),
      win: this.sound.add("win"),
    };

    this.sound.pauseOnBlur = true;
    const d = sessionStorage.getItem("difficulty");
    const firstTime =
      (d == "easy" && this.lives == 5) ||
      (d == "medium" && this.lives == 3) ||
      (d == "hard" && this.lives == 1);

    const track1 = this.sound.add("track1");

    if (firstTime) {
      track1.play({
        volume: 0,
        loop: true,
      });
      this.tweens.add({
        targets: track1,
        volume: this.musicVolume,
        delay: 6000,
        duration: 9000,
      });
    } else {
      track1.play({
        volume: this.musicVolume,
        loop: true,
      });
    }
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
            if (!tile.properties.delivered && tile.index % 4 == 0) {
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
      this.sound.stopAll();
      this.sound.removeAll();
      this.scene.start("Menu");
      return;
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
      if (tile.index != -1 && tile.index % 4 == 0) {
        tile.properties = {
          delivered: false,
          light: this.add
            .pointlight(
              tile.getCenterX() + 63,
              tile.getCenterY() + 94,
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
      2.6
    );

    this.lights.addLight(
      this.churchLights.x - 30,
      this.churchLights.y,
      55,
      0xffffff,
      1.5
    );
    this.lights.addLight(
      this.churchLights.x + 30,
      this.churchLights.y,
      55,
      0xffffff,
      1.5
    );
  }

  update() {
    if (this.paused) return;

    this.houseLayer.forEachTile((tile) => {
      if (
        tile.index != -1 &&
        tile.index % 4 == 0 &&
        !tile.properties.delivered
      ) {
        tile.properties.light.intensity = 0.02;
      }
    });

    // update houses within player that they can deliver message to
    this.housesWithinRange = this.houseLayer.getTilesWithinShape(
      new Phaser.Geom.Circle(this.player.x, this.player.y, 260),
      { isNotEmpty: true }
    );

    // give them a yellow highlight so player knows they can deliver
    this.housesWithinRange.forEach((tile) => {
      if (!tile.properties.delivered && tile.index % 4 == 0)
        tile.properties.light.intensity = 0.06;
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
      x: tile.getCenterX() + 32, // offset to left
      y: tile.getCenterY() + 126, // offset to  bottom
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
      this.housesRemainingText.setText(this.numHousesLeft);
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

    const decorLayer = map.createLayer(
      "Decor",
      map.addTilesetImage("decor-tiles", "decor-tiles")
    );
    const waterLayer = map.createLayer(
      "Water",
      map.addTilesetImage("water-tiles", "water-tiles")
    );
    const churchLayer = map.createLayer(
      "Church",
      map.addTilesetImage("church-tiles", "church-tiles")
    );
    const roadLayer = map.createLayer(
      "Road",
      map.addTilesetImage("road-tiles", "road-tiles")
    );

    const treeLayer = map.createLayer(
      "Trees",
      map.addTilesetImage("tree-tiles", "tree-tiles")
    );
    this.houseLayer = map.createLayer(
      "House",
      map.addTilesetImage("house-tiles", "house-tiles")
    );

    // the next line sets up collision: if there is a road tile built on top of a ground tile,
    // set collision to false so the player can walk on it. otherwise, it's just grass,
    // so set collision to true. the player can only walk on road tiles
    groundLayer.forEachTile((tile) => {
      roadLayer.hasTileAt(tile.x, tile.y)
        ? tile.setCollision(false)
        : tile.setCollision(true);
    });

    // get the number of houses on this map, to keep track
    this.numHousesLeft =
      this.houseLayer.getTilesWithin(
        0,
        0,
        this.houseLayer.width,
        this.houseLayer.height,
        { isNotEmpty: true }
      ).length / 4;

    this.redcoats = [];

    const intersections = [];

    this.redcoatVisionCones = this.add.group();

    map.objects[0].objects.forEach((object) => {
      if (object.name == "Redcoat") {
        if (sessionStorage.getItem("difficulty") == "easy") {
          if (Phaser.Math.Between(1, 2) == 2) {
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
        } else {
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
      if (object.name == "Lights") {
        this.churchLights = new Phaser.Math.Vector2(object.x, object.y);
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
    const housesLeft = this.add
      .image(5, 5, "housesLeft")
      .setOrigin(0, 0)
      .setScale(1);
    const livesLeft = this.add
      .image(this.width - 5, 5, "livesLeft")
      .setOrigin(1, 0)
      .setScale(1);

    this.housesRemainingText = new CustomText(
      this,
      housesLeft.getCenter().x + 65,
      housesLeft.getCenter().y,
      this.numHousesLeft,
      "l",
      "r"
    )
      .setPadding(2)
      .setFontSize("26px")
      .setFontStyle("italic");

    this.livesLeftText = new CustomText(
      this,
      livesLeft.getCenter().x + 45,
      livesLeft.getCenter().y,
      this.lives,
      "l",
      "r"
    )
      .setPadding(2)
      .setFontSize("26px")
      .setFontStyle("italic");
    this.cameras.main.ignore([
      housesLeft,
      livesLeft,
      this.housesRemainingText,
      this.livesLeftText,
    ]);

    if (this.firstTime) {
      this.housesRemainingText.setAlpha(0);
      this.livesLeftText.setAlpha(0);
      housesLeft.setAlpha(0);
      livesLeft.setAlpha(0);
      this.tweens.add({
        targets: [
          this.housesRemainingText,
          this.livesLeftText,
          housesLeft,
          livesLeft,
        ],
        alpha: 1,
        delay: 14000,
        duration: 1000,
      });
    }
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

    const im1 = this.add
      .image(this.width * 0.5, this.height * 0.5 + 20, "win")
      .setAlpha(0);

    this.tweens.add({
      targets: im1,
      alpha: 1,
      duration: 800,
    });

    this.cameras.main.ignore(im1);
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
    if (this.lives <= 0) {
      im1.setTexture("UI_noLives");
    }

    this.cameras.main.ignore([im1]);
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
  fadingOut; // if camera is fading out to gameplay
  proj1; // music track

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
    this.load.image("button", "Button.png");
    this.load.image("select", "Select.png");

    this.load.setPath("./assets/User Interface/Screens/");
    this.load.image("creditsTitle", "Credits.png");
    this.load.image("creditsPanel", "CreditsPanel.png");
    this.load.image("hardDesc", "DeathDescription.png");
    this.load.image("easy", "Easy.png");
    this.load.image("easyDesc", "EasyDescription.png");
    this.load.image("GetReady", "GetReadytoRide.png");
    this.load.image("hard", "GiveMeDeath.png");
    this.load.image("medium", "GiveMeLiberty.png");
    this.load.image("historyTitle", "Historical_Background_Panel.png");
    this.load.image("historyPanel", "HistoryPanel.png");
    this.load.image("hover", "HoverDescription.png");
    this.load.image("howTitle", "How_to_Play.png");
    this.load.image("mediumDesc", "LibertyDescription.png");
    this.load.image("modes", "Modes.png");
    this.load.image("next", "Next.png");
    this.load.image("panel", "Panel.png");
    this.load.image("play", "PlayPanel.png");
    this.load.image("return", "Return.png");
    this.load.image("difficulty", "Select A Difficulty.png");

    this.load.setPath("./");
    this.load.audio("proj1", ["assets/audio/mp3/proj1.mp3"]);
    this.load.image("painting", "assets/Midnight_Ride_of_Paul_Revere.jpg");
    this.musicVolume = 0.2;
    this.soundVolume = 0.4;
    this.fadingOut = false;
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

    this.proj1 = this.sound.add("proj1");
    this.proj1.play({
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
    const im1 = this.add
      .image(this.width * 0.5, this.height - 50, "creditsPanel")
      .setOrigin(0.5, 1);

    const returnButton = new CustomButton(
      this,
      im1.getBottomRight().x - 100,
      im1.getBottomRight().y - 100,
      "return",
      () => {
        this.startMenu.setVisible(true);
        this.creditsMenu.setVisible(false);
      }
    ).setOrigin(1, 1);

    this.creditsMenu = this.add.container(0, 0, [im1, returnButton]);

    this.creditsMenu.setVisible(false);
  }

  loadStory() {
    const im2 = this.add.image(
      this.width * 0.5,
      this.height * 0.53,
      "historyPanel"
    );
    const im1 = this.add
      .image(this.width * 0.5, im2.getTopCenter().y - 2, "historyTitle")
      .setOrigin(0.5, 1);

    const nextButton = new CustomButton(
      this,
      im2.getBottomRight().x - 150,
      im2.getBottomRight().y - 50,
      "next",
      () => {
        this.tutorialMenu.setVisible(true);
        this.storyMenu.setVisible(false);
      }
    );

    this.storyMenu = this.add.container(0, 0, [im1, im2, nextButton]);
    this.storyMenu.setVisible(false);
  }

  loadTutorial() {
    const im2 = this.add.image(this.width * 0.5, this.height * 0.53, "play");

    const im1 = this.add
      .image(this.width * 0.5, im2.getTopCenter().y - 2, "howTitle")
      .setOrigin(0.5, 1);

    const nextButton = new CustomButton(
      this,
      im2.getBottomRight().x - 150,
      im2.getBottomRight().y - 50,
      "next",
      () => {
        this.tutorialMenu.setVisible(false);
        this.difficultyMenu.setVisible(true);
      }
    );

    this.tutorialMenu = this.add.container(0, 0, [im1, im2, nextButton]);
    this.tutorialMenu.setVisible(false);
  }

  loadDifficulty() {
    const im5 = this.add.image(this.width * 0.5, this.height * 0.53, "modes");

    const im1 = this.add
      .image(this.width * 0.5, im5.getTopCenter().y - 2, "difficulty")
      .setOrigin(0.5, 1);

    const selected = this.add
      .image(this.width * 0.5, im1.getBottomLeft().y + 100, "select")
      //.setScale(0.8)
      .setVisible(false);

    const im3 = new CustomButton(
      this,
      this.width * 0.5,
      im5.getTopCenter().y + 160,
      "medium",
      () => {
        sessionStorage.setItem("difficulty", "medium");
        imDesc.setTexture("mediumDesc");
        selected
          .setPosition(this.width * 0.5, im5.getTopCenter().y + 200)
          .setVisible(true)
          .setOrigin(0.5, 0.5);
      }
    ).on("pointerover", () => imDesc.setTexture("mediumDesc"));

    const im2 = new CustomButton(
      this,
      im3.getBottomCenter().x - 180,
      im5.getTopCenter().y + 160,
      "easy",
      () => {
        sessionStorage.setItem("difficulty", "easy");
        imDesc.setTexture("easyDesc");
        selected
          .setPosition(
            im3.getBottomCenter().x - 160,
            im5.getTopCenter().y + 200
          )
          .setVisible(true)
          .setOrigin(1, 0.5);
      }
    )
      .setOrigin(1, 0.5)
      .on("pointerover", () => imDesc.setTexture("easyDesc"));

    const im4 = new CustomButton(
      this,
      im3.getBottomCenter().x + 170,
      im5.getTopCenter().y + 156,
      "hard",
      () => {
        sessionStorage.setItem("difficulty", "hard");
        imDesc.setTexture("hardDesc");
        selected
          .setPosition(
            im3.getBottomCenter().x + 180,
            im5.getTopCenter().y + 196
          )
          .setVisible(true)
          .setOrigin(0, 0.5);
      }
    )
      .setOrigin(0, 0.5)
      .on("pointerover", () => imDesc.setTexture("hardDesc"));

    const imDesc = new CustomButton(
      this,
      this.width * 0.5,
      im3.getBottomLeft().y + 60,
      "hover"
    );

    const startButton = new CustomButton(
      this,
      this.width * 0.5,
      im5.getBottomCenter().y - 70,
      "GetReady",
      () => {
        if (sessionStorage.getItem("difficulty")) {
          if (this.fadingOut) return;
          this.fadingOut = true;
          this.tweens.add({
            targets: this.proj1,
            volume: 0,
            duration: 1000,
            onComplete: () => {
              this.sound.stopAll();
              this.sound.removeAll();
            },
          });
          this.cameras.main.fadeOut(2000, 0, 0, 0);

          this.cameras.main.once(
            Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
            (cam, effect) => this.scene.start("MidnightRide")
          );
        }
      }
    );

    this.difficultyMenu = this.add.container(0, 0, [
      im5,
      im1,
      im2,
      im3,
      im4,
      imDesc,
      selected,
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
