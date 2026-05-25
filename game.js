// =====================
// DOM
// =====================
function on(el, event, handler) {
  if (!el) return; // safely ignore missing elements
  el.addEventListener(event, handler);
}

const els = {
  card: document.getElementById("card"),
  promptLabel: document.getElementById("promptLabel"),
  prompt: document.getElementById("prompt"),
  choices: document.getElementById("choices"),

  score: document.getElementById("score"),
  streak: document.getElementById("streak"),
  seen: document.getElementById("seen"),
  lives: document.getElementById("lives"),
  stickers: document.getElementById("stickers"),

  nextBtn: document.getElementById("nextBtn"),
  resetBtn: document.getElementById("resetBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),

  mascot: document.getElementById("mascot"),

  setSelect: document.getElementById("setSelect"),
  lessonSelect: document.getElementById("lessonSelect"),

  direction: document.getElementById("direction"),
  pool: document.getElementById("pool"),
  speakCorrect: document.getElementById("speakCorrect"),
  autoSlowVoice: document.getElementById("autoSlowVoice"),

  smallMsg: document.getElementById("smallMsg"),
};

// =====================
// Storage
// =====================
const LS_STATS = "hanziGameStats_v5";
const LS_SETTINGS = "hanziGameSettings_v5";

function loadStats() {
  try {
    const obj = JSON.parse(localStorage.getItem(LS_STATS));
    if (obj && typeof obj === "object") return obj;
  } catch {}
  return { score: 0, streak: 0, seen: 0, wrong: {}, right: {}, stickers: 0 };
}
function saveStats(s) {
  localStorage.setItem(LS_STATS, JSON.stringify(s));
}

function loadSettings() {
  try {
    const obj = JSON.parse(localStorage.getItem(LS_SETTINGS));
    if (obj && typeof obj === "object") return obj;
  } catch {}
  return {
    setId: "",
    lesson: "all", // "all" or "1" / "2" / ...
    direction: "hanzi_to_pinyin",
    pool: "all",
    speakCorrect: false,
    autoSlowVoice: false,
  };
}
function saveSettings(s) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}

// MUST load these before manifest uses them
let stats = loadStats();
let settings = loadSettings();

// init controls from settings (null-safe)
if (els.direction) els.direction.value = settings.direction;
if (els.pool) els.pool.value = settings.pool;
if (els.speakCorrect) els.speakCorrect.checked = !!settings.speakCorrect;
if (els.autoSlowVoice) els.autoSlowVoice.checked = !!settings.autoSlowVoice;
if (els.lessonSelect) els.lessonSelect.value = settings.lesson || "all";

// =====================
// Audio & Speech
// =====================
let audioCtx = null;
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
}

function playCorrectSound() {
  ensureAudioCtx();
  const now = audioCtx.currentTime;

  const o1 = audioCtx.createOscillator();
  const g1 = audioCtx.createGain();
  o1.type = "sine";
  o1.frequency.setValueAtTime(880, now);
  g1.gain.setValueAtTime(0.0001, now);
  g1.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  o1.connect(g1).connect(audioCtx.destination);
  o1.start(now);
  o1.stop(now + 0.18);

  const o2 = audioCtx.createOscillator();
  const g2 = audioCtx.createGain();
  o2.type = "sine";
  o2.frequency.setValueAtTime(1175, now + 0.12);
  g2.gain.setValueAtTime(0.0001, now + 0.12);
  g2.gain.exponentialRampToValueAtTime(0.16, now + 0.14);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  o2.connect(g2).connect(audioCtx.destination);
  o2.start(now + 0.12);
  o2.stop(now + 0.32);
}

function speakChinese(text, { slow = false } = {}) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = slow ? 0.70 : 0.85;
  u.pitch = 1.0;
  u.volume = 1.0;

  const voices = window.speechSynthesis.getVoices?.() || [];
  const zhVoice =
    voices.find(v => (v.lang || "").toLowerCase().startsWith("zh")) ||
    voices.find(v => /mandarin|chinese/i.test(v.name || ""));

  if (zhVoice) u.voice = zhVoice;
  window.speechSynthesis.speak(u);
}

// =====================
// Visual fun
// =====================
function setRandomTheme() {
  if (!els.card) return;
  const r = 140 + Math.floor(Math.random() * 95);
  const g = 140 + Math.floor(Math.random() * 95);
  const b = 140 + Math.floor(Math.random() * 95);
  els.card.style.setProperty("--accent", `${r}, ${g}, ${b}`);
}

function mascotReact(kind) {
  if (!els.mascot) return;
  els.mascot.classList.remove("bounce", "wiggle");
  void els.mascot.offsetWidth;
  els.mascot.classList.add(kind === "good" ? "bounce" : "wiggle");
}

function showPlusOne() {
  if (!els.card) return;
  const el = document.createElement("div");
  el.className = "floaty";
  el.textContent = "+1 🎉";
  els.card.appendChild(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

// function showSticker() {
//   if (!els.card) return;
//   const stickers = [
//   "⭐", "🌟", "🏅", "🧸", "🦊", "🐯", "🦄", "🎈", "🍭", "67", "67", "67",
//   "💩", "😈", "👾", "👑", "🌮", "🍕", "🥓", "🍔", "🥪", "🥟", "🍣", "🌮",
//   "🍩", "🍪", "🍯", "🍟", "🧋", "🥤", "🍺", "🍹", "🥇", "🏅", "🎖️",
//   "🎇", "🎆", "❤️", "💯", "🏴‍☠️", "🇺🇸", "🥰", "👏",
//   "😎", "🥞", "🧃", "🎂", "🍮", "🍙", "🥠", "🧉",
//   "🍏", "🍎", "🍐", "🍊", "🍋", "🍋‍🟩", "🍌", "🍉", "🍇", "🍓", "🫐",
//   "🍈", "🍒", "🍑", "🥭", "🍍",
//   "🥒", "🥑", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥦", "🥔",
//   "🍠", "🫚", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🧈", "🧇",
//   "🥩", "🍗", "🍖", "🫓", "🥙", "🧆", "🌯", "🫔", "🥘", "🍱",
//   "🍼", "🍝", "🍲", "🍧", "🍦", "🍫", "🥜"
// ];

//   const pick = stickers[Math.floor(Math.random() * stickers.length)];
//   const el = document.createElement("div");
//   el.className = "stickerPop";
//   el.textContent = pick;
//   els.card.appendChild(el);
//   el.addEventListener("animationend", () => el.remove(), { once: true });
// }


function playStickerSound() {
  // Short celebratory arpeggio + sparkle, no external audio file needed.
  ensureAudioCtx();
  const now = audioCtx.currentTime;

  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  freqs.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, now + i * 0.08);

    g.gain.setValueAtTime(0.0001, now + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.22);

    o.connect(g).connect(audioCtx.destination);
    o.start(now + i * 0.08);
    o.stop(now + i * 0.08 + 0.24);
  });

  // little sparkle noise burst
  const bufferSize = Math.floor(audioCtx.sampleRate * 0.12);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = audioCtx.createBufferSource();
  const ng = audioCtx.createGain();
  noise.buffer = buffer;
  ng.gain.setValueAtTime(0.12, now + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  noise.connect(ng).connect(audioCtx.destination);
  noise.start(now + 0.05);
  noise.stop(now + 0.20);
}

function showSticker() {
  if (!els.card) return;

  const stickers = ["67","67","67","67","67","67","67",
    "⭐", "🌟", "🏅", "🧸", "🦊", "🐯", "🦄", "🎈", "🍭",
    "💩", "😈", "👾", "👑", "🌮", "🍕", "🥓", "🍔", "🥪", "🥟", "🍣",
    "🍩", "🍪", "🍯", "🍟", "🧋", "🥤", "🍹", "🥇", "🎖️",
    "🎇", "🎆", "❤️", "💯", "🏴‍☠️", "🇺🇸", "🥰", "👏", "😎",
    "🥞", "🧃", "🎂", "🍮", "🍙", "🥠", "🧉",
    "🍏", "🍎", "🍐", "🍊", "🍋", "🍋‍🟩", "🍌", "🍉", "🍇", "🍓", "🫐",
    "🍈", "🍒", "🍑", "🥭", "🍍",
    "🥒", "🥑", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥦", "🥔",
    "🍠", "🫚", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🧈", "🧇",
    "🥩", "🍗", "🍖", "🫓", "🥙", "🧆", "🌯", "🫔", "🥘", "🍱",
    "🍼", "🍝", "🍲", "🍧", "🍦", "🍫", "🥜"
  ];

  const pick = stickers[Math.floor(Math.random() * stickers.length)];

  // Make it bigger + keep it longer via inline styles (no CSS changes required)
  const el = document.createElement("div");
  el.className = "stickerPop";
  el.textContent = pick;

  // Bigger + centered pop feel
  el.style.fontSize = "72px";
  el.style.lineHeight = "1";
  el.style.padding = "12px 16px";
  el.style.borderRadius = "24px";
  el.style.position = "absolute";
  el.style.left = "50%";
  el.style.top = "95px";
  el.style.transform = "translateX(-50%)";

  // Stay visible, then fade out
  el.style.opacity = "0";
  el.style.transition = "opacity 250ms ease, transform 250ms ease";
  els.card.appendChild(el);

  // Trigger pop-in
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) scale(1.08)";
  });

  // Play encouraging sound (requires user gesture sometime earlier, which you have)
  playStickerSound();

  // Keep for a few seconds then fade out
  const stayMs = 25000; // visible duration
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) scale(0.95)";
    setTimeout(() => el.remove(), 300);
  }, stayMs);
}


// =====================
// Data: Sets + Lessons loading (DETAILED FORMAT)
// =====================
let MANIFEST = [];
let CURRENT_SET = null; // {id,title,lessons:[{lesson,words}],all:[...] }
let WORDS = [];         // active practice list after lesson filter

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  return await res.json();
}

function normalizeWords(list) {
  const cleaned = (Array.isArray(list) ? list : [])
    .map(x => ({
      hanzi: String(x.hanzi || "").trim(),
      pinyin: String(x.pinyin || "").trim().toLowerCase(),
    }))
    .filter(x => x.hanzi && x.pinyin);

  const seen = new Set();
  const out = [];
  for (const w of cleaned) {
    const k = `${w.hanzi}__${w.pinyin}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(w);
    }
  }
  return out;
}

async function loadManifestAndInitDropdown() {
  MANIFEST = await loadJSON("sets/manifest.json");

  if (!els.setSelect) return;

  els.setSelect.innerHTML = "";
  for (const item of MANIFEST) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.title;
    els.setSelect.appendChild(opt);
  }

  const savedOk = settings.setId && MANIFEST.some(x => x.id === settings.setId);
  settings.setId = savedOk ? settings.setId : (MANIFEST[0]?.id || "");
  saveSettings(settings);

  els.setSelect.value = settings.setId;
}

async function loadSelectedSet() {
  const entry = MANIFEST.find(x => x.id === settings.setId);
  if (!entry) throw new Error("Set not found in manifest");

  const data = await loadJSON(entry.file);

  // Expect detailed format
  if (!data || typeof data !== "object" || !Array.isArray(data.all)) {
    throw new Error(`Set file ${entry.file} is not in detailed format (missing "all")`);
  }

  CURRENT_SET = data;

  rebuildLessonDropdown();
  applyLessonFilter();
}

function rebuildLessonDropdown() {
  if (!els.lessonSelect) return;

  els.lessonSelect.innerHTML = "";

  // All option
  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = "全部课文";
  els.lessonSelect.appendChild(optAll);

  const lessons = Array.isArray(CURRENT_SET?.lessons) ? CURRENT_SET.lessons : [];

  // Collect unique lesson labels (strings)
  const labels = [];
  const seen = new Set();

  for (const l of lessons) {
    const label = String(l.lesson ?? "").trim();
    if (!label) continue;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  // Sort in a nice human order:
  // 识字 1, 识字 2..., 语文园地一, 二..., 课文 1, 2...
  const cnNumMap = {
    "零": 0, "〇": 0,
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
  };

  function parseCnNumber(s) {
    // Handles: 一..十, 十一..十九, 二十.., 三十一.. (basic)
    // Also handles Arabic digits.
    const t = String(s).trim();
    if (/^\d+$/.test(t)) return Number(t);

    // exact 十
    if (t === "十") return 10;

    // 十一..十九
    if (t.startsWith("十") && t.length === 2) {
      const ones = cnNumMap[t[1]];
      return ones != null ? 10 + ones : NaN;
    }

    // 二十..九十九 (very basic)
    // e.g. 二十, 二十一, 三十六
    const m = t.match(/^([一二三四五六七八九])十([一二三四五六七八九])?$/);
    if (m) {
      const tens = cnNumMap[m[1]];
      const ones = m[2] ? cnNumMap[m[2]] : 0;
      return tens * 10 + ones;
    }

    // fallback
    return NaN;
  }

  function sortKey(label) {
    // Group order: 识字 -> 语文园地 -> 课文 -> others
    let group = 9;
    if (label.startsWith("识字")) group = 1;
    else if (label.startsWith("语文园地")) group = 2;
    else if (label.startsWith("课文")) group = 3;

    // Extract trailing number-like part
    // 识字 1 -> 1
    // 课文 12 -> 12
    // 语文园地一 -> 1
    let num = NaN;

    // For "识字 1"/"课文 2"
    const m1 = label.match(/(\d+)\s*$/);
    if (m1) num = Number(m1[1]);

    // For "语文园地一/二/三/十/十一..."
    if (!Number.isFinite(num) && label.startsWith("语文园地")) {
      const tail = label.replace("语文园地", "").trim();
      num = parseCnNumber(tail);
    }

    // For safety: keep stable ordering
    return { group, num: Number.isFinite(num) ? num : 9999, label };
  }

  labels.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka.group !== kb.group) return ka.group - kb.group;
    if (ka.num !== kb.num) return ka.num - kb.num;
    return ka.label.localeCompare(kb.label, "zh-Hans");
  });

  // Build dropdown options
  for (const label of labels) {
    const opt = document.createElement("option");
    opt.value = label;       // IMPORTANT: value is the label string
    opt.textContent = label; // display label as-is
    els.lessonSelect.appendChild(opt);
  }

  // Restore selection if possible
  const wanted = String(settings.lesson || "all");
  const exists = Array.from(els.lessonSelect.options).some(o => o.value === wanted);
  els.lessonSelect.value = exists ? wanted : "all";

  settings.lesson = els.lessonSelect.value;
  saveSettings(settings);
}


function applyLessonFilter() {
  if (!CURRENT_SET) {
    WORDS = [];
    return;
  }

  // const lessonVal = String(settings.lesson || "all");

  // if (lessonVal === "all") {
  //   WORDS = normalizeWords(CURRENT_SET.all);
  //   return;
  // }

  // const lessonNum = Number(lessonVal);
  // const lessonObj = (CURRENT_SET.lessons || []).find(l => Number(l.lesson) === lessonNum);
  // WORDS = normalizeWords(lessonObj?.words || []);
  const lessonVal = String(settings.lesson || "all");
  if (lessonVal === "all") {
    WORDS = normalizeWords(CURRENT_SET.all);
    return;
  }
  const lessonObj = (CURRENT_SET.lessons || []).find(l => String(l.lesson).trim() === lessonVal);
  WORDS = normalizeWords(lessonObj?.words || []);


  // Fallback to all if lesson empty (keeps the game playable)
  if (!WORDS.length) {
    WORDS = normalizeWords(CURRENT_SET.all);
    settings.lesson = "all";
    if (els.lessonSelect) els.lessonSelect.value = "all";
    saveSettings(settings);
  }
}

// =====================
// Game state
// =====================
let livesLeft = 3; // session-only
let current = null;
let locked = false;
const IDK_VALUE = "__IDK__";

function updateTopUI() {
  if (els.score) els.score.textContent = String(stats.score);
  if (els.streak) els.streak.textContent = String(stats.streak);
  if (els.seen) els.seen.textContent = String(stats.seen);
  if (els.stickers) els.stickers.textContent = String(stats.stickers || 0);
  if (els.lives) {
    els.lives.textContent =
      "❤️".repeat(livesLeft) + "🖤".repeat(Math.max(0, 3 - livesLeft));
  }
}
updateTopUI();

function randInt(n) { return Math.floor(Math.random() * n); }
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function keyOf(w) { return `${w.hanzi}__${w.pinyin}`; }
function missCount(w) { return Number(stats.wrong?.[keyOf(w)] || 0); }

function weightedPick(items) {
  let total = 0;
  const weights = items.map(w => {
    const miss = missCount(w);
    const k = keyOf(w);
    const seen = Number(stats.right?.[k] || 0) + Number(stats.wrong?.[k] || 0);
    const newBonus = seen === 0 ? 0.6 : 0;
    const weight = 1 + Math.pow(miss, 1.2) + newBonus;
    total += weight;
    return weight;
  });

  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function missedOnlyList() {
  return WORDS.filter(w => missCount(w) > 0);
}

function pickNextWord() {
  if (!WORDS.length) return null;
  if (settings.pool === "missed") {
    const missed = missedOnlyList();
    if (missed.length > 0) return weightedPick(missed);
  }
  return weightedPick(WORDS);
}

function getPromptAndOptions(word) {
  // Ensure enough distractors even if lesson has few unique items:
  // fallback distractor pool = CURRENT_SET.all
  const fallbackPool = normalizeWords(CURRENT_SET?.all || WORDS);

  if (settings.direction === "hanzi_to_pinyin") {
    const correct = word.pinyin;

    const pool = Array.from(new Set(fallbackPool.map(w => w.pinyin)));
    const all = pool.filter(x => x !== correct);

    const distract = [];
    while (distract.length < 3 && all.length > 0) {
      const idx = randInt(all.length);
      distract.push(all[idx]);
      all.splice(idx, 1);
    }

    return {
      label: "选正确的拼音 🎈",
      prompt: word.hanzi,
      correct,
      options: shuffle([correct, ...distract]),
    };
  } else {
    const correct = word.hanzi;

    const pool = Array.from(new Set(fallbackPool.map(w => w.hanzi)));
    const all = pool.filter(x => x !== correct);

    const distract = [];
    while (distract.length < 3 && all.length > 0) {
      const idx = randInt(all.length);
      distract.push(all[idx]);
      all.splice(idx, 1);
    }

    return {
      label: "选正确的汉字 🎈",
      prompt: word.pinyin,
      correct,
      options: shuffle([correct, ...distract]),
    };
  }
}

function setChoicesEnabled(enabled) {
  for (const b of els.choices.querySelectorAll("button")) b.disabled = !enabled;
}

function gameOver() {
  setChoicesEnabled(false);
  if (els.nextBtn) els.nextBtn.disabled = true;
  if (els.smallMsg) els.smallMsg.textContent = "💥 Game over! Reset stats or refresh to try again.";
  mascotReact("bad");
}

function loseLife() {
  livesLeft = Math.max(0, livesLeft - 1);
  updateTopUI();
  if (livesLeft <= 0) gameOver();
}

function maybeAwardSticker() {
  const target = Math.floor(stats.score / 10);
  if (target > (stats.stickers || 0)) {
    stats.stickers = target;
    saveStats(stats);
    updateTopUI();
    showSticker();
    if (els.smallMsg) els.smallMsg.textContent = "🏅 Sticker earned!";
  }
}

function renderQuestion() {
  if (livesLeft <= 0) return;

  locked = false;
  if (els.nextBtn) els.nextBtn.disabled = true;
  if (els.smallMsg) els.smallMsg.textContent = "";
  setRandomTheme();

  current = pickNextWord();
  if (!current) {
    if (els.promptLabel) els.promptLabel.textContent = "No words loaded";
    if (els.prompt) els.prompt.textContent = "—";
    if (els.choices) els.choices.innerHTML = "";
    return;
  }

  const { label, prompt, correct, options } = getPromptAndOptions(current);
  if (els.promptLabel) els.promptLabel.textContent = label;
  if (els.prompt) els.prompt.textContent = prompt;

  els.choices.innerHTML = "";

  for (const opt of options) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = opt;
    btn.addEventListener("click", () => handleAnswer(opt, correct));
    els.choices.appendChild(btn);
  }

  // "不知道" safe skip
  const idkBtn = document.createElement("button");
  idkBtn.className = "choice idk";
  idkBtn.textContent = "不知道";
  idkBtn.addEventListener("click", () => handleAnswer(IDK_VALUE, correct));
  els.choices.appendChild(idkBtn);

  updateTopUI();

  // Auto slow voice BEFORE answering (parent-controlled toggle)
  if (settings.autoSlowVoice) {
    speakChinese(current.hanzi, { slow: true });
  }
}

function handleAnswer(chosen, correct) {
  if (locked || livesLeft <= 0) return;
  locked = true;

  ensureAudioCtx(); // click occurred

  stats.seen += 1;
  const isIDK = chosen === IDK_VALUE;
  const isCorrect = (!isIDK && chosen === correct);

  const k = keyOf(current);

  // Mark buttons
  const btns = Array.from(els.choices.querySelectorAll("button"));
  for (const b of btns) {
    if (b.textContent === correct) b.classList.add("correct");
    if (isIDK && b.textContent === "不知道") b.classList.add("wrong");
    if (!isIDK && b.textContent === chosen && !isCorrect) b.classList.add("wrong");
    b.disabled = true;
  }

  if (isCorrect) {
    stats.score += 1;
    stats.streak += 1;
    stats.right[k] = (stats.right[k] || 0) + 1;

    // reduce old mistakes
    if (stats.wrong[k]) {
      stats.wrong[k] = Math.max(0, stats.wrong[k] - 1);
      if (stats.wrong[k] === 0) delete stats.wrong[k];
    }

    if (els.smallMsg) els.smallMsg.textContent = "✅ Great job! 🎉";
    playCorrectSound();
    showPlusOne();
    mascotReact("good");

    if (settings.speakCorrect) speakChinese(current.hanzi);

    saveStats(stats);
    updateTopUI();
    maybeAwardSticker();
    if (els.nextBtn) els.nextBtn.disabled = false;
    return;
  }

  // Wrong or IDK: show answer + speak hanzi
  stats.streak = 0;
  stats.wrong[k] = (stats.wrong[k] || 0) + 1;

  if (els.smallMsg) els.smallMsg.textContent = `❌ 正确：${current.pinyin}`;
  mascotReact("bad");
  speakChinese(current.hanzi);

  saveStats(stats);
  updateTopUI();

  // IMPORTANT: IDK is SAFE SKIP (no heart lost)
  if (!isIDK) loseLife();

  if (els.nextBtn) els.nextBtn.disabled = (livesLeft <= 0) ? true : false;
  if (livesLeft > 0 && els.nextBtn) els.nextBtn.disabled = false;
}

// =====================
// Events
// =====================
on(els.nextBtn, "click", () => renderQuestion());

on(els.resetBtn, "click", () => {
  localStorage.removeItem(LS_STATS);
  stats = loadStats();
  livesLeft = 3;
  updateTopUI();
  renderQuestion();
});

on(els.direction, "change", () => {
  settings.direction = els.direction.value;
  saveSettings(settings);
  renderQuestion();
});

on(els.pool, "change", () => {
  settings.pool = els.pool.value;
  saveSettings(settings);
  renderQuestion();
});

on(els.speakCorrect, "change", () => {
  settings.speakCorrect = !!els.speakCorrect.checked;
  saveSettings(settings);
});

on(els.autoSlowVoice, "change", () => {
  settings.autoSlowVoice = !!els.autoSlowVoice.checked;
  saveSettings(settings);
});

on(els.lessonSelect, "change", () => {
  settings.lesson = els.lessonSelect.value;
  saveSettings(settings);
  applyLessonFilter();
  renderQuestion();
});

on(els.setSelect, "change", async () => {
  settings.setId = els.setSelect.value;
  settings.lesson = "all"; // reset lesson when switching set
  saveSettings(settings);

  try {
    await loadSelectedSet();
    livesLeft = 3;
    updateTopUI();
    renderQuestion();
  } catch (e) {
    if (els.promptLabel) els.promptLabel.textContent = "Failed to load set";
    if (els.prompt) els.prompt.textContent = "—";
    if (els.smallMsg) els.smallMsg.textContent = String(e?.message || e);
    if (els.choices) els.choices.innerHTML = "";
    if (els.nextBtn) els.nextBtn.disabled = true;
  }
});

on(els.fullscreenBtn, "click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {}
});

// =====================
// Boot
// =====================
(async function init() {
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.getVoices?.();

    if (els.promptLabel) els.promptLabel.textContent = "Loading…";
    if (els.prompt) els.prompt.textContent = "—";

    await loadManifestAndInitDropdown();
    await loadSelectedSet();

    updateTopUI();
    renderQuestion();
  } catch (e) {
    if (els.promptLabel) els.promptLabel.textContent = "Setup error";
    if (els.prompt) els.prompt.textContent = "—";
    if (els.smallMsg) els.smallMsg.textContent = String(e?.message || e);
    if (els.choices) els.choices.innerHTML = "";
    if (els.nextBtn) els.nextBtn.disabled = true;
  }
})();
