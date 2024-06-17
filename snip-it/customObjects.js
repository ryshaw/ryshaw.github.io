import { COLORS } from "./constants.js";

export class GameText extends Phaser.GameObjects.Text {
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

export class GameButton extends Phaser.GameObjects.Image {
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

        /* 
        BUG: When player is controlling square w/ mouse and releases
        the pointer over one of these buttons, the square will
        still continue to move because the pointerup event will not
        propagate to the game scene. Mouse events only propagate
        to the top-level scene.
        FIX: Here, check if the game is running and not paused.
        If so, ensure the pointerDown variable in the game scene is false.
        */

        if (scene.scene.isActive("Game"))
          scene.scene.get("Game").pointerDown = false;
      });

    return cB;
  }
}
