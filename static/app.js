const MODEL_URL = "static/my_model/";
const GUESS_LEVEL_COUNT = 12;
const MATCH_THRESHOLD = 0.75;
const HOLD_MS = 1000;

// Only show photos that exist in the model
const MODEL_LABELS = [
  "angry", "bıkmış", "rainbow", "boring", "kurnaz",
  "magara_adami", "merhaba", "ne_diyosun_be", "ordek",
  "perfect", "scream", "sus"
];

const ALL_PHOTOS = [
  { filename: "angry.png",         image_path: "photos/angry.png" },
  { filename: "boring.png",        image_path: "photos/boring.png" },
  { filename: "bıkmış.png",        image_path: "photos/bıkmış.png" },
  { filename: "kurnaz.png",        image_path: "photos/kurnaz.png" },
  { filename: "magara_adami.png",  image_path: "photos/magara_adami.png" },
  { filename: "merhaba.png",       image_path: "photos/merhaba.png" },
  { filename: "ne_diyosun_be.png", image_path: "photos/ne_diyosun_be.png" },
  { filename: "ordek.png",         image_path: "photos/ordek.png" },
  { filename: "perfect.png",       image_path: "photos/perfect.png" },
  { filename: "rainbow.png",       image_path: "photos/rainbow.png" },
  { filename: "scream.png",        image_path: "photos/scream.png" },
  { filename: "sus.png",           image_path: "photos/sus.png" },
];

const state = {
  photos: [],
  model: null,
  webcam: null,
  ctx: { live: null, guess: null },
  maxPredictions: 0,
  initialized: false,
  loopStarted: false,
  live: { running: false },
  guess: { running: false, levelIndex: 0, target: null, queue: [], results: [], holdStart: null },
};

const liveCanvas = document.getElementById("liveCanvas");
const guessCanvas = document.getElementById("guessCanvas");

function normalizeName(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/\.[^/.]+$/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_À-ɏḀ-ỿЀ-ӿ֐-׿؀-ۿऀ-ॿğüşöçıİi]/gi, "")
    .trim();
}

function photoStem(photo) {
  return normalizeName(photo.filename || photo.image_path.split("/").pop() || "");
}

function loadPhotos() {
  // Only include photos whose stem matches a model label
  state.photos = ALL_PHOTOS.filter(function (photo) {
    return MODEL_LABELS.some(function (label) {
      return normalizeName(label) === photoStem(photo);
    });
  });
  resetGuessProgress();
}

function shuffledPhotos(photos) {
  const items = photos.slice();
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]; items[i] = items[j]; items[j] = tmp;
  }
  return items;
}

function guessLevelLimit() {
  return Math.min(GUESS_LEVEL_COUNT, state.photos.length);
}

function buildGuessQueue() {
  state.guess.queue = shuffledPhotos(state.photos).slice(0, guessLevelLimit());
}

function guessProgressMarkup(status) {
  return '<span class="guess-progress-dot' + (status ? " is-" + status : "") + '"></span>';
}

function renderGuessProgress() {
  const container = document.getElementById("guessProgress");
  if (!container) return;
  const total = guessLevelLimit();
  let markup = "";
  for (let i = 0; i < total; i++) {
    markup += guessProgressMarkup(state.guess.results[i] || "");
  }
  container.innerHTML = markup;
}

function resetGuessProgress() {
  state.guess.results = [];
  renderGuessProgress();
}

// ── Targets ───────────────────────────────────────────────────────────────────
function setLiveTarget(photo) {
  state.live.target = photo;
  const img = document.getElementById("liveTargetImage");
  img.src = photo.image_path;
  img.style.display = "block";
  document.getElementById("livePlaceholder").style.display = "none";
  document.getElementById("liveTargetTitle").textContent = photoStem(photo).replace(/_/g, " ");
}

function setGuessTarget(photo) {
  state.guess.target = photo;
  const img = document.getElementById("guessTargetImage");
  img.src = photo.image_path;
  img.style.display = "block";
  document.getElementById("guessPlaceholder").style.display = "none";
  document.getElementById("guessLevelTitle").textContent = "Niveau " + (state.guess.levelIndex + 1);
}

// ── Badges ────────────────────────────────────────────────────────────────────
function showSuccess(mode, visible) {
  document.getElementById(mode + "SuccessBadge").classList.toggle("hidden", !visible);
}

// ── Model + webcam init (TM official pattern) ─────────────────────────────────
async function init() {
  if (state.initialized) return;
  const modelURL    = MODEL_URL + "model.json";
  const metadataURL = MODEL_URL + "metadata.json";

  state.model = await tmPose.load(modelURL, metadataURL);
  state.maxPredictions = state.model.getTotalClasses();

  const size = 400;
  const flip = true;
  state.webcam = new tmPose.Webcam(size, size, flip);
  await state.webcam.setup();
  await state.webcam.play();

  liveCanvas.width  = size;
  liveCanvas.height = size;
  guessCanvas.width  = size;
  guessCanvas.height = size;

  state.ctx.live  = liveCanvas.getContext("2d");
  state.ctx.guess = guessCanvas.getContext("2d");

  state.initialized = true;
}

async function ensureLoop() {
  await init();
  if (!state.loopStarted) {
    state.loopStarted = true;
    window.requestAnimationFrame(loop);
  }
}

async function loop() {
  state.webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

// ── Draw (TM official pattern with skeleton) ──────────────────────────────────
function drawPose(ctx, pose) {
  if (!state.webcam.canvas) return;
  ctx.drawImage(state.webcam.canvas, 0, 0);
  if (pose) {
    const minConf = 0.5;
    tmPose.drawKeypoints(pose.keypoints, minConf, ctx);
    tmPose.drawSkeleton(pose.keypoints, minConf, ctx);
  }
}

// ── Predict ───────────────────────────────────────────────────────────────────
async function predict() {
  const { pose, posenetOutput } = await state.model.estimatePose(state.webcam.canvas);
  const predictions = await state.model.predict(posenetOutput);

  if (state.live.running)  drawPose(state.ctx.live, pose);
  if (state.guess.running) drawPose(state.ctx.guess, pose);

  predictions.sort(function (a, b) { return b.probability - a.probability; });
  const top = predictions[0] || null;
  const aboveThreshold = top && top.probability >= MATCH_THRESHOLD;

  if (state.live.running) handleLiveMode(top, aboveThreshold);
  if (state.guess.running) handleGuessMode(top, aboveThreshold);
}

// ── Live mode ─────────────────────────────────────────────────────────────────
function handleLiveMode(top, aboveThreshold) {
  if (aboveThreshold) {
    const photo = state.photos.find(function (p) {
      return photoStem(p) === normalizeName(top.className);
    });
    if (photo) setLiveTarget(photo);
  }
  showSuccess("live", aboveThreshold);
}

// ── Guess mode ────────────────────────────────────────────────────────────────
function handleGuessMode(top, aboveThreshold) {
  if (!state.guess.target) return;
  const matched = aboveThreshold &&
    normalizeName(top.className) === photoStem(state.guess.target);

  if (matched) {
    if (!state.guess.holdStart) {
      state.guess.holdStart = Date.now();
    } else if (Date.now() - state.guess.holdStart >= HOLD_MS) {
      state.guess.holdStart = null;
      completeGuessLevel("correct");
    }
  } else {
    state.guess.holdStart = null;
  }
}

function finishGuessMode() {
  state.guess.running = false;
  state.guess.target = null;
  document.getElementById("guessLevelTitle").textContent = "Tous les niveaux complétés !";
}

function advanceGuessLevel() {
  state.guess.levelIndex += 1;
  if (state.guess.levelIndex >= state.guess.queue.length) {
    finishGuessMode();
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
  showSuccess("live", false);
  const btn = document.getElementById("startLiveMode");
  btn.textContent = "◼ Arrêter";
  btn.onclick = stopLiveMode;
}

function stopLiveMode() {
  state.live.running = false;
  const ctx = state.ctx.live;
  if (ctx) ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
  const btn = document.getElementById("startLiveMode");
  btn.textContent = "▶ Jouer";
  btn.onclick = function () { startLiveMode().catch(onError); };
}

async function startGuessMode() {
  await ensureLoop();
  if (!state.photos.length) throw new Error("Aucune photo trouvée.");
  buildGuessQueue();
  state.guess.running = true;
  state.guess.levelIndex = 0;
  state.guess.results = [];
  state.guess.holdStart = null;
  renderGuessProgress();
  setGuessTarget(state.guess.queue[0]);
  showSuccess("guess", false);
  const btn = document.getElementById("startGuessMode");
  btn.textContent = "◼ Arrêter";
  btn.onclick = stopGuessMode;
}

function stopGuessMode() {
  state.guess.running = false;
  state.guess.target = null;
  state.guess.holdStart = null;
  const ctx = state.ctx.guess;
  if (ctx) ctx.clearRect(0, 0, guessCanvas.width, guessCanvas.height);
  const btn = document.getElementById("startGuessMode");
  btn.textContent = "▶ Jouer";
  btn.onclick = function () { startGuessMode().catch(onError); };
}

function resetGuessMode() {
  if (!state.loopStarted) return;
  state.guess.running = false;
  state.guess.holdStart = null;
  state.guess.levelIndex = 0;
  state.guess.results = [];
  buildGuessQueue();
  renderGuessProgress();
  setGuessTarget(state.guess.queue[0]);
  showSuccess("guess", false);
  state.guess.running = true;
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
  if (!state.guess.running || !state.guess.target) return;
  completeGuessLevel("skipped");
});

document.getElementById("resetGuessMode").addEventListener("click", resetGuessMode);

document.getElementById("liveTargetImage").style.display = "none";
document.getElementById("guessTargetImage").style.display = "none";

loadPhotos();
