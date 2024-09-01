/* I had to split this up into modules because vscode wasn't having fun
the limit for formatting is ~3450 lines
this file contains game config, MainUI, and Background
Game class, custom classes, and constants are imported */

/* OK, so I also had to use ES6 dynamic import or whatever,
because localhost and ryshaw.github.io throw the modules into
different folders so I need to lookup the paths during runtime. */

const path = window.location.pathname.replace("index.html", "");
// path = "/" for localhost, and "/snip-it/" on ryshaw.github.io
// and yes, ryshaw.github.io does not start at index.html,
// but live server and electron do, so I have to eliminate index.html

let { Game } = await import(`${path}game.js`);
let { GameText, GameButton } = await import(`${path}customObjects.js`);
let { VERSION, gameW, gameH, DEV_MODE, MAX_LEVEL, FONTS, COLORS } =
  await import(`${path}constants.js`);

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

    this.scene.launch("MainUI"); // start menu, tutorial, and game launcher

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
  stickMoved; // control the stick input through this variable in update()

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
        this.createErrorText();
        this.createMenus();
        //this.takeSnapshot();
      },
    });

    this.gameActive = false;
    this.transition = false;
    this.transitionTime = 400;
    this.stickMoved = false;
  }

  update() {
    // I'm not seeing any event handlers to gamepad axes
    // so I'm polling the gamepad sticks continuously in update()
    // in order to have the gamepad sticks control the menu
    if (this.input.gamepad.total > 0) {
      // check if player is holding down correct combo for cheat mode
      this.checkGamepadCheatMode();

      // axes[0] is leftStickX, axes[1] is leftStickY,
      // axes[2] is rightStickX, axes[3] is rightStickY
      const axes = this.input.gamepad.getPad(0).axes;

      // if we detect any movement on the sticks, emit the down gamepad
      // event which will change the tutorial controls to the gamepad version
      const anyMovement = Math.round(
        axes.reduce((total, axis) => {
          return total + Math.abs(axis.value);
        }, 0)
      );
      if (anyMovement > 0) {
        this.input.gamepad.emit("down"); // this will change controls text
        // also, emit the Game input gamepad "down" event.
        // this will only activate while the gameLose or gameWin screens are
        // waiting for input, in order to count the sticks as input.
        // otherwise, the Game scene only uses "down" for the D-pad.
        // yeah, emitting events in other scenes' input plugins is silly,
        // but it's the easiest solution I got.
        this.scene.get("Game").input.gamepad.emit("down");
      }

      // poll the sticks so player can select options on the menus
      let stick = 0;
      // pick left or right stick depending on which one is being pressed
      if (Math.abs(axes[1].value) > Math.abs(axes[3].value)) {
        stick = Math.round(axes[1].value); // use left stick
      } else {
        stick = Math.round(axes[3].value); // use right stick
      }

      if (stick == 0) this.stickMoved = false; // stick released
      else if (this.stickMoved)
        return; // stick hasn't been released, don't reset
      else if (stick == -1) {
        this.moveOptionUp(); // if stick up, move option up
        this.stickMoved = true; // don't keep moving option
      } else if (stick == 1) {
        this.moveOptionDown(); // otherwise, move down
        this.stickMoved = true; // don't keep moving option
      }
    }
  }

  checkGamepadCheatMode() {
    if (this.activeOptions != this.startOptions) return;

    const pad = this.input.gamepad.getPad(0);
    const l1 = Math.round(pad.L1);
    const r2 = Math.round(pad.R2);
    const b = pad.B;
    const leftDpad = pad.left;

    const v = this.startMenu.getByName("version");

    // cheat code sequence
    if (l1 && r2 && b && leftDpad) {
      // don't do anything if tweens are running between menus
      if (this.transition) return;
      // don't do anything if tween already running
      if (this.tweens.getTweensOf(v).length > 0) return;

      // if this tween lasts for ten seconds, activate cheat mode
      this.tweens.add({
        targets: v,
        alpha: 0,
        delay: 5000,
        duration: 5000,
        onComplete: () => this.flipCheatMode(),
      });

      // if player lets go of any of these buttons, stop the tween
      this.input.gamepad.once("up", (pad, button, value) => {
        switch (button.index) {
          case 1: // B
          case 4: // L1
          case 7: // R2
          case 14: // D-pad left
            this.tweens.killTweensOf(v);
            v.setAlpha(1);
            break;

          default:
            break;
        }
      });
    }
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
      if (Phaser.Input.Keyboard.JustDown(up)) this.moveOptionUp();
    });

    this.input.keyboard.on("keydown-W", () => {
      if (Phaser.Input.Keyboard.JustDown(w)) this.moveOptionUp();
    });

    this.input.keyboard.on("keydown-DOWN", () => {
      if (Phaser.Input.Keyboard.JustDown(down)) this.moveOptionDown();
    });

    this.input.keyboard.on("keydown-S", () => {
      if (Phaser.Input.Keyboard.JustDown(s)) this.moveOptionDown();
    });

    this.input.keyboard.on("keydown-ENTER", () => {
      if (Phaser.Input.Keyboard.JustDown(enter)) {
        this.selectOption();
        this.setCreditsScrollingSpeed(5);
      }
    });

    this.input.keyboard.on("keyup-ENTER", () => {
      if (Phaser.Input.Keyboard.JustUp(enter)) {
        this.deselectOption();
        this.setCreditsScrollingSpeed(1);
      }
    });

    // for credits scrolling
    this.input.on("pointerdown", () => this.setCreditsScrollingSpeed(5));

    this.input.on("pointerup", () => this.setCreditsScrollingSpeed(1));

    this.input.keyboard.createCombo("CAPYBARA", { resetOnMatch: true });

    this.input.keyboard.on("keycombomatch", () => {
      if (this.activeOptions == this.startOptions) this.flipCheatMode();
    });

    // gamepad controls
    this.input.gamepad.once("connected", (pad) => {
      pad.setAxisThreshold(0.5);
      // using gamepad, hide the mouse for convenience
      this.sys.canvas.style.cursor = "none";
    });

    // if player moves mouse at all, make it appear
    this.input.on(
      "pointermove",
      () => (this.sys.canvas.style.cursor = "default")
    );

    // if player clicks mouse at all, make it appear
    this.input.on(
      "pointerdown",
      () => (this.sys.canvas.style.cursor = "default")
    );

    this.input.gamepad.on("down", (pad, button, value) => {
      this.sys.canvas.style.cursor = "none"; // make mouse disappear

      /* in typical gameplay, this would be called when a gamepad button
      is pressed, but the "down" event is also emitted by the sticks
      in the update() method so that the event gets caught by the "down"
      listener in createControlsText, so it can switch the text to gamepad. */
      if (!button) return; // sometimes this will get called with no button

      // using Xbox wireless controller to calibrate this
      switch (button.index) {
        case 0: // A button
          this.selectOption();
          this.setCreditsScrollingSpeed(5);
          break;
        case 1: // B
          if (this.scene.isPaused("Game")) this.pauseOrResumeGame();
          break;
        case 2: // X
          this.flipMusic();
          break;
        case 3: // Y
          this.flipMusic();
          break;
        case 9: // start
          this.pauseOrResumeGame();
          break;

        case 12: // D-pad up
          this.moveOptionUp();
          break;
        case 13: // D-pad down
          this.moveOptionDown();
          break;
        case 14: // D-pad left
          break;
        case 15: // D-pad right
          break;

        default:
          break;
      }
    });

    this.input.gamepad.on("up", (pad, button, value) => {
      switch (button.index) {
        case 0: // A button
          this.deselectOption();
          this.setCreditsScrollingSpeed(1);
          break;
        default:
          break;
      }
    });
  }

  moveOptionUp() {
    if (this.activeOptions) {
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
  }

  moveOptionDown() {
    if (this.activeOptions) {
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
  }

  selectOption() {
    if (this.activeOptions && this.activeOption != -1) {
      this.activeOptions[this.activeOption].emit("pointerdown");
    }
  }

  deselectOption() {
    if (this.activeOptions && this.activeOption != -1) {
      const option = this.activeOptions[this.activeOption];
      option.emit("pointerup");
      option.emit("pointerout");
    }
  }

  setCreditsScrollingSpeed(num) {
    if (this.creditsMenu?.visible) {
      const creditsText = this.creditsMenu.getByName("creditsText");
      this.tweens.getTweensOf(creditsText)[0].timeScale = num;
    }
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
    this.titleText = new GameText(this, gameW * 0.5, 2, "snip it!", "g", "l")
      .setFontSize("120px")
      .setOrigin(0.48, 0)
      .setStroke(COLORS.fillColor, 4)
      .setShadow(4, 4, "#333333", 2, true, true)
      .setColor("#e0fbfc");
  }

  createErrorText() {
    this.errorText = new GameText(this, gameW * 0.5, gameH - 10, "", "s", "l")
      .setFontSize("20px")
      .setOrigin(0.5, 1);
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
      .setPadding(10)
      .setInteractive()
      .setName("version");

    const tween = {
      targets: v,
      alpha: 0,
      delay: 5000,
      duration: 5000,
      onComplete: () => this.flipCheatMode(),
    };

    v.on("pointerdown", () => {
      // don't do anything if tweens are running between menus
      if (this.transition) return;

      if (this.tweens.getTweensOf(v).length > 0) return;
      this.tweens.add(tween);
    })
      .on("pointerup", () => {
        this.tweens.killTweensOf(v);
        v.setAlpha(1);
      })
      .on("pointerout", () => {
        this.tweens.killTweensOf(v);
        v.setAlpha(1);
      });

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
          this.createControlsText(t);
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

  createControlsText(t) {
    const mouseKbText =
      "mouse or kb controls:" +
      "\n\nWASD/arrow keys or click/touch - move\n\nesc - pause\n\nm - mute";

    const gamepadText =
      "gamepad controls:" +
      "\n\nstick or D-pad - move\n\nA - confirm\n\nstart - pause\n\nX/Y - mute";

    this.input.gamepad.once("connected", () => (t.text = gamepadText));

    this.input.gamepad.on("down", () => (t.text = gamepadText));

    this.input.keyboard.on("keydown", () => (t.text = mouseKbText));

    this.input.on("pointerdown", () => (t.text = mouseKbText));

    t.text = mouseKbText;
    t.setLineSpacing(14);
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

    const lvl = localStorage.getItem("level") || 1;
    if (lvl > 1) this.startMenu.getByName("start").setText(`start lvl ${lvl}`);
    else this.startMenu.getByName("start").setText("start game");

    this.tutorialMenu.setVisible(true).setX(gameW * 1.5);
    this.levelSelectMenu.setVisible(true).setX(gameW * 1.05);
    this.activeOptions = this.startOptions;
    this.activeOption = -1;
    this.gameActive = false;
  }

  flipCheatMode() {
    this.scene.get("MainUI").playSound("highlight");

    const v = this.startMenu.getByName("version");
    v.setAlpha(1);
    this.time.removeAllEvents(); // clear the delayedCall happening later if duplicates exist

    const cheat = localStorage.getItem("cheat");

    if (cheat == null || cheat == "off") {
      v.setText("cheat mode on");
      localStorage.setItem("cheat", "on");
    } else {
      v.setText("cheat mode off");
      localStorage.setItem("cheat", "off");
    }
    this.time.delayedCall(3000, () => v.setText(VERSION));
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
  scene: [Background, MainUI, Game],
  physics: {
    default: "arcade",
    arcade: {
      debug: DEV_MODE,
    },
  },
  input: { gamepad: true },
  title: VERSION,
  autoFocus: true,
};

const game = new Phaser.Game(config);
