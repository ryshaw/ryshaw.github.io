const VERSION = "Snip It! v0.7";

const gameW = 640;
const gameH = 960;
const DEV_MODE = false; // sets timer high, enables level select, turns on FPS, and turns on physics debug
const MAX_LEVEL = 25;

const FONTS = [
  "IBM Plex Mono",
  "Finger Paint",
  "Anonymous Pro",
  "Roboto Mono",
  "PT Sans",
  "Quicksand",
  "IBM Plex Sans",
  "Titillium Web",
];

const COLORS = {
  topGradient: 0x3f8efc, // for background
  bottomGradient: 0x7de2d1, // for background
  fillColor: 0x070600, // colors UI and drawings
  drawColor: 0xfffbfc, // colors player current drawing. other colors: 0xfdd35d, 0xfdca40
  deathColor: 0xc1121f, // when player dies...
  tintColor: 0xfbf8cc, // for highlighting text
  clickColor: 0xdddddd, // when text is clicked
  buttonColor: 0xe0fbfc, // for coloring buttons and the title
  white: 0xffffff,
  black: 0x000000,
};

class Background extends Phaser.Scene {
  constructor() {
    super("Background");
  }

  create() {
    const w = window.innerWidth; // take up the full browser window
    const h = window.innerHeight;

    const graphics = this.add.graphics();

    graphics.fillGradientStyle(
      COLORS.topGradient,
      COLORS.topGradient,
      COLORS.bottomGradient,
      COLORS.bottomGradient,
      0.9
    );
    graphics.fillRect(0, 0, w, h);
    this.scene.launch("MainUI"); // start menu, tutorial, and game launcher
  }
}

class Game extends Phaser.Scene {
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
  level; // the level of the game, contained in localStorage
  levelSelect; // type in number of level and hit enter and it'll load that level
  // only enabled in dev mode
  levelSelectText;
  paused; // see the method createPause for why we need a separate variable for this

  constructor() {
    super("Game");
  }

  preload() {
    // load google's library for the various fonts we want to use
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create(data) {
    this.level = data.level;
    this.level = this.level / 1; // make sure it's a number

    this.createResolution();
    this.createLayout();
    this.createPlayer();
    this.createPlayerControls();
    this.createMouseControls();
    this.createEvents();
    if (DEV_MODE) this.createLevelSelectControls();
    this.createPhysics();

    const numCircles = Math.floor(Math.sqrt(2.8 * this.level));
    const numSquares = Math.floor(this.level * (0.03 * this.level + 0.45));
    this.createCircles(numCircles);
    this.createSquares(numSquares);

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.loadGameText();
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
    const centerX = Math.round(this.gridX / 2);
    this.player = this.physics.add
      .sprite(this.grid[centerX][0].x, this.grid[0][0].y, "rect")
      .setName("player");

    this.player.body.collideWorldBounds = true;
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

    for (let i = 0; i < num; i++) {
      // assign a random point for circle to appear
      const p = bounds.getRandomPoint();

      const circle = this.add
        .arc(p.x, p.y, Phaser.Math.Between(6, 12))
        .setFillStyle(Phaser.Display.Color.RandomRGB(150, 255).color);

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

    const minMaxTime = [150 - (this.level - 1) * 5, 200 - (this.level - 1) * 5];

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
        Phaser.Display.Color.RandomRGB(150, 255).color
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
              duration: time,
            });
          }
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
        if ((t.body || t.getData("filled")) && this.checkInBounds(p)) count++; // count how many tiles we've filled      }
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

      const interval = setInterval(() => {
        if (fpsText.displayList) {
          // if still displaying (game not restarted yet)
          fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`);
        } else clearInterval(interval); // otherwise clear interval
      }, 1000);
    }

    this.levelSelectText = new GameText(this, gameW, 0, "", "l").setOrigin(
      1,
      0
    );
  }

  startGame() {
    if (this.gameOver) clearInterval(this.timeInterval); // just making sure we get it

    this.gameOver = false;

    // every two levels, up the second count by 5
    this.timer = 40 + Math.floor(this.level / 3) * 5;
    if (DEV_MODE) this.timer = 300;

    this.timeText.setVisible(true).setText(`${this.timer}`);

    if (this.timeInterval) return; // we already made an interval from a previous game run
    this.timeInterval = setInterval(() => {
      if (this.gameOver) {
        clearInterval(this.timeInterval);
        return;
      }

      if (this.paused) return; // if game is paused, don't do anything

      this.timer--;
      this.timeText.setText(`${this.timer}`);

      if (this.timer <= 0) {
        clearInterval(this.timeInterval);
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
    const scaleX = this.sizer.width / gameW;
    const scaleY = this.sizer.height / gameH;

    // offset is comparing the game's height to the window's height,
    // and centering the game in (kind of) the middle of the window.
    const offset = (1 + this.parent.height / this.sizer.height) / 2;

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
        from.setFillStyle(COLORS.drawColor, 1);
        this.physics.add.existing(from, true);
        from.body.immovable = true;
      }

      // draw the middle tile always
      mid.setFillStyle(COLORS.drawColor, 1);
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

    this.fillInTilesRecursively(startPos.clone().add(direction));

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
            t.setFillStyle(COLORS.fillColor, 1);
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

    if (Math.round(this.areaFilled * 100) >= 90) this.gameWin();
  }

  fillInTilesRecursively(pos) {
    if (this.checkInBounds(pos)) {
      let tile = this.grid[pos.x][pos.y];
      if (tile.body || tile.getData("filled")) return; // base case!
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
    clearInterval(square.interval);
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

  destroyEnemies() {
    // after a drawing is completed, check for any enemies within the drawing
    // if there are any, destroy them
    const toRemove = [];

    this.circles.getChildren().forEach((c) => {
      const pos = this.convertWorldToGrid(c.x, c.y);
      if (pos && this.grid[pos.x][pos.y].getData("filled")) toRemove.push(c);
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
    if (this.level < MAX_LEVEL) {
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
      const t = new GameText(
        this,
        gameW * 0.5,
        gameH * 0.48,
        "picture complete!",
        "l",
        "c"
      );
    });

    this.time.delayedCall(delay + 2500, () => {
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
      const t = new GameText(
        this,
        gameW * 0.5,
        gameH * 0.48,
        conditionText,
        "l",
        "c"
      );
    });

    this.time.delayedCall(3000, () => {
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
    });
  }
}

class MainUI extends Phaser.Scene {
  pauseButton;
  playButton;
  musicOnButton;
  musicOffButton;
  pauseMenu; // container containing everything used in the pause menu
  pauseOptions; // list w/ the pause menu options so you can select them w/ arrow keys
  activeOption; // to keep track of which option is selected w/ cursor keys
  activeOptions; // which list is currently active and on screen?
  startMenu; // container
  startOptions; // list
  gameActive; // is the game scene running at all
  titleText;
  creditsMenu;
  creditsOptions;
  levelSelectMenu;
  levelSelectOptions;
  levelSelectConfirmMenu;
  levelSelectConfirmOptions;
  tutorialMenu;
  tutorialOptions;
  tutorialActive;

  constructor() {
    super("MainUI");
  }

  preload() {
    // load google's library for the various fonts we want to use
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );

    this.load.setPath("assets");
    this.load.image("pause", "pause.png");
    this.load.image("play", "forward.png");
    this.load.image("musicOn", "musicOn.png");
    this.load.image("musicOff", "musicOff.png");

    this.load.audio("music", "music.mp3");

    this.load.text("credits", "credits.txt");
  }

  create() {
    this.createResolution();
    // show the "game window" while in development
    this.add.rectangle(gameW * 0.5, gameH * 0.5, gameW, gameH, 0x000000, 0.08);

    this.createButtons();
    this.createControls();
    this.createAudio();

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.createTitleText();
        this.createMenus();
      },
    });

    this.gameActive = false;
    this.tutorialActive = false;
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

    // offset is comparing the game's height to the window's height,
    // and centering the game in (kind of) the middle of the window.
    const offset = (1 + this.parent.height / this.sizer.height) / 2;

    camera.setViewport(x, y, this.sizer.width, this.sizer.height * offset);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(gameW / 2, gameH / 2);
  }

  createButtons() {
    this.pauseButton = new GameButton(
      this,
      gameW * 0.875,
      57,
      "pause",
      this.pauseOrResumeGame
    ).setVisible(false);

    this.playButton = new GameButton(
      this,
      gameW * 0.875,
      57,
      "play",
      this.pauseOrResumeGame
    ).setVisible(false);

    this.musicOnButton = new GameButton(
      this,
      gameW * 0.125,
      55,
      "musicOn",
      this.flipMusic
    ).setVisible(false);

    this.musicOffButton = new GameButton(
      this,
      gameW * 0.125,
      55,
      "musicOff",
      this.flipMusic
    ).setVisible(false);
  }

  createControls() {
    const esc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.input.keyboard.on("keydown-ESC", () => {
      if (Phaser.Input.Keyboard.JustDown(esc)) {
        this.pauseOrResumeGame();

        if (this.creditsMenu.visible) this.closeCredits();
      }
    });

    const m = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.input.keyboard.on("keydown-M", () => {
      if (Phaser.Input.Keyboard.JustDown(m)) this.flipMusic();
    });

    // also pause on click away
    this.game.events.addListener(Phaser.Core.Events.BLUR, () => {
      if (!this.scene.isPaused("Game")) this.pauseOrResumeGame();
    });

    const up = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    const w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const down = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.DOWN
    );
    const s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const enter = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );

    // integrating the menu arrow key selection

    this.input.keyboard.on("keydown-UP", () => {
      if (this.activeOptions && Phaser.Input.Keyboard.JustDown(up)) {
        if (this.activeOption == -1) this.activeOption = 0;
        else if (this.activeOption > 0) this.activeOption--;

        for (let i = 0; i < this.activeOptions.length; i++) {
          if (this.activeOption == i) {
            this.activeOptions[i].emit("pointerover");
          } else {
            this.activeOptions[i].emit("pointerout");
          }
        }
      }
    });

    this.input.keyboard.on("keydown-W", () => {
      if (this.activeOptions && Phaser.Input.Keyboard.JustDown(w)) {
        if (this.activeOption == -1) this.activeOption = 0;
        else if (this.activeOption > 0) this.activeOption--;

        for (let i = 0; i < this.activeOptions.length; i++) {
          if (this.activeOption == i) {
            this.activeOptions[i].emit("pointerover");
          } else {
            this.activeOptions[i].emit("pointerout");
          }
        }
      }
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      if (this.activeOptions && Phaser.Input.Keyboard.JustDown(down)) {
        if (this.activeOption == -1) this.activeOption = 0;
        else if (this.activeOption < this.activeOptions.length - 1)
          this.activeOption++;

        for (let i = 0; i < this.activeOptions.length; i++) {
          if (this.activeOption == i) {
            this.activeOptions[i].emit("pointerover");
          } else {
            this.activeOptions[i].emit("pointerout");
          }
        }
      }
    });

    this.input.keyboard.on("keydown-S", () => {
      if (this.activeOptions && Phaser.Input.Keyboard.JustDown(s)) {
        if (this.activeOption == -1) this.activeOption = 0;
        else if (this.activeOption < this.activeOptions.length - 1)
          this.activeOption++;

        for (let i = 0; i < this.activeOptions.length; i++) {
          if (this.activeOption == i) {
            this.activeOptions[i].emit("pointerover");
          } else {
            this.activeOptions[i].emit("pointerout");
          }
        }
      }
    });

    this.input.keyboard.on("keydown-ENTER", () => {
      if (
        this.activeOptions &&
        Phaser.Input.Keyboard.JustDown(enter) &&
        this.activeOption != -1
      ) {
        this.activeOptions[this.activeOption].emit("pointerdown");
      }
    });

    this.input.keyboard.on("keyup-ENTER", () => {
      if (
        this.activeOptions &&
        Phaser.Input.Keyboard.JustUp(enter) &&
        this.activeOption != -1
      ) {
        const option = this.activeOptions[this.activeOption];
        option.emit("pointerup");
        option.emit("pointerout");
      }
    });

    // for credits scrolling
    this.input.on("pointerdown", () => {
      if (this.creditsMenu.visible) {
        const creditsText = this.creditsMenu.getByName("creditsText");
        this.tweens.getTweensOf(creditsText)[0].timeScale = 5;
      }
    });

    this.input.on("pointerup", () => {
      if (this.creditsMenu.visible) {
        const creditsText = this.creditsMenu.getByName("creditsText");
        this.tweens.getTweensOf(creditsText)[0].timeScale = 1;
      }
    });
  }

  createAudio() {
    if (localStorage.getItem("music") == null) {
      localStorage.setItem("music", "on");
    }

    this.sound.add("music").play({
      volume: 0.7,
      loop: true,
    });

    if (localStorage.getItem("music") == "off") this.sound.get("music").pause();
  }

  pauseOrResumeGame() {
    if (!this.gameActive) return; // game hasn't started at all yet
    if (this.scene.get("Game").gameOver) return; // can't pause when ded

    if (!this.scene.isPaused("Game")) {
      this.scene.pause("Game");
      this.pauseButton.setVisible(false);
      this.playButton.setVisible(true);
      this.pauseMenu.setVisible(true);
      this.activeOption = -1;
      this.activeOptions = this.pauseOptions;
    } else {
      this.scene.resume("Game");
      this.pauseButton.setVisible(true);
      this.playButton.setVisible(false);
      this.pauseMenu.setVisible(false);
      this.activeOptions = null;
    }
  }

  flipMusic() {
    const music = this.sound.get("music");
    if (music.isPlaying) {
      music.pause();
      localStorage.setItem("music", "off");

      if (this.gameActive || this.tutorialActive) {
        this.musicOnButton.setVisible(false);
        this.musicOffButton.setVisible(true);
      }
      this.startMenu.getByName("musicText").text = "music: off";
    } else {
      music.resume();
      localStorage.setItem("music", "on");

      if (this.gameActive || this.tutorialActive) {
        this.musicOnButton.setVisible(true);
        this.musicOffButton.setVisible(false);
      }
      this.startMenu.getByName("musicText").text = "music: on";
    }
  }

  createTitleText() {
    this.titleText = new GameText(this, gameW * 0.5, 2, "snip it!", "g", "l")
      //.setFontStyle("bold")
      .setFontSize("120px")
      .setOrigin(0.48, 0)
      .setStroke(COLORS.fillColor, 4)
      .setShadow(4, 4, "#333333", 2, true, true)
      .setColor("#e0fbfc");
  }

  createMenus() {
    this.createPauseMenu();
    this.createStartMenu();
    this.createCreditsMenu();
    this.createLevelSelectMenu();
    this.createLevelSelectConfirmMenu();
    this.createTutorialMenu();

    this.activeOption = -1;
    this.activeOptions = this.startOptions;

    this.startMenu.setVisible(true);
  }

  createPauseMenu() {
    this.pauseMenu = this.add.container(gameW * 0.5, gameH * 0.55).setDepth(1);

    const s = 512; // the graphics object has to be large or it'll be all artifact-y

    this.add
      .graphics()
      .fillStyle(COLORS.white, 1)
      .fillRect(0, 0, s, s)
      .lineStyle(6, COLORS.fillColor, 1)
      .strokeRect(0, 0, s, s)
      .generateTexture("bg", s, s)
      .clear();

    const bg = this.add
      .image(0, 0, "bg")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(gameW * 0.77, gameH * 0.46)
      .setPosition(0, -gameH * 0.06)
      .setTint(0x00b4d8, 0x00b4d8, 0xc8b6ff, 0xc8b6ff)
      .setAlpha(0.6);

    // leaving this graveyard of pause menu background gradients here for a bit
    // some of these are a work of art, but don't fit the overall aesthetic
    //.setTint(0x0077b6, 0x0077b6, 0xc8b6ff, 0xc8b6ff);
    //.setTint(0x90e0ef, 0x90e0ef, 0xc8b6ff, 0xc8b6ff);
    /*
    const hsv = Phaser.Display.Color.HSVColorWheel(0.2);
    //const cs = Phaser.Display.Color.ColorSpectrum(300);

    const size = 250;

    for (let i = 0; i < size; i++) {
      //g.fillStyle(hsv[i].color, 0.8);
      //g.fillStyle(Phaser.Display.Color.RandomRGB(100, 200).color);
      for (let j = 0; j < size; j++) {
        const sum = Math.round((i + j) / 2);
        g.fillStyle(hsv[sum + (340 - size)].color, 0.8);
        g.fillPoint(j * 2, i * 2, 2);
      }
    }*/

    const r1 = new GameText(
      this,
      0,
      -gameH * 0.2,
      "game paused",
      "g",
      "c"
    ).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: r1,
      y: r1.y - 20,
      yoyo: true,
      duration: 1600,
      loop: -1,
      ease: "sine.inout",
    });

    const r2 = new GameText(
      this,
      0,
      -gameH * 0.08,
      "resume game",
      "l",
      undefined,
      this.pauseOrResumeGame
    );

    const r3 = new GameText(
      this,
      0,
      gameH * 0.02,
      "restart level",
      "l",
      undefined,
      () => {
        this.pauseOrResumeGame();
        //localStorage.setItem("level", 1);
        const g = this.scene.get("Game");
        //g.level = 1;
        g.gameOver = true;
        g.restartGame();
      }
    );

    const r4 = new GameText(
      this,
      0,
      gameH * 0.12,
      "return to title",
      "l",
      undefined,
      this.returnToTitle
    );

    this.pauseMenu.add([bg, r1, r2, r3, r4]).setVisible(false);

    this.pauseOptions = [r2, r3, r4];
  }

  createStartMenu() {
    this.startMenu = this.add.container(gameW * 0.05, gameH * 0.28);
    this.startOptions = [];

    const s1 = new GameText(
      this,
      0,
      gameH * 0,
      "start game",
      "g",
      undefined,
      () => {
        // leave off at last level played, or just start from the top
        const lvl = localStorage.getItem("level") || 1;
        this.launchGame(lvl);
      }
    ).setOrigin(0, 0.5);

    const s2 = new GameText(
      this,
      0,
      gameH * 0.13,
      "tutorial",
      "g",
      undefined,
      this.launchTutorial
    ).setOrigin(0, 0.5);

    const s3 = new GameText(
      this,
      0,
      gameH * 0.26,
      "level select",
      "g",
      undefined,
      this.openLevelSelect
    ).setOrigin(0, 0.5);

    const s4 = new GameText(
      this,
      0,
      gameH * 0.39,
      "music: on",
      "g",
      undefined,
      this.flipMusic
    )
      .setOrigin(0, 0.5)
      .setName("musicText");

    if (localStorage.getItem("music") == "off") s4.setText("music: off");

    const s5 = new GameText(
      this,
      0,
      gameH * 0.52,
      "credits",
      "g",
      undefined,
      this.openCredits
    ).setOrigin(0, 0.5);

    const s6 = new GameText(
      this,
      gameW - this.startMenu.x,
      gameH - this.startMenu.y,
      VERSION,
      "m"
    )
      .setOrigin(1, 1)
      .setPadding(10);

    this.startMenu.add([s1, s2, s3, s4, s5, s6]).setVisible(false);

    this.startOptions.push(s1, s2, s3, s4, s5);
  }

  createCreditsMenu() {
    this.creditsMenu = this.add.container();
    this.creditsOptions = [];

    const s1 = new GameText(
      this,
      gameW * 0.5,
      gameH * 0.88,
      this.cache.text.get("credits"),
      "l",
      undefined
    )
      .setOrigin(0.5, 0)
      .setLineSpacing(30)
      .setName("creditsText")
      .setVisible(false);

    this.add.tween({
      targets: s1,
      y: -s1.height * 0.8,
      duration: 24000,
      loop: -1,
      paused: true,
      onUpdate: () => {
        // creates a scrolling text with a top and bottom cutoff
        // I wrote this but I barely understand how it works.
        const topBound = gameH * 0.18 - s1.y;
        const bottomBound = gameH * 0.85 - s1.y;
        if (topBound < 0) {
          s1.setCrop(0, topBound, gameW, bottomBound);
        } else {
          s1.setCrop(0, topBound, gameW, bottomBound - topBound);
        }

        if (!s1.visible) s1.setVisible(true); // must set crop first
      },
    });

    const s2 = new GameText(
      this,
      gameW - 40,
      gameH - 40,
      "return",
      "g",
      undefined,
      this.closeCredits
    ).setOrigin(1, 1);

    this.creditsMenu.add([s1, s2]).setVisible(false);

    this.creditsOptions.push(s2);
  }

  openCredits() {
    this.startMenu.setVisible(false);
    this.creditsMenu.setVisible(true);
    this.activeOptions = this.creditsOptions;
    this.activeOption = -1;

    const creditsText = this.creditsMenu.getByName("creditsText");
    this.tweens.getTweensOf(creditsText)[0].play();
  }

  closeCredits() {
    this.startMenu.setVisible(true);
    this.creditsMenu.setVisible(false);
    this.activeOptions = this.startOptions;
    this.activeOption = -1;

    const creditsText = this.creditsMenu.getByName("creditsText");
    this.tweens.getTweensOf(creditsText)[0].restart().pause();
    creditsText.setVisible(false);
  }

  createLevelSelectMenu() {
    this.levelSelectMenu = this.add.container(gameW * 0.05, gameH * 0.22);
    this.levelSelectOptions = [];

    const s1 = new GameText(
      this,
      0,
      0,
      "level select",
      "g",
      undefined
    ).setOrigin(0, 0.5);

    for (let i = 0; i <= 4; i++) {
      let lvl = i * 5;
      if (i == 0) lvl = 1;

      const s = new GameText(
        this,
        gameW * 0.09,
        gameH * 0.115 * (i + 1),
        lvl,
        "g",
        undefined,
        () => {
          this.openLevelSelectConfirm(lvl);
        }
      ).setOrigin(0.5, 0.5);

      this.levelSelectMenu.add(s);
      this.levelSelectOptions.push(s);
    }

    const s2 = new GameText(
      this,
      gameW - 40 - this.levelSelectMenu.x,
      gameH - 40 - this.levelSelectMenu.y,
      "return",
      "g",
      undefined,
      this.closeLevelSelect
    ).setOrigin(1, 1);

    const s3 = new GameText(
      this,
      gameW * 0.6,
      gameH * 0.13,
      "never played?\nstart at level 1!",
      "m",
      undefined
    )
      .setOrigin(0.5, 0.5)
      .setLineSpacing(10)
      .setFontSize("36px");

    const s4 = new GameText(
      this,
      gameW * 0.6,
      gameH * 0.33,
      "levels 5-15\nfor a challenge!",
      "m",
      undefined
    )
      .setOrigin(0.5, 0.5)
      .setLineSpacing(10)
      .setFontSize("36px");

    const s5 = new GameText(
      this,
      gameW * 0.6,
      gameH * 0.53,
      "level 20?\ngood luck :)",
      "m",
      undefined
    )
      .setOrigin(0.5, 0.5)
      .setLineSpacing(10)
      .setFontSize("36px");

    const s6 = new GameText(
      this,
      gameW * 0.22,
      gameH * 0.7,
      "beat level 25\nfor a prize!",
      "m",
      undefined
    )
      .setOrigin(0.5, 0.5)
      .setLineSpacing(10)
      .setFontSize("36px");

    this.levelSelectMenu.add([s1, s2, s3, s4, s5, s6]).setVisible(false);
    this.levelSelectOptions.push(s2);
  }

  openLevelSelect() {
    this.startMenu.setVisible(false);
    this.levelSelectMenu.setVisible(true);
    this.activeOptions = this.levelSelectOptions;
    this.activeOption = -1;
  }

  closeLevelSelect() {
    this.startMenu.setVisible(true);
    this.levelSelectMenu.setVisible(false);
    this.activeOptions = this.startOptions;
    this.activeOption = -1;
  }

  // yeah I know it's a long name, ok, go away
  createLevelSelectConfirmMenu() {
    this.levelSelectConfirmMenu = this.add
      .container(gameW * 0.5, gameH * 0.55)
      .setDepth(1);

    const bg = this.add
      .image(0, 0, "bg")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(gameW * 0.77, gameH * 0.46)
      .setPosition(0, -gameH * 0.06)
      .setTint(0x00b4d8, 0x00b4d8, 0xc8b6ff, 0xc8b6ff)
      .setAlpha(1);

    const r1 = new GameText(
      this,
      0,
      -gameH * 0.16,
      "start at\nlevel " + "?",
      "g",
      "c"
    )
      .setOrigin(0.5, 0.5)
      .setLineSpacing(10)
      .setName("levelSelectConfirmText");

    this.tweens.add({
      targets: r1,
      y: r1.y - 20,
      yoyo: true,
      duration: 1600,
      loop: -1,
      ease: "sine.inout",
    });

    const r2 = new GameText(
      this,
      0,
      gameH * 0.01,
      "yes!",
      "l",
      undefined,
      () => {
        this.closeLevelSelectConfirm();
        this.launchGame(r2.lvl);
      }
    ).setName("levelSelectConfirmYes");

    const r3 = new GameText(
      this,
      0,
      gameH * 0.12,
      "no!",
      "l",
      undefined,
      this.closeLevelSelectConfirm
    );

    this.levelSelectConfirmMenu.add([bg, r1, r2, r3]).setVisible(false);

    this.levelSelectConfirmOptions = [r2, r3];
  }

  openLevelSelectConfirm(lvl) {
    const t = this.levelSelectConfirmMenu.getByName("levelSelectConfirmText");
    t.text = "start at\nlevel " + lvl + "?";

    const y = this.levelSelectConfirmMenu.getByName("levelSelectConfirmYes");
    y.lvl = lvl;

    this.levelSelectConfirmMenu.setVisible(true);
    this.activeOptions = this.levelSelectConfirmOptions;
    this.activeOption = -1;
  }

  closeLevelSelectConfirm() {
    this.levelSelectConfirmMenu.setVisible(false);
    this.activeOptions = this.levelSelectOptions;
    this.activeOption = -1;
  }

  createTutorialMenu() {
    this.tutorialMenu = this.add.container(gameW * 0.05, gameH * 0.22);
    this.tutorialOptions = [];

    const s1 = new GameText(this, 0, 0, "tutorial", "g", undefined)
      .setOrigin(0, 0.5)
      .setVisible(false);

    const s2 = new GameText(
      this,
      gameW - 40 - this.tutorialMenu.x,
      gameH - 40 - this.tutorialMenu.y,
      "return",
      "g",
      undefined,
      this.returnToTitle
    ).setOrigin(1, 1);

    const s3 = new GameText(
      this,
      gameW * 0.6,
      gameH * 0.13,
      "never played?\nstart at level 1!",
      "m",
      undefined
    )
      .setAlign("left")
      .setOrigin(0.5, 0.5)
      .setLineSpacing(10)
      .setFontSize("36px")
      .setVisible(false);

    this.tutorialMenu.add([s1, s2, s3]).setVisible(false);
    this.tutorialOptions.push(s2);
  }

  launchTutorial() {
    this.scene.launch("Tutorial");

    if (this.sound.get("music").isPlaying) {
      this.musicOnButton.setVisible(true);
    } else {
      this.musicOffButton.setVisible(true);
    }

    this.titleText.setFontSize("72px");
    this.startMenu.setVisible(false);
    this.tutorialActive = true;
    this.tutorialMenu.setVisible(true);
    this.activeOptions = this.tutorialOptions;
    this.activeOption = -1;
    this.scene.bringToTop("MainUI");
  }

  launchGame(lvl) {
    this.scene.launch("Game", { level: lvl });
    this.scene.bringToTop("MainUI");
    this.pauseButton.setVisible(true);

    if (this.sound.get("music").isPlaying) {
      this.musicOnButton.setVisible(true);
    } else {
      this.musicOffButton.setVisible(true);
    }

    this.titleText.setFontSize("72px");
    this.startMenu.setVisible(false);
    this.levelSelectMenu.setVisible(false); // in case we came from here
    this.activeOptions = null;
    this.activeOption = -1;
    this.gameActive = true;
  }

  returnToTitle() {
    // can come from either game scene or tutorial scene
    this.scene.stop("Game");
    this.scene.stop("Tutorial");
    this.pauseButton.setVisible(false);
    this.playButton.setVisible(false);
    this.musicOnButton.setVisible(false);
    this.musicOffButton.setVisible(false);
    this.titleText.setFontSize("120px");
    this.pauseMenu.setVisible(false);
    this.tutorialMenu.setVisible(false);
    this.startMenu.setVisible(true);
    this.activeOptions = this.startOptions;
    this.activeOption = -1;
    this.gameActive = false;
    this.tutorialActive = false;
  }
}

class Tutorial extends Phaser.Scene {
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
  pointerDown; // is mouse or touch input down

  constructor() {
    super("Tutorial");
  }

  preload() {
    // load google's library for the various fonts we want to use
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    this.createResolution();
    this.createLayout();
    this.createPlayer();
    this.createPlayerControls();
    this.createMouseControls();
    this.createPhysics();

    // this.canMove = false; // wait until tutorial is over

    const interval = setInterval(() => {
      // check if we're stuck!
      const directions = [
        Phaser.Math.Vector2.DOWN,
        Phaser.Math.Vector2.UP,
        Phaser.Math.Vector2.LEFT,
        Phaser.Math.Vector2.RIGHT,
      ];

      let count = 0;
      directions.forEach((dir) => {
        const step = this.gridPos.clone().add(dir.clone().scale(2));
        if (this.checkInGrid(step)) {
          const tile = this.grid[step.x][step.y];
          if (tile.fillColor == COLORS.drawColor) {
            count++;
          }
        }
      });

      if (count >= 4) {
        clearInterval(interval);
        this.time.delayedCall(800, () => this.scene.restart());
      }

      this.keysDown.removeAll();
      const r = Phaser.Math.Between(1, 4);
      switch (r) {
        case 1:
          this.keysDown.add(Phaser.Math.Vector2.DOWN);
          break;
        case 2:
          this.keysDown.add(Phaser.Math.Vector2.UP);
          break;
        case 3:
          this.keysDown.add(Phaser.Math.Vector2.LEFT);
          break;
        case 4:
          this.keysDown.add(Phaser.Math.Vector2.RIGHT);
          break;
        default:
          break;
      }
    }, 500);

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.loadGameText();
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
    const centerX = Math.round(this.gridX / 2);
    this.player = this.physics.add
      .sprite(this.grid[centerX][0].x, this.grid[0][0].y, "rect")
      .setName("player");

    this.player.body.collideWorldBounds = true;
    this.player.body.onWorldBounds = true;
    this.gridPos = new Phaser.Math.Vector2(centerX, 0);
    this.canMove = true;
    this.drawing = false;
  }

  createPhysics() {
    this.physics.world.setBounds(
      this.bounds.getTopLeft().x - this.player.width / 2,
      this.bounds.getTopLeft().y - this.player.width / 2,
      this.bounds.width + this.player.width,
      this.bounds.height + this.player.width
    );
  }

  loadGameText() {}

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

    // offset is comparing the game's height to the window's height,
    // and centering the game in (kind of) the middle of the window.
    const offset = (1 + this.parent.height / this.sizer.height) / 2;

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

  update() {
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
        from.setFillStyle(COLORS.drawColor, 1);
        this.physics.add.existing(from, true);
        from.body.immovable = true;
      }

      // draw the middle tile always
      mid.setFillStyle(COLORS.drawColor, 1);
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
    this.time.delayedCall(80 - 1 * 1.6, () => (this.canMove = true));
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

    this.fillInTilesRecursively(startPos.clone().add(direction));

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
            t.setFillStyle(COLORS.fillColor, 1);
            t.setData("filled", true);
            this.edgePoints.add(p);
          }
        }
      }
    }
  }

  fillInTilesRecursively(pos) {
    if (this.checkInBounds(pos)) {
      let tile = this.grid[pos.x][pos.y];
      if (tile.body || tile.getData("filled")) return; // base case!
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
}

// game scale configuration also stolen from
// https://labs.phaser.io/100.html?src=src\scalemanager\mobile%20game%20example.js
const config = {
  type: Phaser.AUTO,
  backgroundColor: 0x000000,
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
  scene: [Background, MainUI, Game, Tutorial],
  physics: {
    default: "arcade",
    arcade: {
      debug: DEV_MODE,
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
    text,
    size = "m", // s, m, l, or g for small, medium, or large
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
            : "26px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily("Roboto Mono")
      .setOrigin(align == "l" ? 0 : align == "c" ? 0.5 : 1, 0.5)
      .setPadding(3)
      .setStroke(COLORS.fillColor, 2)
      .setShadow(2, 2, "#333333", 2, true, true);

    if (size == "s") {
      cT.setStroke(COLORS.fillColor).setShadow(2, 2, "#333333", 0, true, true);
    }

    //"IBM Plex Mono", "Finger Paint", "Anonymous Pro"
    //"Roboto Mono", "PT Sans", "Quicksand", "IBM Plex Sans", "Titillium Web"

    // if callback is given, assume it's a button and add callback.
    // fine-tuned this code so button only clicks if player
    // emits both pointerdown and pointerup events on it
    // update 2: now much more complex w/ arrow key integration
    if (callback) {
      cT.setInteractive({ useHandCursor: true })
        .on("pointermove", function (pointer) {
          this.emit("pointerover", pointer);
        })
        .on("pointerover", function (pointer) {
          if (pointer) scene.activeOption = scene.activeOptions.indexOf(this);
          this.setTint(COLORS.tintColor).setScale(1.02);
          scene.activeOptions.forEach((option) => {
            if (option != this) option.emit("pointerout");
          });
        })
        .on("pointerout", function (pointer) {
          if (pointer) scene.activeOption = -1; // if mouse used, reset arrow key selection
          this.setTint(COLORS.white).setScale(1);
          this.off("pointerup", callback, scene);
        })
        .on("pointerdown", function () {
          this.setTint(COLORS.clickColor);
          if (this.listenerCount("pointerup") < 2) {
            this.on("pointerup", callback, scene);
          }
        })
        .on("pointerup", function () {
          this.setTint(COLORS.tintColor);
          //scene.game.canvas.style.cursor = "auto"; // trying to fix hand cursor remaining on click
        });
    }

    return cT;
  }
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
        this.setTint(COLORS.tintColor).setScale(0.82);
      })
      .on("pointerout", function () {
        this.setTint(COLORS.buttonColor).setScale(0.75);
      })
      .on("pointerdown", callback, scene);

    return cB;
  }
}

const game = new Phaser.Game(config);
