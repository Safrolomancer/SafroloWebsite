const target = document.getElementById("target");
const gameArea = document.getElementById("gameArea");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const startBtn = document.getElementById("startBtn");
const nicknameInput = document.getElementById("nickname");
const leaderboardBody = document.getElementById("leaderboardBody");
const gameStatus = document.getElementById("gameStatus");

let score = 0;
let time = 30;
let gameInterval;
let timerInterval;
let isGameRunning = false;

const API_BASE = "https://safrolowebsite-production.up.railway.app";
const API = {
  submit: `${API_BASE}/api/score`,
  leaderboard: `${API_BASE}/api/leaderboard`,
};

function setStatus(message) {
  gameStatus.textContent = message;
}

function sanitizeNickname(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^\w\-\s]/g, "")
    .slice(0, 24);
}

async function loadLeaderboard() {
  try {
    const response = await fetch(API.leaderboard);
    if (!response.ok) throw new Error("Leaderboard unavailable");
    const data = await response.json();
    renderLeaderboard(data.scores || []);
  } catch {
    setStatus("Leaderboard unavailable right now. Please try again later.");
  }
}

function renderLeaderboard(scores) {
  if (!scores.length) {
    leaderboardBody.innerHTML = "<tr><td colspan='4'>No games yet</td></tr>";
    return;
  }

  leaderboardBody.innerHTML = scores
    .map((item, index) => {
      const name = String(item.nickname || "Player");
      const itemScore = Number(item.score || 0);
      const ipMasked = String(item.ipMasked || "unknown");
      return `<tr>
        <td>${index + 1}</td>
        <td>${name}</td>
        <td>${itemScore}</td>
        <td>${ipMasked}</td>
      </tr>`;
    })
    .join("");
}

async function submitScore() {
  const nickname = sanitizeNickname(nicknameInput.value) || "Player";
  nicknameInput.value = nickname;
  try {
    const response = await fetch(API.submit, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, score }),
    });
    if (!response.ok) throw new Error("Submit failed");
    await loadLeaderboard();
    setStatus(`Saved: ${nickname} - ${score}`);
  } catch {
    setStatus("Could not save score right now. Please try again.");
  }
}

function randomPosition() {
  const maxX = gameArea.clientWidth - 32;
  const maxY = gameArea.clientHeight - 32;

  const x = Math.random() * maxX;
  const y = Math.random() * maxY;

  target.style.left = x + "px";
  target.style.top = y + "px";
}

function startGame() {
  if (isGameRunning) return;
  isGameRunning = true;
  startBtn.disabled = true;
  setStatus("");

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
  isGameRunning = false;
  startBtn.disabled = false;
  submitScore();
  alert("Game over! Your score: " + score);
}

target.addEventListener("click", () => {
  score++;
  scoreEl.textContent = score;
  randomPosition();
});

startBtn.addEventListener("click", startGame);
loadLeaderboard();
