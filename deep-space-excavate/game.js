const VERSION = "Deep Space Excavate v0.1";

const DEV_MODE = false; // turns on physics debug mode

const gameW = 1920;
const gameH = 1080;

const START_SCENE = "Game"; // for testing different scenes

const FONTS = ["Lexend"];

const CLRS = {
  topGradient: 0x0c1821, // for background
  bottomGradient: 0x001233, // for background
  highlightColor: 0xffef9f, // for highlighting text
  clickColor: 0xbfbdc1, // when text is clicked
  spaceColors: [0xcdb4db, 0xffc8dd, 0xffafcc, 0xbde0fe, 0xa2d2ff, 0x8affc1],
  tileColor: 0x272635,
  edgeColor: 0xa6a6a8,
  oreColor: 0x00b4d8,
  textButton: {
    fill: 0x023e7d, //0x2a9134,
    stroke: 0xffffff,
    shadow: "#023e7d", //"#00a8e8",
  },
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
      function (x, y, text, size, width) {
        let t = new GameText(this.scene, x, y, text, size, width);

        this.displayList.add(t);
        this.updateList.add(t);

        return t;
      }
    );

    Phaser.GameObjects.GameObjectFactory.register(
      "gameTextButton",
      function (x, y, text, size, width, callback) {
        let t = new GameTextButton(
          this.scene,
          x,
          y,
          text,
          size,
          width,
          callback
        );

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

    this.loadSpaceSpritesheet();
  }

  loadSpaceSpritesheet() {
    this.load.setPath("./assets/kenney_simple-space/Tilesheet/");

    this.load.spritesheet({
      key: "ship",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 0,
        endFrame: 10,
      },
    });

    this.load.spritesheet({
      key: "advancedShip",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 11,
        endFrame: 20,
      },
    });

    this.load.spritesheet({
      key: "outpost",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 21,
        endFrame: 23,
      },
    });

    this.load.spritesheet({
      key: "asteroid",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 24,
        endFrame: 27,
      },
    });

    this.load.spritesheet({
      key: "star",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 28,
        endFrame: 31,
      },
    });

    this.load.spritesheet({
      key: "asteroid2",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 32,
        endFrame: 35,
      },
    });

    this.load.spritesheet({
      key: "satellite",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 36,
        endFrame: 39,
      },
    });

    this.load.spritesheet({
      key: "target",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 40,
        endFrame: 45,
      },
    });

    this.load.spritesheet({
      key: "effect",
      url: "simpleSpace_tilesheet@2.png",
      frameConfig: {
        frameWidth: 128,
        frameHeight: 128,
        startFrame: 46,
        endFrame: 47,
      },
    });
  }

  create() {
    this.graphics = this.add.graphics();

    this.graphics.fillGradientStyle(
      CLRS.topGradient,
      CLRS.topGradient,
      CLRS.bottomGradient,
      CLRS.bottomGradient,
      0.9
    );
    this.graphics.fillRect(0, 0, window.innerWidth, window.innerHeight);

    this.scene.launch("Stars"); // stars background behind every scene
    this.scene.launch(START_SCENE);

    this.scale.on("resize", this.resize, this);
  }

  resize(gameSize) {
    this.graphics.clear();
    this.graphics.fillGradientStyle(
      CLRS.topGradient,
      CLRS.topGradient,
      CLRS.bottomGradient,
      CLRS.bottomGradient,
      0.9
    );
    this.graphics.fillRect(0, 0, gameSize.width, gameSize.height);
  }
}

class Game extends Phaser.Scene {
  player;
  keysDown;
  grid;
  filledTiles;
  edgeTiles;
  oreTiles;
  tileW;
  selectedObj; // what object the mouse is holding
  prefab; // to instantiate our custom game objects
  path; // the path that the drone is mining, used by aliens
  threatLevel; // increases as drone mines and grabs more minerals
  portal; // the alien portal is located wherever the drone lands

  constructor() {
    super("Game");
  }

  create() {
    this.prefab = new Prefab(this);
    this.createResolution();

    //this.cameras.main.fadeIn();

    this.createAsteroidGrid();
    this.centerAsteroidGrid();

    this.createOreDeposits();
    this.createMouseControls();

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.createDeployButton();
        this.createMenu();
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

  createAsteroidGrid() {
    /* procedural generation is based around spawning a number of circles
    and then filling in tiles that overlap with the circles.
    the middle 1/3 portion is also filled in for consistency. */

    const shapes = [];

    const num = 32; // how many circles to spawn
    for (let i = 0; i < num; i++) {
      const x = Phaser.Math.Between(gameW * 0.275, gameW * 0.725);
      const y = Phaser.Math.Between(gameH * 0.275, gameH * 0.725);
      const w = Phaser.Math.Between(40, 400);

      const c = this.add.circle(x, y, w * 0.5, 0xff0000, 0).setDepth(1);

      shapes[i] = new Phaser.Geom.Circle(c.x, c.y, c.radius);
    }

    this.grid = [];
    this.filledTiles = new Phaser.Structs.List();

    const gridX = 42; // how wide is the grid
    const gridY = 30; // height of the grid
    this.tileW = 32; // width of each tile in pixels

    // top left corner
    const startX = gameW * 0.4 - gridX * this.tileW * 0.5;
    const startY = gameH * 0.48 - gridY * this.tileW * 0.5;

    for (let i = 0; i < gridX; i++) {
      this.grid[i] = [];
      for (let j = 0; j < gridY; j++) {
        const x = startX + i * this.tileW;
        const y = startY + j * this.tileW;
        const rectangle = this.add
          .rectangle(x, y, this.tileW, this.tileW)
          .setAlpha(0)
          .setData("x", i)
          .setData("y", j);

        const r = new Phaser.Geom.Rectangle(
          rectangle.getTopLeft().x,
          rectangle.getTopLeft().y,
          rectangle.width,
          rectangle.height
        );

        shapes.forEach((circle) => {
          if (Phaser.Geom.Intersects.CircleToRectangle(circle, r))
            this.fillInTile(rectangle);
        });

        // fill in middle 1/3 of the map always
        if (
          i >= Math.round((gridX * 1) / 3) &&
          i <= Math.round((gridX * 2) / 3) &&
          j >= Math.round((gridY * 1) / 3) &&
          j <= Math.round((gridY * 2) / 3)
        ) {
          this.fillInTile(rectangle);
        }

        this.grid[i][j] = rectangle;
      }
    }

    // pass over the map one time to fill in tiles that have 3+ neighbors.
    // this fills in and removes some weird gaps/holes
    for (let i = 0; i < gridX; i++) {
      for (let j = 0; j < gridY; j++) {
        const tile = this.grid[i][j];

        if (i <= 0 || i >= gridX - 1 || j <= 0 || j >= gridY - 1) continue;
        if (tile.getData("filled")) continue;

        const neighbors = [
          this.grid[i - 1][j],
          this.grid[i + 1][j],
          this.grid[i][j - 1],
          this.grid[i][j + 1],
        ];

        let count = 0;

        neighbors.forEach((n) => {
          if (n.getData("filled")) count++;
        });

        if (count >= 3) this.fillInTile(tile);
      }
    }

    // finally, color the edge tiles a different color
    this.edgeTiles = new Phaser.Structs.List();

    this.filledTiles.each((tile) => {
      const x = tile.getData("x");
      const y = tile.getData("y");

      if (x == 0 || x == gridX - 1 || y == 0 || y == gridY - 1) {
        tile.setFillStyle(CLRS.edgeColor).setData("edge", true);
        this.edgeTiles.add(tile);
      } else {
        const neighbors = [
          this.grid[x - 1][y],
          this.grid[x + 1][y],
          this.grid[x][y - 1],
          this.grid[x][y + 1],
        ];

        neighbors.forEach((n) => {
          if (!n.getData("filled")) {
            tile.setFillStyle(CLRS.edgeColor).setData("edge", true);
            this.edgeTiles.add(tile);
          }
        });
      }
    });
  }

  fillInTile(tile) {
    tile.setAlpha(1).setFillStyle(CLRS.tileColor).setData("filled", true);
    this.filledTiles.add(tile);
  }

  centerAsteroidGrid() {
    // center the asteroid we've generated in the middle of the map

    // first, find out how many units we are from each side
    let top;
    let bottom;
    let left;
    let right;
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        const tile = this.grid[i][j];
        if (tile.getData("filled")) {
          if (!left) left = i;
          right = i;

          if (!top) top = j;
          if (top && j < top) top = j;

          if (!bottom) bottom = j;
          if (bottom && j > bottom) bottom = j;
        }
      }
    }

    bottom = this.grid[0].length - 1 - bottom;
    right = this.grid.length - 1 - right;

    // make the shift by swapping tiles
    const shiftX = Math.round(left - Phaser.Math.Average([right, left]));
    const shiftY = Math.round(top - Phaser.Math.Average([top, bottom]));

    if (shiftX == 0 && shiftY == 0) return;

    let start = new Phaser.Math.Vector2(this.grid[0][0].x, this.grid[0][0].y);

    for (let i = 0; i < this.grid.length; i++) {
      if (i - shiftX < 0 || i - shiftX > this.grid.length - 1) continue;
      for (let j = 0; j < this.grid[i].length; j++) {
        if (j - shiftY < 0 || j - shiftY > this.grid[i].length - 1) continue;

        const tile = this.grid[i][j];
        const swap = this.grid[i - shiftX][j - shiftY];

        tile.x = start.x + (i - shiftX) * this.tileW;
        tile.y = start.y + (j - shiftY) * this.tileW;

        swap.x = start.x + i * this.tileW;
        swap.y = start.y + j * this.tileW;

        this.grid[i][j] = swap.setData("x", i).setData("y", j);
        this.grid[i - shiftX][j - shiftY] = tile
          .setData("x", i - shiftX)
          .setData("y", j - shiftY);
      }
    }
  }

  checkIfInGrid(x, y) {
    const gridX = this.grid.length;
    const gridY = this.grid[0].length;

    return x >= 0 && x <= gridX - 1 && y >= 0 && y <= gridY - 1;
  }

  checkIfFilled(x, y) {
    return this.grid[x][y].getData("filled");
  }

  checkIfEdge(x, y) {
    return this.grid[x][y].getData("edge");
  }

  checkIfHasTurret(x, y) {
    return this.grid[x][y].getData("turret");
  }

  createOreDeposits() {
    // create num ore deposits
    // algorithm will spawn new ore deposits away from edges and other ore deposits

    const num = 8; //Phaser.Math.Between(8, 12);
    this.oreTiles = new Phaser.Structs.List();

    for (let i = 1; i <= num; i++) {
      let iterations = 30;

      findSpot: while (iterations > 0) {
        iterations -= 1;

        const tile = this.filledTiles.getRandom();
        const x = tile.getData("x");
        const y = tile.getData("y");

        if (tile.getData("ore")) continue findSpot;

        //this.grid[x][y].setFillStyle(0xff0000, 0.9);

        // check neighbors to see if they're filled or have ore

        for (let dist = 1; dist <= 4; dist++) {
          for (let angle = 0; angle < 360; angle += 15) {
            const v = new Phaser.Math.Vector2(dist, 0);

            const r = Phaser.Math.DegToRad(angle);
            v.setAngle(r);
            v.x = Math.round(v.x) + x;
            v.y = Math.round(v.y) + y;

            if (!this.checkIfInGrid(v.x, v.y)) continue findSpot;
            if (!this.checkIfFilled(v.x, v.y)) continue findSpot;
            if (dist <= 2 && this.grid[v.x][v.y].getData("ore"))
              continue findSpot;
          }
        }

        this.grid[x][y].setFillStyle(CLRS.oreColor, 0.9).setData("ore", true);
        this.oreTiles.add(this.grid[x][y]);
        break;
      }

      if (iterations < 5) console.log(iterations); // uh oh, having trouble finding spot

      if (iterations <= 0) {
        // give up, we can't find a suitable spot
        console.log("ore deposits made: " + i);
        return;
      }
    }
  }

  createMiningDrone(x, y) {
    const mineSpeed = 800;

    let start = this.grid[x][y];
    this.portal = start;

    const miner = this.prefab
      .instantiate(
        Prefab.Object.Drone,
        start.x,
        start.y,
        this.tileW,
        this.tileW
      )
      .setData("x", start.getData("x"))
      .setData("y", start.getData("y"));

    miner.setData(
      "loop",
      this.time.addEvent({
        loop: true,
        delay: mineSpeed, //800,
        callback: () => this.updateMiningDrone(miner),
      })
    );
  }

  updateMiningDrone(miner) {
    // pick next target to head to
    // could be ore, or if there's no more ore left,
    // the miner will leave to space through
    // the shorest path
    let target;

    if (this.oreTiles.length <= 0) {
      // no more ore to mine, escape from the asteroid
      target = this.returnMiningDrone(miner);
    }

    // if ore, find closest ore target to head to
    let targetDist;

    // only goes through this if oreTiles has any entries
    this.oreTiles.each((oreTile) => {
      const dist = Phaser.Math.Distance.Between(
        miner.getData("x"),
        miner.getData("y"),
        oreTile.getData("x"),
        oreTile.getData("y")
      );

      if (!target || dist < targetDist) {
        target = oreTile;
        targetDist = dist;
      }
    });

    // with target set, pick which tile to move to next
    let nextTile;
    let nextTileDistToTarget;

    for (let angle = 0; angle < 360; angle += 90) {
      const v = new Phaser.Math.Vector2(1, 0);

      const r = Phaser.Math.DegToRad(angle);
      v.setAngle(r);
      v.x = Math.round(v.x) + miner.getData("x");
      v.y = Math.round(v.y) + miner.getData("y");

      // don't go out of bounds and avoid turrets
      if (
        !this.checkIfInGrid(v.x, v.y) ||
        this.grid[v.x][v.y].getData("turret")
      )
        continue;

      const dist = Phaser.Math.Distance.Between(
        v.x,
        v.y,
        target.getData("x"),
        target.getData("y")
      );

      if (!nextTile || dist < nextTileDistToTarget) {
        nextTile = this.grid[v.x][v.y];
        nextTileDistToTarget = dist;
      }
    }

    // start digging next hole
    if (nextTile.getData("filled")) nextTile.setData("filled", false);

    // reset possible turret build locations by thinking the mouse has moved
    this.input.emit(
      "pointermove",
      this.input.activePointer.updateWorldPoint(this.cameras.main)
    );

    if (nextTile.alpha <= 0) {
      // add tile onto the path for the aliens to follow
      if (!this.path) this.path = [];
      this.path.push(nextTile);

      // "filled" = undefined means was an empty space
      // "filled" = false means was an asteroid piece
      // increase threatLevel as we mine into the asteroid
      if (nextTile.getData("filled") === false) {
        if (!this.threatLevel) {
          this.threatLevel = 1;
          this.startAliens();
        } else {
          // ore adds more threat
          if (nextTile.getData("ore")) this.threatLevel += 2;
          else this.threatLevel += 1;
        }
      }

      miner.setPosition(nextTile.x, nextTile.y);
      miner.setData("x", nextTile.getData("x"));
      miner.setData("y", nextTile.getData("y"));

      if (nextTile.getData("ore")) {
        nextTile.setData("ore", false);
        this.oreTiles.remove(nextTile);
        this.collectOre();
      }
    } else {
      nextTile.alpha -= 0.34;
    }
  }

  returnMiningDrone(miner) {
    // after mining all the ore,
    // the turtle will return to space
    // through the shortest number of filled tiles
    // in any of the four directions.
    let shortestPath;
    let leastNumFilledTiles;

    for (let angle = 0; angle < 360; angle += 90) {
      const unit = new Phaser.Math.Vector2(1, 0);

      unit.setAngle(Phaser.Math.DegToRad(angle));
      unit.x = Math.round(unit.x);
      unit.y = Math.round(unit.y);

      let checkPos = unit.clone();
      checkPos.x = unit.x + miner.getData("x");
      checkPos.y = unit.y + miner.getData("y");

      let numFilledTiles = 0;
      while (this.checkIfInGrid(checkPos.x, checkPos.y)) {
        // specifically the alpha because we must count tiles the miner
        // is cutting down as well. we aren't done until there's no alpha left
        if (this.grid[checkPos.x][checkPos.y].alpha > 0) numFilledTiles++;

        // gotta move around turrets too
        if (this.checkIfHasTurret(checkPos.x, checkPos.y)) numFilledTiles += 2;

        checkPos.add(unit);
      }

      if (!shortestPath || numFilledTiles < leastNumFilledTiles) {
        shortestPath = checkPos.subtract(unit); // make it go back on grid
        leastNumFilledTiles = numFilledTiles;
      }
    }

    const tile = this.grid[shortestPath.x][shortestPath.y];

    if (leastNumFilledTiles == 0) this.escapeMiningDrone(miner, tile);

    return tile;
  }

  escapeMiningDrone(miner, tile) {
    // stop update loop
    miner.getData("loop").remove();

    // spawn ship somewhere outside of the map
    // ship will spawn at point, pick up drone, then go to point2
    const point = Phaser.Geom.Circle.CircumferencePoint(
      new Phaser.Geom.Circle(tile.x, tile.y, gameW),
      Phaser.Math.Angle.Random()
    );

    const point2 = {
      x: tile.x + (tile.x - point.x),
      y: tile.y + (tile.y - point.y),
    };

    const angle = Phaser.Math.Angle.BetweenPoints(point, tile) + Math.PI / 2;

    const ship = this.prefab
      .instantiate(Prefab.Object.Ship, point.x, point.y)
      .setRotation(angle);

    this.tweens.add({
      targets: [miner, ship],
      x: tile.x,
      y: tile.y,
      duration: 1400,
      delay: 200,
      ease: "sine.inout",
      onComplete: () => {
        miner.setAlpha(0);
        this.tweens.add({
          targets: ship,
          x: point2.x,
          y: point2.y,
          delay: 400,
          duration: 1200,
          ease: "sine.inout",
          onComplete: () => this.endScene(),
        });
      },
    });
  }

  endScene() {
    this.input.enabled = false; // stop all further player input

    const duration = 1000;
    this.cameras.main.fade(duration);
    this.time.delayedCall(duration, () => {
      // this.scene.start() has a visual glitch
      // so this is the solution instead
      this.scene.launch("Shop");
      this.time.delayedCall(0, () => this.scene.stop());
    });
  }

  collectOre() {
    console.log("collected");
  }

  createMouseControls() {
    this.input.on("pointermove", (p) => {
      if (!this.selectedObj) return;

      const pos = this.convertWorldToGrid(p.worldX, p.worldY);

      if (this.selectedObj.name == "turtle") {
        const edgeCoords = [
          { x: pos.x, y: 0 },
          { x: pos.x, y: this.grid[0].length - 1 },
          { x: 0, y: pos.y },
          { x: this.grid.length - 1, y: pos.y },
        ];

        // im tired of doing this over multiple for loops so here you go
        edgeCoords.sort((a, b) => {
          return (
            Phaser.Math.Distance.BetweenPoints(pos, a) -
            Phaser.Math.Distance.BetweenPoints(pos, b)
          );
        });

        const tile = this.grid[edgeCoords[0].x][edgeCoords[0].y];

        this.selectedObj.setPosition(tile.x, tile.y);
      } else {
        // turret

        const tile = this.grid[pos.x][pos.y];

        this.selectedObj.setPosition(tile.x, tile.y);

        // reset these properties (could be changed later down)
        this.selectedObj.setAlpha(1).strokeColor = 0xffffff;

        // check for any invalid conditions
        if (
          tile.getData("ore") ||
          !tile.getData("filled") ||
          tile.getData("turret") ||
          tile.getData("turretAdjacent")
        ) {
          this.selectedObj.setAlpha(0.7).strokeColor = 0xff0000;
        }
      }
    });

    this.input.on("pointerdown", (p) => {
      if (!this.selectedObj) return;

      const pos = this.convertWorldToGrid(
        this.selectedObj.x,
        this.selectedObj.y
      );

      if (this.selectedObj.name == "turtle") this.deployMiningDrone(pos);
      else {
        // turret
        if (this.selectedObj.alpha == 1) {
          // valid position
          this.grid[pos.x][pos.y].setData("turret", true);

          // set 3x3 grid around cornerTile to be turreted
          // so it leaves room for mining turtle to move around
          for (let angle = 0; angle < 360; angle += 45) {
            const v = new Phaser.Math.Vector2(1, 0);

            v.setAngle(Phaser.Math.DegToRad(angle));
            v.x = Math.round(v.x) + pos.x;
            v.y = Math.round(v.y) + pos.y;

            this.grid[v.x][v.y].setData("turretAdjacent", true);
          }
        } else {
          this.selectedObj.destroy();
        }

        this.selectedObj = null;
      }
    });
  }

  deployMiningDrone(pos) {
    const tile = this.grid[pos.x][pos.y];

    // spawn in player ship to drop off turtle
    const point = Phaser.Geom.Circle.CircumferencePoint(
      new Phaser.Geom.Circle(tile.x, tile.y, gameW),
      Phaser.Math.Angle.Random()
    );

    const point2 = {
      x: tile.x + (tile.x - point.x),
      y: tile.y + (tile.y - point.y),
    };

    const angle = Phaser.Math.Angle.BetweenPoints(point, tile) + Math.PI / 2;

    const ship = this.prefab
      .instantiate(Prefab.Object.Ship, point.x, point.y)
      .setRotation(angle);

    this.tweens.add({
      targets: tile,
      scale: 1.5,
      angle: `+=90`,
      duration: 600,
      ease: "sine.inout",
    });

    this.tweens.add({
      targets: ship,
      x: tile.x,
      y: tile.y,
      duration: 1400,
      ease: "sine.inout",
      completeDelay: 300,
      onComplete: () => {
        this.createMiningDrone(pos.x, pos.y);
        this.tweens.add({
          targets: ship,
          x: point2.x,
          y: point2.y,
          duration: 1400,
          ease: "sine.inout",
        });
        this.tweens.add({
          targets: tile,
          alpha: 0,
          scale: 1,
          angle: `-=90`,
          duration: 600,
          ease: "sine.inout",
        });
      },
    });

    this.selectedObj.destroy();
    this.selectedObj = null;

    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        if (
          i == 0 ||
          i == this.grid.length - 1 ||
          j == 0 ||
          j == this.grid[i].length - 1
        ) {
          if (i == pos.x && j == pos.y) continue;

          this.grid[i][j].setStrokeStyle(2, 0xffffff);
          this.tweens.add({
            targets: this.grid[i][j],
            alpha: 0,
            duration: 100,
          });
        }
      }
    }
  }

  convertWorldToGrid(x, y) {
    const v = new Phaser.Math.Vector2(x, y);
    const topLeft = this.grid[0][0].getTopLeft();

    v.subtract({ x: topLeft.x, y: topLeft.y }).scale(1 / this.tileW);

    v.x = Phaser.Math.Clamp(Math.floor(v.x), 0, this.grid.length - 1);
    v.y = Phaser.Math.Clamp(Math.floor(v.y), 0, this.grid[0].length - 1);

    return v;
  }

  createDeployButton() {
    const c = this.add.gameTextButton(
      gameW * 0.4,
      gameH * 0.9,
      "Deploy Turtle",
      3,
      null,
      (p) => {
        this.selectedObj = this.prefab.instantiate(
          Prefab.Object.Drone,
          p.worldX,
          p.worldY,
          this.tileW,
          this.tileW
        );

        for (let i = 0; i < this.grid.length; i++) {
          for (let j = 0; j < this.grid[i].length; j++) {
            if (
              i == 0 ||
              i == this.grid.length - 1 ||
              j == 0 ||
              j == this.grid[i].length - 1
            ) {
              this.grid[i][j].setStrokeStyle(3, 0xffffff);
              this.tweens.add({
                targets: this.grid[i][j],
                alpha: 0.7,
                duration: 200,
              });
            }
          }
        }

        c.destroy();
      }
    );
  }

  createMenu() {
    const menu = this.prefab
      .instantiate(
        Prefab.Object.Menu,
        gameW * 0.9,
        gameH * 0.5,
        gameW * 0.2,
        gameH - 16
      )
      .add(this.createTurretButtons());
  }

  createTurretButtons() {
    const turrets = [];

    for (let i = 0; i < 6; i++) {
      const x = (i % 2) * 180 - 90;
      const y = Math.floor(i / 2) * 180 - 400;

      const bg = this.add
        .rectangle(0, 0, 144, 144, 0xffffff, 0.3)
        .setStrokeStyle(6, 0xffffff, 0.8);

      let turret = this.add.rectangle();

      switch (i) {
        case 0:
          turret = this.prefab
            .instantiate(Prefab.Object.Railgun, 0, 0, this.tileW, this.tileW)
            .setScale(1.5);
          break;
        case 1:
          break;
        case 2:
          break;
        case 3:
          break;
        case 4:
          break;
        case 5:
          break;
      }

      let colorMatrix;

      const c = this.add
        .container(x, y, [bg, turret])
        .setData("number", i)
        .setSize(bg.width, bg.height)
        .setInteractive()
        .on("pointerover", () => {
          this.tweens.add({
            targets: bg,
            fillAlpha: 0.5,
            duration: 100,
          });
          this.tweens.add({
            targets: turret,
            scale: 1.85,
            duration: 100,
          });
        })
        .on("pointerout", () => {
          colorMatrix.brightness(1);
          this.tweens.add({
            targets: bg,
            fillAlpha: 0.3,
            duration: 100,
          });
          this.tweens.add({
            targets: turret,
            scale: 1.5,
            duration: 100,
          });
          c.off("pointerup");
        })
        .on("pointerdown", () => {
          colorMatrix.brightness(0.85);

          if (c.listenerCount("pointerup") < 1) {
            c.on("pointerup", (p) => {
              const turretSize = this.tileW * 0.9;

              switch (c.getData("number")) {
                case 0:
                  this.selectedObj = this.prefab
                    .instantiate(
                      Prefab.Object.Railgun,
                      p.worldX,
                      p.worldY,
                      turretSize,
                      turretSize
                    )
                    .setAlpha(0.9)
                    .setDepth(1);

                  break;
                case 1:
                  break;
                case 2:
                  break;
                case 3:
                  break;
                case 4:
                  break;
                case 5:
                  break;
              }

              colorMatrix.brightness(1);
              c.off("pointerup");
            });
          }
        });

      colorMatrix = c.postFX.addColorMatrix();

      turrets.push(c);
    }

    return turrets;
  }

  startAliens() {
    // this.portal was set during createMiningDrone()
    this.portal
      .setStrokeStyle(6, 0xe7c6ff, 1)
      .setFillStyle(0x7209b7, 0.9)
      .setScale(0)
      .setAlpha(0.7)
      .setDepth(1);

    // portal will shift between these two colors
    const c1 = Phaser.Display.Color.HexStringToColor("0x7209b7");
    const c2 = Phaser.Display.Color.HexStringToColor("0xf72585");

    const colorTween = [];
    const numColors = 50; // this directly influences how fast the gradient is

    // colorTweens is an array of size numColors * 2
    // the first half is a gradient from c1 -> c2,
    // and the second half is a gradient back from c2 -> c1
    // so the transition is smooth when we "tween" over the array
    for (let i = 0; i < numColors * 2; i++) {
      if (i < numColors) {
        colorTween.push(
          Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, numColors, i)
        );
      } else {
        const j = i - numColors; // adjust since i > numColors
        colorTween.push(
          Phaser.Display.Color.Interpolate.ColorWithColor(c2, c1, numColors, j)
        );
      }
    }

    this.tweens.add({
      targets: this.portal,
      scale: 1.8,
      alpha: 1,
      angle: `+=${Phaser.Math.Between(270, 360)}`,
      duration: 400, //2000,
      //delay: 3000,
      onComplete: () => {
        this.generateAlien();

        // originally this was tied to tween.progress in onUpdate,
        // but I decided to untie it so it doesn't look like the
        // tween was restarting every loop (even though it is)
        let colorIndex = 0;

        this.tweens.add({
          targets: this.portal,
          angle: "+=270",
          duration: 2000,
          loop: -1,
          onUpdate: () => {
            colorIndex++;
            const rgb = colorTween[colorIndex % colorTween.length];
            const color = Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b);
            this.portal.fillColor = color;
          },
        });
      },
    });
  }

  generateAlien() {
    // start alien at the portal and move to the first item in this.path

    let pathIndex = 0;

    const alien = this.add
      .circle(this.portal.x, this.portal.y, this.tileW * 0.5, 0x00ff00, 1)
      .setScale(0.8)
      .setDepth(1)
      .setData("pathIndex", 0);

    const updateSpeed = 500;

    const updateLoop = this.time.addEvent({
      loop: true,
      delay: updateSpeed,
      startAt: updateSpeed,
      callback: () => {
        const nextTile = this.path[pathIndex];

        this.tweens.add({
          targets: alien,
          x: nextTile.x,
          y: nextTile.y,
          onComplete: () => {
            pathIndex++;

            if (pathIndex > this.path.length) {
              console.log("hit");
              updateLoop.remove();
              alien.destroy();
            }
          },
        });
      },
    });
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

class Stars extends Phaser.Scene {
  constructor() {
    super("Stars");
  }

  create() {
    this.createResolution();
    this.createStars();
  }

  createStars() {
    const stars = this.add.group({
      key: "star",
      frame: [0, 3], // only using the tiny & small stars
      quantity: 200,
    });

    Phaser.Actions.RandomRectangle(
      stars.getChildren(),
      new Phaser.Geom.Rectangle(8, 8, gameW - 16, gameH - 16)
    );

    Phaser.Actions.Call(stars.getChildren(), (star) => {
      const scale = Phaser.Math.Between(2, 6) * 0.1;

      star.setAlpha(scale).setScale(scale).setTint(0xffffff);

      this.tweens.add({
        targets: star,
        alpha: 0,
        duration: 200,
        delay: Phaser.Math.Between(200, 10000),
        loopDelay: Phaser.Math.Between(4000, 10000),
        loop: -1,
        yoyo: true,
      });
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
    camera.setViewport(x, y, this.sizer.width, this.parent.height);
    camera.setZoom(Math.max(scaleX, scaleY));
    camera.centerOn(camera.midPoint.x, camera.midPoint.y);
  }
}

class Shop extends Phaser.Scene {
  results;
  shop;
  contracts;
  transitionTime = 600; // how long tweens will take

  constructor() {
    super("Shop");
  }

  preload() {
    // load google's library for the various fonts we want to use
    this.load.script(
      "webfont",
      "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
    );
  }

  create() {
    this.prefab = new Prefab(this);
    this.createResolution();

    this.cameras.main.fadeIn();

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.createResultsMenu();
        this.createShopMenu();
        this.createContractsMenu();
      },
    });
  }

  createResultsMenu() {
    this.results = this.prefab
      .instantiate(
        Prefab.Object.Menu,
        gameW * 0.5,
        gameH * 0.4,
        gameW * 0.8,
        gameH * 0.7
      )
      .add([
        this.add
          .gameText(-gameW * 0.39, -gameH * 0.34, "Results", 6)
          .setOrigin(0, 0),
        this.add
          .gameText(-gameW * 0.32, -gameH * 0.18, "Iron Ore x500", 3)
          .setOrigin(0, 0.5),
        this.add
          .gameText(gameW * 0.1, -gameH * 0.18, "1200c", 3)
          .setOrigin(1, 0.5),
        this.add.gameTextButton(
          gameW * 0.34,
          gameH * 0.27,
          "Next",
          2,
          null,
          () => {
            // only start this transition if all transitions have finished
            if (this.tweens.getTweens().length > 0) return;

            this.add.tween({
              targets: [this.results, this.shop, this.contracts],
              x: `-=${gameW}`,
              duration: this.transitionTime,
              ease: "cubic.out",
            });
          }
        ),
      ]);
  }

  createShopMenu() {
    this.shop = this.prefab
      .instantiate(
        Prefab.Object.Menu,
        gameW * 1.5,
        gameH * 0.4,
        gameW * 0.8,
        gameH * 0.7
      )
      .add([
        this.add
          .gameText(-gameW * 0.39, -gameH * 0.34, "Shop", 6)
          .setOrigin(0, 0),
        this.add
          .gameText(-gameW * 0.32, -gameH * 0.18, "Buy some upgrades", 3)
          .setOrigin(0, 0.5),
        this.add
          .gameText(gameW * 0.1, -gameH * 0.18, "1000c", 3)
          .setOrigin(1, 0.5),
        this.add.gameTextButton(
          gameW * 0.34,
          gameH * 0.27,
          "Next",
          2,
          null,
          () => {
            // only start this transition if all transitions have finished
            if (this.tweens.getTweens().length > 0) return;

            this.add.tween({
              targets: [this.results, this.shop, this.contracts],
              x: `-=${gameW}`,
              duration: this.transitionTime,
              ease: "cubic.out",
            });
          }
        ),
        this.add.gameTextButton(
          -gameW * 0.34,
          gameH * 0.27,
          "Back",
          2,
          null,
          () => {
            // only start this transition if all transitions have finished
            if (this.tweens.getTweens().length > 0) return;

            this.add.tween({
              targets: [this.results, this.shop, this.contracts],
              x: `+=${gameW}`,
              duration: this.transitionTime,
              ease: "cubic.out",
            });
          }
        ),
      ]);
  }

  createContractsMenu() {
    this.contracts = this.prefab
      .instantiate(
        Prefab.Object.Menu,
        gameW * 2.5,
        gameH * 0.4,
        gameW * 0.8,
        gameH * 0.7
      )
      .add([
        this.add
          .gameText(-gameW * 0.39, -gameH * 0.34, "Contracts", 6)
          .setOrigin(0, 0),
        this.add
          .gameText(
            -gameW * 0.32,
            -gameH * 0.18,
            "Heavily dangerous asteroid",
            3
          )
          .setOrigin(0, 0.5),
        this.add
          .gameText(gameW * 0.1, -gameH * 0.18, "1800c", 3)
          .setOrigin(1, 0.5),
        this.add.gameTextButton(
          gameW * 0.34,
          gameH * 0.27,
          "Start!",
          2,
          null,
          () => this.endScene()
        ),
        this.add.gameTextButton(
          -gameW * 0.34,
          gameH * 0.27,
          "Back",
          2,
          null,
          () => {
            // only start this transition if all transitions have finished
            if (this.tweens.getTweens().length > 0) return;

            this.add.tween({
              targets: [this.results, this.shop, this.contracts],
              x: `+=${gameW}`,
              duration: this.transitionTime,
              ease: "cubic.out",
            });
          }
        ),
      ]);
  }

  endScene() {
    this.input.enabled = false; // stop all further player input

    const duration = 1000;
    this.cameras.main.fade(duration);
    this.time.delayedCall(duration, () => {
      // this.scene.start() has a visual glitch
      // so this is the solution instead
      this.scene.launch("Game");
      this.time.delayedCall(0, () => this.scene.stop());
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
    camera.setViewport(x, y, this.sizer.width, this.parent.height);
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
  scene: [Background, Stars, Shop, Game],
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        x: 0,
        y: 0,
      },
      debug: DEV_MODE,
      fps: 300,
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
    width = null
  ) {
    super(scene, x, y, text, {
      font: `${size * 8 + 24}px`,
      padding: gameW * 0.005,
      lineSpacing: 32,
      fill: "#fff",
      align: "left",
      wordWrap: { width: width ? width : gameW, useAdvancedWrap: true },
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: "#00a8e8",
        blur: 0,
        stroke: false,
        fill: true,
      },
    });

    this.setOrigin(0.5, 0.5).setFontFamily("Lexend");
  }

  preUpdate(delta, time) {}
}

class GameTextButton extends Phaser.GameObjects.Container {
  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    string = "",
    size = 0,
    width = null,
    callback
  ) {
    super(scene, x, y);

    const text = scene.add
      .text(0, 0, string, {
        font: `${size * 8 + 24}px`,
        fontStyle: "bold",
        padding: 30,
        lineSpacing: 32,
        fill: "#fff",
        align: "left",
        wordWrap: { width: width ? width : gameW, useAdvancedWrap: true },
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: CLRS.textButton.shadow,
          blur: 5,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5, 0.5)
      .setFontFamily("Lexend");

    const bg = scene.add
      .rectangle(
        0,
        0,
        text.getBounds().width,
        text.getBounds().height,
        CLRS.textButton.fill
      )
      .setStrokeStyle(8, CLRS.textButton.stroke);

    const bgGradient = bg.postFX.addGradient(
      CLRS.textButton.fill,
      CLRS.textButton.stroke
    );
    const bgColorMatrix = bg.postFX.addColorMatrix();
    const textColorMatrix = text.postFX.addColorMatrix();

    this.add([bg, text])
      .setSize(bg.width, bg.height)
      .setInteractive()
      .on("pointerover", () => (bgGradient.alpha = 0.35))
      .on("pointerout", () => {
        bgGradient.alpha = 0.2;
        bgColorMatrix.brightness(1);
        textColorMatrix.brightness(1);
        this.off("pointerup");
      })
      .on("pointerdown", () => {
        bgColorMatrix.brightness(0.7);
        textColorMatrix.brightness(0.7);

        if (this.listenerCount("pointerup") < 1) {
          this.on("pointerup", (p) => {
            bgColorMatrix.brightness(1);
            textColorMatrix.brightness(1);
            callback(p); // bro... why
          });
        }
      });
  }

  preUpdate(delta, time) {}
}

/* prefab class is a "singleton" custom object maker
  i.e. it can instantiate a turret, menu, and so on
  so I don't have to copy and paste repeatedly */
class Prefab extends Phaser.GameObjects.GameObject {
  static Object = {
    Ship: 0,
    Menu: 1,
    Drone: 2,
    Railgun: 3,
  };

  colors = {
    ship: 0xe9c46a,
    menu: {
      fill: 0x001f54,
      stroke: 0x1e6091,
    },
    drone: {
      fill: 0xca6702,
      stroke: 0xe9d8a6,
    },
    railgun: 0xff9f1c,
    turretStroke: 0xffffff,
  };

  constructor(scene) {
    super(scene);
  }

  instantiate(obj, x, y, w = null, h = null) {
    // see static Object for object name <> integer
    switch (obj) {
      case 0:
        return this.scene.add
          .image(x, y, "advancedShip", 5)
          .setScale(1.5)
          .setAngle(90)
          .setDepth(1)
          .setTint(this.colors.ship);
      case 1:
        return this.scene.add
          .container(x, y, [
            this.scene.add
              .rectangle(0, 0, w, h, this.colors.menu.fill)
              .setStrokeStyle(12, this.colors.menu.stroke)
              .postFX.addGradient(
                this.colors.menu.fill,
                this.colors.menu.stroke,
                0.1,
                0,
                0,
                0,
                1
              ).gameObject,
          ])
          .setDepth(2);
      case 2:
        return this.scene.add
          .rectangle(x, y, w, h, this.colors.drone.fill)
          .setStrokeStyle(4, this.colors.drone.stroke)
          .setName("turtle");
      case 3:
        return this.scene.add
          .rectangle(x, y, w, h, this.colors.railgun, 1)
          .setStrokeStyle(6, this.colors.turretStroke, 1)
          .setName("railgun");
    }
  }
}

const game = new Phaser.Game(config);
