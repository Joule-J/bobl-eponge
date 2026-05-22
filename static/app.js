const MODEL_URL = "https://teachablemachine.withgoogle.com/models/nlN9VfXC7/";
const WEBCAM_WIDTH = 960;
const WEBCAM_HEIGHT = 720;
const MATCH_THRESHOLD = 0.75;
const HOLD_FRAMES = 4;
const GUESS_LEVEL_COUNT = 12;

const LABELS = [
  "angry","bıkmış","boring","magara_adami",
  "merhaba","ne_diyosun_be","ordek","perfect",
  "rainbow","scream","sus"
];

const state = {
  model: null,
  webcam: null,
  initialized: false,
  loopStarted: false,
  live: { running: false, holdFrames: 0 },
  guess: { running: false, levelIndex: 0, target: null, queue: [], results: [], holdFrames: 0 },
};

const liveCanvas = document.getElementById("liveCanvas");
const guessCanvas = document.getElementById("guessCanvas");

function photoPath(label) {
  return "photos/" + label + ".png";
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function renderGuessProgress() {
  const container = document.getElementById("guessProgress");
  if (!container) return;
  const total = Math.min(GUESS_LEVEL_COUNT, LABELS.length);
  container.innerHTML = state.guess.results
    .slice(0, total)
    .map(s => '<span class="guess-progress-dot' + (s ? " is-" + s : "") + '"></span>')
    .join("") +
    Array(Math.max(0, total - state.guess.results.length))
      .fill('<span class="guess-progress-dot"></span>')
      .join("");
}

// ── Targets ───────────────────────────────────────────────────────────────────
function setLiveTarget(label) {
  const img = document.getElementById("liveTargetImage");
  img.src = photoPath(label);
  img.style.display = "block";
  document.getElementById("livePlaceholder").style.display = "none";
  const labelBar = document.getElementById("liveLabelBar");
  if (labelBar) {
    labelBar.style.display = "flex";
    document.getElementById("liveMemeLabel").textContent = label.replace(/_/g, " ");
  }
  document.getElementById("liveTargetTitle").textContent = label.replace(/_/g, " ");
}

function setGuessTarget(label) {
  state.guess.target = label;
  state.guess.holdFrames = 0;
  const img = document.getElementById("guessTargetImage");
  img.src = photoPath(label);
  img.style.display = "block";
  document.getElementById("guessPlaceholder").style.display = "none";
  const labelBar = document.getElementById("guessLabelBar");
  if (labelBar) {
    labelBar.style.display = "flex";
    document.getElementById("guessMemeLabel").textContent = label.replace(/_/g, " ");
  }
  document.getElementById("guessLevelTitle").textContent = "Niveau " + (state.guess.levelIndex + 1);
}

// ── Badges / hints ────────────────────────────────────────────────────────────
function showSuccess(mode, visible) {
  document.getElementById(mode + "SuccessBadge").classList.toggle("hidden", !visible);
}

function renderHints(matched, probability, label) {
  const el = document.getElementById("liveHints");
  if (!el) return;
  const name = (label || "—").replace(/_/g, " ");
  const msg = matched
    ? name + " — tiens la pose !"
    : "Plus proche : " + name + " (" + (probability * 100).toFixed(0) + "%)";
  el.innerHTML = '<span class="hint-chip">' + msg + "</span>";
}

// ── Model + webcam ────────────────────────────────────────────────────────────
async function initModel() {
  if (state.initialized) return;
  const modelURL = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";
  state.model = await tmPose.load(modelURL, metadataURL);
  state.webcam = new tmPose.Webcam(WEBCAM_WIDTH, WEBCAM_HEIGHT, true);
  await state.webcam.setup();
  await state.webcam.play();
  state.initialized = true;
}

async function ensureLoop() {
  if (state.loopStarted) return;
  await initModel();
  state.loopStarted = true;
  window.requestAnimationFrame(loop);
}

async function loop() {
  state.webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawToCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = WEBCAM_WIDTH;
  canvas.height = WEBCAM_HEIGHT;
  ctx.drawImage(state.webcam.canvas, 0, 0);
}

// ── Predict ───────────────────────────────────────────────────────────────────
async function predict() {
  if (!state.model || !state.webcam) return;
  const { pose, posenetOutput } = await state.model.estimatePose(state.webcam.canvas);
  const predictions = await state.model.predict(posenetOutput);

  // En yüksek skorlu label → aktif state
  predictions.sort((a, b) => b.probability - a.probability);
  const top = predictions[0];
  const topLabel = top ? top.className : null;
  const topProb = top ? top.probability : 0;
  const matched = topProb >= MATCH_THRESHOLD;

  drawToCanvas(liveCanvas);
  drawToCanvas(guessCanvas);

  if (matched && topLabel) setLiveTarget(topLabel);
  renderHints(matched, topProb, topLabel);
  showSuccess("live", false);

  handleLiveMode(matched, topLabel, topProb);
  handleGuessMode(predictions);
}

// ── Live mode ─────────────────────────────────────────────────────────────────
function handleLiveMode(matched, label, probability) {
  if (!state.live.running) return;
  state.live.holdFrames = matched ? state.live.holdFrames + 1 : 0;
  renderHints(matched, probability, label);
  showSuccess("live", state.live.holdFrames >= HOLD_FRAMES);
}

// ── Guess mode ────────────────────────────────────────────────────────────────
function handleGuessMode(predictions) {
  if (!state.guess.running || !state.guess.target) return;
  const match = predictions.find(p => p.className === state.guess.target);
  const probability = match ? match.probability : 0;
  const matched = probability >= MATCH_THRESHOLD;
  state.guess.holdFrames = matched ? state.guess.holdFrames + 1 : 0;
  if (state.guess.holdFrames >= HOLD_FRAMES) completeGuessLevel("correct");
}

function advanceGuessLevel() {
  state.guess.levelIndex += 1;
  if (state.guess.levelIndex >= state.guess.queue.length) {
    state.guess.running = false;
    state.guess.target = null;
    document.getElementById("guessLevelTitle").textContent = "Tous les niveaux complétés !";
    return;
  }
  setGuessTarget(state.guess.queue[state.guess.levelIndex]);
  state.guess.running = true;
}

function completeGuessLevel(result) {
  state.guess.running = false;
  state.guess.results[state.guess.levelIndex] = result;
  renderGuessProgress();
  if (result === "correct") showSuccess("guess", true);
  setTimeout(function () {
    showSuccess("guess", false);
    advanceGuessLevel();
  }, result === "correct" ? 900 : 150);
}

// ── Start / stop ──────────────────────────────────────────────────────────────
async function startLiveMode() {
  await ensureLoop();
  state.live.running = true;
  state.live.holdFrames = 0;
  showSuccess("live", false);
  const btn = document.getElementById("startLiveMode");
  btn.textContent = "◼ Arrêter";
  btn.onclick = stopLiveMode;
}

function stopLiveMode() {
  state.live.running = false;
  const btn = document.getElementById("startLiveMode");
  btn.textContent = "▶ Jouer";
  btn.onclick = () => startLiveMode().catch(onModelError);
}

async function startGuessMode() {
  await ensureLoop();
  const total = Math.min(GUESS_LEVEL_COUNT, LABELS.length);
  state.guess.queue = shuffled(LABELS).slice(0, total);
  state.guess.running = true;
  state.guess.levelIndex = 0;
  state.guess.results = [];
  state.guess.holdFrames = 0;
  renderGuessProgress();
  setGuessTarget(state.guess.queue[0]);
  showSuccess("guess", false);
  const btn = document.getElementById("startGuessMode");
  btn.textContent = "◼ Arrêter";
  btn.onclick = stopGuessMode;
}

function stopGuessMode() {
  state.guess.running = false;
  const btn = document.getElementById("startGuessMode");
  btn.textContent = "▶ Jouer";
  btn.onclick = () => startGuessMode().catch(onModelError);
}

function onModelError(err) {
  console.error(err);
  alert("Impossible de charger le modèle Teachable Machine.");
}

// ── Screen switch ─────────────────────────────────────────────────────────────
function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".mode-tab").forEach(el => el.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
  document.querySelector('[data-screen="' + screenId + '"]').classList.add("active");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".mode-tab").forEach(btn => {
  btn.addEventListener("click", () => switchScreen(btn.dataset.screen));
});

document.getElementById("startLiveMode").addEventListener("click", () => startLiveMode().catch(onModelError));
document.getElementById("startGuessMode").addEventListener("click", () => startGuessMode().catch(onModelError));
document.getElementById("skipGuessLevel").addEventListener("click", () => {
  if (state.guess.running && state.guess.target) completeGuessLevel("skipped");
});

document.getElementById("liveTargetImage").style.display = "none";
document.getElementById("guessTargetImage").style.display = "none";
renderGuessProgress();
