const canvas = document.getElementById("matrix-bg");
const ctx = canvas.getContext("2d");

const letters = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&@";
let drops = [];
let fontSize = 16;
let columns = 0;

function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  columns = Math.ceil(window.innerWidth / fontSize);
  drops = new Array(columns).fill(0).map(() => Math.random() * -100);
}

function drawMatrix() {
  ctx.fillStyle = "rgba(0, 8, 5, 0.08)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.fillStyle = "#6dffad";
  ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;

  for (let i = 0; i < drops.length; i++) {
    const text = letters[Math.floor(Math.random() * letters.length)];
    const x = i * fontSize;
    const y = drops[i] * fontSize;

    ctx.fillText(text, x, y);

    if (y > window.innerHeight && Math.random() > 0.975) {
      drops[i] = Math.random() * -18;
    }

    drops[i] += 0.58;
  }

  requestAnimationFrame(drawMatrix);
}

setupCanvas();
drawMatrix();
window.addEventListener("resize", setupCanvas);
