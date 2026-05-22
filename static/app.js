const MODEL_URL = "static/my_model/";
const MATCH_THRESHOLD = 0.75;
const HOLD_MS = 1000;

// className values exactly as they appear in the model metadata
const PHOTO_MAP = {
  "angry":         "photos/angry.png",
  "bıkmış":        "photos/bıkmış.png",
  "boring":        "photos/boring.png",
  "magara_adami":  "photos/magara_adami.png",
  "merhaba":       "photos/merhaba.png",
  "ne_diyosun_be": "photos/ne_diyosun_be.png",
  "ordek":         "photos/ordek.png",
  "perfect":       "photos/perfect.png",
  "rainbow":       "photos/rainbow.png",
  "scream":        "photos/scream.png",
  "sus":           "photos/sus.png",
};

// ── State ─────────────────────────────────────────────────────────────────────
let model, webcam, maxPredictions;
let liveCtx, guessCtx;
let loopStarted = false;
let initialized = false;

const live  = { running: false };
const guess = { running: false, queue: [], levelIndex: 0, results: [], target: null, holdStart: null };

const photos = Object.keys(PHOTO_MAP).map(function (label) {
  return { label: label, src: PHOTO_MAP[label] };
});

const liveCanvas  = document.getElementById("liveCanvas");
const guessCanvas = document.getElementById("guessCanvas");

// ── Photos / progress ─────────────────────────────────────────────────────────
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function buildQueue() {
  guess.queue = shuffled(photos);
}

function renderProgress() {
  const el = document.getElementById("guessProgress");
  if (!el) return;
  el.innerHTML = guess.queue.map(function (_, i) {
    const status = guess.results[i] || "";
    return '<span class="guess-progress-dot' + (status ? " is-" + status : "") + '"></span>';
  }).join("");
}

// ── Targets ───────────────────────────────────────────────────────────────────
function setLiveTarget(label) {
  const src = PHOTO_MAP[label];
  if (!src) return;
  const img = document.getElementById("liveTargetImage");
  img.src = src;
  img.style.display = "block";
  document.getElementById("livePlaceholder").style.display = "none";
  document.getElementById("liveTargetTitle").textContent = label.replace(/_/g, " ");
}

function setGuessTarget(photo) {
  guess.target = photo;
  const img = document.getElementById("guessTargetImage");
  img.src = photo.src;
  img.style.display = "block";
  document.getElementById("guessPlaceholder").style.display = "none";
  document.getElementById("guessLevelTitle").textContent = "Niveau " + (guess.levelIndex + 1);
}

function showSuccess(mode, visible) {
  document.getElementById(mode + "SuccessBadge").classList.toggle("hidden", !visible);
}

// ── TM init (official pattern) ────────────────────────────────────────────────
async function init() {
  if (initialized) return;

  model = await tmPose.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
  maxPredictions = model.getTotalClasses();

  const size = 400;
  webcam = new tmPose.Webcam(size, size, true); // width, height, flip
  await webcam.setup();
  await webcam.play();

  liveCanvas.width  = size;
  liveCanvas.height = size;
  guessCanvas.width  = size;
  guessCanvas.height = size;
  liveCtx  = liveCanvas.getContext("2d");
  guessCtx = guessCanvas.getContext("2d");

  initialized = true;
}

async function ensureLoop() {
  await init();
  if (!loopStarted) {
    loopStarted = true;
    window.requestAnimationFrame(loop);
  }
}

// ── Loop (TM official pattern) ────────────────────────────────────────────────
async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

// ── Draw (TM official pattern) ────────────────────────────────────────────────
function drawPose(ctx, pose) {
  if (!ctx || !webcam.canvas) return;
  ctx.drawImage(webcam.canvas, 0, 0);
  if (pose) {
    const minPartConfidence = 0.5;
    tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
    tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
  }
}

// ── Predict (TM official pattern) ────────────────────────────────────────────
async function predict() {
  // Step 1: run through posenet — exactly as TM sample code
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);

  // Step 2: run through TM classifier
  const prediction = await model.predict(posenetOutput);

  // Draw skeleton on active canvas
  if (live.running)  drawPose(liveCtx, pose);
  if (guess.running) drawPose(guessCtx, pose);

  // Find top prediction — iterate like TM does, pick highest probability
  let top = prediction[0];
  for (let i = 1; i < prediction.length; i++) {
    if (prediction[i].probability > top.probability) top = prediction[i];
  }

  const aboveThreshold = top.probability >= MATCH_THRESHOLD;

  if (live.running)  handleLive(top, aboveThreshold);
  if (guess.running) handleGuess(top, aboveThreshold);
}

// ── Live mode ─────────────────────────────────────────────────────────────────
function handleLive(top, aboveThreshold) {
  if (aboveThreshold && PHOTO_MAP[top.className]) {
    setLiveTarget(top.className);
  }
  showSuccess("live", aboveThreshold);
}

// ── Guess mode ────────────────────────────────────────────────────────────────
function handleGuess(top, aboveThreshold) {
  if (!guess.target) return;

  // Direct className comparison — no custom normalization
  const matched = aboveThreshold && top.className === guess.target.label;

  if (matched) {
    if (!guess.holdStart) {
      guess.holdStart = Date.now();
    } else if (Date.now() - guess.holdStart >= HOLD_MS) {
      guess.holdStart = null;
      completeLevel("correct");
    }
  } else {
    guess.holdStart = null;
  }
}

// ── Level logic ───────────────────────────────────────────────────────────────
function completeLevel(result) {
  guess.running = false;
  guess.results[guess.levelIndex] = result;
  renderProgress();
  if (result === "correct") showSuccess("guess", true);
  setTimeout(function () {
    showSuccess("guess", false);
    advanceLevel();
  }, result === "correct" ? 900 : 150);
}

function advanceLevel() {
  guess.levelIndex += 1;
  if (guess.levelIndex >= guess.queue.length) {
    document.getElementById("guessLevelTitle").textContent = "Tous les niveaux complétés !";
    guess.target = null;
    return;
  }
  setGuessTarget(guess.queue[guess.levelIndex]);
  guess.running = true;
}

// ── Start / stop ──────────────────────────────────────────────────────────────
async function startLiveMode() {
  await ensureLoop();
  live.running = true;
  showSuccess("live", false);
  const btn = document.getElementById("startLiveMode");
  btn.textContent = "◼ Arrêter";
  btn.onclick = stopLiveMode;
}

function stopLiveMode() {
  live.running = false;
  if (liveCtx) liveCtx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  const btn = document.getElementById("startLiveMode");
  btn.textContent = "▶ Jouer";
  btn.onclick = function () { startLiveMode().catch(onError); };
}

async function startGuessMode() {
  await ensureLoop();
  buildQueue();
  guess.running = true;
  guess.levelIndex = 0;
  guess.results = [];
  guess.holdStart = null;
  renderProgress();
  setGuessTarget(guess.queue[0]);
  showSuccess("guess", false);
  const btn = document.getElementById("startGuessMode");
  btn.textContent = "◼ Arrêter";
  btn.onclick = stopGuessMode;
}

function stopGuessMode() {
  guess.running = false;
  guess.target = null;
  guess.holdStart = null;
  if (guessCtx) guessCtx.clearRect(0, 0, guessCanvas.width, guessCanvas.height);
  const btn = document.getElementById("startGuessMode");
  btn.textContent = "▶ Jouer";
  btn.onclick = function () { startGuessMode().catch(onError); };
}

function resetGuessMode() {
  if (!loopStarted) return;
  guess.running = false;
  guess.holdStart = null;
  guess.levelIndex = 0;
  guess.results = [];
  buildQueue();
  renderProgress();
  setGuessTarget(guess.queue[0]);
  showSuccess("guess", false);
  guess.running = true;
}

function onError(err) {
  console.error(err);
  alert("Impossible de charger le modèle Teachable Machine.");
}

// ── Screen switch ─────────────────────────────────────────────────────────────
function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach(function (el) { el.classList.remove("active"); });
  document.querySelectorAll(".mode-tab").forEach(function (el) { el.classList.remove("active"); });
  document.getElementById(screenId).classList.add("active");
  document.querySelector('[data-screen="' + screenId + '"]').classList.add("active");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".mode-tab").forEach(function (btn) {
  btn.addEventListener("click", function () { switchScreen(btn.dataset.screen); });
});

document.getElementById("startLiveMode").addEventListener("click", function () {
  startLiveMode().catch(onError);
});

document.getElementById("startGuessMode").addEventListener("click", function () {
  startGuessMode().catch(onError);
});

document.getElementById("skipGuessLevel").addEventListener("click", function () {
  if (!guess.running || !guess.target) return;
  completeLevel("skipped");
});

document.getElementById("resetGuessMode").addEventListener("click", resetGuessMode);

document.getElementById("liveTargetImage").style.display = "none";
document.getElementById("guessTargetImage").style.display = "none";
