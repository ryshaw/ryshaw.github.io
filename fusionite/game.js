const VERSION = "Fusionite v0.1";

const DEV_MODE = true; // turns on physics debug mode, devtext, fps

const gameW = 1920;
const gameH = 1080;

const FONTS = [
  "Roboto Mono",
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
  topGradient: 0xe2ece9, // for background
  bottomGradient: 0x7de2d1, // for background
  fillColor: 0x070600, // colors UI #and drawings
  tintColor: 0xfbf8cc, // for highlighting text
  clickColor: 0xdddddd, // when text is clicked
  buttonColor: 0xe0fbfc, // for coloring buttons and the title
  white: 0xffffff,
  black: 0x000000,
};

class Background extends Phaser.Scene {
  graphics;

  constructor() {
    super("Background");
  }

  create() {
    const w = window.innerWidth; // take up the full browser window
    const h = window.innerHeight;

    this.graphics = this.add.graphics();

    this.graphics.fillGradientStyle(
      COLORS.topGradient,
      COLORS.topGradient,
      COLORS.bottomGradient,
      COLORS.bottomGradient,
      0.9
    );
    this.graphics.fillRect(0, 0, w, h);

    //this.scene.launch("MainUI"); // start menu, tutorial, and game launcher
    this.scene.launch("Game");

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
    this.graphics.fillRect(0, 0, gameSize.width, gameSize.height);
  }
}

class Game extends Phaser.Scene {
  player;
  keysDown;
  bounds; // 1920x1080 rectangle showcasing the game resolution
  devText; // corner text displaying game data so we don't spam the console

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
    // this.scene.get("MainUI").playSound("levelstart");

    this.createResolution();

    this.createLayout();
    this.createPhysics();
    this.createFactoryGrid();
    //this.createPlayer();

    /*this.createFusion(700, 400, 3);

    this.createFusion(1100, 600, 6);

    this.createFusion(300, 800, 8);

    this.createFusion(1400, 300, 12);*/

    this.createKeyboardControls();

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
    // show bounds while in development
    this.bounds = this.add
      .rectangle(gameW * 0.5, gameH * 0.5, gameW, gameH)
      .setStrokeStyle(8, 0xffffff, 0.8);
  }

  createPhysics() {
    this.matter.world.setBounds(0, 0, gameW, gameH);
  }

  createPlayer() {
    // build hexagon with some trigonometry. taken from bouncy balls!

    const r = 30;
    const points = [];
    for (let index = 1; index < 7; index++) {
      points.push({
        x: r * Math.cos((index * Math.PI) / 3),
        y: r * Math.sin((index * Math.PI) / 3),
      });
    }

    const offset = new Phaser.Math.Vector2(
      r * Math.cos(Math.PI / 3),
      r * Math.sin(Math.PI / 3)
    );

    const hexA = this.add
      .polygon(0, 0, points, 0xffffff, 0.5)
      .setStrokeStyle(8, 0xffffff)
      .setDisplayOrigin(offset.x * 1.5, offset.y * 0.5);

    const hexC = Phaser.Utils.Objects.Clone(hexA);
    hexC.setPosition(300, 300);

    const hexB = this.add
      .polygon(offset.x * 3, offset.y, points, 0xffffff, 0.5)
      .setStrokeStyle(8, 0xffffff)
      .setDisplayOrigin(offset.x * 1.5, offset.y * 0.5);

    this.player = this.add.container(0, 0, [hexA, hexB]);

    const bodyA = this.matter.bodies.polygon(200, 200, 6, 30, {
      angle: Math.PI / 2,
    });
    const bodyB = this.matter.bodies.polygon(
      200 + offset.x * 3,
      200 + offset.y,
      6,
      30,
      {
        angle: Math.PI / 2,
      }
    );

    const compoundBody = this.matter.body.create({ parts: [bodyA, bodyB] });

    this.matter.add.gameObject(this.player);
    this.player.setExistingBody(compoundBody);

    this.player.setMass(15);
    this.player.body.inertia = Math.round(10 ** 7.4);
    this.player.setFriction(0, 0.02, 1);
  }

  createFusion(x, y, numHex) {
    const r = 30;
    const points = [];
    for (let index = 1; index < 7; index++) {
      points.push({
        x: r * Math.cos((index * Math.PI) / 3),
        y: r * Math.sin((index * Math.PI) / 3),
      });
    }

    const hexagons = [
      this.add.polygon(0, 0, points, 0x8093f1, 0.5).setStrokeStyle(8, 0xffffff),
    ];
    const bodies = [
      this.matter.bodies.polygon(0, 0, 6, r, {
        angle: Math.PI / 2,
      }),
    ];

    for (let i = 1; i < numHex; i++) {
      let direction = Phaser.Math.Between(1, 6) + 0.5;
      let x = (2 * r - 8) * Math.cos((direction * Math.PI) / 3);
      let y = (2 * r - 8) * Math.sin((direction * Math.PI) / 3);

      let iterations = 100;
      while (iterations > 0 && this.matter.containsPoint(bodies, x, y)) {
        iterations -= 1;

        direction = Phaser.Math.Between(1, 6) + 0.5;
        x += (2 * r - 8) * Math.cos((direction * Math.PI) / 3);
        y += (2 * r - 8) * Math.sin((direction * Math.PI) / 3);
      }

      const hex = this.add
        .polygon(x, y, points, 0xffffff, 0.5)
        .setStrokeStyle(8, 0xffffff);
      const body = this.matter.bodies.polygon(x, y, 6, r, {
        angle: Math.PI / 2,
      });

      hexagons.push(hex);
      bodies.push(body);
    }

    // because of how matter bodies work,
    // the "center" of the compound body is its center of mass,
    // which is hard to account for.
    // I finally, FINALLY figured out that setting the display origin
    // of each of the hexes to be the "average" position of all the hexes
    // got them to align correctly with the physics bodies. incredible!
    const avg = new Phaser.Math.Vector2(0, 0);
    hexagons.forEach((hex) => {
      avg.x += hex.x;
      avg.y += hex.y;
    });

    avg.scale(1 / numHex);

    hexagons.forEach((hex) => hex.setDisplayOrigin(avg.x, avg.y));

    const fusion = this.add.container(x, y, hexagons);

    const compoundBody = this.matter.body.create({ parts: bodies });

    this.matter.add.gameObject(fusion);
    fusion.setExistingBody(compoundBody);

    fusion.setMass(5 + numHex * 5);
    fusion.body.inertia = Math.round(10 ** 7.4);
    fusion.setFriction(0, 0.07, 1);

    fusion.x = x;
    fusion.y = y;
  }

  createFactoryGrid() {
    this.add.rectangle(gameW * 0.5, gameH * 0.5, 5, 181.96, 0x0000ff, 1);
    this.add.rectangle(gameW * 0.5, gameH * 0.5, 915, 5, 0x00ff00, 1);

    const r = 30;
    const points = [];
    for (let index = 1; index < 7; index++) {
      points.push({
        x: r * Math.cos((index * Math.PI) / 3),
        y: r * Math.sin((index * Math.PI) / 3),
      });
    }

    const hexagons1 = [];
    const hexagons2 = [];

    const gridX = 16; // must be even
    const gridY = 12;
    const size = gridX * gridY;

    for (let i = 0; i < size / 2; i++) {
      hexagons1.push(
        this.add
          .polygon(0, 0, points, 0xffffff, 0.2)
          .setStrokeStyle(2, 0xffffff)
      );
      hexagons2.push(
        this.add
          .polygon(0, 0, points, 0xffffff, 0.2)
          .setStrokeStyle(2, 0xffffff)
      );
    }

    // I don't know why these numbers work but they do
    Phaser.Actions.GridAlign(hexagons1, {
      width: gridX / 2,
      cellWidth: r * 3,
      cellHeight: r * 2 - r / 4,
    });

    Phaser.Actions.GridAlign(hexagons2, {
      width: gridX / 2,
      cellWidth: r * 3,
      cellHeight: r * 2 - r / 4,
      x: r * 1.5,
      y: r - r / 4,
    });

    const grid = this.add.container();
    grid.add(hexagons1).add(hexagons2);

    const bounds = grid.getBounds();
    grid.setPosition(
      gameW / 2 - bounds.width / 2 + r,
      gameH * 0.5 - bounds.height / 2 + r - r / 4
    );

    console.log(grid.getBounds());
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

  loadGameText() {
    new GameText(this, gameW * 0.5, 5, "welcome to fusionite", "g").setOrigin(
      0.5,
      0
    );

    const fpsText = new GameText(
      this,
      0,
      0,
      `${Math.round(this.sys.game.loop.actualFps)}`
    )
      .setOrigin(0, 0)
      .setVisible(DEV_MODE);

    this.time.addEvent({
      delay: 500,
      loop: DEV_MODE,
      callbackScope: this,
      callback: () => {
        fpsText.setText(`${Math.round(this.sys.game.loop.actualFps)}`);
      },
    });

    // records player direction, player velocity, etc
    this.devText = new GameText(this, gameW, gameH, "", "s")
      .setAlign("right")
      .setPadding(10)
      .setOrigin(1, 1)
      .setVisible(DEV_MODE);
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

  update() {
    const speed = 0.01; // how much force is applied to player
    // calculate intended direction from the keys currently down
    let direction = new Phaser.Math.Vector2(0, 0);

    this.keysDown.each((keyVector) => direction.add(keyVector));

    direction.normalize();

    if (this.player && this.keysDown.length > 0) {
      this.player.applyForce(direction.scale(speed));
    }

    if (this.devText) this.updateDevText();
  }

  updateDevText() {
    if (!this.player || !this.player.body) return;
    const b = this.player.body;
    const x = Phaser.Math.RoundTo(b.velocity.x, 0);
    const y = Phaser.Math.RoundTo(b.velocity.y, 0);
    const velocityText = `velocity: (${x}, ${y})`;
    const speedText = `speed: ${Phaser.Math.RoundTo(b.speed, 0)}`;
    const bodyText = `mass: ${b.mass}\nfriction: ${b.friction}\nair: ${b.frictionAir}\nstatic: ${b.frictionStatic}`;
    this.devText.text = `${velocityText}\n${speedText}\n${bodyText}`;
  }

  restartGame() {}
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
  errorText;
  creditsMenu;
  creditsOptions;
  levelSelectMenu;
  levelSelectOptions;
  levelSelectConfirmMenu;
  levelSelectConfirmOptions;
  tutorialMenu;
  tutorialOptions;
  tutorialSegment; // which section of tutorial are we on?
  transition; // are we transitioning between menus or levels?
  transitionTime; // how fast transition should be. 400-500

  constructor() {
    super("MainUI");
  }

  preload() {
    var progress = this.add.graphics();
    // innerWidth works better b/c we haven't done resolution scaling yet
    const text = new GameText(
      this,
      window.innerWidth * 0.5,
      window.innerHeight * 0.5,
      "loading...",
      "g"
    );

    this.load.on("progress", function (value) {
      progress.clear();
      // the numbers are hsv[45].color, hsv[135].color, hsv[215].color, hsv[305].color
      // I just didn't want to instantiate a whole color wheel for four colors
      progress.fillGradientStyle(16773836, 13434841, 13427199, 16764154, 0.6);
      progress.lineStyle(5, COLORS.buttonColor, 1);
      // loading bar is 600x50, looks like that works for everything
      progress.fillRect(
        window.innerWidth * 0.5 - 300,
        window.innerHeight * 0.5 - 50,

        600 * value,
        100
      );
      progress.strokeRect(
        window.innerWidth * 0.5 - 300,
        window.innerHeight * 0.5 - 50,

        600,
        100
      );
    });

    this.load.on("complete", function () {
      progress.destroy();
      text.destroy();
    });

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

    this.load.audio("music", ["music.mp3", "music.ogg"]);

    this.load.text("credits", "credits.txt");

    this.load.setPath("assets/sfx");
    this.load.audio("click1", ["click1.ogg", "click1.mp3"]);
    this.load.audio("click3", ["click3.ogg", "click3.mp3"]);
    this.load.audio("misc_menu_4", ["misc_menu_4.wav", "misc_menu_4.mp3"]);
    this.load.audio("positive", ["positive.wav", "positive.mp3"]);
    this.load.audio("power_up_04", ["power_up_04.ogg", "power_up_04.mp3"]);
    this.load.audio("powerUp5", ["powerUp5.ogg", "powerUp5.mp3"]);
    this.load.audio("powerUp11", ["powerUp11.ogg", "powerUp11.mp3"]);
    this.load.audio("retro_coin_01", [
      "retro_coin_01.ogg",
      "retro_coin_01.mp3",
    ]);
    this.load.audio("retro_explosion_02", [
      "retro_explosion_02.ogg",
      "retro_explosion_02.mp3",
    ]);
    this.load.audio("save", ["save.wav", "save.mp3"]);
    this.load.audio("sharp_echo", ["sharp_echo.wav", "sharp_echo.mp3"]);
    this.load.audio("synth_beep_02", [
      "synth_beep_02.ogg",
      "synth_beep_02.mp3",
    ]);
    this.load.audio("synth_misc_01", [
      "synth_misc_01.ogg",
      "synth_misc_01.mp3",
    ]);
    this.load.audio("synth_misc_07", [
      "synth_misc_07.ogg",
      "synth_misc_07.mp3",
    ]);
    this.load.audio("synth_misc_15", [
      "synth_misc_15.ogg",
      "synth_misc_15.mp3",
    ]);
    this.load.audio("tone1", ["tone1.ogg", "tone1.mp3"]);
  }

  create() {
    this.createResolution();

    // show the "game window" while in development
    // no longer in development.
    //this.add.rectangle(gameW * 0.5, gameH * 0.5, gameW, gameH, 0x000000, 0.02);

    this.createButtons();
    this.createControls();
    this.createAudio();
    this.createEvents();

    WebFont.load({
      google: {
        families: FONTS,
      },
      active: () => {
        this.createTitleText();
        this.createMenus();
        //this.takeSnapshot();
      },
    });

    this.gameActive = false;
    this.transition = false;
    this.transitionTime = 400;
  }

  takeSnapshot() {
    // this code is stolen from:
    // https://phaser.discourse.group/t/save-canvas-using-phaser3/2786/3

    function exportCanvasAsPNG(fileName, dataUrl) {
      var MIME_TYPE = "image/png";
      var imgURL = dataUrl;
      var dlLink = document.createElement("a");
      dlLink.download = fileName;
      dlLink.href = imgURL;
      dlLink.dataset.downloadurl = [
        MIME_TYPE,
        dlLink.download,
        dlLink.href,
      ].join(":");
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
    }

    game.renderer.snapshot(function (image) {
      exportCanvasAsPNG("snapshot", image.src);
    });

    const t = Phaser.Math.Between(10000, 20000);
    this.time.delayedCall(t, () => this.takeSnapshot());
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
      }
    });

    const m = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.input.keyboard.on("keydown-M", () => {
      if (Phaser.Input.Keyboard.JustDown(m)) this.flipMusic();
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

    this.events.on("pause", () => console.log("Paused"));
    this.events.on("resume", () => console.log("Resumed"));
  }

  createEvents() {
    // pause on click away
    this.game.events.addListener(Phaser.Core.Events.BLUR, () => {
      if (!this.scene.isPaused("Game")) this.pauseOrResumeGame();
    });

    // if blurred, sounds will pile up in the queue,
    // so remove all that isn't the main theme when we return
    // or else we'll have a sound explosion upon focus
    this.game.events.addListener(Phaser.Core.Events.FOCUS, () => {
      this.sound.getAllPlaying().forEach((sound) => {
        if (sound.key != "music") this.sound.stopByKey(sound.key);
      });
    });
  }

  pauseOrResumeGame() {
    if (!this.gameActive) return; // game hasn't started at all yet
    if (this.scene.get("Game").gameOver) return; // can't pause when ded

    if (!this.scene.isPaused("Game")) {
      this.playSound("pause");
      this.scene.pause("Game");
      this.pauseButton.setVisible(false);
      this.playButton.setVisible(true);
      this.pauseMenu.setVisible(true);
      this.activeOption = -1;
      this.activeOptions = this.pauseOptions;
    } else {
      this.playSound("resume");
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

      if (this.gameActive) {
        this.musicOnButton.setVisible(false);
        this.musicOffButton.setVisible(true);
      }
      this.startMenu.getByName("musicText").text = "music: off";
    } else {
      music.resume();
      localStorage.setItem("music", "on");

      if (this.gameActive) {
        this.musicOnButton.setVisible(true);
        this.musicOffButton.setVisible(false);
      }
      this.startMenu.getByName("musicText").text = "music: on";
    }
  }

  playSound(s) {
    try {
      const config = {
        volume: 0.7,
        mute: this.sound.get("music").isPaused,
      };

      switch (s) {
        case "pointerover":
          this.sound.play("click1", {
            volume: 0.3,
            mute: this.sound.get("music").isPaused,
          });
          break;
        case "pointerup":
          this.sound.play("click3", config);
          break;

        case "levelstart":
          this.sound.play("misc_menu_4", config);
          break;
        case "gamewin":
          this.sound.play("positive", {
            volume: 0.8,
            mute: this.sound.get("music").isPaused,
          });
          break;
        case "gamelose":
          this.sound.play("synth_misc_15", {
            volume: 0.4,
            mute: this.sound.get("music").isPaused,
          });
          break;
        case "highlight":
          this.sound.play("synth_beep_02", {
            volume: 0.3,
            mute: this.sound.get("music").isPaused,
          });
          break;

        case "completedrawing":
          this.sound.play("retro_coin_01", {
            volume: 0.4,
            mute: this.sound.get("music").isPaused,
          });
          break;

        case "drawing":
          this.sound.play("tone1", {
            volume: 0.08,
            mute: this.sound.get("music").isPaused,
            rate: 4.5, // lol
          });
          break;

        case "pause":
          this.sound.play("powerUp11", {
            volume: 0.4,
            mute: this.sound.get("music").isPaused,
            rate: 1.4,
          });
          break;
        case "resume":
          this.sound.play("powerUp5", {
            volume: 0.4,
            mute: this.sound.get("music").isPaused,
            rate: 1,
          });
          break;

        case "destroy":
          this.sound.play("retro_explosion_02", {
            volume: 0.4,
            mute: this.sound.get("music").isPaused,
            rate: 1,
          });
          break;
        case "swirl":
          this.sound.play("save", {
            volume: 0.5,
            mute: this.sound.get("music").isPaused,
            rate: 3.5,
            delay: 0.65,
          });
          break;

        case "fastForward":
          this.sound.play("power_up_04", {
            volume: 0.5,
            mute: this.sound.get("music").isPaused,
            rate: 1,
          });
          break;
        case "target":
          this.sound.play("synth_misc_07", {
            volume: 0.5,
            mute: this.sound.get("music").isPaused,
            rate: 1,
          });
          break;
        case "rewind":
          this.sound.play("synth_misc_01", {
            volume: 0.5,
            mute: this.sound.get("music").isPaused,
            rate: 1,
          });
          break;
        case "popup":
          this.sound.play("sharp_echo", {
            volume: 0.5,
            mute: this.sound.get("music").isPaused,
            rate: 1,
          });
          break;

        default:
          console.log("unknown sound: " + s);
          break;
      }
    } catch (error) {
      this.errorText.setText(error);
    }
  }

  createTitleText() {
    this.titleText = new GameText(this, gameW * 0.5, 2, "fusionite", "g", "l")
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
        // g.gameOver = true;
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
    )
      .setOrigin(0, 0.5)
      .setName("start");

    const lvl = localStorage.getItem("level") || 1;
    if (lvl > 1) s1.setText(`start lvl ${lvl}`);

    const s2 = new GameText(
      this,
      0,
      gameH * 0.13,
      "tutorial",
      "g",
      undefined,
      this.openTutorial
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

    const v = new GameText(
      this,
      gameW - this.startMenu.x,
      gameH - this.startMenu.y,
      VERSION,
      "m"
    )
      .setOrigin(1, 1)
      .setPadding(10);

    this.startMenu.add([s1, s2, s3, s4, s5, v]);

    this.startOptions.push(s1, s2, s3, s4, s5);
  }

  createCreditsMenu() {
    this.creditsMenu = this.add.container(gameW, 0);
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
      .setVisible(false)
      .setWordWrapWidth(650, true);

    this.add
      .tween({
        targets: s1,
        y: -s1.height * 0.9,
        duration: 32000,
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
      })
      .pause();

    const s2 = new GameText(
      this,
      gameW - 40,
      gameH - 40,
      "return",
      "g",
      undefined,
      this.closeCredits
    ).setOrigin(1, 1);

    this.creditsMenu.add([s1, s2]);

    this.creditsOptions.push(s2);
  }

  openCredits() {
    this.tweens.add({
      targets: [this.startMenu, this.creditsMenu],
      x: `-=${gameW}`,
      duration: this.transitionTime,
      ease: "cubic.out",
      onStart: () => (this.transition = true),
      onComplete: () => (this.transition = false),
    });

    this.activeOptions = this.creditsOptions;
    this.activeOption = -1;

    const creditsText = this.creditsMenu.getByName("creditsText");
    this.tweens.getTweensOf(creditsText)[0].play();
  }

  closeCredits() {
    this.tweens.add({
      targets: [this.startMenu, this.creditsMenu],
      x: `+=${gameW}`,
      duration: this.transitionTime,
      ease: "cubic.out",
      onStart: () => (this.transition = true),
      onComplete: () => {
        this.transition = false;
        const creditsText = this.creditsMenu.getByName("creditsText");
        this.tweens.getTweensOf(creditsText)[0].restart().pause();
      },
    });

    this.activeOptions = this.startOptions;
    this.activeOption = -1;
  }

  createLevelSelectMenu() {
    this.levelSelectMenu = this.add.container(gameW * 1.05, gameH * 0.22);
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
      gameW * 0.88,
      gameH * 0.74,
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

    this.levelSelectMenu.add([s1, s2, s3, s4, s5, s6]);
    this.levelSelectOptions.push(s2);
  }

  openLevelSelect() {
    this.tweens.add({
      targets: [this.startMenu, this.levelSelectMenu],
      x: `-=${gameW}`,
      duration: this.transitionTime,
      ease: "cubic.out",
      onStart: () => (this.transition = true),
      onComplete: () => (this.transition = false),
    });

    this.activeOptions = this.levelSelectOptions;
    this.activeOption = -1;
  }

  closeLevelSelect() {
    this.tweens.add({
      targets: [this.levelSelectMenu, this.startMenu],
      x: `+=${gameW}`,
      duration: this.transitionTime,
      ease: "cubic.out",
      onStart: () => (this.transition = true),
      onComplete: () => (this.transition = false),
    });

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
    this.tutorialMenu = this.add
      .container(gameW * 1.5, gameH * 0.2)
      .setDepth(1);
    this.tutorialOptions = [];

    const back = new GameText(
      this,
      0,
      gameH * 0.75,
      "back",
      "l",
      undefined,
      () => this.setTutorialSegment(this.tutorialSegment - 1)
    ).setName("tutorialBack");

    const next = new GameText(
      this,
      0,
      gameH * 0.66,
      "next",
      "l",
      undefined,
      () => this.setTutorialSegment(this.tutorialSegment + 1)
    ).setName("tutorialNext");

    this.tutorialMenu.add([back, next]);
    this.tutorialOptions.push(next, back);

    this.createTutorialText();
  }

  createTutorialText() {
    const texts = this.add.container().setName("texts");
    this.tutorialMenu.add(texts);

    for (let i = 1; i <= 6; i++) {
      const x = (i - 1) * gameW;
      const t = new GameText(this, x, 0, "", "l", "c")
        .setOrigin(0.5, 0)
        .setLineSpacing(24)
        .setName("tutorialText" + i)
        .setFontSize("40px")
        .setWordWrapWidth(gameW * 0.94, true);

      switch (i) {
        case 1:
          t.text = "welcome to snip it!";
          t.setFontSize("64px");
          this.tweens.add({
            targets: t,
            y: "+=50",
            yoyo: true,
            duration: 1600,
            loop: -1,
            ease: "sine.inout",
          });
          break;
        case 2:
          t.text =
            "your goal is to complete the picture!" +
            "\n\ndraw boxes with your little square!" +
            "\n\nfill up the canvas to win and move on!";
          break;
        case 3:
          t.text =
            "don't let the circles touch your path!" +
            "\n\ndon't let the squares touch your square!" +
            "\n\nfinally, avoid time running out!";
          break;
        case 4:
          t.text =
            "watch out for powerups!" +
            "\n\nspeedup - super speed!" +
            "\n\nrewind - stop time!" +
            "\n\ntarget - explosion!";
          break;
        case 5:
          t.text =
            "controls:" +
            "\nWASD/arrow keys or click/touch to move" +
            "\n\nesc - pause\n\nm - mute";
          break;
        case 6:
          t.text =
            "ready for some practice?" +
            "\n\nclick next to start a practice level" +
            "\n\nfill up 90% of the canvas to move on!";
          break;
      }

      texts.add(t);
    }
  }

  setTutorialSegment(segment) {
    if (segment < 0) return;
    if (segment == 0) {
      this.closeTutorial();
      return;
    }

    this.tweens.add({
      targets: this.tutorialMenu.getByName("texts"),
      x: gameW * (1 - segment), // fancy math but it works
      duration: this.transitionTime,
      ease: "cubic.out",
      onStart: () => (this.transition = true),
      onComplete: () => (this.transition = false),
    });

    this.tutorialSegment = segment;

    // set this text by default, but the segment may change this text further down
    this.tutorialMenu.getByName("tutorialBack").setText("back");
    this.tutorialMenu.getByName("tutorialNext").setText("next");

    switch (this.tutorialSegment) {
      case 1:
        this.tutorialMenu.getByName("tutorialBack").setText("return");
        break;
      case 6:
        this.tutorialMenu.getByName("tutorialNext").setText("play!");
        break;
      case 7:
        this.setTutorialSegment(1); // reset tutorial, go back to start
        this.launchGame(0);
        break;
    }
  }

  openTutorial() {
    this.tweens.add({
      targets: [this.tutorialMenu, this.startMenu],
      x: `-=${gameW}`,
      duration: this.transitionTime,
      ease: "cubic.out",
      onStart: () => (this.transition = true),
      onComplete: () => (this.transition = false),
    });

    this.tutorialSegment = 1;
    this.activeOptions = this.tutorialOptions;
    this.activeOption = -1;

    this.setTutorialSegment(1);
  }

  closeTutorial() {
    this.tweens.add({
      targets: [this.tutorialMenu, this.startMenu],
      x: `+=${gameW}`,
      duration: this.transitionTime,
      ease: "cubic.out",
      onStart: () => (this.transition = true),
      onComplete: () => (this.transition = false),
    });

    this.activeOptions = this.startOptions;
    this.activeOption = -1;
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
    this.tutorialMenu.setVisible(false); // or from here

    this.activeOptions = null;
    this.activeOption = -1;
    this.gameActive = true;
  }

  returnToTitle() {
    // can come from either game scene or tutorial menu
    this.scene.stop("Game");
    this.pauseButton.setVisible(false);
    this.playButton.setVisible(false);
    this.musicOnButton.setVisible(false);
    this.musicOffButton.setVisible(false);
    this.titleText.setFontSize("120px");
    this.pauseMenu.setVisible(false);
    this.startMenu.setVisible(true).setX(gameW * 0.05);

    this.tutorialMenu.setVisible(true).setX(gameW * 1.5);
    this.levelSelectMenu.setVisible(true).setX(gameW * 1.05);
    this.activeOptions = this.startOptions;
    this.activeOption = -1;
    this.gameActive = false;
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
  scene: [Background, MainUI, Game],
  physics: {
    default: "matter",
    matter: {
      gravity: {
        x: 0,
        y: 0,
      },
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
    size = "m", // s, m, l, or g for small, medium, large, or giant
    callback = null // provided only for buttons
  ) {
    super(scene);

    // isn't this just creating two text objects...?
    const cT = scene.add
      .text(x, y, text, {
        font:
          size == "g"
            ? "144px"
            : size == "l"
            ? "108px"
            : size == "m"
            ? "84px"
            : "60px",
        fill: "#fff",
        align: "center",
      })
      .setFontFamily("Titillium Web")
      .setStroke(COLORS.fillColor, 1)
      .setShadow(
        2,
        2,
        "#333333",
        size == "g" ? 5 : size == "l" ? 4 : size == "m" ? 3 : 2,
        true,
        true
      );

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
          if (this.scale == 1) {
            scene.scene.get("MainUI").playSound("pointerover");
          }

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
          // don't do anything if tweens are running between menus
          if (scene.transition) return;

          this.setTint(COLORS.clickColor);
          if (this.listenerCount("pointerup") < 2) {
            this.on("pointerup", callback, scene);
          }
        })
        .on("pointerup", function () {
          scene.scene.get("MainUI").playSound("pointerup");

          this.setTint(COLORS.tintColor);
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
