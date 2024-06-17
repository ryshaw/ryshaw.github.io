const VERSION = "Snip It! v1.1";

const gameW = 640;
const gameH = 960;
const DEV_MODE = false; // sets timer high, enables level select, turns on FPS, and turns on physics debug
const MAX_LEVEL = 25;

const FONTS = ["Roboto Mono"];

const COLORS = {
  topGradient: 0x3f8efc, // for background
  bottomGradient: 0x7de2d1, // for background
  fillColor: 0x070600, // colors UI #and drawings
  drawColor: 0xfffbfc, // colors player current drawing. other colors: 0xfdd35d, 0xfdca40
  deathColor: 0xc1121f, // when player dies...
  tintColor: 0xfbf8cc, // for highlighting text
  clickColor: 0xdddddd, // when text is clicked
  buttonColor: 0xe0fbfc, // for coloring buttons and the title
  white: 0xffffff,
  black: 0x000000,
};

export { VERSION, gameW, gameH, DEV_MODE, MAX_LEVEL, FONTS, COLORS };
