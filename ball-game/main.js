// setup canvas

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const width = (canvas.width = window.innerWidth);
const height = (canvas.height = window.innerHeight);

// get score paragraph

const ballCount = document.querySelector(".ballCount");
let score = 0;

// function to generate random number

function random(min, max) {
  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return num;
}

// function to generate random color

let colorTheme = "default";
const beachColors = ["#526A9B", "#75A0C9", "#8BBFD3", "#C1D3E0", "#F3E9E0"];
const forestColors = ["#3a5a40", "#656d4a", "#a4ac86", "#333d29", "#588157"];
const celestialColors = ["#ffadad", "#9bf6ff", "#bdb2ff", "#ffc6ff", "#3a86ff"];

function randomColor() {
  switch (colorTheme) {
    case "beach":
      return beachColors[random(0, beachColors.length - 1)];
    case "forest":
      return forestColors[random(0, forestColors.length - 1)];
    case "celestial":
      return celestialColors[random(0, celestialColors.length - 1)];
    default:
      return `rgb(${random(0, 255)},${random(0, 255)},${random(0, 255)})`;
  }
}

// parent class for Ball and player

class Shape {
  constructor(x, y, velX, velY, color, size) {
    this.x = x;
    this.y = y;
    this.velX = velX;
    this.velY = velY;
  }
}

class Ball extends Shape {
  constructor(x, y, velX, velY, color, size) {
    super(x, y, velX, velY);
    this.color = color;
    this.size = size;
    this.exists = true;
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.fill();
  }

  update() {
    if (this.x + this.size >= width) {
      this.velX = -this.velX;
    }

    if (this.x - this.size <= 0) {
      this.velX = -this.velX;
    }

    if (this.y + this.size >= height) {
      this.velY = -this.velY;
    }

    if (this.y - this.size <= 0) {
      this.velY = -this.velY;
    }

    this.x += this.velX;
    this.y += this.velY;
  }

  collisionDetect() {
    for (const ball of balls) {
      if (this !== ball && ball.exists) {
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size + ball.size) {
          ball.color = this.color = randomColor();
        }
      }
    }
  }
}

class EvilCircle extends Shape {
  constructor(x, y) {
    super(x, y, 20, 20);
    this.color = "white";
    this.size = 10;
    this.exist = false;
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "a":
          this.x -= this.velX;
          break;
        case "d":
          this.x += this.velX;
          break;
        case "w":
          this.y -= this.velY;
          break;
        case "s":
          this.y += this.velY;
          break;
      }
    });
  }

  draw() {
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.stroke();
  }

  checkBounds() {
    if (this.x + this.size >= width) {
      this.x -= this.size;
    }

    if (this.x - this.size <= 0) {
      this.x += this.size;
    }

    if (this.y + this.size >= height) {
      this.y -= this.size;
    }

    if (this.y - this.size <= 0) {
      this.y += this.size;
    }
  }

  collisionDetect() {
    for (const ball of balls) {
      if (ball.exists) {
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.size + ball.size) {
          ball.exists = false;
          score--;
        }
      }
    }
  }
}

const balls = [];

while (balls.length < 30) {
  const size = random(10, 20);
  const ball = new Ball(
    // ball position always drawn at least one ball width
    // away from the edge of the canvas, to avoid drawing errors
    random(0 + size, width - size),
    random(0 + size, height - size),
    random(-7, 7),
    random(-7, 7),
    randomColor(),
    size
  );

  balls.push(ball);
  score++;
}

const player = new EvilCircle(random(10, width - 10), random(10, height - 10));

// setup start panel

const startPanel = document.querySelector(".start");
const startButton = document.querySelector(".startButton");

startButton.addEventListener("click", () => {
  startPanel.parentNode.removeChild(startPanel);
  player.exist = true;
});

// setup themes
const defaultButton = document.querySelector("#default");
const beachButton = document.querySelector("#beach");
const forestButton = document.querySelector("#forest");
const celestialButton = document.querySelector("#celestial");

let backgroundColor = "rgba(0, 0, 0, 0.25)";

defaultButton.addEventListener("click", () => {
  backgroundColor = "rgba(0, 0, 0, 0.25)";
  colorTheme = "default";
  for (const ball of balls) {
    ball.color = randomColor();
  }
  player.color = "white";
});

beachButton.addEventListener("click", () => {
  backgroundColor = "#E1D2CB";
  colorTheme = "beach";
  for (const ball of balls) {
    ball.color = randomColor();
  }
  player.color = "#985952";
});

forestButton.addEventListener("click", () => {
  backgroundColor = "#b6ad90";
  colorTheme = "forest";
  for (const ball of balls) {
    ball.color = randomColor();
  }
  player.color = "#5dd39e";
});

celestialButton.addEventListener("click", () => {
  backgroundColor = "#a09ebb";
  colorTheme = "celestial";
  for (const ball of balls) {
    ball.color = randomColor();
  }
  player.color = "#03ddcf";
});

function loop() {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  for (const ball of balls) {
    if (ball.exists) {
      ball.draw();
      ball.update();
      ball.collisionDetect();
    }
  }

  if (player.exist) {
    player.draw();
    player.checkBounds();
    player.collisionDetect();
  }

  ballCount.textContent = `Ball count: ${score}`;

  requestAnimationFrame(loop);
}

loop();
