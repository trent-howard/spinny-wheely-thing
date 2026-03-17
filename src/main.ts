import "./style.css";

// --- Configuration -----------------------------------------------------------

const items: string[] = [
  "Alice",
  "Bob",
  "Charlie",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
];

const SPIN_SPEED = 0.8; // degrees per frame (~48 deg/s at 60fps)

const COLORS = [
  "#e63946",
  "#f4a261",
  "#2a9d8f",
  "#457b9d",
  "#a8dadc",
  "#e9c46a",
  "#8ecae6",
  "#c77dff",
  "#06d6a0",
  "#ef476f",
];

// --- Canvas setup ------------------------------------------------------------

const canvas = document.querySelector<HTMLCanvasElement>("#wheel")!;
const ctx = canvas.getContext("2d")!;

function resizeCanvas(): void {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.85;
  canvas.width = size;
  canvas.height = size;
}

resizeCanvas();

new ResizeObserver(resizeCanvas).observe(document.body);

// --- Drawing -----------------------------------------------------------------

let rotation = 0; // current rotation offset in radians

function drawWheel(angleOffset: number): void {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;

  ctx.clearRect(0, 0, size, size);

  const sliceAngle = (2 * Math.PI) / items.length;

  for (let i = 0; i < items.length; i++) {
    const startAngle = angleOffset + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const color = COLORS[i % COLORS.length];

    // --- Wedge fill ---
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // --- Wedge border ---
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Label ---
    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 0.65;
    const lx = cx + Math.cos(labelAngle) * labelRadius;
    const ly = cy + Math.sin(labelAngle) * labelRadius;

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(labelAngle);

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.font = `bold ${Math.max(11, Math.round(size / 28))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(items[i], 0, 0);

    ctx.restore();
  }

  // --- Outer ring ---
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // --- Center dot ---
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.025, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
}

// --- Animation loop ----------------------------------------------------------

const SPEED_RAD = (SPIN_SPEED * Math.PI) / 180;

function tick(): void {
  rotation = (rotation + SPEED_RAD) % (2 * Math.PI);
  drawWheel(rotation);
  requestAnimationFrame(tick);
}

tick();
