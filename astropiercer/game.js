const VERSION = "Astropiercer v0.2";

const DEV_MODE = false; // turns on physics debug mode

const gameW = 1920;
const gameH = 1080;

const START_SCENE = "Game"; // for testing different scenes

const FONTS = ["Oxanium", "Saira"];

const FONT = "Oxanium";

const CLRS = {
  topGradient: 0x0c1821, // for background
  bottomGradient: 0x001233, // for background
  highlightColor: 0xffef9f, // for highlighting text
  clickColor: 0xbfbdc1, // when text is clicked
  spaceColors: [0xcdb4db, 0xffc8dd, 0xffafcc, 0xbde0fe, 0xa2d2ff, 0x8affc1],
  tileColor: 0x272635,
  edgeColor: 0xa6a6a8,
  oreColor: 0x00b4d8,
  button: {
    fill: 0x023e7d, //0x2a9134,
    stroke: 0xffffff,
    shadow: "#023e7d", //"#00a8e8",
  },
};

const Capitalize = (str) => {
  return str[0].toUpperCase() + str.slice(1);
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

    Phaser.GameObjects.GameObjectFactory.register(
      "gameImageButton",
      function (x, y, key, scale, callback) {
        let t = new GameImageButton(this.scene, x, y, key, scale, callback);

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
    this.loadGameIcons();
  }

  loadGameIcons() {
    this.load.setPath("assets/kenney_game-icons/PNG/White/2x/");
    this.load.image("gear", "gear.png");
    this.load.image("fastForward", "fastForward.png");
    this.load.image("pause", "pause.png");
    this.load.image("right", "right.png");
    this.load.image("checkmark", "checkmark.png");
    this.load.image("cross", "cross.png");

    this.load.setPath("assets/kenney_simplified-platformer-pack/Tilesheet/");

    this.load.spritesheet("risk", "platformPack_tilesheet@2.png", {
      frameWidth: 128,
      frameHeight: 128,
      startFrame: 37,
      endFrame: 37,
    });

    this.load.spritesheet("gem", "platformPack_tilesheet@2.png", {
      frameWidth: 128,
      frameHeight: 128,
      startFrame: 49,
      endFrame: 49,
    });

    this.load.spritesheet("heart", "platformPack_tilesheet@2.png", {
      frameWidth: 128,
      frameHeight: 128,
      startFrame: 67,
      endFrame: 67,
    });
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
  portal; // the alien portal is located wherever the drone lands
  gameOver; // true if turtle escaping asteroid, or destroyed by aliens
  alienGroup; // physics group with all the aliens
  turretGroup; // physics group with all turrets (turret body is their range)
  bulletGroup; // physics group with all bullets for hitting the aliens
  display; // all interactable icons in the menu, for updating and changing
  paused; // we gotta implement our own pause system, so here's the variable
  gameStats; // keeps track of the stats: gems, hearts, danger
  gameData; // our "save file" containing all game data
  selectedTurret; // if we have a turret selected to show stats and upgrade
  results; // what ores the drone mined and if the drone survived

  constructor() {
    super("Game");
  }

  create() {
    this.createResolution();

    //this.cameras.main.fadeIn();

    this.createAsteroidGrid();
    this.centerAsteroidGrid();

    this.initVariables(); // this.tileW must be set first

    this.createOreDeposits();
    this.createMouseControls();
    this.createKeyboardControls();

    this.createPhysics();

    this.add
      .rectangle(gameW * 0.5, gameH * 0.5, gameW, gameH)
      .setStrokeStyle(3, 0xffffff, 0.8);

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.createDeployButton();
        this.createMenu();
        this.createOreTooltip();
        this.createFpsText();
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

  initVariables() {
    // initialize and reset variables, helpful if game scene is restarted
    this.prefab = new Prefab(this);
    this.selectedObj = null;
    this.selectedTurret = null;
    this.path = null;
    this.portal = null;
    this.gameOver = null;
    this.display = { gems: null, hearts: null, danger: null };
    this.paused = false;
    this.gameStats = {
      gems: 1000,
      hearts: 10,
      danger: 0,
    };
    this.gameData = {
      turtleSpeed: 500,
      alien: {
        spawnRate: 30000,
        base: {
          speed: 800,
          health: 5,
          damage: 1,
        },
      },
      turrets: {
        size: this.tileW * 1.1,
        railgun: {
          tooltip: {
            title: "Railgun",
            desc: "Fires high speed bullets. Moderate range and decent damage, but only tracks one target at a time.",
          },
          special: "Pierce",
          level1: {
            speed: 1200,
            damage: 1,
            range: 4,
            special: 0,
            cost: 150,
          },
          level2: {
            speed: 1200,
            damage: 1.5,
            range: 4,
            special: 0,
            cost: 200,
          },
          level3: {
            speed: 1200,
            damage: 2,
            range: 4,
            special: 0,
            cost: 250,
          },
          level4: {
            speed: 1200,
            damage: 2.5,
            range: 4,
            special: 0,
            cost: 300,
          },
          level5: {
            speed: 1200,
            damage: 3,
            range: 4,
            special: 0,
            cost: 350,
          },
        },
        plasmaBurst: {
          tooltip: {
            title: "Plasma Burst",
            desc: "Fires short-range bursts of plasma energy. Good damage and hits all targets around turret.",
          },
          special: "Weaken",
          level1: {
            speed: 1200,
            damage: 2,
            range: 2,
            special: 0,
            cost: 75,
          },
          level2: {
            speed: 1200,
            damage: 2.5,
            range: 2,
            special: 0,
            cost: 100,
          },
          level3: {
            speed: 1200,
            damage: 3,
            range: 2,
            special: 0,
            cost: 150,
          },
          level4: {
            speed: 1200,
            damage: 3.5,
            range: 2,
            special: 0,
            cost: 200,
          },
          level5: {
            speed: 1200,
            damage: 4,
            range: 2,
            special: 0,
            cost: 250,
          },
        },
        teslaCoil: {
          tooltip: {
            title: "Tesla Coil",
            desc: "Fires bursts of lightning that can chain across enemies. Deadly powerful if upgraded.",
          },
          special: "Chain",
          level1: {
            speed: 1200,
            damage: 2,
            range: 5,
            special: 0,
            cost: 150,
          },
          level2: {
            speed: 1200,
            damage: 2.5,
            range: 5,
            special: 0,
            cost: 100,
          },
          level3: {
            speed: 1200,
            damage: 3,
            range: 5,
            special: 0,
            cost: 150,
          },
          level4: {
            speed: 1200,
            damage: 3.5,
            range: 5,
            special: 0,
            cost: 200,
          },
          level5: {
            speed: 1200,
            damage: 4,
            range: 5,
            special: 0,
            cost: 250,
          },
        },
        ionCannon: {
          tooltip: {
            title: "Ion Cannon",
            desc: "Fires blasts of crippling ion particles that can slow down and even stun enemies.",
          },
          special: "Stun",
          level1: {
            speed: 1200,
            damage: 2,
            range: 3,
            special: 0,
            cost: 150,
          },

          level2: {
            speed: 1200,
            damage: 2,
            range: 3,
            special: 0,
            cost: 100,
          },
          level3: {
            speed: 1200,
            damage: 3,
            range: 3,
            special: 0,
            cost: 150,
          },
          level4: {
            speed: 1200,
            damage: 4,
            range: 3,
            special: 0,
            cost: 200,
          },
          level5: {
            speed: 1200,
            damage: 5,
            range: 3,
            special: 0,
            cost: 250,
          },
        },
        lrLaser: {
          tooltip: {
            title: "LR Laser",
            desc: "Fires long-range laser beams. Slow, but can hit from anywhere on the map.",
          },
          special: "Jolt",
          level1: {
            speed: 1200,
            damage: 2,
            range: 0,
            special: 0,
            cost: 200,
          },
          level2: {
            speed: 1200,
            damage: 2,
            range: 0,
            special: 0,
            cost: 100,
          },
          level3: {
            speed: 1200,
            damage: 3,
            range: 0,
            special: 0,
            cost: 150,
          },
          level4: {
            speed: 1200,
            damage: 4,
            range: 0,
            special: 0,
            cost: 200,
          },
          level5: {
            speed: 1200,
            damage: 5,
            range: 0,
            special: 0,
            cost: 250,
          },
        },
        refinery: {
          tooltip: {
            title: "Refinery",
            desc: "Unable to attack enemies, but instead can buff up turrets in its radius.",
          },
          special: "Interest",
          level1: {
            speed: 1200,
            damage: 2,
            range: 4,
            special: 0,
            cost: 200,
          },
          level2: {
            speed: 1200,
            damage: 2,
            range: 4,
            special: 0,
            cost: 100,
          },
          level3: {
            speed: 1200,
            damage: 3,
            range: 4,
            special: 0,
            cost: 150,
          },
          level4: {
            speed: 1200,
            damage: 4,
            range: 4,
            special: 0,
            cost: 200,
          },
          level5: {
            speed: 1200,
            damage: 5,
            range: 4,
            special: 0,
            cost: 250,
          },
        },
      },
      ore: {
        rarity1: {
          aluminum: {
            color: 0x6c757d,
          },
          copper: {
            color: 0xeb5e28,
          },
          iron: {
            color: 0xd3d3d3,
          },
        },
        rarity2: {
          gold: {
            color: 0xffe824,
          },
          uranium: {
            color: 0x70e000,
          },
          iridium: {
            color: 0x8367c7,
          },
        },
        rarity3: {
          ruby: {
            color: 0xf94144,
          },
          sapphire: {
            color: 0x277da1,
          },
          emerald: {
            color: 0x90be6d,
          },
        },
        rarity4: {
          diamond: {
            color: 0xffffff,
          },
          iridesium: {
            color: 0xbbd0ff,
          },
        },
      },
    };
    this.results = { droneSurvived: false, oreCollected: {} };
  }

  createAsteroidGrid() {
    /* procedural generation is based around spawning a number of circles
    and then filling in tiles that overlap with the circles.
    the middle 1/3 portion is also filled in for consistency. */

    const shapes = [];

    const num = 36; // how many circles to spawn
    for (let i = 0; i < num; i++) {
      const x = Phaser.Math.Between(gameW * 0.2, gameW * 0.7);
      const y = Phaser.Math.Between(gameH * 0.3, gameH * 0.7);
      const w = Phaser.Math.Between(100, 400);

      const c = this.add.circle(x, y, w * 0.5, 0xff0000, 0).setDepth(1);

      shapes[i] = new Phaser.Geom.Circle(c.x, c.y, c.radius);
    }

    this.grid = [];
    this.filledTiles = new Phaser.Structs.List();

    const gridX = 38; // how wide is the grid
    const gridY = 26; // height of the grid
    this.tileW = 36; // width of each tile in pixels

    // top left corner
    const startX = gameW * 0.4 - gridX * this.tileW * 0.5;
    const startY = gameH * 0.5 - gridY * this.tileW * 0.5;

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
    // first, establish rarity table
    // setting the rarity distribution to be 3/4
    // i.e., if there are four rarities,
    // then the most common rarity will occupy 3/4
    // of the table, then the next rarity will occupy 3/4
    // of the rest of the table, and so on.
    // for four rarities, this will make a rarity table of:
    // [0.75, 0.187, 0.046875, 0.01171875]

    const rarityTable = [];
    const rarities = this.gameData.ore;
    const distribution = 3 / 4;
    let available = 1;
    for (let i = 1; i <= Object.keys(rarities).length; i++) {
      const rarity = available - (1 - distribution) ** i;
      rarityTable.push(rarity);
      available -= rarity;
    }

    // create num ore deposits
    // algorithm will spawn new ore deposits away from edges and other ore deposits
    const num = 16; //Phaser.Math.Between(8, 12);
    this.oreTiles = new Phaser.Structs.List();

    for (let i = 1; i <= num; i++) {
      let iterations = 50;

      findSpot: while (iterations > 0) {
        iterations -= 1;

        const tile = this.filledTiles.getRandom();
        const x = tile.getData("x");
        const y = tile.getData("y");

        if (tile.getData("ore")) continue findSpot;

        //this.grid[x][y].setFillStyle(0xff0000, 0.9);

        // check neighbors to see if they're filled or have ore

        for (let dist = 1; dist <= 3; dist++) {
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

        /* rarity choice algorithm
        let's say the rarity table is distributed by 3/4
        so it comes out to be [0.75, 0.187, 0.046875, 0.01171875]
        start by picking a random number between 0 and 1
        subtract the first number of the rarity table
        if the number now is below 0, stop there and there's our level.
        otherwise, move on to the next number of the table and subtract it
        check if below zero, if so stop, if not then continue and so on
        */

        let r = Math.random();
        let level = 0;
        while (r > 0 && level < rarityTable.length) {
          r -= rarityTable[level];
          // if r is now below zero, stop here and we have our level
          level++;
        }

        const list = this.gameData.ore["rarity" + level];
        const name = Phaser.Math.RND.pick(Object.keys(list));

        this.createOreTile(this.grid[x][y], name, list[name].color, level);
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

  createOreTile(tile, name, color, level) {
    tile.setFillStyle(color, 0.9).setData("ore", name);
    this.oreTiles.add(tile);

    tile.setData("rarity", level);

    tile
      .setInteractive()
      .on("pointerover", () => {
        this.tweens.killTweensOf(this.display.oreTooltip);
        this.display.oreTooltip.setAlpha(0);

        const bounds = this.display.oreTooltip.getData("bounds");
        let x = tile.x;

        // decide if tooltip should be on right or left side
        if (tile.x <= gameW * 0.5) x += bounds.width * 0.5 + this.tileW * 0.8;
        else x -= bounds.width * 0.5 + this.tileW * 0.8;

        this.display.oreTooltip.setPosition(x, tile.y);
        this.display.oreTooltip.getByName("oreText").setText(Capitalize(name));

        for (let i = 1; i <= 4; i++) {
          let a = level >= i ? 1 : 0;
          this.display.oreTooltip.getByName("star" + i).fillAlpha = a;
        }

        this.tweens.add({
          targets: this.display.oreTooltip,
          alpha: 1,
          duration: 100,
          delay: 100,
        });
      })
      .on("pointerout", () => {
        this.tweens.killTweensOf(this.display.oreTooltip);
        this.tweens.add({
          targets: this.display.oreTooltip,
          alpha: 0,
          duration: 100,
        });
      });
  }

  createMiningDrone(x, y) {
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
      .setData("y", start.getData("y"))
      .setDepth(1);

    miner.setData(
      "loop",
      this.time.addEvent({
        loop: true,
        delay: this.gameData.turtleSpeed,
        paused: this.paused,
        callback: () => this.updateMiningDrone(miner),
      })
    );
  }

  updateMiningDrone(miner) {
    // if ded then die
    if (this.gameStats.hearts <= 0) {
      this.destroyMiningDrone(miner);
      return;
    }

    // pick next target to head to
    // could be ore, or if there's no more ore left,
    // the miner will leave to space through
    // the shorest path
    let target;

    // if no more ore to mine, escape from the asteroid
    if (this.oreTiles.length <= 0) target = this.returnMiningDrone(miner);

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
      // increase danger level as we mine into the asteroid
      if (nextTile.getData("filled") === false) {
        if (this.gameStats.danger == 0) {
          this.updateGameStat("danger", 1);
          this.openAlienPortal();
        } else {
          // ore adds more threat
          if (nextTile.getData("ore")) this.updateGameStat("danger", 2);
          else this.updateGameStat("danger", 1);
        }
      }

      //miner.setPosition(nextTile.x, nextTile.y);
      this.add.tween({
        targets: miner,
        x: nextTile.x,
        y: nextTile.y,
        duration: 50,
      });
      miner.setData("x", nextTile.getData("x"));
      miner.setData("y", nextTile.getData("y"));

      if (nextTile.getData("ore")) this.collectOre(nextTile);
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
    // turtle successfully completed mission, now close out the scene
    this.gameOver = true; // stop processing game events
    miner.getData("loop").remove(); // stop update loop

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
      // this.scene.start() has a visual glitch, so this is the workaround
      this.scene.launch("Shop");
      this.time.delayedCall(0, () => this.scene.stop());
    });
  }

  collectOre(tile) {
    const ore = tile.getData("ore");
    console.log("collected " + ore);
    if (!this.results.oreCollected[ore]) {
      this.results.oreCollected[ore] = {
        num: 1,
        rarity: tile.getData("rarity"),
      };
    } else {
      this.results.oreCollected[ore].num += 1;
    }

    tile.setData("ore", false);
    this.oreTiles.remove(tile);
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
        // get range indicator
        const range = this.selectedObj.getData("rangeIndicator");

        // check if we're still not hovering over the grid
        const pos2 = this.convertWorldToGrid(p.worldX, p.worldY, false);
        if (!this.checkIfInGrid(pos2.x, pos2.y)) {
          // just match the mouse cursor since we're not on the grid
          this.selectedObj.setPosition(p.worldX, p.worldY);
          range.setPosition(p.worldX, p.worldY);
          // invalid build position, obviously
          this.selectedObj.setAlpha(0.7).strokeColor = 0xff5714;
          range.fillColor = 0xff5714;
          return;
        }

        const tile = this.grid[pos.x][pos.y];

        this.selectedObj.setPosition(tile.x, tile.y);
        range.setPosition(tile.x, tile.y);

        // reset these properties (could be changed later down)
        this.selectedObj.setAlpha(1).strokeColor = 0x6eeb83;
        range.fillColor = 0x6eeb83;

        // check for any invalid conditions
        if (
          tile.getData("ore") ||
          !tile.getData("filled") ||
          tile.getData("turret") ||
          tile.getData("turretAdjacent")
        ) {
          this.selectedObj.setAlpha(0.7).strokeColor = 0xff5714;
          range.fillColor = 0xff5714;
        }
      }
    });

    this.input.on("pointerdown", (p, over) => {
      // if we're over a button or turret, the player intends to interact
      // so don't mess with selectedObj just yet
      if (over.length > 0) return;

      if (!this.selectedObj) {
        // we're not holding anything,
        // but we should unselect any turrets that are selected

        // only unselect turrets if we're not clicking over the menu
        // yes this is hardcoded to tell if cursor is over the menu
        if (p.worldX >= gameW * 0.82) return;

        if (!this.selectedTurret) return;

        this.selectedTurret.setDepth(2);

        this.tweens.add({
          targets: this.selectedTurret.getData("highlight"),
          strokeAlpha: 0,
          fillAlpha: 0,
          duration: 100,
        });

        this.tweens.add({
          targets: this.selectedTurret.getData("rangeIndicator"),
          alpha: 0,
          duration: 100,
        });

        this.selectedTurret = null;

        this.display.turretSelect.setVisible(false);
        this.display.turretSelect.getByName("sellMenu").setVisible(false);
        this.display.turretButtons.forEach((b) => b.setVisible(true));
        this.display.title.setVisible(true);

        return;
      }

      const pos = this.convertWorldToGrid(
        this.selectedObj.x,
        this.selectedObj.y
      );

      if (this.selectedObj.name == "turtle") this.deployMiningDrone(pos);
      else {
        // turret, either build it or don't
        if (this.selectedObj.alpha == 1)
          this.buildTurret(pos, this.selectedObj); // valid position
        else {
          const range = this.selectedObj.getData("rangeIndicator");
          if (range) range.destroy();
          this.selectedObj.destroy(); // invalid position, just cancel it
        }

        this.selectedObj = null; // turret was built or canceled
      }
    });
  }

  buildTurret(pos, turret) {
    // subtract gems
    const cost = this.gameData.turrets[turret.name].level1.cost;
    this.updateGameStat("gems", -1 * cost);

    const tile = this.grid[pos.x][pos.y];

    // first, adjust the tiles around it so we can't build turrets near it
    tile.setData("turret", true);

    // was green, now color it white
    turret.strokeColor = 0xffffff;

    // set depth lower so it won't overlap with the tooltips
    turret.setDepth(2);

    // turn range indicator off and put it behind turret
    turret.getData("rangeIndicator").setDepth(3).setAlpha(0);

    // add rectangle on top that will act as highlight and select indicator
    const size = this.gameData.turrets.size * 1.2;

    const highlight = this.add
      .rectangle(turret.x, turret.y, size, size, 0xffffff, 0)
      .setStrokeStyle(4, 0xffffff, 0)
      .setDepth(3);

    const rangeIndicator = turret.getData("rangeIndicator");

    turret.setData("highlight", highlight);

    // add highlight and select functionality
    // using the tile below the turret as the interactive object
    // because each turret has a different shape and therefore
    // a different hit area, which is not what I want
    tile
      .setInteractive()
      .on("pointerover", () => {
        // player is holding something, don't select turret
        if (this.selectedObj) return;

        this.tweens.add({
          targets: highlight,
          fillAlpha: 0.3,
          duration: 100,
        });
      })
      .on("pointerout", () => {
        // player is holding something, don't select turret
        if (this.selectedObj) return;

        // turret is selected, keep it highlighted
        if (highlight.strokeAlpha == 1) return;

        // otherwise, stop highlight
        this.tweens.add({
          targets: highlight,
          fillAlpha: 0,
          duration: 100,
        });
      })
      .on("pointerdown", () => {
        // player is holding something, don't select turret
        if (this.selectedObj) return;

        // unselect currently selected turret if not this one
        if (this.selectedTurret && this.selectedTurret != turret) {
          this.selectedTurret.setDepth(2);

          this.tweens.add({
            targets: this.selectedTurret.getData("highlight"),
            strokeAlpha: 0,
            fillAlpha: 0,
            duration: 100,
          });

          this.tweens.add({
            targets: this.selectedTurret.getData("rangeIndicator"),
            alpha: 0,
            duration: 100,
          });
        }

        // select or unselect
        if (highlight.strokeAlpha == 0) {
          this.tweens.add({
            targets: highlight,
            strokeAlpha: 1,
            duration: 100,
          });

          this.tweens.add({
            targets: rangeIndicator,
            alpha: 1,
            duration: 100,
          });

          turret.setDepth(4);
          this.selectedTurret = turret;

          this.updateTurretSelect(turret);

          this.display.turretSelect.setVisible(true);
          this.display.turretButtons.forEach((b) => b.setVisible(false));
          this.display.title.setVisible(false);
        } else {
          this.tweens.add({
            targets: highlight,
            strokeAlpha: 0,
            duration: 100,
          });

          this.tweens.add({
            targets: rangeIndicator,
            alpha: 0,
            duration: 100,
          });

          turret.setDepth(2);
          this.selectedTurret = null;

          this.display.turretSelect.setVisible(false);
          this.display.turretSelect.getByName("sellMenu").setVisible(false);
          this.display.turretButtons.forEach((b) => b.setVisible(true));
          this.display.title.setVisible(true);
        }
      });

    // set 3x3 grid around tile to be turreted
    // so it leaves room for mining turtle to move around
    for (let angle = 0; angle < 360; angle += 45) {
      const v = new Phaser.Math.Vector2(1, 0);

      v.setAngle(Phaser.Math.DegToRad(angle));
      v.x = Math.round(v.x) + pos.x;
      v.y = Math.round(v.y) + pos.y;

      // this actually has to be a number because there may be
      // multiple turrets around a tile, so we need to make
      // sure we're counting them all so that if a turret
      // gets sold, we need to check the number
      this.grid[v.x][v.y].incData("turretAdjacent");
    }

    // add to physics group so it can detect aliens entering
    this.turretGroup.add(turret);

    // set up range
    const range =
      this.gameData.turrets[turret.name].level1.range * this.tileW * 2;

    turret.body.setSize(range, range); // diameter
    turret.body.isCircle = true;

    // add targets List so it can track what aliens to target within range
    turret.setData("targets", []);
    turret.setData("target", null);
    turret.setData("range", range / 2); // use the radius, not diameter

    const updateSpeed = 1000;

    turret.setData(
      "loop",
      this.time.addEvent({
        loop: true,
        delay: updateSpeed,
        paused: this.paused,
        callback: () => {
          let target = turret.getData("target");
          let targets = turret.getData("targets");

          // if we already have a target chosen,
          // check if it's still alive & within range
          // if not, then we'll need to choose a new one
          if (target) {
            if (!target.body) target = null; // already ded
            else {
              // check distance
              const dist = Phaser.Math.Distance.BetweenPoints(turret, target);
              if (dist > turret.getData("range")) target = null;
            }
          }

          // if we need to choose another target,
          // look at what aliens went into our range.
          // if they're dead or outside of our range, disregard them
          // otherwise, we have our new target
          while (!target && targets.length > 0) {
            target = targets.shift();

            if (!target.body) target = null; // already ded
            else {
              // check distance
              const dist = Phaser.Math.Distance.BetweenPoints(turret, target);
              if (dist > turret.getData("range")) target = null;
            }
          }

          // fire at our target
          if (target) this.fireProjectile(turret, target);

          // set our new target, may be null
          turret.setData("target", target);
        },
      })
    );
  }

  fireProjectile(turret, alien) {
    const bullet = this.add
      .circle(turret.x, turret.y, 6, 0xfefae0)
      .setStrokeStyle(4, 0xffffff)
      .setDepth(1)
      .setName("bullet");

    this.bulletGroup.add(bullet);
    bullet.body.isCircle = true;
    bullet.body.onWorldBounds = true;

    this.physics.moveToObject(bullet, alien, 400);
  }

  updateTurretSelect(turret) {
    //console.log(turret.name, turret);
    const turretData = this.gameData.turrets[turret.name];
    let level = turret.getData("level");
    const levelData = turretData["level" + level];
    const display = this.display.turretSelect;
    display.getByName("title").setText(String(turretData.tooltip.title));
    display.getByName("level").setText("Level " + level);
    display.getByName("damage").setText("Damage: " + levelData.damage);

    // convert speed in milliseconds to seconds
    const speed = Phaser.Math.RoundTo(levelData.speed / 1000, -2);
    display.getByName("speed").setText("Fire Rate: " + speed + " sec");
    display.getByName("range").setText("Range: " + levelData.range);

    // this one needs a prefix and a suffix
    display
      .getByName("special")
      .setText(turretData.special + ": " + levelData.special);

    let suffix = "sec";

    if (turretData.special == "Pierce" || turretData.special == "Chain") {
      suffix = levelData == 1 ? "enemy" : "enemies";
    } else if (turretData.special == "Interest") suffix = "%";

    display.getByName("special").text += " " + suffix;

    display.getByName("upgrade").setVisible(true);
    display.getByName("cost").setVisible(true);
    display.getByName("gems").setVisible(true);

    level++;
    if (level > 5) {
      display.getByName("upgrade").setVisible(false);
      display.getByName("cost").setVisible(false);
      display.getByName("gems").setVisible(false);
      return;
    }
    const nextLevelCost = turretData["level" + level].cost;
    display.getByName("cost").setText(nextLevelCost);
  }

  deployMiningDrone(pos) {
    const tile = this.grid[pos.x][pos.y];

    // move pauseText to bottom so it won't overlap with this stuff going on
    if (pos.y == 0) this.display.pauseText.setOrigin(0.5, 1).y = gameH;

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
      onStart: () => tile.setDepth(1),
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

  convertWorldToGrid(x, y, clamp = true) {
    // clamp will clamp the given coordinates inside the grid bounds
    // if clamp = false, the coordinates may be outside of the grid
    let v = new Phaser.Math.Vector2(x, y);
    const topLeft = this.grid[0][0].getTopLeft();

    v.subtract({ x: topLeft.x, y: topLeft.y }).scale(1 / this.tileW);
    v = { x: Math.floor(v.x), y: Math.floor(v.y) };

    if (!clamp) return v;

    v.x = Phaser.Math.Clamp(v.x, 0, this.grid.length - 1);
    v.y = Phaser.Math.Clamp(v.y, 0, this.grid[0].length - 1);

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

        // emit a pointermove event so the turtle will move onto the grid
        this.input.emit("pointermove", p);

        c.destroy();
      }
    );
  }

  createMenu() {
    const menu = this.prefab.instantiate(
      Prefab.Object.Menu,
      gameW * 0.91,
      gameH * 0.5,
      gameW * 0.18 - 24,
      gameH - 24
    );

    const bounds = menu.getBounds();

    this.display.title = this.add.gameText(0, -480, VERSION, 1.5);

    menu.add(this.display.title);

    this.display.turretButtons = this.createTurretButtons();

    menu.add(this.display.turretButtons);

    this.display.turretSelect = this.createTurretSelect();

    menu.add(this.display.turretSelect);

    const gem = this.add.image(-95, 50, "gem");
    this.display.gems = this.add
      .gameText(-55, 50, this.gameStats.gems, 5)
      .setOrigin(0, 0.5);

    menu.add([gem, this.display.gems]);

    const heart = this.add.image(-95, 140, "heart");
    this.display.hearts = this.add
      .gameText(-55, 140, this.gameStats.hearts, 5)
      .setOrigin(0, 0.5);

    menu.add([heart, this.display.hearts]);

    const risk = this.add.image(-95, 230, "risk");
    this.display.danger = this.add
      .gameText(-55, 230, this.gameStats.danger + "%", 5)
      .setOrigin(0, 0.5);

    menu.add([risk, this.display.danger]);

    const y = 340;
    const scale = 0.55;

    this.display.pause = this.add.gameImageButton(-100, y, "pause", scale, () =>
      this.pauseOrResume()
    );

    this.display.play = this.add.gameImageButton(0, y, "right", scale, () => {
      // we're at double speed, flip back to normal game speed
      if (this.time.timeScale == 2) this.flipGameSpeed();
      else this.pauseOrResume(); // otherwise, pause
    });

    this.display.fastForward = this.add.gameImageButton(
      +100,
      y,
      "fastForward",
      scale,
      () => {
        if (this.paused && this.time.timeScale == 2) this.pauseOrResume();
        else this.flipGameSpeed();
      }
    );

    this.display.play.keepPressedDown();

    menu.add([this.display.pause, this.display.play, this.display.fastForward]);

    const options = this.add.gameTextButton(
      0,
      bounds.height / 2 - 75,
      "Options",
      3,
      275,
      () => {}
    );

    menu.add(options);

    this.display.pauseText = this.add
      .gameText(gameW * 0.4, 0, "- Paused -", 3)
      .setOrigin(0.5, 0)
      .setFontStyle("bold")
      .setVisible(false);
  }

  createTurretSelect() {
    const upgradeButton = this.add
      .gameTextButton(0, 0, "Upgrade", 1, null, () => {
        sellMenu.setVisible(false);

        const nextLevel = this.selectedTurret.getData("level") + 1;
        const turretData = this.gameData.turrets[this.selectedTurret.name];
        const cost = turretData["level" + nextLevel].cost;

        if (this.gameStats.gems >= Number(cost)) {
          this.selectedTurret.setData("level", nextLevel);
          this.updateGameStat("gems", -1 * cost);
          this.updateTurretSelect(this.selectedTurret);
        } else this.brokeAlert();
      })
      .on("pointerover", () => {
        // on mouse hover, show what stats will be upgraded
        const level = this.selectedTurret.getData("level");

        if (level >= 5) return; // no more upgrades

        const turretData = this.gameData.turrets[this.selectedTurret.name];
        const levelData = turretData["level" + level];
        const nextLevelData = turretData["level" + (level + 1)];

        for (const stat in levelData) {
          if (stat == "cost") continue; // cost is always different
          if (levelData[stat] != nextLevelData[stat]) {
            // stat is changed on upgrade, so highlight it
            const statText = this.display.turretSelect.getByName(stat);
            if (statText) statText.setBackgroundColor("#2a9d8f");
          }
        }
      })
      .on("pointerout", () => {
        // reset all highlights
        this.display.turretSelect.each((item) => {
          if (item.type == "Text") item.setBackgroundColor();
        });
      });

    const sellButton = this.add.gameTextButton(0, 0, "$", 1, null, () => {
      sellMenu.visible = !sellMenu.visible;
      const level = this.selectedTurret.getData("level");

      const turretData = this.gameData.turrets[this.selectedTurret.name];

      // add up all the costs to get to this level
      let price = 0;
      for (let i = 1; i <= level; i++) price += turretData["level" + i].cost;

      // give back 50% of cost as the selling price
      sellPrice.setText("+" + Math.round(price * 0.5));
    });

    const sellPrice = this.add.gameText(0, 0, "+200", 2).setOrigin(1, 0.5);

    const sellMenu = this.prefab
      .instantiate(Prefab.Object.Menu, 0, 0, 250, 250)
      .add([
        this.add.gameText(0, -80, "Really sell?", 1),
        sellPrice.setPosition(15, -20).setName("sellPrice"),
        this.add.image(45, -20, "gem").setScale(0.8),
        this.add.gameImageButton(-50, 70, "checkmark", 0.4, () => {
          // sell the turret
          sellMenu.setVisible(false);
          this.display.turretSelect.setVisible(false);
          this.display.turretButtons.forEach((b) => b.setVisible(true));
          this.display.title.setVisible(true);

          // ex. "+200" is the text for sellPrice, that becomes 200
          const price = Number(sellPrice.text);
          this.updateGameStat("gems", price);

          const pos = this.convertWorldToGrid(
            this.selectedTurret.x,
            this.selectedTurret.y
          );

          this.grid[pos.x][pos.y].setData("turret", false);
          this.grid[pos.x][pos.y].removeInteractive().removeAllListeners();

          // set 3x3 grid around tile to not be turreted anymore
          // so other turrets can be placed
          for (let angle = 0; angle < 360; angle += 45) {
            const v = new Phaser.Math.Vector2(1, 0);

            v.setAngle(Phaser.Math.DegToRad(angle));
            v.x = Math.round(v.x) + pos.x;
            v.y = Math.round(v.y) + pos.y;

            this.grid[v.x][v.y].incData("turretAdjacent", -1);
          }

          this.selectedTurret.getData("loop").remove();
          this.selectedTurret.getData("rangeIndicator").destroy();
          this.selectedTurret.getData("highlight").destroy();
          this.selectedTurret.destroy();
          this.selectedTurret = null;
        }),
        this.add.gameImageButton(50, 70, "cross", 0.4, () => {
          sellMenu.setVisible(false);
        }),
      ])
      .setVisible(false);

    return this.add
      .container(0, -480, [
        this.add.gameText(0, 0, "Railgun", 3).setName("title"),
        this.add
          .gameText(0, 50, "Level 1", 1)
          .setOrigin(0.5, 0.5)
          .setName("level"),
        this.add
          .gameText(-140, 110, "Damage: 1", 1)
          .setOrigin(0, 0.5)
          .setName("damage"),
        this.add
          .gameText(-140, 160, "Fire Rate: 1 sec", 1)
          .setOrigin(0, 0.5)
          .setName("speed"),
        this.add
          .gameText(-140, 210, "Range: 1 tile", 1)
          .setOrigin(0, 0.5)
          .setName("range"),
        this.add
          .gameText(-140, 260, "Piercing: 1 enemy", 1)
          .setOrigin(0, 0.5)
          .setName("special"),
        upgradeButton.setPosition(-50, 350).setName("upgrade"),
        sellButton.setPosition(90, 350).setName("sell"),
        sellMenu.setPosition(0, 200).setName("sellMenu"),
        this.add.gameText(-35, 430, "100", 2).setOrigin(1, 0.5).setName("cost"),
        this.add.image(-10, 430, "gem").setScale(0.7).setName("gems"),
      ])
      .setVisible(false);
  }

  createOreTooltip() {
    // create tooltip for ore when mouse hovers over the tile

    const stars = [];
    for (let i = 0; i < 4; i++) {
      stars.push(
        this.add
          .star(i * 36 - 36 * 1.5, 20, 5, 7, 14, 0xffffff, 0)
          .setStrokeStyle(3, 0xffffff, 1)
          .setName("star" + (i + 1))
      );
    }

    this.display.oreTooltip = this.add
      .container(400, 400, [
        this.add
          .rectangle(0, 0, 180, 100, 0x000000, 0.9)
          .setStrokeStyle(2, 0xffffff, 1),
        this.add.gameText(0, -20, "Aluminum", 0.5).setName("oreText"),
        ...stars,
      ])
      .setAlpha(0)
      .setDepth(3);

    this.display.oreTooltip.setData(
      "bounds",
      this.display.oreTooltip.getBounds()
    );
  }

  createFpsText() {
    const fpsText = this.add.gameText(0, gameH, "FPS", 2).setOrigin(0, 1);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callbackScope: this,
      callback: () => {
        fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`);
      },
    });
  }

  pauseOrResume() {
    this.paused = !this.paused;

    if (this.paused) {
      this.children.each((c) => {
        if (c.getData("loop")) {
          c.getData("loop").paused = true;
        }
      });

      this.physics.pause();

      // pause portal animation
      this.tweens.getTweensOf(this.portal).forEach((tween) => tween.pause());

      this.scene.get("Stars").scene.pause();
      this.display.pause.keepPressedDown();
      this.display.play.letUp();
      this.display.fastForward.letUp();

      this.display.pauseText.setVisible(true);
    } else {
      this.children.each((c) => {
        if (c.getData("loop")) {
          c.getData("loop").paused = false;
        }
      });

      this.physics.resume();

      // resume portal animation
      this.tweens.getTweensOf(this.portal).forEach((tween) => tween.resume());

      this.scene.get("Stars").scene.resume();
      this.display.pause.letUp();

      if (this.time.timeScale == 1) {
        this.display.play.keepPressedDown();
        this.display.fastForward.letUp();
      } else {
        this.display.play.letUp();
        this.display.fastForward.keepPressedDown();
      }

      this.display.pauseText.setVisible(false);
    }
  }

  flipGameSpeed() {
    if (this.paused) this.pauseOrResume(); // automatically resume

    if (this.time.timeScale == 1) {
      // activate double speed
      this.display.play.letUp();
      this.display.fastForward.keepPressedDown();

      this.tweens.timeScale = 2;
      this.time.timeScale = 2;
      this.physics.world.timeScale = 0.5;
    } else {
      // return to normal speed
      this.display.play.keepPressedDown();
      this.display.fastForward.letUp();

      this.tweens.timeScale = 1;
      this.time.timeScale = 1;
      this.physics.world.timeScale = 1;
    }
  }

  updateGameStat(stat, change) {
    // stat is hearts, gems, or danger
    this.gameStats[stat] += change;
    this.display[stat].text = this.gameStats[stat];
    if (stat == "danger") this.display[stat].text += "%";
  }

  createTurretButtons() {
    const turrets = [];

    for (let i = 0; i < 6; i++) {
      const x = (i % 2) * 150 - 70;
      const y = Math.floor(i / 2) * 150 - 370;
      let prefab;
      let name;

      switch (i) {
        case 0:
          prefab = Prefab.Object.Railgun;
          name = "railgun";
          break;
        case 1:
          prefab = Prefab.Object.PlasmaBurst;
          name = "plasmaBurst";
          break;
        case 2:
          prefab = Prefab.Object.TeslaCoil;
          name = "teslaCoil";
          break;
        case 3:
          prefab = Prefab.Object.IonCannon;
          name = "ionCannon";
          break;
        case 4:
          prefab = Prefab.Object.LRLaser;
          name = "lrLaser";
          break;
        case 5:
          prefab = Prefab.Object.Refinery;
          name = "refinery";
          break;
      }

      turrets.push(this.createTurretButton(x, y, prefab, name));
    }

    return turrets;
  }

  createTurretButton(x, y, prefab, name) {
    const bg = this.add
      .rectangle(0, 0, 120, 120, 0xffffff, 0.3)
      .setStrokeStyle(6, 0xffffff, 1);

    const turret = this.prefab
      .instantiate(prefab, 0, 0, this.tileW, this.tileW)
      .setScale(1.5);

    let turretData = this.gameData.turrets[name];

    if (!turretData) turretData = this.gameData.turrets["railgun"];

    const tooltip = this.add.container(-70, 0, [
      this.add
        .rectangle(0, 118, 400, 360, 0x000000, 0.9)
        .setStrokeStyle(2, 0xffffff, 1)
        .setOrigin(1, 0.5),
      this.add
        .gameText(-390, -55, String(turretData.tooltip.title), 3)
        .setOrigin(0, 0),
      this.add
        .gameText(-390, 20, String(turretData.tooltip.desc), 0.5, 380)
        .setOrigin(0, 0)
        .setLineSpacing(14),
      this.add.image(-155, 250, "gem").setScale(0.9),
      this.add
        .gameText(-190, 250, String(turretData.level1.cost), 4)
        .setOrigin(1, 0.5),
    ]);

    tooltip.each((child) => child.setAlpha(0));

    const button = this.add
      .container(x, y, [bg, turret, tooltip])
      .setSize(bg.width, bg.height)
      .setInteractive()
      .on("pointerover", () => {
        this.tweens.add({
          targets: bg,
          fillAlpha: 0.5,
          lineWidth: 8,
          duration: 100,
        });
        this.tweens.add({
          targets: turret,
          scale: 1.75,
          duration: 100,
        });

        // so tooltip appears over other buttons
        button.parentContainer.bringToTop(button);

        tooltip.each((child) => {
          const delay = 500;
          const duration = 100;

          if (child.type == "Rectangle") {
            this.tweens.add({
              targets: child,
              scaleX: 1,
              duration: duration,
              delay: delay * 0.8,
              onStart: () => child.setScale(0, 1).setAlpha(1),
              ease: "exp.inout",
            });
          } else if (child.type == "Text") {
            this.tweens.add({
              targets: child,
              alpha: 1,
              duration: duration,
              delay: delay,
            });
            child.typeOut(duration * 4, delay);
          } else if (child.type == "Image") {
            this.tweens.add({
              targets: child,
              alpha: 1,
              duration: duration,
              delay: delay,
              repeat: 1,
              yoyo: true,
              ease: "exp.inout",
              onComplete: () => child.setAlpha(1),
            });
          }
        });
      })
      .on("pointerout", () => {
        bg.fillColor = 0xffffff;
        button.off("pointerup");

        this.tweens.add({
          targets: bg,
          fillAlpha: 0.3,
          lineWidth: 6,
          duration: 100,
        });
        this.tweens.add({
          targets: turret,
          scale: 1.5,
          duration: 100,
        });

        tooltip.each((child) => {
          this.tweens.killTweensOf(child);

          this.tweens.add({
            targets: child,
            alpha: 0,
            duration: 100,
          });
        });
      })
      .on("pointerdown", () => {
        bg.fillColor = 0xe1e1e1;

        tooltip.each((child) => {
          this.tweens.killTweensOf(child);

          this.tweens.add({
            targets: child,
            alpha: 0,
            duration: 100,
          });
        });

        if (button.listenerCount("pointerup") < 1) {
          button.on("pointerup", (p) => {
            bg.fillColor = 0xffffff;

            // don't grab another object if we're still holding something
            if (this.selectedObj) return;

            const size = this.gameData.turrets.size;

            if (this.gameStats.gems >= turretData.level1.cost) {
              this.selectedObj = this.prefab
                .instantiate(prefab, p.worldX, p.worldY, size, size)
                .setAlpha(0.9)
                .setDepth(4) // above buttons and rangeIndicator
                .setData(
                  "rangeIndicator",
                  this.add
                    .circle(
                      p.worldX,
                      p.worldY,
                      turretData.level1.range * this.tileW,
                      0xffffff,
                      0.3
                    )
                    .setStrokeStyle(3, 0xffffff, 0.9)
                    .setDepth(3) // above buttons
                );
            } else this.brokeAlert();

            button.off("pointerup");

            // emit a pointermove event so the turret will adjust accordingly
            this.input.emit("pointermove", p);
          });
        }
      });

    return button;
  }

  brokeAlert() {
    // you already know what this is
    this.tweens.killTweensOf(this.display.gems);
    this.display.gems.setTint(0xffffff).setAlpha(1);
    this.tweens.add({
      targets: this.display.gems,
      alpha: 0.5,
      yoyo: true,
      repeat: 1,
      duration: 120,
      onStart: () => {
        this.display.gems.setTint(0xe63946);
      },
      onComplete: () => {
        this.display.gems.setTint(0xffffff);
      },
    });
  }

  openAlienPortal() {
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
    const numColors = 100; // this directly influences how fast the gradient is

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
      scale: 1.6,
      alpha: 1,
      angle: `+=${Phaser.Math.Between(270, 360)}`,
      duration: 500, //2000,
      //delay: 3000,
      onComplete: () => {
        this.alienWaveHandler();

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

  alienWaveHandler() {
    const updateSpeed = this.gameData.alien.spawnRate;

    this.portal.setData(
      "loop",
      this.time.addEvent({
        loop: true,
        delay: updateSpeed,
        startAt: updateSpeed * 0.9,
        paused: this.paused,
        callback: () => {
          // if drone is escaping or destroyed, stop makin aliens
          if (this.gameOver) {
            this.portal.getData("loop").remove();
            return;
          }

          //if (Math.random() > 0.75) return;
          this.generateAlien();
        },
      })
    );
  }

  generateAlien() {
    // start alien at the portal and move to the first item in this.path
    let pathIndex = 0;

    const alien = this.add
      .circle(this.portal.x, this.portal.y, this.tileW * 0.4, 0xaffc41, 1)
      .setStrokeStyle(10, 0x857c8d, 1)
      .setScale(0.75)
      .setData("pathIndex", 0)
      .setData("health", this.gameData.alien.base.health)
      .setAlpha(0)
      .setName("alien");

    // add to physics group so it can be detected by turrets
    this.alienGroup.add(alien);
    alien.body.isCircle = true;

    const updateSpeed = this.gameData.alien.base.speed;
    alien.setData(
      "loop",
      this.time.addEvent({
        loop: true,
        delay: updateSpeed,
        paused: this.paused,
        callback: () => {
          if (alien.alpha == 0) {
            this.tweens.add({
              targets: alien,
              alpha: 1,
              duration: updateSpeed * 1.5,
            });
          }

          // alien will move to this tile
          const nextTile = this.path[pathIndex];
          // may be undefined if we're already at the end, see below

          pathIndex++; // prepare for the next loop
          // if we've hit the end of the path, we've hit the drone
          // so inflict damage and destroy alien
          // unless the drone is escaping to the ship, then just stop
          if (pathIndex > this.path.length) {
            alien.getData("loop").remove(); // stop moving forward
            alien.body.stop(); // stop moving forward

            if (!this.gameOver) {
              // if drone hasn't escaped yet, apply damage
              const damage = this.gameData.alien.base.damage;
              this.updateGameStat("hearts", -1 * damage);
              alien.destroy();
            }
            return; // return immediately so we don't invoke moveToObject
          }

          this.physics.moveToObject(alien, nextTile, null, updateSpeed);
        },
      })
    );
  }

  destroyMiningDrone(drone) {
    // turtle destroyed, now close out the scene
    this.gameOver = true; // stop processing game events
    drone.getData("loop").remove(); // stop update loop

    /*     this.alienGroup.getChildren().forEach((alien) => {
      alien.getData("loop").remove();
      alien.body.stop();
    }); */

    this.tweens.add({
      targets: drone,
      scale: 2,
      angle: 1080,
      delay: 200,
      duration: 2000,
      ease: "sine.inout",
      onComplete: () => {
        this.add.tween({
          targets: drone,
          alpha: 0,
          angle: 1080,
          duration: 200,
        });

        /*         this.alienGroup.getChildren().forEach((alien) => {
          this.tweens.add({
            targets: alien,
            alpha: 0.01, // lmao yeah this avoids the alpha -> 1 tween
            scale: alien.scale + 0.3,
            duration: 300,
          });
        }); */

        for (let i = 0; i < 4; i++) {
          const circle = this.add
            .circle(drone.x, drone.y, 0)
            .setStrokeStyle(32, 0xffffff, 0.8)
            .setAlpha(0);

          this.add.tween({
            targets: circle,
            radius: this.tileW * 20,
            lineWidth: 4,
            duration: 1500,
            delay: i * 400,
            onStart: () => circle.setAlpha(1),
            onComplete: () => {
              this.add.tween({
                targets: circle,
                radius: this.tileW * 30,
                duration: 1000,
                lineWidth: 1,
                alpha: 0,
                onComplete: () => {
                  if (i == 3) this.endScene();
                },
                completeDelay: 1500,
              });
            },
          });
        }
      },
    });
  }

  createPhysics() {
    this.alienGroup = this.physics.add.group();
    this.turretGroup = this.physics.add.staticGroup();
    this.bulletGroup = this.physics.add.group({ collideWorldBounds: true });

    // if alien goes within turret's range,
    // add it to the turret's target list
    this.physics.add.overlap(
      this.alienGroup,
      this.turretGroup,
      (alien, turret) => {
        const targets = turret.getData("targets");
        if (!targets.includes(alien)) targets.push(alien);
      }
    );

    // pew pew
    this.physics.add.overlap(
      this.bulletGroup,
      this.alienGroup,
      (bullet, alien) => {
        this.bulletGroup.remove(bullet, true, true);

        if (alien.getData("health") <= 0) return; // already ded

        const health = alien.incData("health", -1).getData("health");

        alien.strokeColor = 0xbc4749;
        this.time.delayedCall(80, () => (alien.strokeColor = 0x857c8d));

        // chops off an equal portion of the arc each time
        alien.endAngle -= (alien.endAngle - 150) / (health + 1);

        if (health <= 0) {
          alien.getData("loop").remove(); // stop update loop
          this.tweens.add({
            targets: alien,
            alpha: 0,
            scale: alien.scale + 0.3,
            duration: 100,
            onComplete: () => this.alienGroup.remove(alien, true, true),
          });
        }
      }
    );

    this.physics.world.on("worldbounds", (body) => {
      if (this.bulletGroup.contains(body.gameObject)) {
        this.bulletGroup.remove(body.gameObject, true, true);
      }
    });

    this.physics.world.setBounds(0, 0, gameW, gameH);
  }

  createKeyboardControls() {
    // apparently this is all you need for the "JustDown" check,
    // but I added the JustDown if statement anyway.
    const s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.keyboard.on("keydown-SPACE", (e) => {
      if (Phaser.Input.Keyboard.JustDown(s)) this.pauseOrResume();
    });
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
        this.createFpsText();
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
              onStart: () => this.shop.setVisible(true),
              onComplete: () => this.results.setVisible(false),
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
      .setVisible(false)
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
              onStart: () => this.contracts.setVisible(true),
              onComplete: () => this.shop.setVisible(false),
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
              onStart: () => this.results.setVisible(true),
              onComplete: () => this.shop.setVisible(false),
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
      .setVisible(false)
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
              onStart: () => this.shop.setVisible(true),
              onComplete: () => this.contracts.setVisible(false),
            });
          }
        ),
      ]);
  }

  createFpsText() {
    const fpsText = this.add.gameText(0, gameH, "FPS", 2).setOrigin(0, 1);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callbackScope: this,
      callback: () => {
        fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`);
      },
    });
  }

  endScene() {
    this.input.enabled = false; // stop all further player input

    const duration = 1000;
    this.cameras.main.fade(duration);
    this.time.delayedCall(duration, () => {
      // this.scene.start() has a visual glitch, so this is the workaround
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
      //fps: 300,
    },
  },
  title: VERSION,
  autoFocus: true,
};

class GameText extends Phaser.GameObjects.Text {
  originalText;

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

    this.originalText = text; // for typeOut()

    this.setOrigin(0.5, 0.5).setFontFamily(FONT);
  }

  typeOut(duration, delay) {
    const tween = this.scene.tweens.addCounter({
      from: 0,
      to: this.originalText.length,
      duration: duration,
      delay: delay,
      onUpdate: () => {
        this.text = this.originalText.slice(0, tween.getValue());
      },
    });

    return this; // for method chaining
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
    callback,
    doubleGradient = false // see doubleGradient below
  ) {
    super(scene, x, y);

    const text = scene.add
      .text(0, 0, string, {
        font: `${size * 8 + 24}px`,
        fontStyle: "bold",
        padding: 24,
        lineSpacing: 10,
        fill: "#fff",
        align: "left",
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: CLRS.button.shadow,
          blur: 5,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5, 0.5)
      .setFontFamily(FONT);

    // width fixes the button to be a certain width,
    // but you can leave it for a dynamic width (widens or shortens with the text)

    let w = text.getBounds().width; // dynamic width
    if (width) w = width; // fixed width, must be given

    const bg = scene.add
      .rectangle(0, 0, w, text.getBounds().height, CLRS.button.fill)
      .setStrokeStyle(8, CLRS.button.stroke);

    const bgGradient = bg.postFX.addGradient(
      CLRS.button.fill,
      CLRS.button.stroke,
      0.2,
      0,
      0,
      0,
      2
    );

    const tweenTime = 80;

    this.add([bg, text])
      .setSize(bg.width, bg.height)
      .setInteractive()
      .on("pointerover", () => {
        scene.add.tween({
          targets: bgGradient,
          alpha: 0.35,
          duration: tweenTime,
        });
      })
      .on("pointerout", () => {
        scene.add.tween({
          targets: bgGradient,
          alpha: 0.2,
          duration: tweenTime,
        });
        this.off("pointerup");
      })
      .on("pointerdown", () => {
        scene.add.tween({
          targets: bgGradient,
          alpha: 0.5,
          duration: tweenTime,
        });

        if (this.listenerCount("pointerup") < 1) {
          this.on("pointerup", (p) => {
            scene.add.tween({
              targets: bgGradient,
              alpha: 0.35,
              duration: tweenTime,
            });

            callback(p); // bro... why
          });
        }
      });
  }

  preUpdate(delta, time) {}
}

class GameImageButton extends Phaser.GameObjects.Container {
  gradient;
  keepPressed;

  constructor(
    scene, // always "this" in the scene class
    x,
    y,
    key = "",
    scale = 1,
    callback
  ) {
    super(scene, x, y);

    const image = scene.add.image(0, 0, key).setScale(scale);
    // preFX had a bug where the image would be blank, so postFX instead
    image.postFX.addShadow(-2, -2, 0.1, 0.3, CLRS.button.shadow);

    const padding = 24;

    const bg = scene.add
      .rectangle(
        0,
        0,
        image.displayWidth + padding,
        image.displayHeight + padding,
        CLRS.button.fill
      )
      .setStrokeStyle(8, CLRS.button.stroke);

    const bgGradient = bg.postFX.addGradient(
      CLRS.button.fill,
      CLRS.button.stroke,
      0.2,
      0,
      0,
      0,
      2
    );

    this.gradient = bgGradient; // used for keepPressed() and letUp()
    this.keepPressed = false;

    const tweenTime = 80;

    this.add([bg, image])
      .setSize(bg.width, bg.height)
      .setInteractive()
      .on("pointerover", () => {
        if (this.keepPressed) return;

        scene.add.tween({
          targets: bgGradient,
          alpha: 0.35,
          duration: tweenTime,
        });
      })
      .on("pointerout", () => {
        if (this.keepPressed) return;

        scene.add.tween({
          targets: bgGradient,
          alpha: 0.2,
          duration: tweenTime,
        });
      })
      .on("pointerdown", (p) => {
        scene.add.tween({
          targets: bgGradient,
          alpha: 0.5,
          duration: tweenTime,
        });

        callback(p); // invoke on pointerdown for better responsiveness
      })
      .on("pointerup", () => {
        if (this.keepPressed) return;

        scene.add.tween({
          targets: bgGradient,
          alpha: 0.35,
          duration: tweenTime,
        });
      });
  }

  keepPressedDown() {
    // keep button pressed down (like on a tape recorder)
    this.keepPressed = true;

    this.scene.tweens.add({
      targets: this.gradient,
      alpha: 0.5,
      duration: 150,
    });
  }

  letUp() {
    // let button come back up
    this.keepPressed = false;

    // if pointer currently over this object,
    // set alpha gradient to 0.35, otherwise 0.2
    const currentlyOver = this.scene.input.hitTestPointer(
      this.scene.input.activePointer
    );

    for (let i = 0; i < currentlyOver.length; i++) {
      if (currentlyOver[i] == this) {
        this.scene.add.tween({
          targets: this.gradient,
          alpha: 0.35,
          duration: 150,
        });
        return;
      }
    }

    this.scene.add.tween({
      targets: this.gradient,
      alpha: 0.2,
      duration: 150,
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
    PlasmaBurst: 4,
    TeslaCoil: 5,
    IonCannon: 6,
    LRLaser: 7,
    Refinery: 8,
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
    turrets: {
      railgun: 0xff9f1c,
      plasmaBurst: 0xa100f2,
      teslaCoil: 0xfdc500,
      ionCannon: 0x00509d,
      lrLaser: 0xa70b0b,
      refinery: 0x548c2f,
    },
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
          .setDepth(2)
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
          .setDepth(3);
      case 2:
        return this.scene.add
          .rectangle(x, y, w, h, this.colors.drone.fill)
          .setStrokeStyle(4, this.colors.drone.stroke)
          .setName("turtle");
      case 3:
        return this.scene.add
          .rectangle(x, y, w, h, this.colors.turrets.railgun, 1)
          .setStrokeStyle(5, this.colors.turretStroke, 1)
          .setData("level", 1)
          .setName("railgun");
      case 4:
        return this.scene.add
          .ellipse(x, y, w, h, this.colors.turrets.plasmaBurst, 1)
          .setStrokeStyle(5, this.colors.turretStroke, 1)
          .setData("level", 1)
          .setSmoothness(8)
          .setAngle(180 / 8)
          .setName("plasmaBurst");
      case 5:
        return this.scene.add
          .ellipse(x, y, w, h, this.colors.turrets.teslaCoil, 1)
          .setStrokeStyle(5, this.colors.turretStroke, 1)
          .setData("level", 1)
          .setSmoothness(6)
          .setName("teslaCoil");
      case 6:
        return this.scene.add
          .circle(x, y, w / 2, this.colors.turrets.ionCannon, 1)
          .setStrokeStyle(5, this.colors.turretStroke, 1)
          .setData("level", 1)
          .setIterations(0.2)
          .setAngle(270 / 5)
          .setName("ionCannon");
      case 7:
        return this.scene.add
          .triangle(
            x,
            y,
            -w * 0.5,
            h * 0.4,
            0,
            -h * 0.5,
            w * 0.5,
            h * 0.4,
            this.colors.turrets.lrLaser,
            1
          )
          .setOrigin(0, 0)
          .setStrokeStyle(5, this.colors.turretStroke, 1)
          .setData("level", 1)
          .setName("lrLaser");
      case 8:
        return this.scene.add
          .circle(x, y, w * 0.5, this.colors.turrets.refinery, 1)
          .setStrokeStyle(5, this.colors.turretStroke, 1)
          .setData("level", 1)
          .setName("refinery");
    }
  }
}

const game = new Phaser.Game(config);
