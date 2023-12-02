const VERSION = "Snip It! v0.3";

class Background extends Phaser.Scene {
  constructor() {
    super("Background");
  }

  create() {
    // add gradient background. this is stolen from a phaser example
    // https://labs.phaser.io/view.html?src=src/fx\gradient\gradient%20fx.js

    // for gradients
    const top = 0x023e8a;
    const bottom = 0x457b9d;
    const w = window.innerWidth; // take up the full browser window
    const h = window.innerHeight;

    // if on desktop, render the pretty gradient
    if (this.sys.game.device.os.desktop) {
      const num1 = 0.1;
      const num2 = 0.9;

      this.add
        .image(w / 2, h / 2, "__WHITE")
        .setDisplaySize(w, h)
        .preFX.addGradient(top, bottom, 0.16, num1, num1, num2, num2, 18);
    } else {
      // otherwise, render the mid gradient
      const graphics = this.add.graphics();

      graphics.fillGradientStyle(top, top, top, bottom, 0.8);
      graphics.fillRect(0, 0, w, h);
    }
    this.scene.launch("Game");
  }
}

// sets timer high, and turns on physics debug
const DEBUG_MODE = false;

class Game extends Phaser.Scene {
  gameW = 640;
  gameH = 960;
  keysDown;
  graphics;
  player;
  bounds; // big rectangle that is the "canvas"
  grid; // tile grid for the canvas
  gridPos; // what grid position is player in
  gridX; // how many tiles is grid in X direction
  gridY; // how many tiles is grid in Y direction
  canMove; // timer that controls how fast player can go across tiles
  edgePoints; // all points on drawn edges that player can walk on and connect to
  fillColor = 0x272640; // colors the filled area and edges the player has drawn
  drawColor = 0xcfd6ea; // colors the line the player is currently drawing
  areaFilled = 0; // percentage of area that has been drawn in
  totalDrawingArea; // the area of the grid minus the perimeter which is already filled in, so don't count the perimeter
  areaText;
  pointerDown; // is mouse or touch input down
  gameOver; // true if game win or game over, false during normal gameplay
  timer; // if counts down to zero, game over
  timeText;
  circles; // physics group with the circle enemies
  squares; // physics group with the square enemies
  level; // the level of the game, contained in localStorage

  constructor() {
    super("Game");
  }

  preload() {
    this.level = localStorage.getItem("level") || 1;

    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    // resolution, resizing, camera code stolen from
    // https://labs.phaser.io/view.html?src=src/scalemanager\mobile%20game%20example.js
    const width = this.scale.gameSize.width;
    const height = this.scale.gameSize.height;

    this.parent = new Phaser.Structs.Size(width, height);
    this.sizer = new Phaser.Structs.Size(
      this.gameW,
      this.gameH,
      Phaser.Structs.Size.FIT,
      this.parent
    );

    this.parent.setSize(width, height);
    this.sizer.setSize(width, height);

    this.updateCamera();

    this.scale.on("resize", this.resize, this);

    this.createLayout();
    this.createPlayer();
    this.createControls();
    this.createMobileControls();
    this.createPhysics();

    this.level = this.level / 1; // make sure it's a number
    const numCircles = Math.floor(this.level / 4) + 1;
    const numSquares = Math.floor((this.level + 3) / 2) - 2;
    console.log(this.level, numCircles, numSquares);

    this.createCircles(numCircles);
    this.createSquares(numSquares);

    WebFont.load({
      google: {
        families: [
          "IBM Plex Mono",
          "Finger Paint",
          "Anonymous Pro",
          "Roboto Mono",
          "PT Sans",
          "Quicksand",
          "IBM Plex Sans",
          "Titillium Web",
        ],
      },
      active: () => {
        this.loadGameUI();
        this.startGame();
      },
    });
  }

  createLayout() {
    // show the "game window" while in development
    this.add.rectangle(
      this.gameW * 0.5,
      this.gameH * 0.5,
      this.gameW,
      this.gameH,
      0x000000,
      0.04
    );

    this.graphics = this.add.graphics();

    this.bounds = this.add.rectangle(
      this.gameW * 0.5,
      this.gameH * 0.49,
      this.gameW * 0.85,
      this.gameH * 0.75,
      0xffffff,
      0 //0.04
    );

    this.grid = [];
    const start = this.bounds.getTopLeft();

    const aspectRatio = this.bounds.width / this.bounds.height;

    this.gridY = 61;
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
          .setFillStyle(this.fillColor, 0)
          .setData("counted", false)
          .setData("filled", false);

        this.grid[i][j] = r;

        // fill up edges
        if (i == 0 || i == this.gridX - 1 || j == 0 || j == this.gridY - 1) {
          this.grid[i][j].setFillStyle(this.fillColor, 1);
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
            t.setFillStyle(this.fillColor, 1);
            this.edgePoints.add(p);
          }
        }
      }
    }
  }

  createPlayer() {
    // create simple rectangle texture for player
    const rectangleDrawer = this.make.graphics(); // disposable graphics obj
    const playerW = Math.ceil(this.grid[0][0].width); // match tile width
    rectangleDrawer.fillStyle(0xf2f4f3, 1);
    rectangleDrawer.fillRect(0, 0, playerW, playerW);
    rectangleDrawer.generateTexture("rect", playerW, playerW);
    const centerX = Math.round(this.gridX / 2);
    this.player = this.physics.add
      .sprite(this.grid[centerX][0].x, this.grid[0][0].y, "rect")
      .setName("player");
    this.player.setCollideWorldBounds(true);
    this.player.body.onWorldBounds = true;
    this.gridPos = new Phaser.Math.Vector2(centerX, 0);
    this.canMove = true;
    this.drawing = false;
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
    console.log(minMaxSpeed);

    for (let i = 0; i < num; i++) {
      // assign a random point for circle to appear
      const p = bounds.getRandomPoint();

      const circle = this.add
        .arc(p.x, p.y, Phaser.Math.Between(6, 12))
        .setFillStyle(Phaser.Display.Color.RandomRGB().color);

      this.circles.add(circle);

      circle.alive = true; // alive until hit by player
      this.physics.add.existing(circle);

      circle.body
        .setVelocity(
          Phaser.Math.Between(minMaxSpeed[0], minMaxSpeed[1]),
          Phaser.Math.Between(minMaxSpeed[0], minMaxSpeed[1])
        )
        .setBounce(1)
        .setCollideWorldBounds(true);
      circle.body.isCircle = true;

      // random direction
      if (Math.random() > 0.5) {
        circle.body.velocity.x *= -1;
      } else {
        circle.body.velocity.y *= -1;
      }
    }
  }

  createSquares(num) {
    const size = this.grid[0][0].width * 1.05;

    const minMaxTime = [200 - (this.level - 1) * 5, 400 - (this.level - 1) * 5];

    console.log(minMaxTime);

    for (let i = 0; i < num; i++) {
      // create moving squares along the border
      let p = this.edgePoints.getRandom().clone();
      // ensure it doesn't spawn too close to player
      while (p.y == 0) p = this.edgePoints.getRandom().clone();

      const tile = this.grid[p.x][p.y];

      const square = this.add.rectangle(
        tile.x,
        tile.y,
        size,
        size,
        Phaser.Display.Color.RandomRGB().color
      );

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

      square.interval = setInterval(() => {
        // if ded, stop its update loop
        if (!square.active) clearInterval(square.interval);

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
        const nextTile = this.grid[p.x][p.y];
        if (nextTile) {
          // sometimes there's no tile if player just cut them off
          this.tweens.add({
            targets: square,
            x: nextTile.x,
            y: nextTile.y,
            duration: time,
          });
        }
      }, time);
    }
  }

  createPhysics() {
    this.physics.world.setBounds(
      this.bounds.getTopLeft().x - this.player.width / 2,
      this.bounds.getTopLeft().y - this.player.width / 2,
      this.bounds.width + this.player.width,
      this.bounds.height + this.player.width
    );

    this.physics.world.on("worldbounds", (body, up, down, left, right) => {});

    this.circles = this.physics.add.group();
    this.squares = this.physics.add.group();

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
  }

  loadGameUI() {
    const title = new CustomText(
      this,
      this.gameW * 0.5,
      20,
      "snip it!",
      "g",
      "l"
    ).setOrigin(0.5, 0);
    /*
    const t2 = new CustomText(
      this,
      this.gameW * 0.5,
      this.gameH - 20,
      "a game by ryshaw\nmade in phaser 3",
      "m",
      "c"
    ).setOrigin(0.5, 1);*/

    const levelNum = new CustomText(
      this,
      this.gameW * 0.15,
      this.gameH - 20,
      `${this.level}`,
      "g",
      "c"
    ).setOrigin(0.5, 1);

    const levelT = new CustomText(
      this,
      levelNum.getTopCenter().x,
      levelNum.getTopCenter().y,
      "level",
      "s",
      "c"
    ).setOrigin(0.5, 1);

    let count = 0; // count how many tiles we've filled
    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const p = new Phaser.Math.Vector2(i, j);
        const t = this.grid[i][j];
        if ((t.body || t.getData("filled")) && this.checkInBounds(p)) count++; // count how many tiles we've filled      }
      }
    }

    // display how much area we've covered
    this.areaFilled = Math.round((100 * count) / this.totalDrawingArea) / 100;

    this.areaText = new CustomText(
      this,
      this.gameW * 0.85,
      this.gameH - 20,
      `${Math.round(this.areaFilled * 100)}%`,
      "g",
      "c"
    ).setOrigin(0.5, 1);

    const areaT = new CustomText(
      this,
      this.areaText.getTopCenter().x,
      this.areaText.getTopCenter().y,
      "filled area",
      "s",
      "c"
    ).setOrigin(0.5, 1);

    this.timeText = new CustomText(
      this,
      this.gameW * 0.5,
      this.gameH - 20,
      `${this.timer}`,
      "g",
      "c"
    )
      .setOrigin(0.5, 1)
      .setVisible(false);

    const timeT = new CustomText(
      this,
      this.timeText.getTopCenter().x,
      this.timeText.getTopCenter().y,
      "time left",
      "s",
      "c"
    ).setOrigin(0.5, 1);
    /*
    const fpsText = new CustomText(
      this,
      this.gameW * 0.1,
      this.gameH * 0.08,
      `${this.sys.game.loop.actualFps}`,
      "l",
      "c"
    );

    setInterval(
      () => fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`),
      1000
    );*/

    // add fx here for desktop only, not mobile
    if (this.sys.game.device.os.desktop) {
      title.postFX.addGlow(0xffffff, 0.5);
      areaT.postFX.addGlow(0xffffff, 0.1);
      timeT.postFX.addGlow(0xffffff, 0.1);
      levelT.postFX.addGlow(0xffffff, 0.1);
      levelNum.postFX.addGlow(0xffffff, 0.3);
      this.areaText.postFX.addGlow(0xffffff, 0.3);
      this.timeText.postFX.addGlow(0xffffff, 0.3);
    }
  }

  startGame() {
    this.gameOver = false;

    // every two levels, up the second count by 5
    this.timer = 60 + Math.floor(this.level / 3) * 5;
    if (DEBUG_MODE) this.timer = 300;

    this.timeText.setVisible(true).setText(`${this.timer}`);

    const interval = setInterval(() => {
      if (this.gameOver) {
        clearInterval(interval);
        return;
      }

      this.timer--;
      this.timeText.setText(`${this.timer}`);

      if (this.timer <= 0) {
        clearInterval(interval);
        this.gameLose("time");
      } else if (this.timer <= 9) {
        this.timeText.setTint(0xc1121f); // time's boutta run out
      }
    }, 1000);
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
    const scaleX = this.sizer.width / this.gameW;
    const scaleY = this.sizer.height / this.gameH;

    // offset is comparing the game's height to the window's height,
    // and centering the game in the middle of the window.
    const offset = (1 + this.parent.height / this.sizer.height) / 2;

    camera.setViewport(x, y, this.sizer.width, this.sizer.height * offset);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(this.gameW / 2, this.gameH / 2);
  }

  createControls() {
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

  createMobileControls() {
    this.pointerDown = false;
    this.input.on("pointerdown", () => (this.pointerDown = true));
    this.input.on("pointerup", () => (this.pointerDown = false));
  }

  restartGame() {
    this.children.getAll().forEach((object) => {
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
    this.create();
  }

  update() {
    if (this.gameOver) return;

    this.updatePlayerMovement();
  }

  updatePlayerMovement() {
    // player movement dictated by last key held down or touch input
    if (!this.canMove) return; // don't move between moves

    // check keyboard input first then touch input
    let direction = undefined;
    if (this.keysDown.last) direction = this.keysDown.last;
    else if (this.pointerDown) {
      // for touch controls
      const p1 = this.input.activePointer.positionToCamera(this.cameras.main);
      const p0 = new Phaser.Math.Vector2(this.player.x, this.player.y);
      const angle = Phaser.Math.RadToDeg(p1.subtract(p0).angle());

      if (p1.length() < this.grid[0][0].width * 1.2) return; // too short of a distance to move

      direction = Phaser.Math.Vector2.UP;

      if (angle >= 315 || angle < 45) {
        direction = Phaser.Math.Vector2.RIGHT;
      } else if (angle >= 45 && angle < 135) {
        direction = Phaser.Math.Vector2.DOWN;
      } else if (angle >= 135 && angle < 225) {
        direction = Phaser.Math.Vector2.LEFT;
      }
    } else return; // don't move if no input detected

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

    // player is not allowed to move onto any filled area that isn't an edge
    if ((nextTile.getData("filled") || nextTile.body) && !edge) return;

    // check midpoint as well
    if ((mid.body || mid.getData("filled")) && !midEdge) return;

    // all checks pass, move the player
    this.movePlayer(this.gridPos, nextPos, edge);
  }

  movePlayer(fromPos, toPos, toEdge) {
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
    if (this.checkInBounds(midPos) && !midEdge && !mid.body) {
      // if we're in completely undrawn area, cover the area we're coming from
      if (this.checkInBounds(fromPos) && !fromEdge) {
        from.setFillStyle(this.drawColor, 1);
        this.physics.add.existing(from, true);
        from.body.immovable = true;
      }

      // draw the middle tile always
      mid.setFillStyle(this.drawColor, 1);
      this.physics.add.existing(mid, true);
      mid.body.immovable = true;

      // complete drawing if we've hit a wall or an edge
      if (!this.checkInBounds(toPos) || toEdge) {
        this.completeDrawing(midPos);
      }
    }

    this.player.setPosition(to.x, to.y);
    this.gridPos.x = toPos.x;
    this.gridPos.y = toPos.y;
    this.canMove = false;
    this.time.delayedCall(80 - this.level * 1.6, () => (this.canMove = true));
  }

  completeDrawing(startPos) {
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

    this.fillInTilesRecursiely(startPos.clone().add(direction));

    // update edge points: filled-in tiles that are facing undrawn area only
    this.edgePoints.removeAll();

    let count = 0; // count how many tiles we've filled
    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const p = new Phaser.Math.Vector2(i, j);
        const t = this.grid[i][j];
        t.setData("counted", false);
        if ((t.body || t.getData("filled")) && this.checkInBounds(p)) count++; // count how many tiles we've filled

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
            t.body
          ) {
            t.setFillStyle(this.fillColor, 1);
            t.setData("filled", true);
            this.edgePoints.add(p);
          }
        }
      }
    }

    // destroy any enemies we've trapped in the drawing
    this.destroyEnemies();

    // display how much area we've covered
    this.areaFilled = Math.round((100 * count) / this.totalDrawingArea) / 100;

    this.areaText.setText(`${Math.round(this.areaFilled * 100)}%`);

    if (Math.round(this.areaFilled * 100) >= 95) this.gameWin();
  }

  fillInTilesRecursiely(pos) {
    if (this.checkInBounds(pos)) {
      let tile = this.grid[pos.x][pos.y];
      if (tile.body || tile.getData("filled")) return; // base case!
      tile.setFillStyle(this.fillColor, 0.4);
      tile.setData("filled", true);
      //this.physics.add.existing(tile, true);
    } else return;

    this.fillInTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.UP));
    this.fillInTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.RIGHT));
    this.fillInTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.LEFT));
    this.fillInTilesRecursiely(pos.clone().add(Phaser.Math.Vector2.DOWN));
  }

  countTilesRecursiely(pos) {
    if (this.checkInBounds(pos)) {
      let tile = this.grid[pos.x][pos.y];
      if (tile.body || tile.getData("counted")) return; // base case!
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
    if (tile.fillColor == this.drawColor) {
      tile.fillColor = 0xc1121f;
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
    clearInterval(square.interval);
    square.fillColor = 0xc1121f;
    this.tweens.add({
      targets: square,
      angle: 360,
      duration: 400,
      alpha: 0,
      scale: 2,
    });
    this.gameLose("enemy");
  }

  destroyEnemies() {
    // after a drawing is completed, check for any enemies within the drawing
    // if there are any, destroy them
    const toRemove = [];

    this.circles.getChildren().forEach((c) => {
      const pos = this.convertWorldToGrid(c.x, c.y);
      if (this.grid[pos.x][pos.y].getData("filled")) toRemove.push(c);
    });

    toRemove.forEach((c) => this.circles.remove(c, true, true));

    toRemove.length = 0; // this clears an array in js.

    this.squares.getChildren().forEach((s) => {
      const pos = this.convertWorldToGrid(s.x, s.y);
      if (!this.checkIfEdge(pos)) toRemove.push(s);
    });

    toRemove.forEach((s) => this.squares.remove(s, true, true));
  }

  convertWorldToGrid(x, y) {
    // converts a position in the world to a position on the grid
    // for enemies to check where they are on the grid to see if it's filled
    const b = this.bounds.getBounds();
    if (!Phaser.Geom.Rectangle.Contains(b, x, y)) return;

    const topLeft = this.bounds.getTopLeft();
    const w = this.grid[0][0].width;
    const h = this.grid[0][0].height;
    x = Math.floor((x - topLeft.x) / w);
    y = Math.floor((y - topLeft.y) / h);

    return new Phaser.Math.Vector2(x, y);
  }

  gameWin() {
    if (this.gameOver) return; // already lost?

    this.gameOver = true;
    this.physics.pause();

    // last level is 25
    if (this.level < 25) {
      this.level++;
      localStorage.setItem("level", this.level);
    }

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
      clearInterval(s.interval);
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

    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const t = this.grid[i][j];
        this.tweens.add({
          targets: t,
          fillAlpha: 1,
          delay: (i + j) * 15 + 600,
          duration: 1200,
          angle: 180,
          scale: 0,
          ease: "sine.inout",
        });
      }
    }

    let delay = (this.gridX + this.gridY) * 15 + 600;

    this.time.delayedCall(delay + 1500, () => {
      const t = new CustomText(
        this,
        this.gameW * 0.5,
        this.gameH * 0.48,
        "picture complete!",
        "l",
        "c"
      );

      if (this.sys.game.device.os.desktop) {
        t.postFX.addGlow(0xffffff, 0.3);
      }
    });

    this.time.delayedCall(delay + 2500, () => {
      const t = new CustomText(
        this,
        this.gameW * 0.5,
        this.gameH * 0.54,
        "press any key to continue",
        "m",
        "c"
      );

      if (this.sys.game.device.os.desktop) {
        t.postFX.addGlow(0xffffff, 0.3);
      }

      this.input.keyboard.once("keydown", () => this.restartGame());
      this.input.once("pointerdown", () => this.restartGame());
    });
  }

  gameLose(condition) {
    if (this.gameOver) return; // already lost?

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
      clearInterval(s.interval);
      this.tweens.add({
        targets: s,
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

    this.time.delayedCall(2200, () => {
      const t = new CustomText(
        this,
        this.gameW * 0.5,
        this.gameH * 0.48,
        conditionText,
        "l",
        "c"
      );

      if (this.sys.game.device.os.desktop) {
        t.postFX.addGlow(0xffffff, 0.3);
      }
    });

    this.time.delayedCall(3000, () => {
      const t = new CustomText(
        this,
        this.gameW * 0.5,
        this.gameH * 0.54,
        "press any key to try again",
        "m",
        "c"
      );

      if (this.sys.game.device.os.desktop) {
        t.postFX.addGlow(0xffffff, 0.3);
      }

      this.input.keyboard.once("keydown", () => this.restartGame());
      this.input.once("pointerdown", () => this.restartGame());
    });
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

// game scale configuration also stolen from
// https://labs.phaser.io/100.html?src=src\scalemanager\mobile%20game%20example.js
const config = {
  type: Phaser.AUTO,
  backgroundColor: 0xffffff,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: 640,
    height: 960,
    min: {
      width: 320,
      height: 480,
    },
    max: {
      width: 1400,
      height: 1200,
    },
  },
  scene: [Background, Game],
  physics: {
    default: "arcade",
    arcade: {
      debug: DEBUG_MODE,
    },
  },
  title: VERSION,
  autoFocus: true,
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

    this.clickedOn = false;

    const cT = scene.add
      .text(x, y, text, {
        font:
          size == "g"
            ? "64px"
            : size == "l"
            ? "48px"
            : size == "m"
            ? "32px"
            : "16px",
        fill: "#fff",
        align: "left",
      })
      .setFontFamily("Roboto Mono")
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setLineSpacing(16);

    //"IBM Plex Mono", "Finger Paint", "Anonymous Pro"]
    //"Roboto Mono", "PT Sans", "Quicksand", "IBM Plex Sans", "Titillium Web"

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
    }
    return cT;
  }
}

const game = new Phaser.Game(config);
