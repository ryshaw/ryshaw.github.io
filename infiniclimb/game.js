const VERSION = "Infiniclimb v0.1";

const DEV_MODE = false; // turns on physics debug mode

const gameW = 800;
const gameH = 960;

const FONTS = ["Red Hat Display", "Josefin Sans"];

const COLORS = {
  topGradient: 0x9bf6ff, // for background//
  bottomGradient: 0xc2f8cb, // for background
  //fillColor: 0xedf2fb, // colors UI
  highlightColor: 0xffef9f, // for highlighting text
  clickColor: 0xbfbdc1, // when text is clicked
  buttonColor: 0xe0fbfc, // for coloring buttons and the title
  white: 0xffffff,
  black: 0x000000,
  gray: 0xd2d2cf,
  shipColors: [0xcdb4db, 0xffc8dd, 0xffafcc, 0xbde0fe, 0xa2d2ff, 0x8affc1],
  stationColor: 0x98f5e1,
  fillColor: 0x14213d,
  strokeColor: 0x6bbaec,
};

class Background extends Phaser.Scene {
  graphics;

  constructor() {
    super("Background");
  }

  // initiate all custom objects
  init() {
    Phaser.GameObjects.GameObjectFactory.register(
      "gameText",
      function (x, y, text, size, width, callback) {
        let t = new GameText(this.scene, x, y, text, size, width, callback);

        this.displayList.add(t);
        this.updateList.add(t);

        return t;
      }
    );
  }

  // preload everything for the game
  preload() {
    // load google's library for the various fonts we want to use
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    this.graphics = this.add.graphics();

    this.graphics.fillGradientStyle(
      COLORS.topGradient,
      COLORS.topGradient,
      COLORS.bottomGradient,
      COLORS.bottomGradient,
      0.9
    );
    this.graphics.fillRect(0, 0, window.innerWidth, window.innerHeight * 1.5);

    this.scene.launch("Game");
    this.scene.launch("HUD");

    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize) {
    this.graphics.clear();
    this.graphics.fillGradientStyle(
      COLORS.topGradient,
      COLORS.topGradient,
      COLORS.bottomGradient,
      COLORS.bottomGradient,
      0.9
    );
    this.graphics.fillRect(0, 0, gameSize.width, gameSize.height * 1.5);
  }
}

class Game extends Phaser.Scene {
  player;
  keysDown;
  arrow;
  canJump;
  circle;
  arrowVector; // updates angle and distance of arrow every frame
  bounds; // dictates the area the player can move

  constructor() {
    super("Game");
  }

  create() {
    this.canJump = true;
    this.arrowVector = new Phaser.Math.Vector2(0, 0);
    this.bounds = new Phaser.Math.Vector2(gameW * 3, gameH * 3);

    //this.createResolution();

    this.createTextures();

    this.createLayout();
    this.createPlayer();

    this.createPhysics();

    this.createKeyboardControls();
    this.createMouseControls();

    this.startGame();
  }

  createResolution() {
    // I don't know how this code works but it's magic. I also stole it from here:
    // https://labs.phaser.io/view.html?src=src/scalemanager\mobile%20game%20example.js
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    this.parent = new Phaser.Structs.Size(width, height);

    this.sizer = new Phaser.Structs.Size(
      gameW,
      gameH,
      Phaser.Structs.Size.FIT,
      this.parent
    );

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
    this.cameras.main.centerOn(gameW / 2, gameH / 2);

    this.scale.on("resize", this.resize, this);
  }

  createTextures() {
    this.make
      .graphics()
      .fillStyle(0x000000)
      .fillRoundedRect(0, 0, 50, 50, 12)
      .fillStyle(0xee4266)
      .fillRoundedRect(3.6, 3.6, 42, 42, 8)
      .generateTexture("rect", 50, 50)
      .clear()
      .fillStyle(0x000000)
      .fillRoundedRect(0, 0, gameW * 2, gameH * 0.5, 20)
      .fillStyle(0x3da35d)
      .fillRoundedRect(6, 4, gameW * 2 - 16, gameH * 0.5 - 16, 12)
      .generateTexture("ground", gameW * 2, gameH * 0.5)
      .clear()
      .fillStyle(0x000000)
      .fillCircle(16, 16, 16)
      .fillStyle(0xccc5b9)
      .fillCircle(14.5, 14.5, 12)
      .generateTexture("ball", 32, 32)
      .clear()
      .fillStyle(0x000000)
      .fillRect(0, 0, 128, 16)
      .fillStyle(0xccc5b9)
      .fillRect(2, 2, 124, 10)
      .generateTexture("line", 128, 16)
      .destroy();
  }

  createLayout() {
    this.ground = this.matter.add
      .image(0, gameH * 0.8, "ground", null, {
        isStatic: true,
        chamfer: { radius: 20 },
        label: "ground",
      })
      .setName("ground");

    // create grabbables
    const grabbables = [];
    const bounds = new Phaser.Geom.Rectangle(
      -gameW,
      -gameH * 0.5,
      gameW * 2,
      gameH * 0.9
    );

    for (let i = 0; i < 3; i++) {
      const line = this.add.image(0, 0, "line").setName("line");
      const scale = 3; //2 + Math.random();
      line.setScale(scale, 1);
      const ball1 = this.add
        .image(line.getLeftCenter().x, 0, "ball")
        .setName("ball1");
      const ball2 = this.add
        .image(line.getRightCenter().x, 0, "ball")
        .setName("ball2");

      const c = this.add.container(0, 0, [line, ball1, ball2]);

      const b = c.getBounds();

      const rect = this.matter.bodies.rectangle(0, 0, b.width, b.height, {
        isStatic: true,
        isSensor: true,
        chamfer: { radius: 16 },
        label: "grabbable",
      });

      this.matter.add.gameObject(c, rect, true);

      // find spot away from other grabbables algorithm
      let iterations = 100; // loop 10 times before giving up
      let intersectsCircle = true;
      let p = bounds.getRandomPoint();
      let radius = b.width * 0.7;
      let circle = new Phaser.Geom.Circle(p.x, p.y, radius);

      while (intersectsCircle && iterations > 0) {
        intersectsCircle = false;

        grabbables.forEach((grabbable) => {
          if (
            Phaser.Geom.Intersects.CircleToCircle(
              circle,
              grabbable.getData("circleBounds")
            )
          ) {
            intersectsCircle = true;
          }
        });

        if (intersectsCircle) {
          p = bounds.getRandomPoint();
          circle = new Phaser.Geom.Circle(p.x, p.y, radius);
        }

        iterations -= 1;
      }

      c.setPosition(p.x, p.y).setAngle(Math.random() * 360);
      c.setData("circleBounds", circle);
      //this.add.graphics().fillStyle(0xff0000, 0.2).fillCircleShape(circle);

      this.add.tween({
        targets: c,
        angle: "+=360",
        duration: 20000,
        loop: -1,
        onUpdate: () => {
          if (this.constraint?.bodyB == c.body) {
            // adjust player position while rotating
            // this is adapted from the right mouse button code
            const r = c.rotation;
            const dist = this.constraint.pointB.length();

            // current player position, adjusted to match the container's position
            const pPos = new Phaser.Math.Vector2(
              this.player.x - c.x,
              this.player.y - c.y
            );

            // calculate both far end positions of the grabbable
            const p1 = new Phaser.Math.Vector2(
              dist * Math.cos(r),
              dist * Math.sin(r)
            );
            const p2 = new Phaser.Math.Vector2(
              -dist * Math.cos(r),
              -dist * Math.sin(r)
            );
            let moveTo; // we'll actually move to moveTo

            // is the mouse closer to p1 or p2? which far end?
            pPos.distance(p1) < pPos.distance(p2)
              ? (moveTo = p1)
              : (moveTo = p2);

            // stroke of genius here, I don't really know why this is correct
            const z = moveTo.x * Math.cos(r) + moveTo.y * Math.sin(r);
            this.constraint.pointB.x = z * Math.cos(r);
            this.constraint.pointB.y = z * Math.sin(r);
          }
        },
      });

      grabbables.push(c);
    }

    //this.cameras.main.setZoom(0.35);
  }

  createPlayer() {
    this.player = this.matter.add
      .image(0, gameH * 0.52, "rect", null, {
        restitution: 0.5,
        chamfer: { radius: 10 },
        density: 0.005,
        friction: 0.2,
        label: "player",
      })
      .setName("player");

    this.circle = this.add
      .arc(this.player.x, this.player.y, 12, 0, 360, false)
      .setStrokeStyle(8, 0xffb3c6, 1)
      .setClosePath(false)
      .setAngle(270);

    const arrowScale = 16;

    const arrowPoints = [
      [0, 6],
      [10, 6],
      [9, 10],
      [22, 3],
      [9, -4],
      [10, 0],
      [0, 0],
    ];

    // scale up the arrow (too lazy to hardcode it)
    arrowPoints.forEach((coord) => {
      coord[0] *= arrowScale;
      coord[1] *= arrowScale;
    });

    this.arrow = this.add
      .polygon(0, 0, arrowPoints, 0x83b0e1, 0.8)
      .setOrigin(0, 0.5)
      .setDepth(1)
      .setDisplayOrigin(0, 3 * arrowScale) // align polygon shape
      .setScale(0.1) // scaleY is [0.1, 0.2]
      .setStrokeStyle(20, 0x000000)
      .setVisible(false);
  }

  createPhysics() {
    this.matter.world.on("collisionstart", (event, a, b) => {
      // assume player is one, and other object is other
      let other;

      if (a.label != "player") {
        other = a;
      } else if (b.label != "player") {
        other = b;
      } else return; // no player involved, just return

      if (other.label != "grabbable") return;

      if (this.constraint) {
        this.matter.world.removeConstraint(this.constraint);
        this.constraint = null;
      }

      // this is a stroke of genius and I hope I can understand this later

      const bounds = new Phaser.Geom.Rectangle(
        Math.round(other.bounds.min.x),
        Math.round(other.bounds.min.y),
        Math.round(other.bounds.max.x - other.bounds.min.x),
        Math.round(other.bounds.max.y - other.bounds.min.y)
      );

      let x = this.player.x - other.gameObject.x;
      let y = this.player.y - other.gameObject.y;

      const ball = other.gameObject.getByName("ball1");

      x = Phaser.Math.Clamp(
        x,
        -bounds.width / 2 + ball.width / 2,
        bounds.width / 2 - ball.width / 2
      );

      y = Phaser.Math.Clamp(
        y,
        -bounds.height / 2 + ball.width / 2,
        bounds.height / 2 - ball.width / 2
      );

      const r = other.gameObject.rotation;

      const z = x * Math.cos(r) + y * Math.sin(r);

      const v = new Phaser.Math.Vector2(z * Math.cos(r), z * Math.sin(r));

      this.constraint = this.matter.add.constraint(
        this.player.body,
        other,
        0,
        0.05,
        {
          pointB: v,
        }
      );

      this.player.setVelocity(0, 0);
    });
  }

  createMouseControls() {
    this.cameras.main.setZoom(0.6);
    this.input.mouse.disableContextMenu();

    this.input.on("pointerdown", (p) => {
      if (p.button == 0) {
        // if we can jump, add a listener to draw the jump arrow
        if (this.canJump && this.input.listenerCount("pointermove") == 0) {
          this.input.on("pointermove", (p) => {
            if (p.getDistance() >= 10) this.arrow.setVisible(true);
            else this.arrow.setVisible(false);
          });
        }
      } else if (p.button == 2) {
        // right button down
        if (!this.constraint) return;

        // start moving the player to the edge of the grabbable
        const grabbable = this.constraint.bodyB.gameObject;
        let r = grabbable.rotation;

        const line = grabbable.getByName("line");
        const w = (line.width * line.scaleX) / 2;

        // current mouse position, adjusted to match the container's position
        const pPos = new Phaser.Math.Vector2(
          p.worldX - grabbable.x,
          p.worldY - grabbable.y
        );

        // calculate both far end positions of the grabbable
        const p1 = new Phaser.Math.Vector2(w * Math.cos(r), w * Math.sin(r));
        const p2 = new Phaser.Math.Vector2(-w * Math.cos(r), -w * Math.sin(r));
        let moveTo; // we'll actually move to moveTo

        // is the mouse closer to p1 or p2? which far end?
        pPos.distance(p1) < pPos.distance(p2) ? (moveTo = p1) : (moveTo = p2);

        // calculate the distance from player's current pos to moveTo
        const distX = Math.abs(this.constraint.pointB.x - moveTo.x);
        const distY = Math.abs(this.constraint.pointB.y - moveTo.y);

        // adjusted so we can get the true length
        const v = new Phaser.Math.Vector2(
          distX * Math.cos(r),
          distY * Math.sin(r)
        );

        // normalizes the duration to the edge
        // a distance of 160 units translates to 1 second
        const duration = (v.length() / 160) * 1000;

        // stroke of genius here, I don't really know why this is correct
        let z = moveTo.x * Math.cos(r) + moveTo.y * Math.sin(r);

        const t = this.tweens.add({
          targets: this.constraint.pointB,
          x: z * Math.cos(r), // again, don't really know about z but it works
          y: z * Math.sin(r),
          duration: duration,
          onComplete: () => {
            //this.player.setVelocity(0, 0); // no weird bouncy movement
          },
          onUpdate: () => {
            //r = grabbable.rotation; //Phaser.Math.Linear(r, grabbable.rotation, t.progress * 0.04);

            const distance = Phaser.Math.Distance.BetweenPoints(
              this.constraint.pointB,
              moveTo
            );

            const q = distance / (w * 2);

            let linear = (1 - q) * 0.05;

            if (distance > w) {
              linear = 0;
            } else {
              linear = 0.04;
            }

            t.data[0].end = Phaser.Math.Linear(
              t.data[0].end,
              z * Math.cos(grabbable.rotation),
              linear
            );
            t.data[1].end = Phaser.Math.Linear(
              t.data[1].end,
              z * Math.sin(grabbable.rotation),
              linear
            );
            //
            //r = grabbable.rotation;
          },
        });
      }
    });

    this.input.on("pointerup", (p) => this.pointerUp(p));

    // same as pointerup but if player moves cursor outside canvas
    this.input.on("pointerupoutside", (p) => this.pointerUp(p));
  }

  pointerUp(p) {
    if (p.button == 0) {
      // remove this listener no matter what,
      // even if you didn't jump
      // remove the jump arrow listener, so we can't jump, until
      // until 1) canJump is true and 2) player emits pointerdown
      if (this.input.listenerCount("pointermove") > 0)
        this.input.removeListener("pointermove");

      if (!this.arrow.visible) return;

      if (this.constraint) {
        this.matter.world.removeConstraint(this.constraint);
        this.constraint = null;
      }

      this.arrow.setVisible(false);

      const d = this.arrowVector.x;
      const a = this.arrowVector.y;

      const force = new Phaser.Math.Vector2(Math.cos(a), Math.sin(a));

      this.player.applyForce(force.scale(d));

      this.canJump = false;
      const timer = 200; //1500;

      this.time.delayedCall(timer, () => (this.canJump = true));

      this.circle.setEndAngle(0);

      this.tweens.add({
        targets: this.circle,
        endAngle: 360,
        duration: timer,
      });
    } else if (p.button == 2) {
      if (!this.constraint) return;

      this.tweens.killTweensOf(this.constraint.pointB);
      this.player.setVelocity(0, 0);
    }
  }

  startGame() {
    //this.scene.get("HUD").cameras.main.fadeIn();
    this.cameras.main.startFollow(this.player, false, 0.08, 0.08);
  }

  update() {
    this.checkIfInBounds();

    this.circle.setPosition(this.player.x, this.player.y);

    if (!this.arrow.visible) return;

    const p = this.input.activePointer.updateWorldPoint(this.cameras.main);

    this.arrowVector.x = Math.min(1, p.getDistance() / (gameW * 0.5));
    this.arrowVector.y = p.getAngle() + Math.PI;

    this.arrow
      .setPosition(
        this.player.x + 40 * Math.cos(this.arrowVector.y),
        this.player.y + 40 * Math.sin(this.arrowVector.y)
      )
      .setScale(this.arrowVector.x * 0.15 + 0.05)
      .setRotation(this.arrowVector.y);
  }

  checkIfInBounds() {
    if (this.player.y > gameH) {
      this.player.setPosition(0, gameH * 0.52);
      this.player.setVelocity(0, 0);
    }
    if (this.player.x < -gameW * 100) {
      this.player.setPosition(0, gameH * 0.52);
      this.player.setVelocity(0, 0);
    } else if (this.player.x > gameW * 100) {
      this.player.setPosition(0, gameH * 0.52);
      this.player.setVelocity(0, 0);
    }
  }

  createKeyboardControls() {
    this.keysDown = new Phaser.Structs.List();

    this.input.keyboard.on("keydown-W", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keyup-W", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keydown-UP", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keyup-UP", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.UP);
    });

    this.input.keyboard.on("keydown-S", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keyup-S", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keydown-DOWN", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keyup-DOWN", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.DOWN);
    });

    this.input.keyboard.on("keydown-A", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keyup-A", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keydown-LEFT", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keyup-LEFT", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.LEFT);
    });

    this.input.keyboard.on("keydown-D", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.RIGHT);
    });

    this.input.keyboard.on("keyup-D", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.RIGHT);
    });

    this.input.keyboard.on("keydown-RIGHT", (event) => {
      this.keysDown.add(Phaser.Math.Vector2.RIGHT);
    });

    this.input.keyboard.on("keyup-RIGHT", (event) => {
      this.keysDown.remove(Phaser.Math.Vector2.RIGHT);
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

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
  }

  updateCamera() {
    const camera = this.cameras.main;

    const x = Math.ceil((this.parent.width - this.sizer.width) * 0.5);
    const y = 0;
    const scaleX = this.sizer.width / gameW;
    const scaleY = this.sizer.height / gameH;

    // this offset was meant to move the game screen a little up
    // because it was being centered a little down when playing it on
    // my phone (iPhone 12). I'm going to remove it now because
    // I'm prioritizing a multi-platform game and the offset looks
    // weird on other platforms.

    // offset is comparing the game's height to the window's height,
    // and centering the game in (kind of) the middle of the window.
    // old line:
    //const offset = (1 + this.parent.height / this.sizer.height) / 2;
    // new line:
    const offset = this.parent.height / this.sizer.height;

    if (!camera) return;

    camera.setViewport(x, y, this.sizer.width, this.sizer.height * offset);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(camera.midPoint.x, camera.midPoint.y);
  }
}

class HUD extends Phaser.Scene {
  bounds;

  constructor() {
    super("HUD");
  }

  create() {
    this.createResolution();

    // show bounds of game while in dev
    this.bounds = this.add
      .rectangle(gameW / 2, gameH / 2, gameW, gameH)
      .setStrokeStyle(4, 0xffffff);

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.createText();
      },
    });

    this.circle = this.add
      .rectangle(0, 0, 8, 8, 0x83b0e1, 0.7)
      .setStrokeStyle(2, 0x000000, 0.7)
      .setVisible(false);

    this.input.on("pointerdown", (p) => {
      // button = 0 is left click, button = 2 is right click
      if (p.button == 2) return;

      if (!this.scene.get("Game").canJump) return;

      this.circle.setPosition(p.worldX, p.worldY).setVisible(true);
    });

    this.input.on("pointerup", (p) => {
      if (p.button == 2) return;

      this.circle.setVisible(false);
    });

    this.input.on("pointerupoutside", (p) => {
      if (p.button == 2) return;

      this.circle.setVisible(false);
    });
  }

  createText() {
    this.add.gameText(gameW * 0.5, 0, "infiniclimb", 8).setOrigin(0.5, 0);

    this.add.gameText(gameW, gameH, VERSION).setOrigin(1, 1);

    const fpsText = this.add.gameText(0, gameH).setOrigin(0, 1);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callbackScope: this,
      callback: () => {
        fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`);
      },
    });
  }

  createResolution() {
    // I don't know how this code works but it's magic. I also stole it from here:
    // https://labs.phaser.io/view.html?src=src/scalemanager\mobile%20game%20example.js
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    this.parent = new Phaser.Structs.Size(width, height);

    this.sizer = new Phaser.Structs.Size(
      gameW,
      gameH,
      Phaser.Structs.Size.FIT,
      this.parent
    );

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
    this.cameras.main.centerOn(gameW / 2, gameH / 2);

    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize) {
    const width = gameSize.width;
    const height = gameSize.height;

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();
  }

  updateCamera() {
    const camera = this.cameras.main;

    const x = Math.ceil((this.parent.width - this.sizer.width) * 0.5);
    const y = 0;
    const scaleX = this.sizer.width / gameW;
    const scaleY = this.sizer.height / gameH;

    if (!camera) return;
    // camera.setViewport(x, y, this.sizer.width, this.parent.height);
    //camera.setViewport(0, 0, window.innerWidth, window.innerHeight);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(camera.midPoint.x, camera.midPoint.y);
  }
}

// game scale configuration also stolen from
// https://labs.phaser.io/100.html?src=src\scalemanager\mobile%20game%20example.js
const config = {
  type: Phaser.AUTO,
  backgroundColor: 0x000000,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: gameW,
    height: gameH,
  },
  scene: [Background, Game, HUD],
  physics: {
    default: "matter",
    matter: {
      gravity: {
        x: 0,
        y: 1,
      },
      debug: DEV_MODE,
      //fps: 300,
    },
  },
  title: VERSION,
  autoFocus: true,
};

class GameText extends Phaser.GameObjects.Text {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    text = "",
    size = 0,
    width = null,
    callback = null // provided only for buttons
  ) {
    super(scene, x, y, text, {
      font: `${size * 8 + 24}px`,
      padding: gameW * 0.005,
      lineSpacing: 32,
      fill: "#fff",
      align: "left",
      wordWrap: { width: width ? width : gameW, useAdvancedWrap: true },
      shadow: {
        offsetX: Math.max(1.5, 0.3 * (size + 1)),
        offsetY: Math.max(1.5, 0.3 * (size + 1)),
        color: "#9cadce",
        blur: 1,
        stroke: true,
        fill: true,
      },
    });

    this.setOrigin(0, 0).setFontFamily("Josefin Sans");

    // if callback is given, assume it's a button and add callback.
    // fine-tuned this code so button only clicks if player
    // emits both pointerdown and pointerup events on it
    if (callback) {
      this.setInteractive()
        .on("pointerover", function (pointer) {
          this.setTint(COLORS.highlightColor);
        })
        .on("pointerout", function (pointer) {
          this.setTint(COLORS.white);
          //this.setShadow(0, 0, "#99c1de", 0, true, true);
          this.off("pointerup", callback, scene);
        })
        .on("pointerdown", function () {
          this.setTint(COLORS.clickColor);
          if (this.listenerCount("pointerup") < 2) {
            this.on("pointerup", callback, scene);
          }
        })
        .on("pointerup", function () {
          this.setTint(COLORS.highlightColor);
          // this.setShadow(0, 0, "#fcf5c7", 4, false, true);
        });
    }
  }

  preUpdate(delta, time) {}
}

class GameButton extends Phaser.GameObjects.Image {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    key,
    callback
  ) {
    super(scene);

    const cB = scene.add
      .image(x, y, key)
      .setScale(0.75)
      .setTint(COLORS.buttonColor);

    // fx slow down phones, so only allow on desktop
    /*if (scene.sys.game.device.os.desktop) {
      cB.preFX.setPadding(32);
      cB.preFX.addShadow(-2, -2, 0.06, 0.75, 0x000000, 4, 0.8);
    }*/

    cB.setInteractive()
      .on("pointerover", function () {
        this.setTint(COLORS.highlightColor).setScale(0.82);
        scene.scene.get("MainUI").playSound("pointerover");
      })
      .on("pointerout", function () {
        this.setTint(COLORS.buttonColor).setScale(0.75);
      })
      .on("pointerdown", callback, scene)
      .on("pointerup", function () {
        scene.scene.get("MainUI").playSound("pointerup");
      });

    return cB;
  }
}

const game = new Phaser.Game(config);
