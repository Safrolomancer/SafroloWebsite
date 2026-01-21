const target = document.getElementById("target");
const gameArea = document.getElementById("gameArea");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const startBtn = document.getElementById("startBtn");

let score = 0;
let time = 30;
let gameInterval;
let timerInterval;

function randomPosition() {
  const maxX = gameArea.clientWidth - 32;
  const maxY = gameArea.clientHeight - 32;

  const x = Math.random() * maxX;
  const y = Math.random() * maxY;

  target.style.left = x + "px";
  target.style.top = y + "px";
}

function startGame() {
  score = 0;
  time = 30;
  scoreEl.textContent = score;
  timeEl.textContent = time;

  target.style.display = "block";
  randomPosition();

  gameInterval = setInterval(randomPosition, 800);

  timerInterval = setInterval(() => {
    time--;
    timeEl.textContent = time;

    if (time <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  target.style.display = "none";
  alert("Game over! Your score: " + score);
}

target.addEventListener("click", () => {
  score++;
  scoreEl.textContent = score;
  randomPosition();
});

startBtn.addEventListener("click", startGame);

