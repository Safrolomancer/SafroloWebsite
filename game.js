const target = document.getElementById("target");
const gameArea = document.getElementById("gameArea");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const startBtn = document.getElementById("startBtn");
const leaderboardBody = document.getElementById("leaderboardBody");
const gameStatus = document.getElementById("gameStatus");
const geoStatus = document.getElementById("geoStatus");
const geoMapEl = document.getElementById("geoMap");

let score = 0;
let time = 30;
let gameInterval;
let timerInterval;
let isGameRunning = false;

const API_BASE = "https://safrolowebsite-production.up.railway.app";
const API = {
  submit: `${API_BASE}/api/score`,
  leaderboard: `${API_BASE}/api/leaderboard`,
  geo: `${API_BASE}/api/geo`,
};

function setStatus(message) {
  gameStatus.textContent = message;
}

function setGeoStatus(country, city, dateText) {
  geoStatus.innerHTML = `Country: ${country}<br>City: ${city}<br>Date: ${dateText}`;
}

let geoMap;
let geoMarker;

function ensureGeoMap() {
  if (geoMap) return geoMap;

  geoMap = L.map(geoMapEl, {
    zoomControl: false,
    attributionControl: true,
  }).setView([20, 0], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  }).addTo(geoMap);

  setTimeout(() => geoMap.invalidateSize(), 100);
  return geoMap;
}

function updateGeoMarker(lat, lon, placeLabel) {
  const map = ensureGeoMap();
  const pulseIcon = L.divIcon({
    className: "",
    html: '<div class="geo-pulse"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  if (!geoMarker) {
    geoMarker = L.marker([lat, lon], { icon: pulseIcon }).addTo(map);
  } else {
    geoMarker.setLatLng([lat, lon]);
  }

  geoMarker.bindPopup(placeLabel);
  map.flyTo([lat, lon], 10, { duration: 1.8 });
}

async function loadGeoLocation() {
  ensureGeoMap();
  geoStatus.textContent = "Locating city...";
  try {
    const response = await fetch(API.geo);
    if (!response.ok) throw new Error("Geo API unavailable");
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "No geo data");

    const city = String(data.city || "Unknown");
    const region = String(data.region || "").trim();
    const country = String(data.country || "").trim();
    const place = [city, region, country].filter(Boolean).join(", ");
    const date = new Date(data.lookedUpAt || Date.now()).toLocaleString();

    updateGeoMarker(Number(data.latitude), Number(data.longitude), place);
    setGeoStatus(country || "Unknown", city, date);
  } catch {
    geoStatus.textContent = "Country: Unknown | City: Unknown | Date: -";
  }
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
    leaderboardBody.innerHTML = "<tr><td colspan='3'>No games yet</td></tr>";
    return;
  }

  leaderboardBody.innerHTML = scores
    .map((item, index) => {
      const itemScore = Number(item.score || 0);
      const ipMasked = String(item.ipMasked || "unknown");
      return `<tr>
        <td>${index + 1}</td>
        <td>${itemScore}</td>
        <td>${ipMasked}</td>
      </tr>`;
    })
    .join("");
}

async function submitScore() {
  try {
    const response = await fetch(API.submit, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score }),
    });
    if (!response.ok) throw new Error("Submit failed");
    await loadLeaderboard();
    setStatus(`Saved score: ${score}`);
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
loadGeoLocation();
