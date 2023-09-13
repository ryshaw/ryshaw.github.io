class Game extends Phaser.Scene {
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
  bullets; // physics group
  zombos; // physics group
  playerHealth;
  days;

  playerCollisionCategory;
  zomboCollisionCategory;
  bulletCollisionCategory;
  fortCollisionCategory;
  playerGroup;

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

    this.graphics = this.add.graphics({
      lineStyle: { width: 0.2, color: 0xffd166 },
    });

    // zoom in camera and reset position
    // bounds of the world are [0, 0, gameW, gameH]
    this.cameras.main.setZoom(4);
    this.cameras.main.centerOn(this.gameW / 2, this.gameH / 2);
    this.matter.world.setBounds(0, 0, this.gameW, this.gameH);

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
    this.playerCollisionCategory = this.matter.world.nextCategory();
    this.zomboCollisionCategory = this.matter.world.nextCategory();
    this.bulletCollisionCategory = this.matter.world.nextCategory();
    this.fortCollisionCategory = this.matter.world.nextCategory();
    this.playerGroup = this.matter.world.nextGroup(true);

    const map = this.make.tilemap({ key: "map" });

    const backgroundLayer = map.createLayer(
      "Background",
      map.addTilesetImage("tileset", "tileset")
    );

    const fortLayer = map
      .createLayer("Fort", map.addTilesetImage("tileset", "tileset"))
      .setDepth(1); // to be above car

    map.setCollisionByExclusion([-1], true, true, fortLayer);

    this.matter.world.convertTilemapLayer(fortLayer);

    // this.player is two parts, car and gun. both are in a container
    const car = this.add.sprite(0, 0, "car").setName("car");

    const gun = this.add
      .rectangle(0, 0, 1, 7, 0xffffff, 1)
      .setOrigin(0.5, 0)
      .setRotation(-Math.PI / 2)
      .setName("gun");

    this.player = this.add.container(20, 100, [car, gun]);
    this.matter.add.gameObject(this.player);
    this.player.setRectangle(9, 5).setFriction(1, 0.3, 1);
    this.player.speed = 0;
    this.player.setCollisionGroup(this.playerGroup);
    //this.player.setCollisionCategory(this.playerCollisionCategory);

    const f = this.matter.add
      .sprite(this.gameW / 2, this.gameH / 2, "food")
      .setStatic(true)
      .setCircle(10);
    f.health = 10;

    this.add.existing(new Zombo(this, this.gameW * 0.1, this.gameH * 0.1));
    /*
    this.zombos = this.physics.add.group();
    this.add.existing(new Zombo(this, this.gameW * 0.1, this.gameH * 0.1));

    this.physics.add.collider(this.zombos, fortLayer, (z, t) =>
      this.zomboHitWall(z, t)
    );

    this.bullets = this.physics.add.group();
    this.physics.add.overlap(this.zombos, this.bullets, (z, b) =>
      this.hitZombo(z, b)
    );

    this.physics.add.collider(this.zombos, f, (z, f) =>
      this.zomboHitFood(z, f)
    );

    this.physics.add.collider(this.player, this.zombos, (p, z) => {
      z.attacking = false;
      if (!z.hitByCar) {
        z.hitByCar = true;
      }
    });*/
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
    this.updatePlayerMovement();
    this.updateShoot();
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
    if (this.player.speed < 0) turnRadius *= -0.6;

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
    // gotta subtract this.player.rotation because by default, gun rotation
    // is offset by the container's rotation
    this.player
      .getByName("gun")
      .setRotation(angle - Math.PI / 2 - this.player.rotation);
  }

  updateShoot() {
    if (this.mouseDown && this.reloadTime <= 0) {
      const v = this.input.activePointer.positionToCamera(this.cameras.main);
      // adjust for how fast player is going so it doesn't look bad
      const offset = new Phaser.Math.Vector2(
        this.player.body.velocity.x,
        this.player.body.velocity.y
      ).scale(1.8);
      // yeah I'm doing this by hand instead of using custom classes, keep scrolling
      const circle = this.add
        .circle(
          this.player.x + offset.x,
          this.player.y + offset.y,
          0.5,
          0xffd166,
          1
        )
        .setDepth(-1);

      this.matter.add
        .gameObject(circle)
        .setCircle(0.5)
        .setFriction(0, 0, 0)
        .setCollisionGroup(this.playerGroup)
        .setCollidesWith(0);

      this.moveToPoint(circle, v, 5);
      circle.name = "bullet";

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

  zomboHitWall(zombo, wall) {
    zombo.body.stop();
    zombo.attacking = true;
    this.time.delayedCall(1000, () => {
      if (zombo.health >= 0 && zombo.attacking) {
        if (wall.alpha <= 0.2) {
          wall.setCollision(false);
        } else {
          wall.setAlpha(wall.alpha - 0.1);
        }
      }
    });
  }

  zomboHitFood(zombo, food) {
    zombo.body.stop();
    this.playerHealth -= 1;
    this.UIContainer.getByName("healthText").setText(
      `health: ${this.playerHealth}`
    );
    if (this.playerHealth <= 0) this.gameOver();
  }

  loadGameUI() {
    new CustomText(this, 5, 5, "wasd or arrow keys to move", "s").setOrigin(
      0,
      0
    );
    new CustomText(
      this,
      this.windowW - 5,
      5,
      `health: ${this.playerHealth}`,
      "s"
    )
      .setOrigin(1, 0)
      .setName("healthText");
    new CustomText(this, this.windowW * 0.5, 5, "STAY DEAD", "m")
      .setFontFamily("Finger Paint")
      .setOrigin(0.5, 0)
      .setColor("#9e2a2b");
  }

  gameOver() {
    /*
    this.sound.stopAll();

    this.sounds["lose"].play({
      volume: 0.4,
    });*/

    this.physics.pause();
    this.tweens.killAll();
    this.anims.pauseAll();

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
  backgroundColor: "#9badb7",
  scene: [Game],
};

class Zombo extends Phaser.Physics.Matter.Sprite {
  scene;
  health;
  attacking;
  hitByCar;

  constructor(scene, x, y) {
    super(scene.matter.world, x, y, "zombo").setDepth(1);
    this.scene = scene;
    this.health = 3;
    this.attacking = false;
    this.hitByCar = false;
    this.setCircle(3).setBounce(0.6, 0.6).setFriction(0.1, 0.1);

    scene.time.delayedCall(1000, () => this.zomboHandler());
  }

  zomboHandler() {
    if (!this.body) return;
    if (this.hitByCar) {
      this.hitByCar = false;
    } else {
      this.scene.moveToPoint(
        this,
        new Phaser.Math.Vector2(this.scene.gameW / 2, this.scene.gameH / 2),
        0.5
      );
    }
    this.scene.time.delayedCall(1000, () => this.zomboHandler());
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.rotation = this.body.angle;
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
