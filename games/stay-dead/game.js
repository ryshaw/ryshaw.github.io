class Night extends Phaser.Scene {
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

  boundsGroup; // player and bounds collide, nothing else collides with bounds

  constructor() {
    super({ key: "Night" });
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
    this.load.image("zombo", "assets/zombo.png");
    this.load.image("food", "assets/food.png");

    this.windowW = game.config.width;
    this.windowH = game.config.height;
    this.gameW = this.windowW / 4;
    this.gameH = this.windowH / 4;
  }

  create() {
    this.mouseDown = false;
    this.reloadTime = 0;
    this.playerHealth = 10;
    this.days = 1;
    this.wave = 1;
    this.bullets = this.add.group();
    this.zombos = this.add.group();
    this.gameState = "night";
    this.nightTime = 0;
    this.isGameOver = false;

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

    this.cameras.main.fadeIn(800);
    this.UICamera.fadeIn(800);
  }

  createLayout() {
    this.boundsGroup = this.matter.world.nextGroup(false);

    this.matter.world.setBounds(0, 0, this.gameW, this.gameH);
    // this sets the bounds so the player does collide, zombos do NOT collide with bounds
    Object.values(this.matter.world.walls).forEach((wall) => {
      wall.collisionFilter.group = this.boundsGroup; // player is in boundsGroup
      wall.collisionFilter.category = 0; // otherwise, don't collide with anything else
    });

    const map = this.make.tilemap({ key: "map" });

    const backgroundLayer = map.createLayer(
      "Background",
      map.addTilesetImage("tileset", "tileset")
    );

    const fortLayer = map
      .createLayer("Fort", map.addTilesetImage("tileset", "tileset"))
      .setDepth(1); // to be above car

    fortLayer.forEachTile((tile) => {
      if (tile.index != -1) {
        tile.name = "wall";
        tile.health = 8;
      }
    });

    map.setCollisionByExclusion([-1], true, true, fortLayer);

    this.matter.world.convertTilemapLayer(fortLayer);

    // this.player is two parts, car and gun. both are in a container
    const car = this.add.sprite(0, 0, "car").setName("car");

    const gun = this.add
      .rectangle(0, 0, 1, 7, 0xffffff, 1)
      .setOrigin(0.5, 0)
      .setRotation(-Math.PI / 2)
      .setName("gun");

    this.player = this.add.container(20, 100, [car, gun]).setName("player");
    this.matter.add.gameObject(this.player);
    this.player.setRectangle(9, 5).setFriction(0, 0.3, 1);
    this.player.speed = 0;
    this.player.setCollisionGroup(this.boundsGroup);

    this.food = this.matter.add
      .sprite(this.gameW / 2, this.gameH / 2, "food")
      .setCircle(10)
      .setStatic(true)
      .setName("food");
    this.food.health = 10;

    // foodDamaged emitted by zombo when attacking food supply
    this.events.on(
      "foodDamaged",
      () => {
        this.UIContainer.getByName("healthText").setText(
          `health: ${this.food.health}`
        );
        if (this.food.health <= 0) this.gameOver();
      },
      this
    );

    this.events.on(
      "waveOver",
      () => {
        this.wave += 1;
        this.UIContainer.getByName("waveText").setText(`wave: ${this.wave}`);
      },
      this
    );

    this.matter.world.on("collisionstart", (event) => {
      this.collisionStartHandler(event);
    });

    this.matter.world.on("collisionend", (event) => {
      this.collisionEndHandler(event);
    });

    // game starts at night, so set the interval and get the night going
    this.timeInterval = setInterval(() => this.timeHandler(), 1000);
    this.waveInterval = setInterval(() => this.waveHandler(), 2500);
  }

  // converts the timer during night to clock format so we can display it for player
  getClockTime() {
    let hour = Math.floor(this.nightTime / 6);
    if (hour == 0) hour = 12;
    return hour + ":" + (this.nightTime % 6) + "0";
  }

  timeHandler() {
    this.nightTime += 1;
    this.UIContainer.getByName("timeText").setText(this.getClockTime());
    if (this.nightTime >= 36) {
      clearInterval(this.timeInterval);
      clearInterval(this.waveInterval);
      this.matter.pause();
      this.UIContainer.getByName("timeText").setColor("#fcf6bd");
      this.tweens.addCounter({
        from: 24,
        to: 32,
        duration: 300,
        yoyo: true,
        loop: 2,
        onUpdate: (tween) => {
          this.UIContainer.getByName("timeText").setFontSize(tween.getValue());
        },
        completeDelay: 500,
        onComplete: () => {
          this.cameras.main.fadeOut(800);
          this.UICamera.fadeOut(800);
          this.time.delayedCall(1000, () => this.scene.start("Day"));
        },
      });
    }
  }

  waveHandler() {
    // get random point outside the screen for zombo to spawn in
    const rectOuter = new Phaser.Geom.Rectangle(
      -this.gameW * 0.1,
      -this.gameH * 0.1,
      this.gameW * 1.2,
      this.gameH * 1.2
    );
    const rectInner = new Phaser.Geom.Rectangle(0, 0, this.gameW, this.gameH);

    this.add.existing(
      new Zombo(this, Phaser.Geom.Rectangle.RandomOutside(rectOuter, rectInner))
    );
  }

  // sorry in advance...
  collisionStartHandler(event) {
    event.pairs.forEach((pair) => {
      const objA = this.getNameAndGameObject(pair.bodyA);
      const objB = this.getNameAndGameObject(pair.bodyB);
      if (objA.includes("zombo")) {
        switch (objB[0]) {
          case "zombo":
          case "fort":
          case "food":
            objA[1].hit(objB[1]);
            break;
          case "player":
            objA[1].hitByCar();
          default:
            break;
        }
      }
      if (objB.includes("zombo")) {
        switch (objA[0]) {
          case "zombo":
          case "fort":
          case "food":
            objB[1].hit(objA[1]);
            break;
          case "player":
            objB[1].hitByCar();
          default:
            break;
        }
      }
    });
  }

  collisionEndHandler(event) {
    event.pairs.forEach((pair) => {
      const objA = this.getNameAndGameObject(pair.bodyA);
      const objB = this.getNameAndGameObject(pair.bodyB);
      if (objA.includes("zombo")) {
        switch (objB[0]) {
          case "zombo":
          case "fort":
          case "food":
          case "player":
            objA[1].collisionEnd(objB[1]);
            break;

          default:
            break;
        }
      }
      if (objB.includes("zombo")) {
        switch (objA[0]) {
          case "zombo":
          case "fort":
          case "food":
          case "player":
            objB[1].collisionEnd(objA[1]);
            break;

          default:
            break;
        }
      }
    });
  }

  // helper method for collisionHandlers
  getNameAndGameObject(body) {
    let array = [];
    if (body.gameObject)
      if (body.gameObject.tile) array = ["fort", body.gameObject.tile];
      else array = [body.gameObject.name, body.gameObject];
    else array = ["bounds", null];

    return array;
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

  update() {
    this.updatePlayerMovement();
    this.updateShoot();

    // see if any bullets hit zombies. this must be done each frame
    // because we're checking for overlap, not collision
    this.bullets.getChildren().forEach((bullet) => {
      this.matter.overlap(bullet, this.zombos.getChildren(), (b, z) => {
        this.bullets.remove(bullet, true, true);
        z.gameObject.health -= 1;
        if (z.gameObject.health <= 0) {
          this.zombos.remove(z.gameObject, true, true);
        }
      });
    });
  }

  updatePlayerMovement() {
    // this is a long one :)

    let turnRadius = 0.075; // maximum turn radius of the car
    let maxSpeed = 0.00006; // maximum speed of the car

    const forward = this.keys.up.isDown || this.keys.w.isDown;
    const backward = this.keys.down.isDown || this.keys.s.isDown;
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;

    // if we're backing up, turn down the turnRadius
    if (this.player.speed < -0.000008) turnRadius *= -0.6;

    // turn left when we press left
    if (left && !right) this.player.setAngularVelocity(-turnRadius);

    // turn right when press right
    if (right && !left) this.player.setAngularVelocity(turnRadius);

    // if we press up, move forward
    if (forward && !backward)
      this.player.speed = Phaser.Math.Linear(this.player.speed, maxSpeed, 0.02);

    // if we press down, go backward
    if (backward && !forward)
      this.player.speed = Phaser.Math.Linear(
        this.player.speed,
        -maxSpeed * 0.3,
        0.02
      );

    // if we press neither up nor right, slow down
    if (!backward && !forward) {
      this.player.speed = Phaser.Math.Linear(this.player.speed, 0, 0.04);
      if (Math.abs(this.player.speed) < 0.000001) this.player.speed = 0;
    }

    // set body velocity according to speed and angle
    this.matter.applyForceFromAngle(
      this.player,
      this.player.speed,
      this.player.rotation
    );

    // turn mounted gun to face mouse
    const v = this.input.activePointer.positionToCamera(this.cameras.main);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      v.x,
      v.y
    );

    // only rotate gun if physics is enabled so it doesn't look weird when physics is paused
    if (this.matter.world.enabled) {
      // gotta subtract this.player.rotation because by default, gun rotation
      // is offset by the container's rotation
      this.player
        .getByName("gun")
        .setRotation(angle - Math.PI / 2 - this.player.rotation);
    }
  }

  updateShoot() {
    if (this.mouseDown && this.reloadTime <= 0) {
      const v = this.input.activePointer.positionToCamera(this.cameras.main);
      // adjust for how fast player is going so it doesn't look bad
      const offset = new Phaser.Math.Vector2(
        this.player.body.velocity.x,
        this.player.body.velocity.y
      ).scale(1.4);
      // yeah I'm doing this by hand instead of using custom classes, keep scrolling
      const circle = this.add
        .circle(
          this.player.x + offset.x,
          this.player.y + offset.y,
          0.6,
          0xffd166,
          1
        )
        .setDepth(-1);

      this.matter.add
        .gameObject(circle)
        .setCircle(0.6)
        .setFriction(0, 0, 0)
        .setCollidesWith(0);

      this.moveToPoint(circle, v, 8);
      circle.name = "bullet";

      this.bullets.add(circle);

      this.time.delayedCall(5000, () => circle.destroy());
      this.reloadTime = 0.2;
      this.tweens.add({
        targets: this,
        reloadTime: 0,
        duration: this.reloadTime * 1000,
      });
    }
  }

  // moveToPoint stolen from https://phaser.discourse.group/t/is-it-possible-to-use-sprite-move-to-another-sprite-on-matter-js/2367
  moveToPoint(obj, to, speed = 1) {
    const direction = Math.atan((to.x - obj.x) / (to.y - obj.y));
    const speed2 = to.y >= obj.y ? speed : -speed;
    obj.setVelocity(speed2 * Math.sin(direction), speed2 * Math.cos(direction));
  }

  hitZombo(zombo, bullet) {
    this.bullets.remove(bullet, true, true);
    zombo.health--;
    if (zombo.health <= 0) this.zombos.remove(zombo, true, true);
  }

  loadGameUI() {
    new CustomText(
      this,
      5,
      5,
      "wasd or arrow keys to move, click to shoot",
      "s"
    ).setOrigin(0, 0);

    new CustomText(
      this,
      this.windowW - 5,
      5,
      `health: ${this.playerHealth}`,
      "s"
    )
      .setOrigin(1, 0)
      .setName("healthText");

    new CustomText(this, this.windowW - 5, 20, `wave: ${this.wave}`, "s")
      .setOrigin(1, 0)
      .setName("waveText");

    new CustomText(this, this.windowW * 0.5, 2, "12:00", "m")
      .setOrigin(0.5, 0)
      .setName("timeText");

    new CustomText(this, this.windowW, this.windowH, "STAY DEAD", "s")
      .setFontFamily("Finger Paint")
      .setOrigin(1, 1)
      .setColor("#9e2a2b");
  }

  gameOver() {
    /*
    this.sound.stopAll();

    this.sounds["lose"].play({
      volume: 0.4,
    });*/

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
  }
}

class Day extends Phaser.Scene {
  // window resolution is 1280x720.
  // game resolution is 320x180.
  windowW;
  windowH;
  gameW;
  gameH;
  UICamera;
  UIContainer;
  player; // container with the car and the mounted gun
  sounds;
  food;
  days;
  buttons; // player, turrets, wall, and food
  containers; // player, turrets, wall, and food

  constructor() {
    super({ key: "Day" });
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
    this.load.image("food", "assets/food.png");

    this.windowW = game.config.width;
    this.windowH = game.config.height;
    this.gameW = this.windowW / 4;
    this.gameH = this.windowH / 4;
  }

  create() {
    this.days = 1;

    this.graphics = this.add.graphics({
      lineStyle: { width: 0.2, color: 0xffd166 },
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

    this.cameras.main.fadeIn(800);
    this.UICamera.fadeIn(800);
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

    fortLayer.forEachTile((tile) => {
      if (tile.index != -1) {
        tile.name = "wall";
        tile.health = 8;
      }
    });

    map.setCollisionByExclusion([-1], true, true, fortLayer);

    this.matter.world.convertTilemapLayer(fortLayer);

    // this.player is two parts, car and gun. both are in a container
    const car = this.add.sprite(0, 0, "car").setName("car");

    const gun = this.add
      .rectangle(0, 0, 1, 7, 0xffffff, 1)
      .setOrigin(0.5, 0)
      .setRotation(-Math.PI / 2)
      .setName("gun");

    this.player = this.add
      .container(this.gameW / 2, this.gameH * 0.88, [car, gun])
      .setName("player");
    this.matter.add.gameObject(this.player);
    this.player.setRectangle(9, 5).setFriction(0, 0.3, 1);
    this.player.speed = 0;
    this.player.setCollisionGroup(this.boundsGroup);

    this.food = this.matter.add
      .sprite(this.gameW / 2, this.gameH / 2, "food")
      .setCircle(10)
      .setStatic(true)
      .setName("food");
    this.food.health = 10;

    this.events.on(
      "waveOver",
      () => {
        this.wave += 1;
        this.UIContainer.getByName("waveText").setText(`wave: ${this.wave}`);
      },
      this
    );
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

  update() {}

  loadGameUI() {
    this.createBackground();
    this.createButtons();
    this.createDescriptions();

    new CustomText(this, this.windowW, this.windowH, "STAY DEAD", "s")
      .setFontFamily("Finger Paint")
      .setOrigin(1, 1)
      .setColor("#9e2a2b");
  }

  createBackground() {
    new CustomText(this, 15, 5, `day ${this.days}`, "g").setOrigin(0, 0);

    this.UIContainer.add(
      this.add.rectangle(
        this.windowW * 0.18,
        this.windowH * 0.53,
        this.windowW * 0.35,
        this.windowH * 0.86,
        0x284b63,
        0.85
      )
    );

    this.UIContainer.add(
      this.add.rectangle(
        this.windowW * 0.18,
        this.windowH * 0.53,
        this.windowW * 0.34,
        this.windowH * 0.84,
        0x3c6e71,
        0.85
      )
    );

    this.UIContainer.add(
      this.add.rectangle(
        this.windowW * 0.82,
        this.windowH * 0.53,
        this.windowW * 0.35,
        this.windowH * 0.86,
        0x284b63,
        0.85
      )
    );

    this.UIContainer.add(
      this.add.rectangle(
        this.windowW * 0.82,
        this.windowH * 0.53,
        this.windowW * 0.34,
        this.windowH * 0.84,
        0x3c6e71,
        0.85
      )
    );

    this.UIContainer.add(
      this.add.rectangle(
        this.windowW * 0.18,
        this.windowH * 0.2,
        this.windowW * 0.33,
        this.windowH * 0.008,
        0xffffff,
        0.85
      )
    );
  }

  createButtons() {
    this.buttons = {
      player: new CustomUIButton(this, 15, 88, "player", () =>
        this.switchToContainer("player")
      ),
      turrets: new CustomUIButton(this, 138, 88, "turrets", () =>
        this.switchToContainer("turrets")
      ),
      wall: new CustomUIButton(this, 277, 88, "wall", () =>
        this.switchToContainer("wall")
      ),
      food: new CustomUIButton(this, 364, 88, "food", () =>
        this.switchToContainer("food")
      ),
    };

    new CustomText(
      this,
      this.windowW * 0.5,
      6,
      "begin the night!",
      "l",
      "c",
      () => {
        this.input.removeAllListeners();
        this.input.enabled = false;
        this.cameras.main.fadeOut(800);
        this.UICamera.fadeOut(800);
        this.time.delayedCall(1000, () => this.scene.start("Night"));
      }
    )
      .setOrigin(0.5, 0)
      .setName("nightButton");
  }

  createDescriptions() {}

  switchToContainer(container) {
    for (const name in this.buttons) {
      if (name == container) {
        this.buttons[name].setBackgroundColor("rgba(220, 220, 220, 0.4)");
      } else {
        this.buttons[name].setBackgroundColor("rgba(220, 220, 220, 0.1)");
      }
    }

    switch (container) {
      case "":
        break;

      default:
        break;
    }
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
    default: "matter",
    matter: {
      debug: false,
      gravity: {
        x: 0,
        y: 0,
      },
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  backgroundColor: "#000000",
  scene: [Day, Night],
};

// for zombo states
const STANDING = 0;
const WALKING = 1;
const ATTACKING = 2;
const HITBYCAR = 3;

class Zombo extends Phaser.Physics.Matter.Sprite {
  scene;
  health;
  state; // finite state machine: standing, walking, attacking, or hitByCar
  timeInState; // counter of time in each state, resets to 0 each time we switch
  targets; // when attacking fort
  walkingSpeed;

  constructor(scene, point) {
    super(scene.matter.world, point.x, point.y, "zombo")
      .setDepth(1)
      .setName("zombo");
    this.scene = scene;
    this.health = 3;
    this.state = STANDING;
    this.timeInState = 0;
    this.targets = [];
    this.setRectangle(5, 5).setBounce(0.7).setFriction(0, 0.06, 0);
    this.scene.zombos.add(this);

    /* calculate zombo speed. the zombo spawns at a random point just outside the game bounds.
    first we get the distance from zombo to center of screen (food supply),
    then we square the distance and divide it by a large number so it's small enough to be
    a good slow Matter velocity. I square it to make sure large distances can be covered easily,
    while keeping short-distanced zombos at a very slow speed to not overwhelm the player,
    as the top and bottom sides of the screen are closest to the walls. */
    const center = new Phaser.Geom.Point(
      this.scene.gameW / 2,
      this.scene.gameH / 2
    );
    const d = Phaser.Math.Distance.BetweenPoints(point, center);
    this.walkingSpeed = d ** 2 / 200000;
  }

  // runs every frame or whatever
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // nightTime goes from 0 to 36 (12am to 6am in ten minute intervals)
    if (this.scene.nightTime >= 36 || this.scene.isGameOver) return;

    this.timeInState += delta;

    switch (this.state) {
      // if standing around, wait a second then start walking
      case STANDING:
        if (this.timeInState >= 1000) {
          this.state = WALKING;
          this.timeInState = 0;
        }
        break;

      // walk towards center of screen (food)
      case WALKING:
        this.scene.moveToPoint(
          this,
          new Phaser.Math.Vector2(this.scene.gameW / 2, this.scene.gameH / 2),
          this.walkingSpeed
        );
        this.setRotation(
          Phaser.Math.Angle.Between(
            0,
            0,
            this.body.velocity.x,
            this.body.velocity.y
          )
        );
        /* this next block fixes a bug where a zombo gets stuck on the
        north, east, south, west section of the wall. the zombo gets stuck
        because it's not really moving around the wall so it's not finding
        targets to hit. so, every once in a while, turn around for exactly
        one frame so the velocity and collision box can reset.
        */
        if (Math.random() < 0.008) {
          this.scene.moveToPoint(
            this,
            new Phaser.Math.Vector2(this.scene.gameW / 2, this.scene.gameH / 2),
            -0.1
          );
        }
        break;

      // zombo is attacking a wall or the food supply
      case ATTACKING:
        // only attack once per second
        if (this.timeInState >= 1000) {
          this.timeInState -= 1000;
          // check if there's any targets, sometimes there aren't
          // if not, just go back to walking
          if (this.targets.length <= 0) {
            this.state = WALKING;
            this.timeInState = 0;
            break;
          }
          // if there is a target, select the first one
          const target = this.targets[0];
          target.health -= 1;

          // if food supply is attacked, emit for UI and gameOver purposes
          if (target.name == "food") {
            this.scene.events.emit("foodDamaged");
          }

          // target is destroyed
          if (target.health <= 0) {
            if (target.name == "wall") {
              // remove collision on wall so zombo can move forward
              target.physics.matterBody.setCollisionCategory(0);
            }
            Phaser.Utils.Array.Remove(this.targets, target);
            this.scene.time.delayedCall(900, () => {
              this.state = WALKING;
              this.timeInState = 0;
            });
          } else {
            target.setAlpha(target.alpha - 0.1);
          }
        }
        break;

      // if hit by car, idle until zombo slows down to a stop
      // then go back to standing (which then invokes walking)
      case HITBYCAR:
        if (this.body.speed < 0.01) {
          this.state = STANDING;
          this.timeInState = 0;
        }
        break;

      default:
        break;
    }
  }

  hit(obj) {
    // hit wall or food
    if (this.state == HITBYCAR) {
      if (obj.name == "zombo") obj.hitByCar();
      return;
    }
    if (obj.name != "zombo") {
      this.state = ATTACKING;
      this.timeInState = 0;
      Phaser.Utils.Array.Add(this.targets, obj);
    }
  }

  hitByCar() {
    this.state = HITBYCAR;
    this.timeInState = 0;
  }

  collisionEnd(obj) {
    // was hit by car, or the wall came down while attacking
    Phaser.Utils.Array.Remove(this.targets, obj);
  }
}

// Bullet & Bullets unused for now
class Bullet extends Phaser.GameObjects.Arc {
  constructor(scene, x, y) {
    super(scene, x, y, 0.5).setFillStyle(0xffd166);
  }

  fire(x, y) {
    this.body.reset(x, y);

    this.setActive(true);
    this.setVisible(true);

    this.setVelocityY(-300);
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (this.y <= -32) {
      this.setActive(false);
      this.setVisible(false);
    }
  }
}

class Bullets extends Phaser.Physics.Arcade.Group {
  constructor(scene) {
    super(scene.physics.world, scene);

    this.createMultiple({
      frameQuantity: 5,
      key: "bullet",
      active: false,
      visible: false,
      classType: Bullet,
    });
  }

  fireBullet(x, y) {
    const bullet = this.getFirstDead(false);

    if (bullet) {
      bullet.fire(x, y);
    }
  }
}

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

class CustomUIButton extends Phaser.GameObjects.Text {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    text,
    callback
  ) {
    super(scene);

    const cT = scene.add
      .text(x, y, text, {
        font: "32px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily("Anonymous Pro");

    // fine-tuned this code so button only clicks if player
    // emits both pointerdown and pointerup events on it
    cT.setInteractive({ useHandCursor: true })
      .setBackgroundColor("rgba(220, 220, 220, 0.1)") // it's just CSS
      .setPadding(5)
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
