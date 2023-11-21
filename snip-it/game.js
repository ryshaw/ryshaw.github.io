const VERSION = "Snip It! v0.1";

class Background extends Phaser.Scene {
  constructor() {
    super("Background");
  }

  create() {
    // add gradient background. this is stolen from a phaser example
    // https://labs.phaser.io/view.html?src=src/fx\gradient\gradient%20fx.js
    const num1 = 0.1;
    const num2 = 0.9;
    const top = "0x023e8a";
    const bottom = "0x457b9d";
    const w = window.innerWidth; // take up the full browser window
    const h = window.innerHeight;
    this.add
      .image(w / 2, h / 2, "__WHITE")
      .setDisplaySize(w, h)
      .preFX.addGradient(top, bottom, 0.16, num1, num1, num2, num2, 18);

    this.scene.launch("Game");
  }
}

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
  drawColor = 0xf8edeb; // colors the line the player is currently drawing
  areaFilled = 0; // percentage of area that has been drawn in
  areaText;
  pointerDown; // is mouse or touch input down

  constructor() {
    super("Game");
  }

  preload() {
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
      this.gameW * 0.9,
      this.gameH * 0.75,
      0xffffff,
      0.1
    );

    this.grid = [];
    const start = this.bounds.getTopLeft();

    const aspectRatio = this.bounds.width / this.bounds.height;
    this.gridY = 81;
    this.gridX = Math.round(this.gridY * aspectRatio);
    if (this.gridX % 2 == 0) this.gridX++; // must be odd

    const w = this.bounds.width / this.gridX;
    const h = this.bounds.height / this.gridY;

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
          .setStrokeStyle(0.8, 0xffffff, 0.1)
          .setData("counted", false);

        this.grid[i][j] = r;

        // fill up edges
        if (i == 0 || i == this.gridX - 1 || j == 0 || j == this.gridY - 1) {
          this.grid[i][j].setFillStyle(this.fillColor, 1);
          this.physics.add.existing(this.grid[i][j]);
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
        t.setData("counted", false);

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
    const playerW = 12;
    rectangleDrawer.fillStyle(0xe0fbfc, 1);
    rectangleDrawer.fillRect(0, 0, playerW, playerW);
    rectangleDrawer.generateTexture("rect", playerW, playerW);
    this.player = this.physics.add
      .sprite(this.grid[0][0].x, this.grid[0][0].y, "rect")
      .setName("player");
    this.player.setCollideWorldBounds(true);
    this.player.body.onWorldBounds = true;
    this.gridPos = new Phaser.Math.Vector2(0, 0);
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

    this.physics.world.on("worldbounds", (body, up, down, left, right) => {});
  }

  loadGameUI() {
    new CustomText(this, this.gameW * 0.5, 20, "snip it!", "g", "l")
      .setOrigin(0.5, 0)
      .postFX.addGlow(0xffffff, 0.45);

    new CustomText(
      this,
      this.gameW * 0.5,
      this.gameH - 20,
      "a game by ryshaw\nmade in phaser 3",
      "m",
      "c"
    )
      .setOrigin(0.5, 1)
      .postFX.addGlow(0xffffff, 0.3);

    let count = 0; // count how many tiles we've filled
    for (let i = 0; i < this.gridX; i++) {
      for (let j = 0; j < this.gridY; j++) {
        const t = this.grid[i][j];
        if (t.body) count++; // count how many tiles we've filled
      }
    }

    // display how much area we've covered
    this.areaFilled =
      Math.round((100 * count) / (this.gridX * this.gridY)) / 100;

    this.areaText = new CustomText(
      this,
      this.gameW * 0.87,
      this.gameH - 40,
      `${this.areaFilled * 100}%`,
      "m",
      "c"
    ).setOrigin(0.5, 1);

    this.areaText.postFX.addGlow(0xffffff, 0.3);
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

    // check if we're going to an edge (player is allowed to walk on edges)
    let edge = false;
    this.edgePoints.list.forEach((p) => {
      if (nextPos.x == p.x && nextPos.y == p.y) {
        edge = true;
      }
    });
    // player is not allowed to move onto any filled area that isn't an edge
    if (nextTile.body && !edge) return;

    // if (this.checkInBounds(nextPos) && nextTile.body && !edge) return;

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
        this.physics.add.existing(from);
        from.body.immovable = true;
      }

      // draw the middle tile always
      mid.setFillStyle(this.drawColor, 1);
      this.physics.add.existing(mid);
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
    this.time.delayedCall(80, () => (this.canMove = true));
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
        if (t.body) count++; // count how many tiles we've filled

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

    // display how much area we've covered
    this.areaFilled =
      Math.round((100 * count) / (this.gridX * this.gridY)) / 100;

    this.areaText.setText(`${Math.round(this.areaFilled * 100)}%`);
  }

  fillInTilesRecursiely(pos) {
    if (this.checkInBounds(pos)) {
      let tile = this.grid[pos.x][pos.y];
      if (tile.body) return; // base case!
      tile.setFillStyle(this.fillColor, 0.4);
      this.physics.add.existing(tile);
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
    return !(
      pos.y <= 0 ||
      pos.y >= this.gridY - 1 ||
      pos.x <= 0 ||
      pos.x >= this.gridX - 1
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

// game configuration also stolen from
// https://labs.phaser.io/100.html?src=src\scalemanager\mobile%20game%20example.js
const config = {
  type: Phaser.AUTO,
  backgroundColor: "#000000",
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
      gravity: { y: 0 },
      debug: false,
    },
  },
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
