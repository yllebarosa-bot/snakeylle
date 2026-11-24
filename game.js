
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const COLS = 20;
const ROWS = 20;

let CELL;
let snake, food, dir, nextDir;
let score = 0;
let best = Number(localStorage.getItem("snakeBest")) || 0;

let running = false;
let dead = false;
let paused = false;

let speed = 130;
let lastTime = 0;
let accumulator = 0;
let animationId;

let particles = [];

document.getElementById("best").textContent = best;

function resize() {
  const size = canvas.clientWidth;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = size * dpr;
  canvas.height = size * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  CELL = size / COLS;
  draw();
}

window.addEventListener("resize", resize);

function init() {
  snake = [
    {x: 10, y: 10},
    {x: 9, y: 10},
    {x: 8, y: 10}
  ];

  dir = {x: 1, y: 0};
  nextDir = {x: 1, y: 0};

  score = 0;
  speed = 130;
  particles = [];

  updateScore();
  placeFood();
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
  } while (
    snake.some(s => s.x === food.x && s.y === food.y)
  );
}

function updateScore() {
  document.getElementById("score").textContent = score;
  document.getElementById("best").textContent = best;
}

function startGame() {
  cancelAnimationFrame(animationId);

  init();

  running = true;
  dead = false;
  paused = false;

  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("pauseBtn").textContent = "PAUSE";

  lastTime = 0;
  accumulator = 0;

  animationId = requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
  if (!running || paused) return;

  if (!lastTime) lastTime = time;

  let delta = Math.min(time - lastTime, 100);
  lastTime = time;

  accumulator += delta;

  while (accumulator >= speed) {
    update();
    accumulator -= speed;

    if (!running) break;
  }

  if (running) {
    draw();
    animationId = requestAnimationFrame(gameLoop);
  }
}

function update() {
  dir = nextDir;

  const head = {
    x: snake[0].x + dir.x,
    y: snake[0].y + dir.y
  };

  // Wall collision
  if (
    head.x < 0 || head.x >= COLS ||
    head.y < 0 || head.y >= ROWS
  ) {
    gameOver();
    return;
  }

  const eating = head.x === food.x && head.y === food.y;

  // Self collision
  const body = eating ? snake : snake.slice(0, -1);

  if (body.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (eating) {
    score++;

    if (score > best) {
      best = score;
      localStorage.setItem("snakeBest", best);
    }

    speed = Math.max(55, 130 - score * 3);

    createParticles(food.x, food.y);
    placeFood();
    updateScore();

    playSound(650);
  } else {
    snake.pop();
  }
}

function gameOver() {
  running = false;
  dead = true;

  document.getElementById("overlayTitle").textContent = "GAME OVER";
  document.getElementById("overlayText").textContent =
    "Your score: " + score;

  document.getElementById("startBtn").textContent = "PLAY AGAIN";
  document.getElementById("overlay").classList.remove("hidden");

  updateScore();
  playSound(180);
}

function draw() {
  if (!CELL) return;

  const size = CELL * COLS;

  // Background
  ctx.fillStyle = "#091a12";
  ctx.fillRect(0, 0, size, size);

  // Grid
  ctx.strokeStyle = "#173326";
  ctx.lineWidth = 0.5;

  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(size, i * CELL);
    ctx.stroke();
  }

  // Food glow
  if (food) {
    const fx = (food.x + 0.5) * CELL;
    const fy = (food.y + 0.5) * CELL;

    ctx.shadowColor = "#ff3737";
    ctx.shadowBlur = 18;

    const gradient = ctx.createRadialGradient(
      fx - 3, fy - 3, 1,
      fx, fy, CELL * 0.4
    );

    gradient.addColorStop(0, "#ffaaaa");
    gradient.addColorStop(0.5, "#ff3030");
    gradient.addColorStop(1, "#a50000");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  // Snake body
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];

    const x = s.x * CELL;
    const y = s.y * CELL;

    const inset = CELL * 0.07;

    const gradient = ctx.createLinearGradient(
      x, y, x + CELL, y + CELL
    );

    if (i === 0) {
      gradient.addColorStop(0, "#a0ffba");
      gradient.addColorStop(1, "#19bd59");
    } else {
      gradient.addColorStop(0, "#55e889");
      gradient.addColorStop(1, "#087a3b");
    }

    ctx.fillStyle = gradient;
    ctx.shadowColor = "#26ff77";
    ctx.shadowBlur = i === 0 ? 10 : 3;

    roundedRect(
      x + inset,
      y + inset,
      CELL - inset * 2,
      CELL - inset * 2,
      CELL * 0.3
    );

    ctx.fill();
    ctx.shadowBlur = 0;

    // Body highlights
    if (i > 0) {
      ctx.fillStyle = "#b0ffc9";
      ctx.globalAlpha = 0.3;

      ctx.beginPath();
      ctx.arc(
        x + CELL * 0.35,
        y + CELL * 0.3,
        CELL * 0.08,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.globalAlpha = 1;
    }
  }

  // Snake eyes
  if (snake.length) {
    const h = snake[0];

    const cx = (h.x + 0.5) * CELL;
    const cy = (h.y + 0.5) * CELL;

    const px = -dir.y;
    const py = dir.x;

    ctx.fillStyle = "white";

    for (const side of [-1, 1]) {
      const ex = cx + dir.x * CELL * 0.18 +
        px * CELL * 0.2 * side;

      const ey = cy + dir.y * CELL * 0.18 +
        py * CELL * 0.2 * side;

      ctx.beginPath();
      ctx.arc(ex, ey, CELL * 0.11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#092116";
      ctx.beginPath();
      ctx.arc(
        ex + dir.x * CELL * 0.04,
        ey + dir.y * CELL * 0.04,
        CELL * 0.055,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = "white";
    }
  }

  drawParticles();
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function createParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: (x + 0.5) * CELL,
      y: (y + 0.5) * CELL,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 1
    });
  }
}

function drawParticles() {
  particles = particles.filter(p => p.life > 0);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;

    ctx.globalAlpha = p.life;
    ctx.fillStyle = "#65ff9a";

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
}

function changeDirection(x, y) {
  if (!running || paused) return;

  if (x === -dir.x && y === -dir.y) return;

  nextDir = {x, y};
}

// Button controls
document.getElementById("up").onclick =
  () => changeDirection(0, -1);

document.getElementById("down").onclick =
  () => changeDirection(0, 1);

document.getElementById("left").onclick =
  () => changeDirection(-1, 0);

document.getElementById("right").onclick =
  () => changeDirection(1, 0);

// Keyboard controls
document.addEventListener("keydown", e => {
  const keys = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0]
  };

  if (keys[e.key]) {
    e.preventDefault();
    changeDirection(...keys[e.key]);
  }
});

// Swipe controls
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", e => {
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}, {passive: true});

canvas.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    changeDirection(dx > 0 ? 1 : -1, 0);
  } else {
    changeDirection(0, dy > 0 ? 1 : -1);
  }
}, {passive: true});

// Pause
document.getElementById("pauseBtn").onclick = () => {
  if (!running && !paused) return;

  paused = !paused;

  document.getElementById("pauseBtn").textContent =
    paused ? "RESUME" : "PAUSE";

  if (paused) {
    cancelAnimationFrame(animationId);
    document.getElementById("overlayTitle").textContent = "PAUSED";
    document.getElementById("overlayText").textContent =
      "Take a break!";
    document.getElementById("startBtn").textContent = "RESUME";
    document.getElementById("overlay").classList.remove("hidden");
  } else {
    document.getElementById("overlay").classList.add("hidden");
    lastTime = 0;
    animationId = requestAnimationFrame(gameLoop);
  }
};

// Start / Resume
document.getElementById("startBtn").onclick = () => {
  if (paused) {
    paused = false;
    running = true;

    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("pauseBtn").textContent = "PAUSE";

    lastTime = 0;
    animationId = requestAnimationFrame(gameLoop);
  } else {
    startGame();
  }
};

document.getElementById("restartBtn").onclick = startGame;

// Sound effects
function playSound(frequency) {
  try {
    const audio = new (window.AudioContext ||
      window.webkitAudioContext)();

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + 0.15
    );

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();
    oscillator.stop(audio.currentTime + 0.15);
    oscillator.onended = () => audio.close();
  } catch (e) {}
}

// Initial screen
init();
resize();
