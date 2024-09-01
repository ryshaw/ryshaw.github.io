const path = window.location.pathname;

let { GameText, GameButton } = await import(`${path}customObjects.js`);
let { VERSION, gameW, gameH, DEV_MODE, MAX_LEVEL, FONTS, COLORS } =
  await import(`${path}constants.js`);

export class Game extends Phaser.Scene {
  keysDown; // track the keys being pressed in order
  graphics;
  player;
  bounds; // big rectangle that is the "canvas"
  grid; // tile grid for the canvas
  gridPos; // what grid position is player in
  gridX; // how many tiles is grid in X direction
  gridY; // how many tiles is grid in Y direction
  canMove; // timer that controls how fast player can go across tiles
  edgePoints; // all points on drawn edges that player can walk on and connect to
  areaFilled = 0; // percentage of area that has been drawn in
  totalDrawingArea; // the area of the grid minus the perimeter which is already filled in, so don't count the perimeter
  areaText;
  pointerDown; // is mouse or touch input down
  gameOver; // true if game win or game over, false during normal gameplay
  timer; // if counts down to zero, game over
  timeInterval; // for handling the countdown
  timeText;
  circles; // physics group with the circle enemies
  squares; // physics group with the square enemies
  powerups; // physics group with powerup items
  level; // the level of the game, contained in localStorage
  levelSelect; // in dev mode, type number of level and hit enter and it'll load that level
  levelSelectText;
  paused; // see the method createPause for why we need a separate variable for this
  speedScale; // affects movement speed. 1 normally, higher when powered up
  fastForwardPopup; // to show the player how much time is left for powerup
  rewindPopup; // same as above but for rewind
  darkWheel; // color wheel. saturation = 0.4
  lightWheel; // color wheel, saturation = 0.1
  cheatMode; // true if on, false if off
  drawPath; // current path of white squares that the player is drawing
  dpadDown; // if gamepad is enabled, track which buttons are down

  constructor() {
    super("Game");
  }

  preload() {
    // load google's library for the various fonts we want to use
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.setPath("assets");
    this.load.image("rewind", "rewind.png");
    this.load.image("fastForward", "fastForward.png");
    this.load.image("target", "target.png");
  }

  create(data) {
    this.scene.get("MainUI").playSound("levelstart");
    this.level = data.level; // level is any number from 0 (tutorial) to 26 (game complete)
    this.level = this.level / 1; // make sure it's a number

    this.createResolution();
    this.createEvents();

    // if game fully beaten, just load win stuff
    if (this.level > MAX_LEVEL) {
      this.displayWinScreen();
      return;
    }

    // otherwise, create game
    this.createLayout();
    this.createPlayer();
    this.createPlayerControls();
    this.createMouseControls();
    this.createDpadControls(); // dpad handled here, sticks in getInputDirection
    this.createPhysics();

    this.cheatMode = localStorage.getItem("cheat") == "on";

    const numCircles = Math.floor(Math.sqrt(2.8 * this.level));
    const numSquares = Math.floor(this.level * (0.03 * this.level + 0.45));
    this.createCircles(numCircles);
    this.createSquares(numSquares);
    this.createPowerups();

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.loadGameText();
        if (DEV_MODE) this.createLevelSelectControls();

        this.startGame();
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

    this.scale.on("resize", this.resize, this);
  }

  createLayout() {
    this.graphics = this.add.graphics();

    this.bounds = this.add.rectangle(
      gameW * 0.5,
      gameH * 0.49,
      gameW * 0.85,
      gameH * 0.75,
      0xffffff,
      0 //0.04
    );

    this.grid = [];
    const start = this.bounds.getTopLeft();

    const aspectRatio = this.bounds.width / this.bounds.height;

    this.gridY = 83;

    if (!this.sys.game.device.os.desktop) {
      this.gridY = 51;
    }

    this.gridX = Math.round(this.gridY * aspectRatio);
    if (this.gridX % 2 == 0) this.gridX++; // must be odd

    const perimeter = 2 * (this.gridX + this.gridY) - 4;

    // minus four to account for the four corner tiles,
    // so they won't be counted twice

    // this is the total area the player is drawing in
    // since the bounds of the rectangle are already filled in
    this.totalDrawingArea = this.gridX * this.gridY - perimeter;

    const w = this.bounds.width / this.gridX;
    const h = this.bounds.height / this.gridY;

    // w and h should mathematically be equal
    // since we adjusted gridX to gridY via the aspect ratio

    for (let i = 0; i < this.gridX; i++) {
      this.grid[i] = [];

      for (let j = 0; j < this.gridY; j++) {
        const r = this.add
          .rectangle(
            start.x + w / 2 + i * w,
            start.y + h / 2 + j * h,
            w,
            h,
            0xffff00,
            0
          )
          .setFillStyle(COLORS.fillColor, 0)
          .setData("counted", false)
          .setData("filled", false);

        this.grid[i][j] = r;

        // fill up edges
        if (i == 0 || i == this.gridX - 1 || j == 0 || j == this.gridY - 1) {
          this.grid[i][j].setFillStyle(COLORS.fillColor, 1);
          this.physics.add.existing(this.grid[i][j], true);
          this.grid[i][j].body.immovable = true;
        }
      }
    }

    // update edge points: filled-in tiles that are facing undrawn area only
    this.edgePoints = new Phaser.Structs.List();

    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const p = new Phaser.Math.Vector2(i, j);
        const t = this.grid[i][j];

        // player can only walk on edge points
        // edge points are the filled points next to unfilled area
        for (let angle = 0; angle < 360; angle += 45) {
          let r = Phaser.Math.DegToRad(angle);
          let v = Phaser.Math.Vector2.UP.clone().rotate(r);
          v.x = Math.round(v.x);
          v.y = Math.round(v.y);
          v.add(p);

          if (this.checkInBounds(v) && !this.grid[v.x][v.y].body && t.body) {
            t.setFillStyle(COLORS.fillColor, 1);
            this.edgePoints.add(p);
          }
        }
      }
    }
  }

  createPlayer() {
    // create simple rectangle texture for player
    const rectangleDrawer = this.make.graphics(); // disposable graphics obj
    const playerW = Math.ceil(this.grid[0][0].width * 1.2); // match tile width
    rectangleDrawer.lineStyle(4, 0xfffbfc, 1);
    rectangleDrawer.strokeRect(0, 0, playerW, playerW);
    rectangleDrawer.generateTexture("rect", playerW, playerW);
    rectangleDrawer.destroy();
    const centerX = Math.round(this.gridX / 2);

    this.player = this.physics.add
      .sprite(this.grid[centerX][0].x, this.grid[0][0].y, "rect")
      .setName("player");

    this.player.body.collideWorldBounds = true;
    this.player.body.onWorldBounds = true;
    this.gridPos = new Phaser.Math.Vector2(centerX, 0);
    this.canMove = true;
    this.speedScale = 1;
    this.drawing = false;
    this.drawPath = [];
  }

  createCircles(num) {
    const offset = this.grid[0][0].width * 2; // so circles don't start outside bounds

    const bounds = new Phaser.Geom.Rectangle(
      this.bounds.getTopLeft().x + offset,
      this.bounds.getTopLeft().y + offset,
      this.bounds.width - offset * 2,
      this.bounds.height - offset * 2
    );

    const minMaxSpeed = [20 + (this.level - 1) * 5, 100 + (this.level - 1) * 5];

    for (let i = 0; i < num; i++) {
      // assign a random point for circle to appear
      const p = bounds.getRandomPoint();

      const circle = this.add
        .arc(p.x, p.y, Phaser.Math.Between(6, 12))
        .setFillStyle(Phaser.Display.Color.RandomRGB(150, 255).color)
        .setName("circle");

      this.circles.add(circle);

      circle.body
        .setVelocity(
          Phaser.Math.Between(minMaxSpeed[0], minMaxSpeed[1]),
          Phaser.Math.Between(minMaxSpeed[0], minMaxSpeed[1])
        )
        .setBounce(1)
        .setCollideWorldBounds(true);
      circle.body.isCircle = true;
      circle.body.onWorldBounds = true;

      // go in random direction
      if (Math.random() > 0.5) circle.body.velocity.x *= -1;
      if (Math.random() > 0.5) circle.body.velocity.y *= -1;
    }
  }

  createSquares(num) {
    const size = this.grid[0][0].width * 1.05;

    const minMaxTime = [150 - (this.level - 1) * 5, 200 - (this.level - 1) * 5];

    for (let i = 0; i < num; i++) {
      // create moving squares along the border
      let p = this.edgePoints.getRandom().clone();

      // ensure it doesn't spawn too close to player
      while (p.y == 0) p = this.edgePoints.getRandom().clone();

      const tile = this.grid[p.x][p.y];

      const square = this.add
        .rectangle(
          tile.x,
          tile.y,
          size,
          size,
          Phaser.Display.Color.RandomRGB(150, 255).color
        )
        .setName("square");

      this.squares.add(square);

      const directions = new Phaser.Structs.List(); // what directions can we move in?

      for (let angle = 0; angle < 360; angle += 90) {
        let r = Phaser.Math.DegToRad(angle);
        let v = Phaser.Math.Vector2.UP.clone().rotate(r);
        v.x = Math.round(v.x);
        v.y = Math.round(v.y);

        this.edgePoints.list.forEach((edge) => {
          if (v.clone().add(p).x == edge.x && v.clone().add(p).y == edge.y) {
            directions.add(v); // we can move in this direction
          }
        });
      }

      let dir = directions.getRandom();

      // how fast every interval is. lower is faster
      const time = Phaser.Math.Between(minMaxTime[0], minMaxTime[1]);

      square.interval = this.time.addEvent({
        delay: time,
        callbackScope: this,
        loop: true,
        callback: () => {
          // if ded, stop its update loop
          if (!square.active) square.interval.remove();

          // if game is paused, don't do anything
          if (this.paused) return;

          // if not in grid or edge anymore, change direction
          if (
            !this.checkInGrid(p.clone().add(dir)) ||
            !this.checkIfEdge(p.clone().add(dir))
          ) {
            const left = dir.clone().rotate(Phaser.Math.DegToRad(-90));
            const right = dir.clone().rotate(Phaser.Math.DegToRad(90));
            left.x = Math.round(left.x);
            left.y = Math.round(left.y);
            right.x = Math.round(right.x);
            right.y = Math.round(right.y);

            this.edgePoints.list.forEach((edge) => {
              if (
                p.clone().add(left).x == edge.x &&
                p.clone().add(left).y == edge.y
              ) {
                dir = left;
              } else if (
                p.clone().add(right).x == edge.x &&
                p.clone().add(right).y == edge.y
              ) {
                dir = right;
              }
            });
          }

          // move to next tile
          p.add(dir);

          if (this.grid[p.x]) {
            // okay...
            const nextTile = this.grid[p.x][p.y];

            if (nextTile) {
              // sometimes there's no tile if player just cut them off
              this.tweens.add({
                targets: square,
                x: nextTile.x,
                y: nextTile.y,
                duration: time * (1 / square.interval.timeScale),
              });
            }
          }
        },
      });
    }
  }

  createPowerups() {
    this.darkWheel = Phaser.Display.Color.HSVColorWheel(0.4); // length of list is 360
    this.lightWheel = Phaser.Display.Color.HSVColorWheel(0.1);

    const arc = this.add
      .arc(0, 0, 48, 0, 360, false)
      .setStrokeStyle(14, COLORS.white)
      .setClosePath(false)
      .setName("arc");

    const image = this.add
      .image(2, 0, "fastForward")
      .setScale(0.8)
      .setName("image");

    this.fastForwardPopup = this.add
      .container(gameW * 0.67, gameH - 64, [arc, image])
      .setAlpha(0);

    const arc2 = this.add
      .arc(0, 0, 48, 0, 360, false)
      .setStrokeStyle(14, COLORS.white)
      .setClosePath(false)
      .setName("arc");

    const image2 = this.add
      .image(-8, 0, "rewind")
      .setScale(0.8)
      .setName("image");

    this.rewindPopup = this.add
      .container(gameW * 0.31, gameH - 64, [arc2, image2])
      .setAlpha(0);

    let t = 5000;
    if (this.cheatMode) t /= 5;

    this.time.delayedCall(t, this.generatePowerup, undefined, this);
  }

  generatePowerup() {
    if (this.gameOver) return;

    let p = this.bounds.getBounds().getRandomPoint();

    // check two things before inserting a powerup in a location:
    // 1. is it too close to a wall? check for static bodies in a radius of 32
    // (100x100 is powerup resolution)
    // 2. is it in a filled zone already? check filled data of tile
    let staticBodies = this.physics.overlapCirc(p.x, p.y, 32, false, true);
    let v = this.convertWorldToGrid(p.x, p.y);

    let limit = 1000; // so we don't run this loop forever
    // if the play area is so narrow that the overlapping circle isn't valid at all,
    // the while loop could go on forever. limit fixes that bug
    while (
      limit > 0 &&
      (staticBodies.length > 0 || this.grid[v.x][v.y].getData("filled"))
    ) {
      limit--;
      // it didn't pass the two questions, so try again
      p = this.bounds.getBounds().getRandomPoint();
      staticBodies = this.physics.overlapCirc(p.x, p.y, 32, false, true);
      v = this.convertWorldToGrid(p.x, p.y);
    }

    if (limit <= 0) return; // no valid area to generate powerup so just give up.

    this.scene.get("MainUI").playSound("popup");
    let powerup;

    switch (Phaser.Math.Between(1, 3)) {
      case 1:
        powerup = this.physics.add.image(p.x, p.y, "fastForward");
        break;
      case 2:
        powerup = this.physics.add.image(p.x, p.y, "target");
        break;
      case 3:
        powerup = this.physics.add.image(p.x, p.y, "rewind");
        break;
    }

    this.powerups.add(powerup);

    powerup
      .setScale(0.1)
      .setTint(COLORS.white)
      .setDepth(-1)
      .setName(powerup.texture.key)
      .setCircle(
        powerup.width * 0.4,
        powerup.width * 0.1,
        powerup.width * 0.12
      );

    const start = Phaser.Math.Between(0, 359 * 8); // 359 * 8 taken from below tween

    this.tweens.add({
      targets: powerup,
      scale: 0.4,
      duration: 200,
      onStart: () => {
        // set the color properly
        const i = Math.floor((start % (359 * 8)) / 8);
        powerup.setTint(this.darkWheel[i].color);
      },
      onComplete: () => {
        const tween = this.tweens.add({
          targets: powerup,
          scale: 0.5,
          duration: 800,
          loop: -1,
          yoyo: true,
          ease: "sine.inout",
          onUpdate: () => {
            // do some math shenanigans to loop between 0 and 359
            // in a pretty slow manner using modulus and division
            const i = Math.floor(
              ((tween.totalElapsed + start) % (359 * 8)) / 8
            );
            powerup.setTint(this.darkWheel[i].color);
          },
        });
      },
    });

    this.tweens.add({
      targets: powerup,
      alpha: 0,
      duration: 100,
      repeat: 9,
      repeatDelay: 200,
      yoyo: true,
      delay: 8000,
      onComplete: () => {
        this.tweens.add({
          targets: powerup,
          alpha: 0,
          delay: 800,
          duration: 200,
          onComplete: () => this.powerups.remove(powerup, true, true),
        });
      },
    });

    let t = Phaser.Math.Between(6000, 10000);
    if (this.cheatMode) t /= 5;
    this.time.delayedCall(t, this.generatePowerup, undefined, this);
  }

  createPhysics() {
    this.physics.world.setBounds(
      this.bounds.getTopLeft().x - this.player.width / 2,
      this.bounds.getTopLeft().y - this.player.width / 2,
      this.bounds.width + this.player.width,
      this.bounds.height + this.player.width
    );

    // in case a circle goes too fast and flies out of world bounds
    this.physics.world.on("worldbounds", (body) => {
      if (body.gameObject.name == "circle") {
        this.circles.remove(body.gameObject, true, true);
      }
    });

    this.circles = this.physics.add.group();
    this.squares = this.physics.add.group();
    this.powerups = this.physics.add.group();

    for (let i = 0; i < this.gridX; i++) {
      this.physics.add.collider(
        this.circles,
        this.grid[i],
        this.circleHitEdge,
        undefined,
        this
      );
    }

    this.physics.add.collider(this.circles, this.circles);

    this.physics.add.collider(
      this.squares,
      this.player,
      this.squareHitPlayer,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.powerups,
      this.player,
      this.playerHitPowerup,
      undefined,
      this
    );
  }

  playerHitPowerup(player, powerup) {
    this.scene.get("MainUI").playSound(powerup.name);
    powerup.body.setEnable(false);

    this.tweens.killTweensOf(powerup);
    this.tweens.add({
      targets: powerup,
      scale: powerup.scale + 0.8,
      alpha: 0,
      duration: 200,
      onComplete: () => this.powerups.remove(powerup, true, true),
    });

    switch (powerup.name) {
      case "fastForward":
        this.activateFastForward();
        break;
      case "target":
        this.activateTarget(powerup);
        break;
      case "rewind":
        this.activateRewind();
        break;
    }
  }

  activateFastForward() {
    this.speedScale = 2;

    this.fastForwardPopup.setScale(1);
    const arc = this.fastForwardPopup.getByName("arc").setEndAngle(360);
    const image = this.fastForwardPopup.getByName("image");

    // if the tween's already running, remove it so we can reset the tween back to full
    // this means the player is collecting multiple powerups one after the other
    this.tweens.killTweensOf([arc, this.fastForwardPopup]);
    const startIndex = Phaser.Math.Between(0, 359);

    this.tweens.chain({
      tweens: [
        {
          targets: this.fastForwardPopup,
          alpha: 1,
          duration: 100,
          onStart: () => {
            const i = Math.floor(arc.endAngle + startIndex) % 360;
            const color = this.lightWheel[i].color;
            arc.setStrokeStyle(14, color);
            image.setTint(color);
          },
        },
        {
          targets: arc,
          endAngle: 0,
          duration: 3000,
          onUpdate: () => {
            const i = Math.floor(arc.endAngle + startIndex) % 360;
            const color = this.lightWheel[i].color;
            arc.setStrokeStyle(14, color);
            image.setTint(color);
          },
        },
        {
          targets: this.fastForwardPopup,
          alpha: 0,
          scale: 1.5,
          duration: 100,
        },
      ],
      onComplete: () => (this.speedScale = 1),
    });
  }

  activateTarget(powerup) {
    const a = 0.3;
    const c = this.add
      .circle(powerup.x, powerup.y, gameW * 0.4)
      .setStrokeStyle(10, COLORS.white)
      .setFillStyle(COLORS.white, a)
      .setScale(0);

    const n = Phaser.Math.Between(0, 359);

    this.tweens.chain({
      tweens: [
        {
          targets: c,
          scale: 1,
          duration: 300,
          ease: "sine.inout",
          onStart: () => {
            c.setStrokeStyle(10, this.lightWheel[n].color).setFillStyle(
              this.lightWheel[n].color,
              a
            );
          },
          onUpdate: () => {
            const i = (Math.floor(c.scale * 359) + n) % 360;
            c.setStrokeStyle(14, this.lightWheel[i].color).setFillStyle(
              this.lightWheel[i].color,
              a
            );
          },
          onComplete: () => {
            this.physics.overlapCirc(c.x, c.y, c.radius).forEach((body) => {
              const obj = body.gameObject;

              // obj.body test because could be destroyed already!
              if (obj.name == "circle" && obj.body) {
                this.scene.get("MainUI").playSound("destroy");
                obj.body.setEnable(false);

                this.tweens.add({
                  targets: obj,
                  scale: 2,
                  alpha: 0,
                  duration: 300,
                  onComplete: () => this.circles.remove(obj, true, true),
                });
              } else if (obj.name == "square" && obj.body) {
                this.scene.get("MainUI").playSound("destroy");
                obj.interval.remove();
                obj.body.setEnable(false);

                this.tweens.add({
                  targets: obj,
                  scale: 2,
                  alpha: 0,
                  duration: 300,
                  angle: 180,
                  onComplete: () => this.squares.remove(obj, true, true),
                });
              }
            });
          },
        },
        {
          targets: c,
          scale: 0,
          duration: 300,
          ease: "sine.inout",
          delay: 600,
          onUpdate: () => {
            const i = (Math.floor(c.scale * 359) + n) % 360;
            c.setStrokeStyle(14, this.lightWheel[i].color).setFillStyle(
              this.lightWheel[i].color,
              a
            );
          },
          onComplete: () => c.destroy(),
        },
      ],
    });
  }

  activateRewind() {
    this.squares.getChildren().forEach((s) => (s.interval.paused = true));
    this.circles.getChildren().forEach((c) => (c.body.moves = false));

    this.rewindPopup.setScale(1);
    const arc = this.rewindPopup.getByName("arc").setEndAngle(360);
    const image = this.rewindPopup.getByName("image");

    // if the tween's already running, remove it so we can reset the tween back to full
    // this means the player is collecting multiple powerups one after the other
    this.tweens.killTweensOf([arc, this.rewindPopup]);
    const startIndex = Phaser.Math.Between(0, 359);

    this.tweens.chain({
      tweens: [
        {
          targets: this.rewindPopup,
          alpha: 1,
          duration: 100,
          onStart: () => {
            const i = Math.floor(arc.endAngle + startIndex) % 360;
            const color = this.lightWheel[i].color;
            arc.setStrokeStyle(14, color);
            image.setTint(color);
          },
        },
        {
          targets: arc,
          endAngle: 0,
          duration: 3000,
          onUpdate: () => {
            const i = Math.floor(arc.endAngle + startIndex) % 360;
            const color = this.lightWheel[i].color;
            arc.setStrokeStyle(14, color);
            image.setTint(color);
          },
        },
        {
          targets: this.rewindPopup,
          alpha: 0,
          scale: 1.5,
          duration: 100,
        },
      ],
      onComplete: () => {
        this.circles.getChildren().forEach((c) => (c.body.moves = true));
        this.squares.getChildren().forEach((s) => (s.interval.paused = false));
      },
    });
  }

  loadGameText() {
    const levelNum = new GameText(
      this,
      gameW * 0.15,
      gameH - 12,
      `${this.level}`,
      "g",
      "c"
    ).setOrigin(0.5, 1);

    const levelT = new GameText(
      this,
      levelNum.getTopCenter().x,
      levelNum.getTopCenter().y + 8,
      "level",
      "s",
      "c"
    ).setOrigin(0.5, 1);

    let count = 0; // count how many tiles we've filled

    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const p = new Phaser.Math.Vector2(i, j);
        const t = this.grid[i][j];
        if ((t.body || t.getData("filled")) && this.checkInBounds(p)) count++; // count how many tiles we've filled
      }
    }

    // display how much area we've covered
    this.areaFilled = Math.round((100 * count) / this.totalDrawingArea) / 100;

    this.areaText = new GameText(
      this,
      gameW * 0.85,
      gameH - 12,
      `${Math.round(this.areaFilled * 100)}%`,
      "g",
      "c"
    ).setOrigin(0.5, 1);

    const areaT = new GameText(
      this,
      this.areaText.getTopCenter().x,
      this.areaText.getTopCenter().y + 8,
      "area",
      "s",
      "c"
    ).setOrigin(0.5, 1);

    this.timeText = new GameText(
      this,
      gameW * 0.5,
      gameH - 12,
      `${this.timer}`,
      "g",
      "c"
    )
      .setOrigin(0.5, 1)
      .setVisible(false);

    const timeT = new GameText(
      this,
      this.timeText.getTopCenter().x,
      this.timeText.getTopCenter().y + 8,
      "timer",
      "s",
      "c"
    ).setOrigin(0.5, 1);

    if (DEV_MODE) {
      const fpsText = new GameText(
        this,
        0,
        0,
        `${Math.round(this.sys.game.loop.actualFps)}`,
        "l",
        "c"
      ).setOrigin(0, 0);

      const interval = this.time.addEvent({
        delay: 1000,
        loop: true,
        callbackScope: this,
        callback: () => {
          if (fpsText.displayList) {
            // if still displaying (game not restarted yet)
            fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`);
          } else interval.remove(); // otherwise clear interval
        },
      });
    }

    this.levelSelectText = new GameText(this, gameW, 0, "", "l").setOrigin(
      1,
      0
    );
  }

  startGame() {
    // always clear the interval
    // just to make sure it's cleared from a previous level or game sesh
    if (this.timeInterval) this.timeInterval.remove();
    this.gameOver = false;

    // every two levels, up the second count by 5
    this.timer = 40 + Math.floor(this.level / 3) * 5;
    if (DEV_MODE || this.level == 0) this.timer = 99;

    this.timeText.setVisible(true).setText(`${this.timer}`);

    this.timeInterval = this.time.addEvent({
      delay: 1000,
      callbackScope: this,
      loop: true,
      callback: () => {
        if (this.gameOver) this.timeInterval.remove();

        if (this.paused || this.gameOver) return; // if game is paused or over, don't do anything

        this.timer--;
        this.timeText.setText(`${this.timer}`);

        if (this.timer <= 0) {
          this.timeInterval.remove();
          this.gameLose("time");
        } else if (this.timer <= 9) {
          this.timeText.setTint(0xc1121f); // time's boutta run out
        }
      },
    });
  }

  resize(gameSize) {
    // don't resize if scene stopped. this fixes a bug
    if (!this.scene.isActive("Game") && !this.scene.isPaused("Game")) return;

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

    camera.setViewport(x, y, this.sizer.width, this.sizer.height * offset);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(gameW / 2, gameH / 2);
  }

  createPlayerControls() {
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

  createMouseControls() {
    this.pointerDown = false;
    this.input.on("pointerdown", () => (this.pointerDown = true));
    this.input.on("pointerup", () => (this.pointerDown = false));
  }

  createDpadControls() {
    this.dpadDown = new Phaser.Structs.List();

    // for gamepad
    this.input.gamepad.on("down", (pad, button, value) => {
      /* in typical gameplay, this would be called when a gamepad button
      is pressed, but the "down" event is also emitted by the sticks
      in the update() method of MainUI so that the event gets caught 
      by the "down" listener in gameWin and gameLose, so it will progress
      the level without requiring the player to press a button. */
      if (!button) return; // sometimes this will get called with no button

      // using Xbox wireless controller to calibrate this
      switch (button.index) {
        case 12: // D-pad up
          this.dpadDown.add(Phaser.Math.Vector2.UP);
          break;
        case 13: // D-pad down
          this.dpadDown.add(Phaser.Math.Vector2.DOWN);
          break;
        case 14: // D-pad left
          this.dpadDown.add(Phaser.Math.Vector2.LEFT);
          break;
        case 15: // D-pad right
          this.dpadDown.add(Phaser.Math.Vector2.RIGHT);
          break;

        default:
          break;
      }
    });

    this.input.gamepad.on("up", (pad, button, value) => {
      // using Xbox wireless controller to calibrate this
      switch (button.index) {
        case 12: // D-pad up
          this.dpadDown.remove(Phaser.Math.Vector2.UP);
          break;
        case 13: // D-pad down
          this.dpadDown.remove(Phaser.Math.Vector2.DOWN);
          break;
        case 14: // D-pad left
          this.dpadDown.remove(Phaser.Math.Vector2.LEFT);
          break;
        case 15: // D-pad right
          this.dpadDown.remove(Phaser.Math.Vector2.RIGHT);
          break;

        default:
          break;
      }
    });
  }

  createLevelSelectControls() {
    this.levelSelect = "";
    this.input.keyboard.on("keydown", (event) => {
      if (event.code.includes("Digit")) {
        this.levelSelect += event.key;
      } else if (event.code.includes("Backspace")) {
        this.levelSelect = this.levelSelect.substr(
          0,
          this.levelSelect.length - 1
        );
      } else if (event.code.includes("Enter")) {
        if (this.levelSelect / 1 <= MAX_LEVEL && this.levelSelect / 1 > 0) {
          this.level = this.levelSelect / 1;
          localStorage.setItem("level", this.level);
          this.gameOver = true;
          this.restartGame();
          return;
        }
        this.levelSelect = "";
      }

      this.levelSelectText.text = this.levelSelect;
    });
  }

  createEvents() {
    /* phaser has isActive(scene) or isPaused(scene) to check whether a scene
    is paused or not. however, that information is not immediately updated if
    the user clicks away from the page. we have intervals that we run in the game 
    (the timer and the squares) and they will keep running if the user clicks
    onto a different tab if we use isActive() or isPaused() as our check.
    so, instead, we have a variable called paused that updates immediately
    upon blur and resume, so all timers use this variable to check if they
    should still be running or not. */
    this.paused = false;

    this.events.on("pause", () => (this.paused = true));
    this.events.on("resume", () => (this.paused = false));
  }

  restartGame() {
    /*this.children.getAll().forEach((object) => {
      object.destroy();
    });
    this.input.removeAllListeners();
    this.input.keyboard.removeAllListeners();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.sound.stopAll();
    this.sound.removeAll();
    this.anims.resumeAll();
    this.physics.resume();
    this.create();*/
    this.scene.restart({ level: this.level });
  }

  update() {
    if (this.gameOver) return;

    this.updatePlayerMovement();
  }

  updatePlayerMovement() {
    // player movement dictated by last key held down or touch input
    if (!this.canMove) return; // don't move between moves

    // check keyboard input first then touch input
    let direction = this.getInputDirection();
    if (!direction) return; // don't move if no input

    // grab the player's next intended position, two tile movement
    const nextPos = this.gridPos.clone().add(direction.clone().scale(2));

    // if that position is out of bounds, don't move
    if (
      nextPos.x < 0 ||
      nextPos.x > this.gridX - 1 ||
      nextPos.y < 0 ||
      nextPos.y > this.gridY - 1
    )
      return;

    // grab the player's intended next tile
    const nextTile = this.grid[nextPos.x][nextPos.y];

    // must also check that the midpoint (one tile forward) is an edge
    const midPos = this.gridPos.clone().add(direction.clone());
    const mid = this.grid[midPos.x][midPos.y];

    // check if we're going to an edge (player is allowed to walk on edges)
    let edge = false;
    let midEdge = false;
    this.edgePoints.list.forEach((p) => {
      if (nextPos.x == p.x && nextPos.y == p.y) edge = true;
      if (midPos.x == p.x && midPos.y == p.y) midEdge = true;
    });

    // player can also "walk back" on the path now, in Snip It 1.1
    const onPath = this.drawPath.includes(nextTile);
    const isFilled = nextTile.getData("filled") || nextTile.body?.enable;

    // player is not allowed to move onto any filled area that isn't an edge
    if (isFilled && !edge && !onPath) return;

    // check midpoint as well
    if (mid.getData("filled") && !midEdge) return;

    // all checks pass, move the player
    this.movePlayer(this.gridPos, nextPos, edge);
  }

  getInputDirection() {
    // check input in this order: keyboard, then mouse, then controller
    // return a vector that's up, down, left, or right, and move player

    if (this.keysDown.last) return this.keysDown.last;
    else if (this.pointerDown) {
      // I'm using touch controls!
      const p1 = this.input.activePointer.positionToCamera(this.cameras.main);
      const p0 = new Phaser.Math.Vector2(this.player.x, this.player.y);
      const angle = Phaser.Math.RadToDeg(p1.subtract(p0).angle());

      if (p1.length() < this.grid[0][0].width * 1.2) return; // too short of a distance to move

      let direction = Phaser.Math.Vector2.UP;

      if (angle >= 315 || angle < 45) {
        direction = Phaser.Math.Vector2.RIGHT;
      } else if (angle >= 45 && angle < 135) {
        direction = Phaser.Math.Vector2.DOWN;
      } else if (angle >= 135 && angle < 225) {
        direction = Phaser.Math.Vector2.LEFT;
      }

      return direction;
    } else if (this.input.gamepad.total > 0) {
      // controller is connected!

      // return any dpad direction first, if dpad is being pressed
      if (this.dpadDown.last) return this.dpadDown.last;

      // check left stick first, if no left stick input, check right stick
      let stick = this.input.gamepad.getPad(0).leftStick;

      // go in whatever direction the stick is pointing the most
      if (Math.abs(stick.x) > Math.abs(stick.y)) stick.y = 0;
      else stick.x = 0;

      stick.x = Math.round(stick.x);
      stick.y = Math.round(stick.y);

      // return left stick if there's an input
      if (stick.x != 0 || stick.y != 0) return stick;

      // now check right stick since left stick had no movement
      stick = this.input.gamepad.getPad(0).rightStick;

      // go in whatever direction the stick is pointing the most
      if (Math.abs(stick.x) > Math.abs(stick.y)) stick.y = 0;
      else stick.x = 0;

      stick.x = Math.round(stick.x);
      stick.y = Math.round(stick.y);

      // if right stick has movement, return right stick
      if (stick.x != 0 || stick.y != 0) return stick;
      // otherwise, return nothing
      else return;
    } else return; // don't move if no input detected
  }

  movePlayer(fromPos, toPos, toEdge) {
    this.scene.get("MainUI").playSound("drawing");

    const from = this.grid[fromPos.x][fromPos.y];
    const midPos = new Phaser.Math.Vector2();
    midPos.x = (fromPos.x + toPos.x) / 2;
    midPos.y = (fromPos.y + toPos.y) / 2;
    const mid = this.grid[midPos.x][midPos.y];
    const to = this.grid[toPos.x][toPos.y];

    let midEdge = false;
    let fromEdge = false;
    this.edgePoints.list.forEach((p) => {
      if (midPos.x == p.x && midPos.y == p.y) {
        midEdge = true;
      }
      if (fromPos.x == p.x && fromPos.y == p.y) {
        fromEdge = true;
      }
    });

    // only draw if covering undrawn area
    // guess who just learned about JavaScript option chaining, booyah!
    if (this.checkInBounds(midPos) && !midEdge && !mid.body?.enable) {
      // if we're in completely undrawn area, cover the area we're coming from
      if (this.checkInBounds(fromPos) && !fromEdge) {
        from.setFillStyle(COLORS.drawColor, 1);
        this.physics.add.existing(from, true);
        from.body.immovable = true;
        this.drawPath.push(from);
      }

      // draw the middle tile always
      mid.setFillStyle(COLORS.drawColor, 1);
      this.physics.add.existing(mid, true);
      mid.body.immovable = true;
      this.drawPath.push(mid);

      // complete drawing if we've hit a wall or an edge
      if (!this.checkInBounds(toPos) || toEdge) {
        this.completeDrawing(midPos);
      }
    }

    this.player.setPosition(to.x, to.y);
    this.gridPos.x = toPos.x;
    this.gridPos.y = toPos.y;

    // if we crossed over the current drawing path,
    // then delete everything that's not between the player and the edge
    const drawIndex = this.drawPath.indexOf(to);
    if (drawIndex != -1) {
      const toRemove = this.drawPath.splice(drawIndex);
      toRemove.forEach((tile) => {
        tile.setFillStyle(COLORS.fillColor, 0);
        this.physics.world.disableBody(tile.body);
      });
    }

    // if we started drawing but returned to an edge
    // without drawing a full path, then delete the path
    if (toEdge && this.drawPath.length > 0) {
      this.drawPath.forEach((tile) => {
        tile.setFillStyle(COLORS.fillColor, 0);
        this.physics.world.disableBody(tile.body);
      });
      this.drawPath.length = 0;
    }

    this.canMove = false;
    let speed = (80 - this.level * 1.6) / this.speedScale;

    if (this.cheatMode) speed /= 2;

    this.time.delayedCall(speed, () => (this.canMove = true));
  }

  completeDrawing(startPos) {
    this.scene.get("MainUI").playSound("completedrawing");

    // determine what direction contains the least amount of area to fill up
    let direction = Phaser.Math.Vector2.UP.clone();
    let minArea = this.gridX * this.gridY;

    for (let i = 0; i < 360; i += 90) {
      this.drawingArea = 0;

      const dir = direction.clone().rotate(Phaser.Math.DegToRad(i));
      dir.x = Math.round(dir.x);
      dir.y = Math.round(dir.y);

      // count how many tiles in this direction
      this.countTilesRecursiely(startPos.clone().add(dir));

      if (this.drawingArea > 0 && this.drawingArea < minArea) {
        minArea = this.drawingArea;
        direction = dir.clone();
      }
    }

    // clear the player's drawing path now that these are all edges
    this.drawPath.length = 0;

    this.fillInTilesRecursively(startPos.clone().add(direction));

    // update edge points: filled-in tiles that are facing undrawn area only
    this.edgePoints.removeAll();

    let count = 0; // count how many tiles we've filled

    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const p = new Phaser.Math.Vector2(i, j);
        const t = this.grid[i][j];
        t.setData("counted", false);
        if ((t.body?.enable || t.getData("filled")) && this.checkInBounds(p))
          count++; // count how many tiles we've filled

        // player can only walk on edge points
        // edge points are the filled points next to unfilled area
        for (let angle = 0; angle < 360; angle += 45) {
          let r = Phaser.Math.DegToRad(angle);
          let v = Phaser.Math.Vector2.UP.clone().rotate(r);
          v.x = Math.round(v.x);
          v.y = Math.round(v.y);
          v.add(p);

          if (
            this.checkInBounds(v) &&
            !this.grid[v.x][v.y].getData("filled") &&
            !this.grid[v.x][v.y].body &&
            t.body?.enable
          ) {
            t.setFillStyle(COLORS.fillColor, 1);
            t.setData("filled", true);
            this.edgePoints.add(p);
          }
        }
      }
    }

    // destroy any enemies we've trapped in the drawing
    this.destroyEnemies();

    // collect powerups in the drawing
    this.collectPowerups();

    // display how much area we've covered
    this.areaFilled = Math.round((100 * count) / this.totalDrawingArea) / 100;

    this.areaText.setText(`${Math.round(this.areaFilled * 100)}%`);

    if (Math.round(this.areaFilled * 100) >= 90) this.gameWin();
  }

  fillInTilesRecursively(pos) {
    if (this.checkInBounds(pos)) {
      let tile = this.grid[pos.x][pos.y];
      if (tile.body?.enable || tile.getData("filled")) return; // base case!
      tile.setFillStyle(COLORS.fillColor, 0.2);
      tile.setData("filled", true);

      //this.physics.add.existing(tile, true);
    } else return;

    this.fillInTilesRecursively(pos.clone().add(Phaser.Math.Vector2.UP));
    this.fillInTilesRecursively(pos.clone().add(Phaser.Math.Vector2.RIGHT));
    this.fillInTilesRecursively(pos.clone().add(Phaser.Math.Vector2.LEFT));
    this.fillInTilesRecursively(pos.clone().add(Phaser.Math.Vector2.DOWN));
  }

  countTilesRecursiely(pos) {
    if (this.checkInBounds(pos)) {
      let tile = this.grid[pos.x][pos.y];
      if (tile.body?.enable || tile.getData("counted")) return; // base case!
      tile.setData("counted", true);
      this.drawingArea++;
    } else return;

    this.countTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.RIGHT));
    this.countTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.UP));
    this.countTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.LEFT));
    this.countTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.DOWN));
  }

  checkInBounds(pos) {
    // check if inside canvas (not on the border)
    return !(
      pos.y <= 0 ||
      pos.y >= this.gridY - 1 ||
      pos.x <= 0 ||
      pos.x >= this.gridX - 1
    );
  }

  checkInGrid(pos) {
    // is this a valid grid position at all?
    return (
      pos.x >= 0 &&
      pos.x <= this.gridX - 1 &&
      pos.y >= 0 &&
      pos.y <= this.gridY - 1
    );
  }

  checkIfEdge(pos) {
    // is this position an edge point?
    let onEdge = false;
    this.edgePoints.list.forEach((edge) => {
      if (pos.x == edge.x && pos.y == edge.y) onEdge = true;
    });
    return onEdge;
  }

  circleHitEdge(tile, circle) {
    // if we hit a line the player is currently drawing, they die
    // before a drawing is completed,
    // the player's drawing is colored in drawColor
    if (tile.fillColor == COLORS.drawColor) {
      tile.fillColor = COLORS.deathColor;

      this.tweens.add({
        targets: tile,
        angle: 360,
        duration: 400,
        alpha: 0,
        scale: 2,
      });
      this.gameLose("enemy");
    }
  }

  squareHitPlayer(player, square) {
    square.interval.remove();
    square.fillColor = COLORS.deathColor;

    this.tweens.add({
      targets: square,
      angle: 360,
      duration: 400,
      alpha: 0,
      scale: 2,
    });
    this.gameLose("enemy");
  }

  collectPowerups() {
    // after a drawing is completed, check for any powerups within the drawing
    // if there are any, collect them! <:)
    this.powerups.getChildren().forEach((p) => {
      const pos = this.convertWorldToGrid(p.x, p.y);
      if (pos && this.grid[pos.x][pos.y].getData("filled")) {
        this.playerHitPowerup(this.player, p);
      }
    });
  }

  destroyEnemies() {
    // after a drawing is completed, check for any enemies within the drawing
    // if there are any, destroy them! >:(
    const toRemove = [];

    this.circles.getChildren().forEach((c) => {
      const pos = this.convertWorldToGrid(c.x, c.y);
      if (pos && this.grid[pos.x][pos.y].getData("filled")) toRemove.push(c);
    });

    toRemove.forEach((c) => {
      this.scene.get("MainUI").playSound("destroy");
      c.body.setEnable(false);
      this.tweens.add({
        targets: c,
        scale: 2,
        alpha: 0,
        duration: 300,
        onComplete: () => this.circles.remove(c, true, true),
      });
    });

    toRemove.length = 0; // this clears an array in js.

    this.squares.getChildren().forEach((s) => {
      const pos = this.convertWorldToGrid(s.x, s.y);
      if (!this.checkIfEdge(pos)) toRemove.push(s);
    });

    toRemove.forEach((s) => {
      this.scene.get("MainUI").playSound("destroy");
      s.interval.remove();
      s.body.setEnable(false);

      this.tweens.add({
        targets: s,
        scale: 2,
        alpha: 0,
        duration: 300,
        angle: 180,
        onComplete: () => this.squares.remove(s, true, true),
      });
    });
  }

  convertWorldToGrid(x, y) {
    // converts a position in the world to a position on the grid
    // for enemies to check where they are on the grid to see if it's filled
    const b = this.bounds.getBounds();
    if (!Phaser.Geom.Rectangle.Contains(b, x, y)) return null;

    const topLeft = this.bounds.getTopLeft();
    const w = this.grid[0][0].width;
    const h = this.grid[0][0].height;
    x = Math.floor((x - topLeft.x) / w);
    y = Math.floor((y - topLeft.y) / h);

    return new Phaser.Math.Vector2(x, y);
  }

  gameWin() {
    if (this.gameOver) return; // already lost?

    this.scene.get("MainUI").playSound("gamewin");

    this.gameOver = true;
    this.physics.pause();

    this.level++;
    localStorage.setItem("level", this.level);

    this.areaText.setTint(0x85ff9e);

    this.tweens.add({
      targets: this.player,
      duration: 1200,
      angle: 180,
      scale: 0,
      delay: (this.gridPos.x + this.gridPos.y) * 15 + 600,
      ease: "sine.inout",
    });

    this.circles.getChildren().forEach((c) => {
      const pos = this.convertWorldToGrid(c.x, c.y);

      // add a check in case circle flew out of bounds
      if (pos == null) pos = Phaser.Math.Vector2.ZERO;

      this.tweens.add({
        targets: c,
        duration: 1200,
        angle: 180,
        scale: 0,
        delay: (pos.x + pos.y) * 15 + 600,
        ease: "sine.inout",
      });
    });

    this.squares.getChildren().forEach((s) => {
      s.interval.remove();
      const pos = this.convertWorldToGrid(s.x, s.y);
      this.tweens.add({
        targets: s,
        duration: 1200,
        angle: 180,
        scale: 0,
        delay: (pos.x + pos.y) * 15 + 600,
        ease: "sine.inout",
      });
    });

    this.powerups.getChildren().forEach((p) => {
      this.tweens.killTweensOf(p);
      const pos = this.convertWorldToGrid(p.x, p.y);
      this.tweens.add({
        targets: p,
        duration: 1200,
        angle: 180,
        scale: 0,
        delay: (pos.x + pos.y) * 15 + 600,
        ease: "sine.inout",
      });
    });

    // rainbow effect time
    const ratio = 360 / (this.gridX + this.gridY); // for a full color gradient
    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const t = this.grid[i][j];

        const index = Math.floor((i + j) * ratio) % 359;

        this.tweens.chain({
          targets: t,
          delay: (i + j) * 15 + 600,
          onStart: () => {
            // don't ask. i tried to separate the sound loops as much as possible
            if (i % 8 == 0 && i == j)
              this.scene.get("MainUI").playSound("swirl");
          },
          tweens: [
            {
              scaleX: 0,
              angle: 180,
              fillAlpha: 0.7,
              duration: 800,
              ease: "sine.inout",
              onComplete: () => {
                t.fillColor = this.darkWheel[index].color;
                t.setScale(0);
              },
            },
            {
              scale: 1,
              angle: 180,
              fillAlpha: 0.7,
              duration: 800,
              ease: "sine.inout",
              onComplete: () => {},
            },
            {
              // cutting out this tween for now because the waves are super cool
              ///scale: 1,
              /// angle: 180,
              duration: 800, //800
              ease: "sine.inout",
              onComplete: () => {
                this.tweens.add({
                  targets: t,
                  scale: 1.4,
                  yoyo: true,
                  loop: -1,
                  duration: 600, // 500
                  ease: "sine.inout",
                });
              },
            },
          ],
        });
      }
    }

    let delay = (this.gridX + this.gridY) * 15 + 600;

    this.time.delayedCall(delay + 1200, () => {
      this.scene.get("MainUI").playSound("highlight");

      const t = new GameText(
        this,
        gameW * 0.5,
        gameH * 0.48,
        "picture complete!",
        "l",
        "c"
      );
    });

    this.time.delayedCall(delay + 2200, () => {
      this.scene.get("MainUI").playSound("highlight");

      const t = new GameText(
        this,
        gameW * 0.5,
        gameH * 0.54,
        "press any key to continue",
        "m",
        "c"
      );

      this.input.keyboard.once("keydown", () => this.restartGame());
      this.input.once("pointerdown", () => this.restartGame());
      this.input.gamepad.once("down", () => this.restartGame());
    });
  }

  gameLose(condition) {
    if (this.gameOver) return; // already lost?

    this.scene.get("MainUI").playSound("gamelose");

    this.gameOver = true;
    this.physics.pause();

    this.tweens.add({
      targets: this.player,
      duration: 1000,
      angle: 360,
      scale: 5,
      alpha: 0,
      delay: 400,
      ease: "sine.inout",
    });

    this.circles.getChildren().forEach((c) => {
      this.tweens.add({
        targets: c,
        duration: 1000,
        angle: 180,
        scale: 0,
        delay: 600,
        ease: "sine.inout",
      });
    });

    this.squares.getChildren().forEach((s) => {
      s.interval.remove();
      this.tweens.add({
        targets: s,
        duration: 1000,
        angle: 180,
        scale: 0,
        delay: 600,
        ease: "sine.inout",
      });
    });

    this.powerups.getChildren().forEach((p) => {
      this.tweens.killTweensOf(p);
      this.tweens.add({
        targets: p,
        duration: 1000,
        angle: 180,
        scale: 0,
        delay: 600,
        ease: "sine.inout",
      });
    });

    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const t = this.grid[i][j];

        this.tweens.add({
          targets: t,
          fillAlpha: 0,
          delay: 800,
          duration: 1200,
          ease: "sine.inout",
        });
      }
    }

    let conditionText = "time ran out!";
    if (condition == "enemy") conditionText = "you got snipped!";

    this.time.delayedCall(2000, () => {
      this.scene.get("MainUI").playSound("highlight");

      const t = new GameText(
        this,
        gameW * 0.5,
        gameH * 0.48,
        conditionText,
        "l",
        "c"
      );
    });

    this.time.delayedCall(2800, () => {
      this.scene.get("MainUI").playSound("highlight");

      const t = new GameText(
        this,
        gameW * 0.5,
        gameH * 0.54,
        "press any key to try again",
        "m",
        "c"
      );

      this.input.keyboard.once("keydown", () => this.restartGame());
      this.input.once("pointerdown", () => this.restartGame());
      this.input.gamepad.once("down", () => this.restartGame());
    });
  }

  displayWinScreen() {
    this.gameOver = true;

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        const t = new GameText(
          this,
          gameW * 0.5,
          gameH * 0.13,
          "you snipped it all!!\nthank you for playing!",
          "l",
          "c"
        )
          .setOrigin(0.5, 0)
          .setLineSpacing(24)
          .setFontSize("46px");

        this.tweens.add({
          targets: t,
          y: "+=20",
          yoyo: true,
          duration: 1600,
          loop: -1,
          ease: "sine.inout",
        });

        const mouseKbText =
          "here's how to unlock cheat mode:\n\n" +
          `- click/tap & hold the "${VERSION}" text on the start menu ` +
          'for ten seconds\n\n- or type the word "capybara" on the start menu\n\n' +
          "cheat mode doubles your speed, and powerups will appear 5x as fast. enjoy!\n\n" +
          "hold any key, or click/tap & hold to return to the start menu";

        const gamepadText =
          "here's how to unlock cheat mode:\n\n" +
          "- on the start menu, hold\nL1 + R2 + B + D-pad left\n" +
          "all at the same time for ten seconds\n\n" +
          "cheat mode doubles your speed, and powerups will appear 5x as fast. enjoy!\n\n" +
          "hold any button (except analog sticks) to return to the start menu";

        const c = new GameText(
          this,
          gameW * 0.5,
          gameH * 0.33,
          mouseKbText,
          "s",
          "c"
        )
          .setOrigin(0.5, 0)
          .setLineSpacing(14)
          .setWordWrapWidth(gameW * 0.97, true);

        this.input.gamepad.once("connected", () => (c.text = gamepadText));

        this.input.gamepad.on("down", () => (c.text = gamepadText));

        this.input.keyboard.on("keydown", () => (c.text = mouseKbText));

        this.input.on("pointerdown", () => (c.text = mouseKbText));

        const r = this.add
          .rectangle(gameW * 0.05, gameH - 20, 0, 16, COLORS.buttonColor, 1)
          .setOrigin(0, 0.5);

        const container = this.add.container(0, 0, [t, c, r]);

        const tween = {
          targets: r,
          width: gameW * 0.9,
          duration: 3000,
          ease: "sine.inout",
          onComplete: () => {
            this.tweens.add({
              targets: container,
              duration: 1500,
              alpha: 0,
              ease: "sine.inout",
              onComplete: () => {
                localStorage.setItem("level", 1);
                this.scene.get("MainUI").returnToTitle();
              },
            });
          },
        };

        this.input.keyboard.on("keydown", () => {
          if (this.tweens.getTweensOf(r).length > 0) return;
          this.tweens.add(tween);
        });
        this.input.keyboard.on("keyup", () => {
          this.tweens.killTweensOf(r);
          r.width = 0;
        });
        this.input.on("pointerdown", () => {
          if (this.tweens.getTweensOf(r).length > 0) return;
          this.tweens.add(tween);
        });
        this.input.on("pointerup", () => {
          this.tweens.killTweensOf(r);
          r.width = 0;
        });
        this.input.gamepad.on("down", (pad) => {
          /* bug: moving the sticks triggers the down event,
          but releasing the sticks will not trigger the up event.

          fix: upon further investigation, pressing the gamepad buttons
          (not the sticks) will give a Gamepad object as the pad parameter,
          whereas the sticks will not give a Gamepad object and simply
          leave it as undefined. so, if there's no pad parameter,
          assume the player is moving the sticks and do not record as down.
          */
          if (!pad) return; // sticks moved, don't start tween
          if (this.tweens.getTweensOf(r).length > 0) return;
          this.tweens.add(tween);
        });
        this.input.gamepad.on("up", () => {
          this.tweens.killTweensOf(r);
          r.width = 0;
        });
      },
    });
  }
}
