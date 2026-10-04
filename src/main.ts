import "./style.css";

// --- Configuration -----------------------------------------------------------

const MAX_OPTIONS = 30;
const DEFAULT_OPTIONS = [
  "Aiko",
  "Björn",
  "Chioma",
  "Diego",
  "Elif",
  "Femi",
  "Guadalupe",
];

// Catppuccin Mocha accent palette, ordered to maximise hue contrast
// between adjacent wedges (warm/cool interleaved).
const COLORS = [
  "#f38ba8", // red
  "#94e2d5", // teal
  "#f9e2af", // yellow
  "#89b4fa", // blue
  "#eba0ac", // maroon
  "#a6e3a1", // green
  "#f5c2e7", // pink
  "#89dceb", // sky
  "#fab387", // peach
  "#cba6f7", // mauve
];

// Initial speed in radians/frame and the friction factor applied each frame.
const INITIAL_SPEED = 0.35;
const FRICTION = 0.987;
// Speed below which we consider the wheel stopped.
const STOP_THRESHOLD = 0.0005;

const params = new URLSearchParams(window.location.search);
let items: string[] =
  params.getAll("option").length > 0
    ? params.getAll("option").slice(0, MAX_OPTIONS)
    : DEFAULT_OPTIONS;

// --- Canvas & button setup ---------------------------------------------------

const canvas = document.querySelector<HTMLCanvasElement>("#wheel")!;
const ctx = canvas.getContext("2d")!;
const hubBtn = document.querySelector<HTMLButtonElement>("#hub-btn")!;
const spinBtn = document.querySelector<HTMLButtonElement>("#spin-btn")!;
const editBtn = document.querySelector<HTMLButtonElement>("#edit-btn")!;
const winnerEl = document.querySelector<HTMLDivElement>("#winner")!;
const winnerNameEl =
  document.querySelector<HTMLParagraphElement>("#winner-name")!;
const winnerCloseBtn =
  document.querySelector<HTMLButtonElement>("#winner-close")!;
const copyBtn = document.querySelector<HTMLButtonElement>("#copy-btn")!;
const copyStatusEl =
  document.querySelector<HTMLParagraphElement>("#copy-status")!;
const editDialog = document.querySelector<HTMLDialogElement>("#edit-dialog")!;
const optionsInput =
  document.querySelector<HTMLTextAreaElement>("#options-input")!;
const editError = document.querySelector<HTMLParagraphElement>("#edit-error")!;
const saveBtn = document.querySelector<HTMLButtonElement>("#save-btn")!;
const cancelBtn = document.querySelector<HTMLButtonElement>("#cancel-btn")!;

function resizeCanvas(): void {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.85;
  canvas.width = size;
  canvas.height = size;
  syncHubButton(size);
}

// The hub is a square box exactly matching its SVG circle (the flag renders
// as pure overflow outside that box), so sizing it keeps the circle itself
// centered on the wheel. Clamped so it stays legible on small wheels and
// doesn't balloon on large ones.
function syncHubButton(size: number): void {
  const hubSize = Math.min(160, Math.max(80, size * 0.22));
  hubBtn.style.width = `${hubSize}px`;
  hubBtn.style.height = `${hubSize}px`;
  hubBtn.style.fontSize = `${hubSize * 0.2}px`;
}

resizeCanvas();
new ResizeObserver(resizeCanvas).observe(document.body);

// --- Spin state --------------------------------------------------------------

let rotation = Math.random() * 2 * Math.PI;
let velocity = 0; // radians per frame
let spinning = false;
let lastWinner = "";

function setButtonsDisabled(disabled: boolean): void {
  hubBtn.disabled = disabled;
  spinBtn.disabled = disabled;
  editBtn.disabled = disabled;
}

function getWinner(): string {
  const sliceAngle = (2 * Math.PI) / items.length;
  // The pointer sits at angle 0 (3 o'clock). Work out which wedge occupies
  // that angle by inverting the rotation offset.
  const normalized =
    (((0 - rotation) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const index = Math.floor(normalized / sliceAngle) % items.length;
  return items[index];
}

function triggerSpin(): void {
  if (spinning) return;
  spinning = true;
  velocity = INITIAL_SPEED;
  winnerEl.classList.remove("show");
  copyStatusEl.textContent = "";
  setButtonsDisabled(true);
}

hubBtn.addEventListener("click", triggerSpin);
spinBtn.addEventListener("click", triggerSpin);

// --- Edit dialog -------------------------------------------------------------

function parseOptions(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function setEditParam(open: boolean): void {
  const p = new URLSearchParams(window.location.search);
  if (open) {
    p.set("edit", "true");
  } else {
    p.delete("edit");
  }
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function saveOptionsToParams(newItems: string[]): void {
  const p = new URLSearchParams(window.location.search);
  p.delete("option");
  newItems.forEach((item) => p.append("option", item));
  const qs = p.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

editBtn.addEventListener("click", () => {
  optionsInput.value = items.join("\n");
  editError.textContent = "";
  editDialog.showModal();
  setEditParam(true);
});

saveBtn.addEventListener("click", () => {
  const parsed = parseOptions(optionsInput.value);
  if (parsed.length === 0) {
    editError.textContent = "Add at least one option.";
    return;
  }
  if (parsed.length > MAX_OPTIONS) {
    editError.textContent = `Too many options — max is ${MAX_OPTIONS}.`;
    return;
  }
  items = parsed;
  saveOptionsToParams(items);
  setEditParam(false);
  editDialog.close();
});

cancelBtn.addEventListener("click", () => {
  setEditParam(false);
  editDialog.close();
});

// Open dialog on load if the param is present.
if (new URLSearchParams(window.location.search).has("edit")) {
  optionsInput.value = items.join("\n");
  editError.textContent = "";
  editDialog.showModal();
}

// --- Drawing -----------------------------------------------------------------

// Mixes a hex colour toward white by `amount` (0-1) for the gradient's
// hub-facing stop.
function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function drawWheel(
  targetCtx: CanvasRenderingContext2D,
  size: number,
  angleOffset: number,
  clearBackground = true,
): void {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;

  if (clearBackground) {
    targetCtx.clearRect(0, 0, size, size);
  }
  if (radius <= 0) return;

  const sliceAngle = (2 * Math.PI) / items.length;

  for (let i = 0; i < items.length; i++) {
    const startAngle = angleOffset + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    const modifier =
      Math.floor(i / COLORS.length) * Math.round(COLORS.length / 2);
    const color = COLORS[(i + modifier) % COLORS.length];

    // --- Wedge fill (gradient: lighter near the hub, full accent at the rim) ---
    const gradient = targetCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, lighten(color, 0.45));
    gradient.addColorStop(1, color);

    targetCtx.beginPath();
    targetCtx.moveTo(cx, cy);
    targetCtx.arc(cx, cy, radius, startAngle, endAngle);
    targetCtx.closePath();
    targetCtx.fillStyle = gradient;
    targetCtx.fill();

    // --- Wedge border ---
    targetCtx.strokeStyle = "rgba(0,0,0,0.35)";
    targetCtx.lineWidth = 2;
    targetCtx.stroke();

    // --- Label ---
    const labelAngle = startAngle + sliceAngle / 2;
    const labelRadius = radius * 0.65;
    const lx = cx + Math.cos(labelAngle) * labelRadius;
    const ly = cy + Math.sin(labelAngle) * labelRadius;

    targetCtx.save();
    targetCtx.translate(lx, ly);
    targetCtx.rotate(labelAngle);

    targetCtx.font = `bold ${Math.max(11, Math.round(size / 28))}px Inter, system-ui, sans-serif`;
    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.fillStyle = "#11111b"; // Catppuccin Mocha "Crust"
    targetCtx.fillText(items[i], 0, 0);

    targetCtx.restore();
  }

  // --- Outer ring ---
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
  targetCtx.strokeStyle = "rgba(255,255,255,0.2)";
  targetCtx.lineWidth = 4;
  targetCtx.stroke();
}

// Draws the same merged circle+flag hub shape as the live app's SVG button
// (see index.html's #hub-btn path), minus the "SPIN" text — used for the
// static share card, where the wheel has already stopped.
function drawHubShape(
  targetCtx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const halfAngle = (24 * Math.PI) / 180;
  const flagLength = radius * 0.5;
  const p1x = cx + radius * Math.cos(-halfAngle);
  const p1y = cy + radius * Math.sin(-halfAngle);
  const apexX = cx + radius + flagLength;

  targetCtx.beginPath();
  targetCtx.moveTo(p1x, p1y);
  targetCtx.arc(cx, cy, radius, -halfAngle, halfAngle, true);
  targetCtx.lineTo(apexX, cy);
  targetCtx.closePath();

  targetCtx.fillStyle = "#11111b";
  targetCtx.fill();
  targetCtx.lineJoin = "round";
  targetCtx.lineWidth = radius * 0.14;
  targetCtx.strokeStyle = "#ffffff";
  targetCtx.stroke();
}

// --- Confetti ------------------------------------------------------------

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
}

const CONFETTI_DURATION = 1500; // ms
const CONFETTI_COUNT = 550;
const CONFETTI_GRAVITY = 0.18;

const confettiCanvas =
  document.querySelector<HTMLCanvasElement>("#confetti-canvas")!;
const confettiCtx = confettiCanvas.getContext("2d")!;
let confettiParticles: ConfettiParticle[] = [];
let confettiRafId: number | null = null;
let confettiStart = 0;

function fireConfetti(): void {
  const rect = canvas.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  confettiParticles = Array.from({ length: CONFETTI_COUNT }, () => {
    const angle = Math.random() * 2 * Math.PI;
    const speed = 4 + Math.random() * 7;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      rotation: Math.random() * 2 * Math.PI,
      spin: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  });

  confettiStart = performance.now();
  if (confettiRafId === null) {
    confettiRafId = requestAnimationFrame(confettiTick);
  }
}

function confettiTick(now: number): void {
  const elapsed = now - confettiStart;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  if (elapsed >= CONFETTI_DURATION) {
    confettiParticles = [];
    confettiRafId = null;
    return;
  }

  const fade = 1 - elapsed / CONFETTI_DURATION;

  for (const p of confettiParticles) {
    p.vy += CONFETTI_GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.spin;

    confettiCtx.save();
    confettiCtx.globalAlpha = Math.max(fade, 0);
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rotation);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    confettiCtx.restore();
  }

  confettiRafId = requestAnimationFrame(confettiTick);
}

// --- Shareable winner card -------------------------------------------------

function buildShareCard(winnerName: string): HTMLCanvasElement {
  const width = 800;
  const pad = 28;
  const wheelSize = width - pad * 2;
  const textGap = 20;
  const labelHeight = 34;
  const nameHeight = 128;
  const bottomPad = 32;
  const height =
    pad + wheelSize + textGap + labelHeight + nameHeight + bottomPad;

  const card = document.createElement("canvas");
  card.width = width;
  card.height = height;
  const cardCtx = card.getContext("2d")!;

  const bg = cardCtx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#1e1e2e");
  bg.addColorStop(1, "#11111b");
  cardCtx.fillStyle = bg;
  cardCtx.fillRect(0, 0, width, height);

  cardCtx.save();
  cardCtx.translate(pad, pad);
  drawWheel(cardCtx, wheelSize, rotation, false);
  drawHubShape(cardCtx, wheelSize / 2, wheelSize / 2, wheelSize * 0.11);
  cardCtx.restore();

  cardCtx.textAlign = "center";
  let textY = pad + wheelSize + textGap + labelHeight * 0.7;

  cardCtx.fillStyle = "#a6adc8";
  cardCtx.font = "700 24px Inter, system-ui, sans-serif";
  cardCtx.fillText("WINNER", width / 2, textY);

  textY += nameHeight * 0.75;
  cardCtx.fillStyle = "#cba6f7";
  cardCtx.font = "bold 104px Inter, system-ui, sans-serif";
  cardCtx.fillText(`🎉 ${winnerName}`, width / 2, textY, width - pad * 2);

  return card;
}

winnerCloseBtn.addEventListener("click", () => {
  winnerEl.classList.remove("show");
});

copyBtn.addEventListener("click", () => {
  const card = buildShareCard(lastWinner);

  card.toBlob(async (blob) => {
    if (!blob) return;

    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      copyStatusEl.textContent = "Copied!";
    } catch {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${lastWinner || "winner"}.png`;
      link.click();
      URL.revokeObjectURL(url);
      copyStatusEl.textContent = "Clipboard unavailable — downloaded instead.";
    }

    setTimeout(() => {
      copyStatusEl.textContent = "";
    }, 2500);
  }, "image/png");
});

// --- Animation loop ----------------------------------------------------------

function tick(): void {
  if (spinning) {
    velocity *= FRICTION;
    rotation = (rotation + velocity) % (2 * Math.PI);

    if (velocity < STOP_THRESHOLD) {
      velocity = 0;
      spinning = false;
      setButtonsDisabled(false);

      lastWinner = getWinner();
      winnerNameEl.textContent = `🎉 ${lastWinner}`;
      winnerEl.classList.remove("show");
      void winnerEl.offsetWidth; // reflow so the pop-in animation restarts
      winnerEl.classList.add("show");
      fireConfetti();
    }
  }

  drawWheel(ctx, canvas.width, rotation);
  requestAnimationFrame(tick);
}

tick();
