// ── i18n ─────────────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  tr: {
    cat_spongebob:    "Süngerbob",
    cat_statues:      "Heykeller",
    tab_catalog:      "📖 Katalog",
    catalog_title:    "Poz Kataloğu",
    catalog_all:      "Tümü",
    catalog_empty:    "Bu kategoride görüntü yok.",
    tab_live:         "Canlı Görüntü",
    tab_levels:       "Seviye Modu",
    tab_mix:          "Karışık",
    camera:           "Kamera",
    take_pose:        "Poz ver",
    btn_play:         "▶ Oyna",
    btn_stop:         "◼ Durdur",
    btn_skip:         "Geç",
    btn_restart:      "↺ Yeniden",
    matched:          "✓ Eşleşti",
    prediction:       "Tahmin",
    waiting:          "Görüntü bekleniyor…",
    live_placeholder: "Poz ver — görüntü çıkar",
    tag_image:        "Görüntü",
    objective:        "Hedef",
    level_n:          "Seviye 1",
    guess_placeholder:"Oyna — hedef çıkar",
    tag_target:       "Hedef",
    hold_pose:        "Pozu koru, seviyeyi geç",
    next:             "✓ Sonraki",
    results_title:    "Sonuçlar",
    hint_hold:        " — pozu koru!",
    hint_closer:      "En yakın: ",
    no_model:         "Teachable Machine modeli yüklenemedi.",
    statues_no_model: "Heykeller modeli henüz yüklenmedi. Etkinleştirmek için static/statues_model/ ekleyin.",
  },
  fr: {
    cat_spongebob:    "Bob L'éponge",
    cat_statues:      "Statues",
    tab_catalog:      "📖 Catalogue",
    catalog_title:    "Catalogue des poses",
    catalog_all:      "Tout",
    catalog_empty:    "Aucune image dans cette catégorie.",
    tab_live:         "Image Live",
    tab_levels:       "Mode Niveaux",
    tab_mix:          "Mix",
    camera:           "Caméra",
    take_pose:        "Prends la pose",
    btn_play:         "▶ Jouer",
    btn_stop:         "◼ Arrêter",
    btn_skip:         "Pas",
    btn_restart:      "↺ Recommencer",
    matched:          "✓ Matched",
    prediction:       "Prédiction",
    waiting:          "En attente d'image…",
    live_placeholder: "Pose toi — l'image apparaît",
    tag_image:        "Image",
    objective:        "Objectif",
    level_n:          "Niveau 1",
    guess_placeholder:"Jouer — l'objectif apparaît",
    tag_target:       "Objectif",
    hold_pose:        "Tiens la pose, passe le niveau",
    next:             "✓ Suivant",
    results_title:    "Résultats",
    hint_hold:        " — tiens la pose !",
    hint_closer:      "Plus proche : ",
    no_model:         "Impossible de charger le modèle Teachable Machine.",
    statues_no_model: "Le modèle Statues n'est pas encore chargé. Ajoutez static/statues_model/ pour l'activer.",
  },
  en: {
    cat_spongebob:    "Bob L'éponge",
    cat_statues:      "Statues",
    tab_catalog:      "📖 Catalog",
    catalog_title:    "Pose Catalog",
    catalog_all:      "All",
    catalog_empty:    "No images in this category.",
    tab_live:         "Live Image",
    tab_levels:       "Level Mode",
    tab_mix:          "Mix",
    camera:           "Camera",
    take_pose:        "Strike a pose",
    btn_play:         "▶ Play",
    btn_stop:         "◼ Stop",
    btn_skip:         "Skip",
    btn_restart:      "↺ Restart",
    matched:          "✓ Matched",
    prediction:       "Prediction",
    waiting:          "Waiting for image…",
    live_placeholder: "Pose — image appears",
    tag_image:        "Image",
    objective:        "Objective",
    level_n:          "Level 1",
    guess_placeholder:"Play — objective appears",
    tag_target:       "Target",
    hold_pose:        "Hold the pose, pass the level",
    next:             "✓ Next",
    results_title:    "Results",
    hint_hold:        " — hold the pose!",
    hint_closer:      "Closest: ",
    no_model:         "Could not load the Teachable Machine model.",
    statues_no_model: "Statues model not loaded yet. Add static/statues_model/ to activate.",
  },
};

if (!localStorage.getItem("poseLangV2")) { localStorage.setItem("poseLang", "tr"); localStorage.setItem("poseLangV2", "1"); }
let currentLang = localStorage.getItem("poseLang") || "tr";

function t(key) {
  return (TRANSLATIONS[currentLang] || TRANSLATIONS.fr)[key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (key === "cat_spongebob") return; // brand name never translated
    el.textContent = t(key);
  });
  document.documentElement.lang = currentLang;
}

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = {
  spongebob: {
    modelUrl:    "https://teachablemachine.withgoogle.com/models/nlN9VfXC7/",
    labels:      ["angry","bıkmış","boring","magara_adami","merhaba","ne_diyosun_be","ordek","perfect","rainbow","scream","sus"],
    photoPath:   label => "photos/" + label + ".png",
    liveScreen:  "liveGeneratorScreen",
    guessScreen: "guessModeScreen",
    liveTabKey:  "tab_live",
    guessTabKey: "tab_levels",
    titleFixed:  true,   // brand title stays "Bob L'éponge"
    brandKey:    null,
  },
  statues: {
    modelUrl:    null,   // set when user uploads: static/statues_model/
    labels:      [],     // populated from model metadata at load time
    photoPath:   label => "statues_photos/" + label + ".png",
    liveScreen:  "statueLiveScreen",
    guessScreen: "statueGuessScreen",
    liveTabKey:  "tab_live",
    guessTabKey: "tab_levels",
    titleFixed:  false,
    brandKey:    "cat_statues",
  },
};

let activeCategory = "spongebob";
let activeScreenId  = "liveGeneratorScreen";

// ── Game constants ────────────────────────────────────────────────────────────
const WEBCAM_WIDTH    = 960;
const WEBCAM_HEIGHT   = 720;
const MATCH_THRESHOLD = 0.75;
const HOLD_FRAMES     = 4;
const GUESS_LEVEL_COUNT = 12;

// ── Shared webcam/model state ─────────────────────────────────────────────────
const models  = {};   // keyed by category
const webcams = {};   // keyed by category
const inited  = {};   // keyed by category
const loopActive = {}; // keyed by category

// Per-category game state
const liveState  = { spongebob: { running: false, holdFrames: 0 }, statues: { running: false, holdFrames: 0 } };
const guessState = {
  spongebob: { running: false, levelIndex: 0, target: null, queue: [], results: [], holdFrames: 0 },
  statues:   { running: false, levelIndex: 0, target: null, queue: [], results: [], holdFrames: 0 },
};

// Mix mode state — each queue item is { label, cat }
const mixState = {
  running: false,
  levelIndex: 0,
  target: null,   // { label, cat }
  queue: [],
  results: [],
  holdFrames: 0,
};

// ── Utility ───────────────────────────────────────────────────────────────────
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(id) { return document.getElementById(id); }

// ── Topbar tabs (dynamic) ─────────────────────────────────────────────────────
function renderTabs() {
  const cat = CATEGORIES[activeCategory];
  const modesEl = el("topbarModes");

  // Remove only the dynamic tabs (not the persistent mix button)
  modesEl.querySelectorAll(".mode-tab:not(.mode-tab-mix)").forEach(b => b.remove());

  [
    { key: cat.liveTabKey,  screen: cat.liveScreen  },
    { key: cat.guessTabKey, screen: cat.guessScreen },
  ].forEach(({ key, screen }) => {
    const btn = document.createElement("button");
    btn.className = "mode-tab" + (screen === activeScreenId ? " active" : "");
    btn.textContent = t(key);
    btn.dataset.screen = screen;
    btn.addEventListener("click", () => switchScreen(screen));
    modesEl.insertBefore(btn, el("mixModeTab"));
  });

  // Update mix tab active state and label
  const mixTab = el("mixModeTab");
  mixTab.textContent = t("tab_mix");
  mixTab.classList.toggle("active", activeScreenId === "mixScreen");
}

// ── Screen switch ─────────────────────────────────────────────────────────────
function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");
  activeScreenId = screenId;
  renderTabs();
}

// ── Category switch ───────────────────────────────────────────────────────────
function switchCategory(cat) {
  activeCategory = cat;
  const cfg = CATEGORIES[cat];

  // Update brand title
  const titleEl = el("topbarTitle");
  if (cfg.titleFixed) {
    titleEl.textContent = "Bob L'éponge";
  } else {
    titleEl.textContent = t(cfg.brandKey);
  }

  // Update category button label
  el("categoryLabel").textContent = cat === "spongebob" ? "Bob L'éponge" : t("cat_statues");

  // Switch to this category's live screen
  switchScreen(cfg.liveScreen);
}

// ── Progress dots ─────────────────────────────────────────────────────────────
function renderProgress(containerId, results, total) {
  const container = el(containerId);
  if (!container) return;
  container.innerHTML =
    results.slice(0, total).map(s => '<span class="guess-progress-dot' + (s ? " is-" + s : "") + '"></span>').join("") +
    Array(Math.max(0, total - results.length)).fill('<span class="guess-progress-dot"></span>').join("");
}

// ── Targets ───────────────────────────────────────────────────────────────────
function setLiveTarget(cat, label) {
  const cfg = CATEGORIES[cat];
  if (cat === "spongebob") {
    el("liveTargetImage").src = cfg.photoPath(label);
    el("liveTargetImage").style.display = "block";
    el("livePlaceholder").style.display = "none";
    el("liveLabelBar").style.display = "flex";
    el("liveMemeLabel").textContent = label.replace(/_/g, " ");
    el("liveTargetTitle").textContent = label.replace(/_/g, " ");
  } else {
    el("statueLiveTargetImage").src = cfg.photoPath(label);
    el("statueLiveTargetImage").style.display = "block";
    el("statueLivePlaceholder").style.display = "none";
    el("statueLiveLabelBar").style.display = "flex";
    el("statueLiveMemeLabel").textContent = label.replace(/_/g, " ");
    el("statueLiveTargetTitle").textContent = label.replace(/_/g, " ");
  }
}

function setGuessTarget(cat, label) {
  const cfg = CATEGORIES[cat];
  const gs = guessState[cat];
  gs.target = label;
  gs.holdFrames = 0;
  if (cat === "spongebob") {
    el("guessTargetImage").src = cfg.photoPath(label);
    el("guessTargetImage").style.display = "block";
    el("guessPlaceholder").style.display = "none";
    el("guessLabelBar").style.display = "flex";
    el("guessMemeLabel").textContent = label.replace(/_/g, " ");
    el("guessLevelTitle").textContent = t("level_n").replace("1", gs.levelIndex + 1);
  } else {
    el("statueGuessTargetImage").src = cfg.photoPath(label);
    el("statueGuessTargetImage").style.display = "block";
    el("statueGuessPlaceholder").style.display = "none";
    el("statueGuessLabelBar").style.display = "flex";
    el("statueGuessMemeLabel").textContent = label.replace(/_/g, " ");
    el("statueGuessLevelTitle").textContent = t("level_n").replace("1", gs.levelIndex + 1);
  }
}

// ── Badges / hints ────────────────────────────────────────────────────────────
function showSuccess(badgeId, visible) {
  const badge = el(badgeId);
  if (badge) badge.classList.toggle("hidden", !visible);
}

function renderHints(hintsId, matched, probability, label) {
  const elH = el(hintsId);
  if (!elH) return;
  const name = (label || "—").replace(/_/g, " ");
  const msg = matched
    ? name + t("hint_hold")
    : t("hint_closer") + name + " (" + (probability * 100).toFixed(0) + "%)";
  elH.innerHTML = '<span class="hint-chip">' + msg + "</span>";
}

// ── Model + webcam ────────────────────────────────────────────────────────────
async function initModel(cat) {
  if (inited[cat]) return;
  const cfg = CATEGORIES[cat];
  if (!cfg.modelUrl) {
    alert(t("statues_no_model"));
    throw new Error("no model url");
  }
  const modelURL    = cfg.modelUrl + "model.json";
  const metadataURL = cfg.modelUrl + "metadata.json";
  models[cat]  = await tmPose.load(modelURL, metadataURL);

  // For statues, pull labels from model metadata
  if (cat === "statues" && models[cat].getTotalClasses) {
    cfg.labels = models[cat].getClassLabels ? models[cat].getClassLabels() : cfg.labels;
  }

  webcams[cat] = new tmPose.Webcam(WEBCAM_WIDTH, WEBCAM_HEIGHT, true);
  await webcams[cat].setup();
  await webcams[cat].play();
  inited[cat] = true;
}

async function ensureLoop(cat) {
  if (loopActive[cat]) return;
  await initModel(cat);
  loopActive[cat] = true;
  window.requestAnimationFrame(() => loop(cat));
}

async function loop(cat) {
  if (!loopActive[cat]) return;
  webcams[cat].update();
  await predict(cat);
  window.requestAnimationFrame(() => loop(cat));
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawToCanvas(cat, canvasId) {
  const canvas = el(canvasId);
  if (!canvas || !webcams[cat]) return;
  const ctx = canvas.getContext("2d");
  canvas.width  = WEBCAM_WIDTH;
  canvas.height = WEBCAM_HEIGHT;
  ctx.drawImage(webcams[cat].canvas, 0, 0);
}

// ── Predict ───────────────────────────────────────────────────────────────────
async function predict(cat) {
  const model  = models[cat];
  const webcam = webcams[cat];
  if (!model || !webcam) return;

  const { posenetOutput } = await model.estimatePose(webcam.canvas);
  const predictions = await model.predict(posenetOutput);
  predictions.sort((a, b) => b.probability - a.probability);
  const top      = predictions[0];
  const topLabel = top ? top.className : null;
  const topProb  = top ? top.probability : 0;
  const matched  = topProb >= MATCH_THRESHOLD;

  if (cat === "spongebob") {
    drawToCanvas(cat, "liveCanvas");
    drawToCanvas(cat, "guessCanvas");
    if (matched && topLabel) setLiveTarget(cat, topLabel);
    renderHints("liveHints", matched, topProb, topLabel);
    showSuccess("liveSuccessBadge", false);
    handleLiveMode(cat, matched, topLabel, topProb);
    handleGuessMode(cat, predictions);
  } else {
    drawToCanvas(cat, "statueLiveCanvas");
    drawToCanvas(cat, "statueGuessCanvas");
    if (matched && topLabel) setLiveTarget(cat, topLabel);
    renderHints("statueLiveHints", matched, topProb, topLabel);
    showSuccess("statueLiveSuccessBadge", false);
    handleLiveMode(cat, matched, topLabel, topProb);
    handleGuessMode(cat, predictions);
  }

  // Mix mode: draw from whichever model matches current target's category
  if (mixState.running && mixState.target && mixState.target.cat === cat) {
    drawToCanvas(cat, "mixCanvas");
    handleMixMode(cat, predictions);
  } else if (!mixState.running && activeScreenId === "mixScreen") {
    drawToCanvas(cat, "mixCanvas");
  }
}

// ── Live mode ─────────────────────────────────────────────────────────────────
function handleLiveMode(cat, matched, label, probability) {
  const ls = liveState[cat];
  if (!ls.running) return;
  ls.holdFrames = matched ? ls.holdFrames + 1 : 0;
  const hintsId   = cat === "spongebob" ? "liveHints"          : "statueLiveHints";
  const badgeId   = cat === "spongebob" ? "liveSuccessBadge"   : "statueLiveSuccessBadge";
  renderHints(hintsId, matched, probability, label);
  showSuccess(badgeId, ls.holdFrames >= HOLD_FRAMES);
}

// ── Guess mode ────────────────────────────────────────────────────────────────
function handleGuessMode(cat, predictions) {
  const gs = guessState[cat];
  if (!gs.running || !gs.target) return;
  const match       = predictions.find(p => p.className === gs.target);
  const probability = match ? match.probability : 0;
  const matched     = probability >= MATCH_THRESHOLD;
  gs.holdFrames = matched ? gs.holdFrames + 1 : 0;
  if (gs.holdFrames >= HOLD_FRAMES) completeGuessLevel(cat, "correct");
}

// ── Results popup ─────────────────────────────────────────────────────────────
function showResultsPopup(cat) {
  const gs      = guessState[cat];
  const correct = gs.results.filter(r => r === "correct").length;
  el("resultsScore").textContent = correct;
  el("resultsTotal").textContent = "/" + gs.queue.length;
  el("resultsDots").innerHTML    = gs.results.map(r =>
    '<span class="guess-progress-dot is-' + r + '"></span>'
  ).join("");
  el("resultsPopup").classList.remove("hidden");
  // store last category so restart knows which one
  el("resultsPopup").dataset.cat = cat;
}

function hideResultsPopup() {
  el("resultsPopup").classList.add("hidden");
}

function advanceGuessLevel(cat) {
  const gs        = guessState[cat];
  const progressId = cat === "spongebob" ? "guessProgress" : "statueGuessProgress";
  gs.levelIndex  += 1;
  if (gs.levelIndex >= gs.queue.length) {
    gs.running = false;
    gs.target  = null;
    showResultsPopup(cat);
    return;
  }
  setGuessTarget(cat, gs.queue[gs.levelIndex]);
  gs.running = true;
}

function completeGuessLevel(cat, result) {
  const gs        = guessState[cat];
  const badgeId   = cat === "spongebob" ? "guessSuccessBadge" : "statueGuessSuccessBadge";
  const progressId = cat === "spongebob" ? "guessProgress"    : "statueGuessProgress";
  const total     = Math.min(GUESS_LEVEL_COUNT, CATEGORIES[cat].labels.length);
  gs.running = false;
  gs.results[gs.levelIndex] = result;
  renderProgress(progressId, gs.results, total);
  if (result === "correct") showSuccess(badgeId, true);
  setTimeout(function () {
    showSuccess(badgeId, false);
    advanceGuessLevel(cat);
  }, result === "correct" ? 900 : 150);
}

// ── Mix mode ──────────────────────────────────────────────────────────────────
function handleMixMode(cat, predictions) {
  if (!mixState.running || !mixState.target) return;
  if (mixState.target.cat !== cat) return;
  const match       = predictions.find(p => p.className === mixState.target.label);
  const probability = match ? match.probability : 0;
  const matched     = probability >= MATCH_THRESHOLD;
  mixState.holdFrames = matched ? mixState.holdFrames + 1 : 0;
  if (mixState.holdFrames >= HOLD_FRAMES) completeMixLevel("correct");
}

function setMixTarget(item) {
  mixState.target     = item;
  mixState.holdFrames = 0;
  const cfg = CATEGORIES[item.cat];
  el("mixTargetImage").src          = cfg.photoPath(item.label);
  el("mixTargetImage").style.display = "block";
  el("mixPlaceholder").style.display = "none";
  el("mixLabelBar").style.display    = "flex";
  el("mixMemeLabel").textContent     = item.label.replace(/_/g, " ");
  el("mixSourceTag").textContent     = item.cat === "spongebob" ? "Bob L'éponge" : t("cat_statues");
  el("mixLevelTitle").textContent    = t("level_n").replace("1", mixState.levelIndex + 1);
}

function advanceMixLevel() {
  mixState.levelIndex += 1;
  if (mixState.levelIndex >= mixState.queue.length) {
    mixState.running = false;
    mixState.target  = null;
    showMixResultsPopup();
    return;
  }
  setMixTarget(mixState.queue[mixState.levelIndex]);
  mixState.running = true;
}

function completeMixLevel(result) {
  mixState.running = false;
  mixState.results[mixState.levelIndex] = result;
  renderProgress("mixProgress", mixState.results, mixState.queue.length);
  if (result === "correct") showSuccess("mixSuccessBadge", true);
  setTimeout(function () {
    showSuccess("mixSuccessBadge", false);
    advanceMixLevel();
  }, result === "correct" ? 900 : 150);
}

function showMixResultsPopup() {
  const correct = mixState.results.filter(r => r === "correct").length;
  el("resultsScore").textContent = correct;
  el("resultsTotal").textContent = "/" + mixState.queue.length;
  el("resultsDots").innerHTML    = mixState.results.map(r =>
    '<span class="guess-progress-dot is-' + r + '"></span>'
  ).join("");
  el("resultsPopup").classList.remove("hidden");
  el("resultsPopup").dataset.cat = "mix";
}

async function startMixMode() {
  // Ensure both models are loaded
  const sbLabels  = CATEGORIES.spongebob.labels.map(l => ({ label: l, cat: "spongebob" }));
  const stLabels  = CATEGORIES.statues.labels.length > 0
    ? CATEGORIES.statues.labels.map(l => ({ label: l, cat: "statues" }))
    : [];

  // Always load spongebob; try statues if model url is set
  await ensureLoop("spongebob");
  if (CATEGORIES.statues.modelUrl && stLabels.length === 0) {
    try { await ensureLoop("statues"); } catch (_) {}
  }

  const allItems = shuffled([...sbLabels, ...stLabels]);
  const total    = Math.min(GUESS_LEVEL_COUNT, allItems.length);

  mixState.queue      = allItems.slice(0, total);
  mixState.running    = true;
  mixState.levelIndex = 0;
  mixState.results    = [];
  mixState.holdFrames = 0;

  renderProgress("mixProgress", mixState.results, total);
  setMixTarget(mixState.queue[0]);
  showSuccess("mixSuccessBadge", false);

  const btn = el("startMixMode");
  btn.textContent = t("btn_stop");
  btn.onclick = stopMixMode;
}

function stopMixMode() {
  mixState.running = false;
  const btn = el("startMixMode");
  btn.textContent = t("btn_play");
  btn.onclick = () => startMixMode().catch(onModelError);
}

// ── Start / stop live ─────────────────────────────────────────────────────────
async function startLive(cat) {
  await ensureLoop(cat);
  liveState[cat].running    = true;
  liveState[cat].holdFrames = 0;
  const badgeId = cat === "spongebob" ? "liveSuccessBadge" : "statueLiveSuccessBadge";
  showSuccess(badgeId, false);
  const btnId = cat === "spongebob" ? "startLiveMode" : "startStatueLive";
  const btn   = el(btnId);
  btn.textContent = t("btn_stop");
  btn.onclick = () => stopLive(cat);
}

function stopLive(cat) {
  liveState[cat].running = false;
  const btnId = cat === "spongebob" ? "startLiveMode" : "startStatueLive";
  const btn   = el(btnId);
  btn.textContent = t("btn_play");
  btn.onclick = () => startLive(cat).catch(onModelError);
}

// ── Start / stop guess ────────────────────────────────────────────────────────
async function startGuess(cat) {
  await ensureLoop(cat);
  const labels    = CATEGORIES[cat].labels;
  const total     = Math.min(GUESS_LEVEL_COUNT, labels.length);
  const gs        = guessState[cat];
  const progressId = cat === "spongebob" ? "guessProgress" : "statueGuessProgress";
  const badgeId   = cat === "spongebob" ? "guessSuccessBadge" : "statueGuessSuccessBadge";
  gs.queue      = shuffled(labels).slice(0, total);
  gs.running    = true;
  gs.levelIndex = 0;
  gs.results    = [];
  gs.holdFrames = 0;
  renderProgress(progressId, gs.results, total);
  setGuessTarget(cat, gs.queue[0]);
  showSuccess(badgeId, false);
  const btnId = cat === "spongebob" ? "startGuessMode" : "startStatueGuess";
  const btn   = el(btnId);
  btn.textContent = t("btn_stop");
  btn.onclick = () => stopGuess(cat);
}

function stopGuess(cat) {
  guessState[cat].running = false;
  const btnId = cat === "spongebob" ? "startGuessMode" : "startStatueGuess";
  const btn   = el(btnId);
  btn.textContent = t("btn_play");
  btn.onclick = () => startGuess(cat).catch(onModelError);
}

function onModelError(err) {
  console.error(err);
  if (err.message !== "no model url") alert(t("no_model"));
}

// ── Dropdown logic ────────────────────────────────────────────────────────────
function setupDropdown(btnId, menuId, onSelect) {
  const btn  = el(btnId);
  const menu = el(menuId);

  btn.addEventListener("click", e => {
    e.stopPropagation();
    const open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  });

  menu.querySelectorAll("li[role=menuitem]").forEach(item => {
    item.addEventListener("click", () => {
      onSelect(item);
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", false);
    });
  });

  document.addEventListener("click", () => {
    menu.classList.remove("open");
    btn.setAttribute("aria-expanded", false);
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

// Category dropdown
setupDropdown("categoryBtn", "categoryMenu", item => {
  switchCategory(item.dataset.category);
});

// Language dropdown
setupDropdown("langBtn", "langMenu", item => {
  currentLang = item.dataset.lang;
  localStorage.setItem("poseLang", currentLang);
  el("langLabel").textContent = currentLang.toUpperCase();
  applyTranslations();
  renderTabs();
  // re-render dynamic button texts
  ["startLiveMode","startGuessMode","startStatueLive","startStatueGuess"].forEach(id => {
    const b = el(id);
    if (b && b.textContent.trim() !== t("btn_stop")) b.textContent = t("btn_play");
  });
  el("skipGuessLevel").textContent  = t("btn_skip");
  el("skipStatueLevel").textContent = t("btn_skip");
});

// Mix mode tab button
el("mixModeTab").addEventListener("click", () => switchScreen("mixScreen"));

// Mix mode buttons
el("startMixMode").addEventListener("click", () => startMixMode().catch(onModelError));
el("skipMixLevel").addEventListener("click", () => {
  if (mixState.running && mixState.target) completeMixLevel("skipped");
});

// Spongebob buttons
el("startLiveMode").addEventListener("click",  () => startLive("spongebob").catch(onModelError));
el("startGuessMode").addEventListener("click", () => startGuess("spongebob").catch(onModelError));
el("skipGuessLevel").addEventListener("click", () => {
  if (guessState.spongebob.running && guessState.spongebob.target) completeGuessLevel("spongebob", "skipped");
});

// Statues buttons
el("startStatueLive").addEventListener("click",  () => startLive("statues").catch(onModelError));
el("startStatueGuess").addEventListener("click", () => startGuess("statues").catch(onModelError));
el("skipStatueLevel").addEventListener("click", () => {
  if (guessState.statues.running && guessState.statues.target) completeGuessLevel("statues", "skipped");
});

// Results popup restart
el("resultsRestart").addEventListener("click", function () {
  const cat = el("resultsPopup").dataset.cat || "spongebob";
  hideResultsPopup();
  if (cat === "mix") {
    startMixMode().catch(onModelError);
  } else {
    startGuess(cat).catch(onModelError);
  }
});

// Initial setup
el("liveTargetImage").style.display        = "none";
el("guessTargetImage").style.display       = "none";
el("statueLiveTargetImage").style.display  = "none";
el("statueGuessTargetImage").style.display = "none";

renderProgress("guessProgress",       [], Math.min(GUESS_LEVEL_COUNT, CATEGORIES.spongebob.labels.length));
renderProgress("statueGuessProgress", [], GUESS_LEVEL_COUNT);

el("langLabel").textContent = currentLang.toUpperCase();
applyTranslations();
renderTabs();
switchCategory("spongebob");

// ── Catalog ───────────────────────────────────────────────────────────────────
function buildCatalogItems(filterCat) {
  const items = [];
  if (filterCat === "all" || filterCat === "spongebob") {
    CATEGORIES.spongebob.labels.forEach(label => items.push({ label, cat: "spongebob" }));
  }
  if (filterCat === "all" || filterCat === "statues") {
    CATEGORIES.statues.labels.forEach(label => items.push({ label, cat: "statues" }));
  }
  return items;
}

function renderCatalog(filterCat) {
  const grid = el("catalogGrid");
  const items = buildCatalogItems(filterCat || "all");
  if (items.length === 0) {
    grid.innerHTML = '<div class="catalog-empty" data-i18n="catalog_empty">' + t("catalog_empty") + '</div>';
    return;
  }
  grid.innerHTML = items.map(({ label, cat }) => {
    const cfg  = CATEGORIES[cat];
    const name = label.replace(/_/g, " ");
    const catBadge = cat === "spongebob" ? t("cat_spongebob") : t("cat_statues");
    return `<div class="catalog-card">
      <div class="catalog-img-wrap">
        <img src="${cfg.photoPath(label)}" alt="${name}" loading="lazy" />
      </div>
      <div class="catalog-card-body">
        <span class="catalog-card-name">${name}</span>
        <span class="catalog-card-cat">${catBadge}</span>
      </div>
    </div>`;
  }).join("");
}

let catalogActive = false;
el("catalogTab").addEventListener("click", () => {
  if (!catalogActive) {
    // Hide all screens
    document.querySelectorAll(".screen").forEach(s => { s.style.display = "none"; s.classList.remove("active"); });
    document.querySelectorAll(".mode-tab").forEach(b => b.classList.remove("active"));
    el("catalogTab").classList.add("active");
    el("catalogScreen").style.display = "flex";
    catalogActive = true;
    renderCatalog("all");
  } else {
    el("catalogScreen").style.display = "none";
    el("catalogTab").classList.remove("active");
    catalogActive = false;
    switchCategory(activeCategory);
  }
});

el("catalogFilter").querySelectorAll(".catalog-filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    el("catalogFilter").querySelectorAll(".catalog-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderCatalog(btn.dataset.cat);
  });
});
