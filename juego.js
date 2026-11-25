import { t, message, language, setupLanguage, setLanguage, isLanguageAutoDetected, displayDie, displayBossRule, scoreText } from './idioma.js?v=esmaltes-30';
import { Table, HAND, POWER, UNIQUE, PLATE, ROLL_TIME, comboKeys } from './mesa.js?v=esmaltes-30';
import { DiceArt, tileArt, diePortrait, platePortrait, plateArt } from './arte.js?v=esmaltes-30';
import { powers, rarities, dieCount, hasFace, getDieSpec, comboCatalog } from './catalogo.js?v=esmaltes-30';
import { stageAt, campaignLength, orderAt, comboPoints, getComboValue, tileLimit, newRun, restoreRun, isFresh, canPlace, canMove, place, move, recall, chip, preview, commit, continueEndless, advance, breakUnique,
  decks, deckSample, bosses, bossAt, bossText, BOSS_EVERY, BOSS_GOLD, difficulties } from './reglas.js?v=esmaltes-30';
import { uniqueDice } from './unicos.js?v=esmaltes-30';
import { MarketUI } from './mercado.js?v=esmaltes-30';
import { collectionMarkup, syncCollectionTips, hideCollectionTip, openPlateShelf, comboUsesLabel } from './coleccion.js?v=esmaltes-30';
import { icon, hydrateIcons } from './iconos.js?v=esmaltes-30';
import { Music } from './musica.js?v=esmaltes-30';

const $ = id => document.getElementById(id);
// Runs are shared with every other edition of the web game.
const storage = 'mosaic-roll/3d-web-v2';
const progressionStorage = `${storage}/progression`;
const soundStorage = `${storage}/sound`;
const musicStorage = `${storage}/music`;
const musicVolumeStorage = `${storage}/music-volume`;
const soundVolumeStorage = `${storage}/sound-volume`;
const hapticsStorage = `${storage}/haptics`;
const speedStorage = `${storage}/animation-speed`;
const dialog = $('dialog');
const canvas = $('canvas');
const activePowers = $('active-powers');
const workshop = $('workshop');
const codex = $('codex');
const decimal = value => value.toLocaleString(language, { maximumFractionDigits: 2 });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const patterns = [
  ['Línea llena', [1, 5, 2], `+${comboPoints.line}`], ['Pareja', [2, 2], `+${comboPoints.pair}`],
  ['Trío', [3, 3, 3], `+${comboPoints.trio}`], ['Escalera', [2, 3, 4], `+${comboPoints.straight}`],
  ['Monocolor', [4, 2, 6], '+0,4×', 'mono'], ['Colores distintos', [1, 3, 6], '+0,25×', 'mixed'],
];

hydrateIcons();
setupLanguage();

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* The current game remains playable in memory. */ }
}

function restore() {
  try { return restoreRun(JSON.parse(read(storage))); } catch { return null; }
}

let run = restore();
let table, market, sound, resolution;
let playing = false;
let modal = '';
let collectionReturn = '';
let optionsReturn = '';
let muted = read(soundStorage) === 'off';
let musicOn = read(musicStorage) !== 'off';
let musicVolume = Number(read(musicVolumeStorage) ?? '0.6') || 0.6;
let sfxVolume = Number(read(soundVolumeStorage) ?? '0.8') || 0.8;
let hapticsEnabled = read(hapticsStorage) !== 'off';
let fastSpeed = read(speedStorage) === 'fast';
let music = null, musicMood = 'title', musicHalted = false;
let selected = -1, focused = -1, hovered = -1;
let tooltip = -1, tooltipPlate = -1, pinned = false;
let pointer = null, lockUntil = 0;
// Stone cell waiting for a confirming second tap on touch screens.
let armed = -1;
// Time at which the end-of-mosaic screen opens, after the celebration banner.
let pendingOutcome = 0;
let codexOpen = false;
const counters = new Map();
// Pointer travel, in pixels, after which a press is no longer treated as a tap.
const TAP_SLOP = 10;

function bump(element) {
  if (reducedMotion.matches) return;
  element.classList.remove('bump');
  void element.offsetWidth;
  element.classList.add('bump');
}

function countTo(element, value) {
  const shown = Number(element.dataset.value);
  element.dataset.value = value;
  if (!Number.isFinite(shown) || shown === value || reducedMotion.matches) {
    counters.delete(element);
    element.textContent = value;
    return;
  }
  const from = Number(element.textContent);
  counters.set(element, { from: Number.isFinite(from) ? from : shown, to: value, start: performance.now() });
  bump(element);
}

function tickCounters(now) {
  for (const [element, counter] of counters) {
    const t = Math.min(1, (now - counter.start) / 650);
    element.textContent = Math.round(counter.from + (counter.to - counter.from) * (1 - (1 - t) ** 3));
    if (t >= 1) counters.delete(element);
  }
}

function resetCounters() {
  counters.clear();
  for (const id of ['score', 'gold-count']) delete $(id).dataset.value;
}

function popup(text, cells = [], kind = '', extra = null) {
  if (reducedMotion.matches || !table?.width) return;
  const anchors = extra?.anchor ? [extra.anchor] : cells.map(cell => table.dieAnchor(cell)).filter(Boolean);
  const x = anchors.length ? anchors.reduce((sum, point) => sum + point.x, 0) / anchors.length : table.width / 2;
  const y = anchors.length ? anchors.reduce((sum, point) => sum + point.y, 0) / anchors.length - (extra?.anchor ? 12 : 0) : table.height * .42;
  const element = document.createElement('span');
  element.className = `popup ${kind}`.trim();
  element.style.left = `${Math.round(x)}px`;
  element.style.top = `${Math.round(y)}px`;
  if (extra?.fire != null) element.style.setProperty('--fire', extra.fire.toFixed(3));
  if (extra?.heat >= 1) {
    element.dataset.heat = String(extra.heat);
    const flames = document.createElement('span');
    flames.className = 'popup-flames';
    flames.setAttribute('aria-hidden', 'true');
    const tongue = (cls) => `<svg class="pf ${cls}" viewBox="0 0 32 48" preserveAspectRatio="none"><path d="M16 1C20 13 30 21 30 34C30 43 24 47 16 47C8 47 2 43 2 34C2 23 10 17 12 8C14 14 15 11 16 1Z"/></svg>`;
    flames.innerHTML = `${tongue('outer p1')}${tongue('mid p2')}${tongue('inner p3')}${tongue('mid p4')}${tongue('outer p5')}<i class="ps s1"></i><i class="ps s2"></i><i class="ps s3"></i><i class="ps s4"></i>`;
    const label = document.createElement('span');
    label.className = 'popup-num';
    label.textContent = text;
    element.append(flames, label);
  } else {
    element.textContent = text;
  }
  element.addEventListener('animationend', () => element.remove(), { once: true });
  $('popups').append(element);
}

function shake(heavy = false) {
  if (reducedMotion.matches) return;
  const world = $('world');
  world.classList.remove('shake', 'shake-big');
  void world.offsetWidth;
  world.classList.add(heavy ? 'shake-big' : 'shake');
}

function scoreHeat(points) {
  const goal = Math.max(1, run?.goal || 1);
  const ratio = points / goal;
  const fire = Math.max(0, Math.min(1, ratio / 1.15));
  const heat = ratio >= 1.25 ? 4 : ratio >= 0.85 ? 3 : ratio >= 0.5 ? 2 : ratio >= 0.25 ? 1 : 0;
  return { fire, heat };
}

function setSequenceHeat(points) {
  const seq = $('sequence');
  const { fire, heat } = scoreHeat(points);
  seq.dataset.heat = String(heat);
  seq.style.setProperty('--fire', fire.toFixed(3));
  return { fire, heat };
}

function hideSequence() {
  const seq = $('sequence');
  seq.hidden = true;
  delete seq.dataset.phase;
  delete seq.dataset.heat;
  seq.style.removeProperty('--fire');
}

const coins = value => `<span class="coins">${value}<i class="coin" aria-hidden="true"></i></span>`;
const chips = (base, multiplier, popBase = false, popMulti = false) =>
  `<span class="chip chip-base${popBase ? ' pop' : ''}">${base}</span><span class="times" aria-label="${t("por")}">×</span><span class="chip chip-mult${popMulti ? ' pop' : ''}">${decimal(multiplier)}</span>`;

// Music plays while sound is on, the music switch is on and the page is visible.
function syncMusic() {
  try {
    if (musicOn && !muted && !musicHalted && !document.hidden && window.AudioContext) {
      sound ??= new AudioContext();
      if (sound.state === 'suspended') sound.resume().catch(() => {});
      music ??= new Music(sound);
      music.setMood(musicMood);
      music.setVolume(musicVolume);
      music.start();
    } else if (!musicHalted || !musicOn || muted || document.hidden) music?.stop();
  } catch { /* The game stays playable without music. */ }
  paintMusic();
}

function paintMusic() {
  const button = $('music');
  button.setAttribute('aria-pressed', String(musicOn));
  button.querySelector('.music-state').textContent = musicOn ? t('sí') : t('no');
}

function setMusicMood(mood) {
  musicMood = mood;
  music?.setMood(mood);
}

function toggleMusic() {
  musicOn = !musicOn;
  write(musicStorage, musicOn ? 'on' : 'off');
  syncMusic();
}

function vibrate(pattern = [15]) {
  if (hapticsEnabled && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

function note(type) {
  if (muted || !window.AudioContext || sfxVolume <= 0) return;
  try {
    sound ??= new AudioContext();
    if (sound.state === 'suspended') sound.resume().catch(() => {});
    const cues = { pick: [840], place: [560, 1280], chip: [285, 153], roll: [388, 551, 434, 661],
      count: [574], color: [733, 890], score: [392, 523, 659, 784], forge: [262, 392, 523, 659, 784, 1047],
      levelUp: [523, 659, 784, 1047, 1318] };
    const speedMult = fastSpeed ? 0.75 : 1;
    const interval = (type === 'levelUp' ? .09 : type === 'forge' ? .115 : type === 'score' ? .075 : .037) * speedMult;
    cues[type].forEach((frequency, index) => {
      const time = sound.currentTime + index * interval;
      const oscillator = sound.createOscillator();
      const volume = sound.createGain();
      oscillator.type = type === 'chip' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      const targetVolume = (type === 'count' ? .024 : .059) * sfxVolume;
      volume.gain.setValueAtTime(.001, time);
      volume.gain.exponentialRampToValueAtTime(Math.max(0.0001, targetVolume), time + .008 * speedMult);
      volume.gain.exponentialRampToValueAtTime(.001, time + .18 * speedMult);
      oscillator.connect(volume).connect(sound.destination);
      oscillator.start(time);
      oscillator.stop(time + .185 * speedMult);
    });
  } catch { /* Audio can be unavailable while the game is still playable. */ }
}

const save = () => write(storage, JSON.stringify(run));
const ongoing = () => run && run.phase !== 'lost';
const ready = () => playing && !modal && !resolution && !lockUntil && run.phase === 'play';
const at = id => id >= UNIQUE && id < UNIQUE + 3 ? run.uniqueRack?.[id - UNIQUE] : id >= HAND && id < POWER ? run.hand[id - HAND] : id >= 0 && id < HAND ? run.board[id] : null;
const movable = id => isFresh(at(id));

function setCodex(open, focus = false) {
  codexOpen = open;
  codex.classList.toggle('open', open);
  codex.inert = !open;
  codex.setAttribute('aria-hidden', String(!open));
  $('codex-toggle').setAttribute('aria-expanded', String(open));
  $('play-layout').classList.toggle('codex-open', open);
  if (open && focus) codex.querySelector('h2').focus({ preventScroll: true });
}

function closeDialog() {
  market?.close();
  modal = '';
  collectionReturn = '';
  if (dialog.open) dialog.close();
  delete dialog.dataset.kind;
  workshop.hidden = true;
  $('play-layout').hidden = false;
  $('game').classList.remove('workshop-open');
}

function title() {
  musicHalted = false;
  setMusicMood('title');
  if (sound) syncMusic();
  closeDialog();
  cancelPointer();
  setCodex(false);
  playing = false;
  lockUntil = 0;
  pendingOutcome = 0;
  resolution = null;
  hideSequence();
  $('popups').replaceChildren();
  $('game').hidden = true;
  $('start').hidden = false;
  document.body.dataset.screen = 'title';
  const button = $('play');
  button.disabled = !table;
  const label = !table ? t('Cargando…') : run?.phase === 'won' ? t('Ver victoria') : ongoing() ? t('Continuar') : t('Jugar');
  $('play-label').textContent = label;
  $('play-note').textContent = !table ? '' : !ongoing() ? t('Elige tu bolsa inicial')
    : run.phase === 'shop' ? message`Zoco · tras el mosaico ${run.stage + 1}` : `${message`Mosaico ${run.stage + 1}`} · ${t(stageAt(run.stage, run.difficulty ?? 0).name)}`;
  $('new').hidden = !table || !ongoing();
  if (table) button.focus({ preventScroll: true });
}

// The stage is full-bleed with the HUD floating over it, so the camera pulls back a little
// further than the framed original to keep the dice tray and the board clear of the overlays.
function cameraZoom() {
  const aspect = innerWidth / Math.max(1, innerHeight);
  return aspect >= 1 ? (innerHeight < 700 ? 1.42 : 1.36) : aspect > .62 ? 1.12 : .88;
}

let framedZoom = 0;

function centerCamera() {
  table.reset();
  framedZoom = cameraZoom();
  table.zoomBy(framedZoom);
}

// Rotating a phone or resizing the window changes the framing the camera needs.
addEventListener('resize', () => {
  if (playing && table && framedZoom && cameraZoom() !== framedZoom) centerCamera();
});

function topCamera() {
  table.top();
  table.zoomBy(cameraZoom());
}

function clearSelection() {
  selected = focused = hovered = armed = -1;
  table.focus(-1, -1);
  showPower(-1);
  showUnique();
}

function enter(roll = []) {
  closeDialog();
  cancelPointer();
  playing = true;
  $('start').hidden = true;
  $('game').hidden = false;
  document.body.dataset.screen = 'game';
  hideSequence();
  $('popups').replaceChildren();
  window.scrollTo(0, 0);
  table.clear();
  clearSelection();
  table.resize();
  const now = performance.now();
  lockUntil = roll.length ? now + (reducedMotion.matches ? 100 : ROLL_TIME) : 0;
  pendingOutcome = 0;
  resolution = null;
  resetCounters();
  table.sync(run, now, { roll: new Set(reducedMotion.matches ? [] : roll) });
  // Framed after the sync: a new board size reconfigures the table, which resets the camera.
  centerCamera();
  render();
  table.frame(now);
  if (roll.length) note('roll');
  musicHalted = false;
  setMusicMood(bossAt(run) ? 'boss' : 'play');
  syncMusic();
  if (run.phase !== 'play') showOutcome();
  else if (bossAt(run)) popup(message`Jefe: ${t(bosses[bossAt(run).key].name)}`, [], 'banner boss');
}

const DECK_ORDER = ['classic', 'saffron', 'even', 'relics'];
const bagDifficulties = { classic: 0, saffron: 0, even: 0, relics: 0 };

function getProgression() {
  try {
    const raw = JSON.parse(read(progressionStorage));
    if (raw && typeof raw === 'object') {
      const unlocked = Array.isArray(raw.unlocked) ? raw.unlocked : ['classic'];
      if (!unlocked.includes('classic')) unlocked.unshift('classic');
      if (run?.deck && !unlocked.includes(run.deck)) unlocked.push(run.deck);
      const completed = (raw.completed && typeof raw.completed === 'object') ? raw.completed : {};
      return { unlocked, completed };
    }
  } catch {}
  const unlocked = ['classic'];
  if (run?.deck && !unlocked.includes(run.deck)) unlocked.push(run.deck);
  return { unlocked, completed: {} };
}

function saveProgression(prog) {
  write(progressionStorage, JSON.stringify(prog));
}

function recordVictory(run) {
  const prog = getProgression();
  const deck = run.deck || 'classic';
  const diff = run.difficulty ?? 0;
  let newlyUnlockedDeck = null;
  const currentIndex = DECK_ORDER.indexOf(deck);
  if (currentIndex >= 0 && currentIndex < DECK_ORDER.length - 1) {
    const nextDeck = DECK_ORDER[currentIndex + 1];
    if (!prog.unlocked.includes(nextDeck)) {
      prog.unlocked.push(nextDeck);
      newlyUnlockedDeck = nextDeck;
    }
  }
  const prevMax = prog.completed[deck] ?? -1;
  let newlyUnlockedDiff = false;
  if (diff > prevMax) {
    prog.completed[deck] = diff;
    if (diff < 5) newlyUnlockedDiff = true;
  }
  saveProgression(prog);
  return { newlyUnlockedDeck, newlyUnlockedDiff };
}

function startRun(deck, difficulty = 0) {
  closeDialog();
  run = newRun(deck, difficulty);
  save();
  enter(run.hand.filter(Boolean).map(die => die.id));
}

let selectedDeckKey = 'classic';
let selectedDiffLevel = 0;

function openDifficultyScreen(deckKey) {
  selectedDeckKey = deckKey;
  const prog = getProgression();
  const maxCompleted = prog.completed[deckKey] ?? -1;
  const maxAvailable = Math.min(5, maxCompleted + 1);
  bagDifficulties[deckKey] = Math.min(maxAvailable, Math.max(0, bagDifficulties[deckKey] ?? (maxCompleted >= 0 ? maxCompleted + 1 : 0)));
  selectedDiffLevel = bagDifficulties[deckKey];

  const deck = decks[deckKey];
  const screenBags = $('bags-screen');
  const screenDiff = $('diff-screen');
  if (!screenBags || !screenDiff) return;

  const diceContainer = $('chosen-bag-dice');
  if (diceContainer) {
    diceContainer.innerHTML = deckSample(deckKey).map(spec => `<img src="${diePortrait(spec)}" alt="">`).join('');
  }
  const nameEl = $('chosen-bag-name');
  if (nameEl) nameEl.textContent = t(deck.name);
  const descEl = $('chosen-bag-desc');
  if (descEl) descEl.textContent = t(deck.text);

  renderDiffStepper(selectedDiffLevel, maxAvailable, maxCompleted);
  updateDifficultyDetails(selectedDiffLevel, maxAvailable);

  screenBags.hidden = true;
  screenDiff.hidden = false;
  $('diff-play-btn')?.focus({ preventScroll: true });
}

function renderDiffStepper(selectedLevel, maxAvailable, maxCompleted) {
  const dotsBar = $('diff-dots-bar');
  if (dotsBar) {
    dotsBar.innerHTML = [0, 1, 2, 3, 4, 5].map(lvl => {
      const isUnlocked = lvl <= maxAvailable;
      const isSelected = lvl === selectedLevel;
      const isCleared = lvl <= maxCompleted;
      const diffDef = difficulties[lvl];
      const displayNum = lvl + 1;
      let statusClass = 'unlocked';
      if (!isUnlocked) statusClass = 'locked';
      else if (isCleared) statusClass = 'cleared';

      const glyph = !isUnlocked
        ? `<span class="dot-glyph">${icon('lock')}</span>`
        : isCleared
          ? `<span class="dot-glyph">${icon('check')}</span>`
          : '';

      return `<button type="button" class="diff-dot diff-dot-${lvl} ${statusClass}${isSelected ? ' active' : ''}" data-action="pick-diff" data-level="${lvl}" ${!isUnlocked ? 'disabled' : ''} aria-label="${message`Nivel ${displayNum}`} · ${t(diffDef.name)}" title="${message`Nivel ${displayNum}`} · ${t(diffDef.name)}">
        <span class="dot-num">${displayNum}</span>
        ${glyph}
      </button>`;
    }).join('');
  }

  const prevBtn = $('diff-prev-btn');
  if (prevBtn) prevBtn.disabled = selectedLevel <= 0;
  const nextBtn = $('diff-next-btn');
  if (nextBtn) nextBtn.disabled = selectedLevel >= maxAvailable;
}

function updateDifficultyDetails(level, maxAvailable) {
  selectedDiffLevel = level;
  bagDifficulties[selectedDeckKey] = level;
  const diffDef = difficulties[level] || difficulties[0];
  const displayNum = level + 1;

  const dotsBar = $('diff-dots-bar');
  if (dotsBar) {
    for (const btn of dotsBar.querySelectorAll('[data-action="pick-diff"]')) {
      const btnLvl = Number(btn.dataset.level);
      btn.classList.toggle('active', btnLvl === level);
    }
  }

  const prevBtn = $('diff-prev-btn');
  if (prevBtn) prevBtn.disabled = level <= 0;
  const nextBtn = $('diff-next-btn');
  if (nextBtn) nextBtn.disabled = level >= maxAvailable;

  const stepNumEl = $('diff-stepper-num');
  if (stepNumEl) stepNumEl.textContent = message`Nivel ${displayNum} de 6`;
  const stepNameEl = $('diff-stepper-name');
  if (stepNameEl) stepNameEl.textContent = `${t(diffDef.name)} · ${t(diffDef.title)}`;

  const badgeEl = $('diff-card-badge');
  if (badgeEl) {
    badgeEl.textContent = message`Nivel ${displayNum}`;
    badgeEl.className = `diff-card-badge diff-badge-${level}`;
  }
  const titleEl = $('diff-card-title');
  if (titleEl) titleEl.textContent = `${t(diffDef.name)} · ${t(diffDef.title)}`;
  const summaryEl = $('diff-card-summary');
  if (summaryEl) summaryEl.textContent = t(diffDef.text);

  const rulesList = $('diff-rules-list');
  if (rulesList) {
    const rules = [
      { text: t('Reglas estándar del alfarero: metas base de 55 a 350 puntos.'), lvl: 0 },
      { text: t('Metas de puntuación +20% en cada mosaico.'), lvl: 1 },
      { text: t('Economía austera: oro base del zoco y de jefes a la mitad; turnos sobrantes no pagan sin Paciencia.'), lvl: 2 },
      { text: t('Horno de pago: cocer una mejora cuesta 6 de oro (el horno es saltable).'), lvl: 3 },
      { text: t('Metas de puntuación aumentan otro +20% acumulativo (+44% sobre base).'), lvl: 4 },
      { text: t('El Juicio del Sultán: empiezas con solo 1 cincel por mosaico (-1) y los jefes exigen +15% de puntos adicional.'), lvl: 5 }
    ];
    rulesList.innerHTML = rules.map(r => {
      const isActive = r.lvl <= level;
      return `<li class="diff-rule-item${isActive ? ' rule-active' : ' rule-inactive'}">
        <span class="rule-bullet">${isActive ? icon('check') : '•'}</span>
        <span class="rule-text">${r.text}</span>
      </li>`;
    }).join('');
  }

  const playBtn = $('diff-play-btn');
  const playLabel = $('diff-play-label');
  if (playLabel) {
    playLabel.textContent = message`Comenzar partida · Niv. ${displayNum}`;
  }
  if (playBtn) {
    playBtn.dataset.bag = selectedDeckKey;
    playBtn.dataset.level = String(level);
  }
}

function openBagScreen() {
  const screenBags = $('bags-screen');
  const screenDiff = $('diff-screen');
  if (screenBags && screenDiff) {
    screenDiff.hidden = true;
    screenBags.hidden = false;
    screenBags.querySelector(`.bag-card[data-bag="${selectedDeckKey}"]`)?.focus({ preventScroll: true });
  }
}

// New runs begin by choosing a starting bag, like the decks of a deck-builder.
function chooseBag() {
  const prog = getProgression();
  const cards = DECK_ORDER.map((key, index) => {
    const deck = decks[key];
    const isUnlocked = prog.unlocked.includes(key);
    if (!isUnlocked) {
      const prevKey = DECK_ORDER[index - 1] ?? 'classic';
      const prevName = decks[prevKey]?.name ?? '';
      return `<div class="bag-card locked" tabindex="-1">
        <div class="bag-lock">${icon('lock')}</div>
        <strong class="bag-name">${t(deck.name)}</strong>
        <span class="bag-lock-text">${message`Supera la campaña con la ${t(prevName)} para desbloquear.`}</span>
      </div>`;
    }
    const maxCompleted = prog.completed[key] ?? -1;
    const completedBadge = maxCompleted >= 0 ? `<span class="bag-cleared-tag">${icon('crown')}${message`Niv. ${maxCompleted + 1} superado`}</span>` : '';
    return `<button class="bag-card unlocked" type="button" data-action="pick-bag" data-bag="${key}">
      <span class="bag-dice" aria-hidden="true">${deckSample(key).map(spec => `<img src="${diePortrait(spec)}" alt="">`).join('')}</span>
      <strong class="bag-name">${t(deck.name)}</strong>
      <span class="bag-text">${t(deck.text)}</span>
      ${completedBadge}
      <span class="bag-cta"><span>${t('Elegir bolsa')}</span>${icon('arrow')}</span>
    </button>`;
  }).join('');

  showDialog('bags', `<div class="book bags" id="bags-modal-container">
    <!-- Pantalla 1: Selección de Bolsa -->
    <div class="bags-screen" id="bags-screen">
      <header class="book-head">
        <div class="book-heading">
          <span class="book-kicker">${message`Paso 1 de 2 · Nueva partida`}</span>
          <h2 id="dialog-title">${t('Elige tu bolsa')}</h2>
        </div>
        <button class="btn btn-quiet btn-small" type="button" data-action="back">${icon('close')}${t('Cancelar')}</button>
      </header>
      <div class="bag-grid">${cards}</div>
      <p class="bag-foot">${icon('crown')}${message`Cada ${BOSS_EVERY} mosaicos te espera un jefe con una regla especial. Vencerlo da ${BOSS_GOLD} de oro extra.`}</p>
    </div>

    <!-- Pantalla 2: Selección de Dificultad (oculta de inicio) -->
    <div class="diff-screen" id="diff-screen" hidden>
      <header class="book-head">
        <div class="book-heading">
          <span class="book-kicker">${message`Paso 2 de 2 · Preparación`}</span>
          <h2>${t('Elige la dificultad')}</h2>
        </div>
        <button class="btn btn-quiet btn-small" type="button" data-action="back">${icon('close')}<span>${t('Cancelar')}</span></button>
      </header>
      <div class="diff-body">
        <div class="chosen-bag-card">
          <span class="chosen-bag-dice" id="chosen-bag-dice" aria-hidden="true"></span>
          <div class="chosen-bag-info">
            <span class="chosen-bag-tag">${t('Bolsa seleccionada')}</span>
            <strong class="chosen-bag-name" id="chosen-bag-name"></strong>
            <p class="chosen-bag-desc" id="chosen-bag-desc"></p>
          </div>
          <button class="btn btn-quiet btn-small chosen-bag-change" type="button" data-action="back-to-bags">
            ${icon('undo')}<span>${t('Cambiar')}</span>
          </button>
        </div>

        <div class="diff-stepper-wrap">
          <button type="button" class="diff-arrow diff-arrow-prev" id="diff-prev-btn" data-action="diff-prev" aria-label="${t('Dificultad anterior')}">
            ${icon('arrow-left')}
          </button>
          <div class="diff-stepper-center">
            <div class="diff-stepper-kicker">
              <span class="diff-stepper-num" id="diff-stepper-num">Nivel 1 de 6</span>
              <strong class="diff-stepper-name" id="diff-stepper-name"></strong>
            </div>
            <div class="diff-dots-bar" id="diff-dots-bar" role="tablist" aria-label="${t('Niveles de dificultad')}"></div>
          </div>
          <button type="button" class="diff-arrow diff-arrow-next" id="diff-next-btn" data-action="diff-next" aria-label="${t('Dificultad siguiente')}">
            ${icon('arrow')}
          </button>
        </div>

        <div class="diff-card" id="diff-card">
          <div class="diff-card-head">
            <span class="diff-card-badge" id="diff-card-badge">Nivel 1</span>
            <h3 class="diff-card-title" id="diff-card-title"></h3>
          </div>
          <p class="diff-card-summary" id="diff-card-summary"></p>
          <div class="diff-rules-section">
            <span class="diff-rules-label">${t('Reglas activas en este nivel:')}</span>
            <ul class="diff-rules-list" id="diff-rules-list"></ul>
          </div>
        </div>

        <div class="diff-footer">
          <button type="button" class="btn btn-gold btn-big diff-play-btn" id="diff-play-btn" data-action="start-with-diff">
            ${icon('play')}<span id="diff-play-label">${t('Comenzar partida')}</span>
          </button>
        </div>
      </div>
    </div>
  </div>`);

  dialog.querySelector('.bag-card.unlocked')?.focus({ preventScroll: true });
}

function nextMosaic() {
  const rolled = advance(run);
  save();
  enter(rolled);
}

function render() {
  const stage = stageAt(run.stage, run.difficulty ?? 0);
  const score = resolution?.score ?? preview(run);
  const points = resolution ? run.points - score.total : run.points;
  const dimensions = run.cols === 4 ? `${run.cols} × ${run.rows}` : `${run.rows} × ${run.cols}`;
  const progress = run.endless ? message`Modo libre · Mosaico ${run.stage + 1}` : message`Mosaico ${run.stage + 1}/${campaignLength}`;
  const boss = bossAt(run);
  const finalBoss = boss && !run.endless && run.stage === campaignLength - 1;
  const diffBadge = ` · Niv. ${(run.difficulty ?? 0) + 1}`;
  $('stage-label').textContent = `${boss ? (finalBoss ? `${t('Jefe final')} · ` : `${t('Jefe')} · `) : ''}${progress} · ${dimensions}${diffBadge}`;
  $('stage-name').textContent = t(boss ? bosses[boss.key].name : stage.name);
  $('crown').classList.toggle('boss-stage', Boolean(boss));
  $('boss').hidden = !boss;
  if (boss) $('boss-rule').textContent = displayBossRule(boss, bossText);
  countTo($('score'), points);
  $('goal').textContent = `/ ${run.goal}`;
  const projected = points + (resolution ? 0 : score.total);
  const ring = $('progress');
  ring.setAttribute('aria-valuemax', run.goal);
  ring.setAttribute('aria-valuenow', Math.min(run.goal, points));
  ring.setAttribute('aria-valuetext', score.count && !resolution
    ? message`${points} de ${run.goal} puntos (+${score.total} en esta jugada)`
    : message`${points} de ${run.goal} puntos`);
  $('medallion').style.setProperty('--p', Math.min(1, points / run.goal).toFixed(4));
  $('medallion').style.setProperty('--p-next', Math.min(1, projected / run.goal).toFixed(4));
  $('medallion').classList.toggle('reached', points >= run.goal);
  $('medallion').classList.toggle('will-reach', points < run.goal && projected >= run.goal);
  $('turns').setAttribute('aria-label', message`${run.turns} de ${run.maxTurns} turnos`);
  $('turns').innerHTML = Array.from({ length: run.maxTurns }, (_, index) => `<i class="pip${index >= run.turns ? ' spent' : ''}"></i>`).join('');
  $('chisel-count').textContent = `×${run.chisels}`;
  $('chisel-glyph').classList.toggle('empty', !run.chisels);
  // Gold earned by a play is revealed when its scoring sequence ends.
  countTo($('gold-count'), resolution ? resolution.gold : run.gold);
  $('bag-count').textContent = dieCount(run);
  $('sound').setAttribute('aria-pressed', String(!muted));
  $('sound').innerHTML = icon(muted ? 'mute' : 'sound');
  const pList = [
    { key: 'line', name: 'Línea llena', faces: [1, 5, 2] },
    { key: 'pair', name: 'Pareja', faces: [2, 2] },
    { key: 'trio', name: 'Trío', faces: [3, 3, 3] },
    ...(run.cols === 4 ? [{ key: 'quartet', name: 'Cuarteto', faces: [4, 4, 4, 4] }] : []),
    { key: 'straight', name: 'Escalera', faces: [2, 3, 4] },
    ...(run.cols === 4 ? [{ key: 'longStraight', name: 'Escalera larga', faces: [1, 2, 3, 4] }] : []),
    { key: 'mono', name: 'Monocolor', faces: [4, 2, 6], color: 'mono' },
    { key: 'chromatic', name: 'Colores distintos', faces: [1, 3, 6], color: 'mixed' },
    { key: 'panel', name: 'Panel completo', glyph: '<span class="panel-glyph"></span>' },
  ];
  const active = new Map();
  for (const step of [...score.numberSteps, ...score.colorSteps]) active.set(step.name, (active.get(step.name) ?? 0) + 1);
  let lit = 0;
  const row = item => {
    const count = active.get(item.name) ?? 0;
    if (count) lit++;
    const classes = [item.color && 'color-pattern', count && 'active'].filter(Boolean).join(' ');
    const glyphs = item.glyph ?? item.faces.map(face => `<i>${face}</i>`).join('');
    const lvl = run?.comboLevels?.[item.key] ?? 1;
    const uses = run?.comboCounts?.[item.key] ?? 0;
    const val = (item.key === 'mono' || item.key === 'chromatic')
      ? `+${decimal(getComboValue(run, item.key) / 100)}×`
      : `+${getComboValue(run, item.key)}`;
    const lvlTag = lvl > 1 ? ` <span class="combo-lvl-tag">N.${lvl}</span>` : '';
    const usesTag = ` <span class="combo-uses-tag">${comboUsesLabel(uses)}</span>`;
    return `<li${classes ? ` class="${classes}"` : ''}><span class="glyphs ${item.color || ''}" aria-hidden="true">${glyphs}</span>
      <span class="pattern-name">${t(item.name)}${lvlTag}${usesTag}${count > 1 ? ` <em>×${count}</em>` : ''}${count ? `<span class="sr-only"> ${t('(activa)')}</span>` : ''}</span><strong>${language === 'en' ? val.replace(',', '.') : val}</strong></li>`;
  };
  $('patterns').innerHTML = pList.map(row).join('');
  $('codex-count').textContent = lit || '';
  $('codex-count').hidden = !lit;
  $('codex-toggle').setAttribute('aria-label', lit ? message`Códice: ${lit} ${lit === 1 ? t('combinación activa') : t('combinaciones activas')}` : t('Códice de combinaciones y azulejos'));
  const total = `+${score.total}`;
  if ($('preview').textContent !== total) {
    $('preview').textContent = total;
    if (!resolution && score.count) bump($('preview'));
  }
  $('breakdown').innerHTML = score.count ? `${chips(score.base, score.multiplier)}${score.gold ? `<span class="gold-note">+${coins(score.gold)}</span>` : ''}`
    : t('Coloca un dado para ver sus puntos.');
  $('placed').innerHTML = Array.from({ length: 4 }, (_, index) => `<i class="slot${index < score.count ? ' filled' : ''}"></i>`).join('') +
    `<span class="sr-only">${message`${score.count}/4 dados colocados`}</span>`;
  $('tally').classList.toggle('has-play', score.count > 0);
  const order = orderAt(run.stage);
  $('order').hidden = !order;
  if (order) {
    const done = run.orders.includes(order.key);
    $('order').classList.toggle('fulfilled', done);
    $('order-label').textContent = t(order.label);
    $('order-reward').innerHTML = `${done ? icon('check') : ''}+${coins(order.gold)}<span class="sr-only"> ${t('de oro')}${done ? t(', cumplido') : ''}</span>`;
  }
  $('play-layout').classList.toggle('scoring', Boolean(resolution));
  $('equipped-count').textContent = `${run.powers.length}/${tileLimit}`;
  const equipped = run.powers.join('/');
  if (activePowers.dataset.equipped !== equipped) {
    activePowers.dataset.equipped = equipped;
    activePowers.innerHTML = run.powers.map(key => {
      const power = powers[key], rarity = rarities[power.rarity];
      return `<li class="tile-entry" style="--rarity:${rarity.color}"><img src="${tileArt(key).url}" alt=""><div><strong>${t(power.name)}</strong><small>${t(rarity.name)}</small><p>${t(power.text)}</p></div></li>`;
    }).join('') + '<li class="tile-empty" aria-hidden="true"></li>'.repeat(Math.max(0, tileLimit - run.powers.length)) +
      (run.powers.length ? '' : `<li class="sr-only">${t("Todavía no tienes azulejos equipados.")}</li>`);
  }
  const scorable = ready() && score.count > 0;
  $('confirm').disabled = !scorable;
  $('confirm').setAttribute('aria-label', message`Puntuar la jugada, ${total} puntos`);
  $('pause').disabled = Boolean(resolution);
  $('collection-button').disabled = Boolean(resolution);
  $('recall').hidden = !ready() || selected < 0 || selected >= HAND || !isFresh(run.board[selected]);
  $('hint').textContent = hint(score.count);
  table.mount(run.powers, run.comboLevels);
  table.marks(score.matches, score.powerMarks, [...score.numberSteps, ...score.colorSteps]);
  updateFocus();
  showUnique();
}

function hint(count) {
  if (resolution) return t('Sumando la jugada…');
  if (lockUntil && run.phase === 'play') return t('Reponiendo los dados jugados…');
  if (armed >= 0 && run.board[armed]?.stone) return message`Toca otra vez la piedra para cincelarla · ${run.chisels === 1 ? t('queda 1 carga') : message`quedan ${run.chisels} cargas`}.`;
  if (movable(selected)) {
    const die = at(selected), spec = getDieSpec(run, die);
    if (!spec) return '';
    const multText = spec.boostMult === 4 ? '×4' : '×2';
    const value = [die.value, hasFace(spec.boost, die.face) && multText, hasFace(spec.wild, die.face) && '★'].filter(Boolean).join(' ');
    const origin = (selected >= HAND || selected >= UNIQUE) ? t('Elige una casilla para colocarlo o sustituir otro.') : t('Recolócalo o devuélvelo a la bandeja.');
    return `${displayDie(spec)} · ${value}. ${origin}`;
  }
  if (hovered >= 0 && hovered < HAND && run.board[hovered]?.stone) return run.chisels ? t('Pulsa la piedra para cincelarla.') : t('Has agotado las cargas del cincel.');
  if (run.board.every(Boolean) && !count && run.chisels) return t('Tablero lleno. Pulsa una piedra para liberar una casilla.');
  if (count >= 4 || run.board.every(Boolean)) return t('Puntúa la jugada o recoloca un dado.');
  if (count) return t('Arrastra para recolocar un dado o puntúa la jugada.');
  return t('Arrastra un dado o toca el dado y la casilla.');
}

function canTarget(cell) {
  if (selected >= UNIQUE) return canPlace(run, selected - UNIQUE, cell, true);
  return selected >= HAND ? canPlace(run, selected - HAND, cell) : canMove(run, selected, cell);
}

function updateFocus() {
  const cell = hovered >= 0 && hovered < HAND && (canTarget(hovered) || run.board[hovered]?.stone && run.chisels) ? hovered : focused;
  table.focus(selected, cell);
}

function select(id, force = false) {
  if (!ready() || !movable(id)) return;
  armed = -1;
  selected = selected === id && !force ? -1 : id;
  note('pick');
  render();
}

function applyCell(cell, direct = true) {
  if (!ready() || cell < 0 || cell >= run.board.length) return false;
  const now = performance.now();
  armed = -1;
  if (direct && run.board[cell]?.stone) {
    const drawn = chip(run, cell);
    if (!drawn) return false;
    note('chip');
    vibrate([15]);
    popup(t('¡Crac!'), [cell], 'mult');
    if (drawn.length && !reducedMotion.matches) lockUntil = now + ROLL_TIME;
    table.sync(run, now, { roll: new Set(reducedMotion.matches ? [] : drawn), dissolve: true });
  } else {
    const placed = selected >= UNIQUE ? place(run, selected - UNIQUE, cell, true)
      : selected >= HAND ? place(run, selected - HAND, cell)
      : move(run, selected, cell);
    if (!placed) return false;
    selected = -1;
    note('place');
    vibrate([15]);
    table.sync(run, now);
  }
  save();
  render();
  return true;
}

function returnDie() {
  if (!ready() || selected < 0 || selected >= HAND || !recall(run, selected)) return false;
  selected = -1;
  vibrate([10]);
  table.sync(run, performance.now());
  save();
  render();
  return true;
}

// Tooltip for the power tiles standing on the 3D shelf behind the board.
function showPower(index, pin = false) {
  const element = $('power-tooltip');
  const key = run?.powers[index];
  tooltip = key ? index : -1;
  pinned = Boolean(key && pin);
  element.hidden = !key;
  if (!key) return;
  tooltipPlate = -1;
  const power = powers[key], rarity = rarities[power.rarity];
  element.style.setProperty('--rarity', rarity.color);
  element.innerHTML = `<small class="tooltip-kicker">${t(rarity.name)}</small><strong>${t(power.name)}</strong><span>${t(power.text)}</span>`;
  positionPower();
}

function showPlate(index, pin = false) {
  const element = $('power-tooltip');
  const key = comboKeys[index];
  if (key == null) {
    tooltipPlate = -1;
    if (tooltip < 0) element.hidden = true;
    return;
  }
  tooltip = -1;
  tooltipPlate = index;
  pinned = Boolean(pin);
  element.hidden = false;
  const combo = comboCatalog[key];
  const level = run?.comboLevels?.[key] || 1;
  const uses = run?.comboCounts?.[key] || 0;
  const portraitUrl = plateArt(key, level).url;
  const val = (key === 'mono' || key === 'chromatic')
    ? `+${decimal(getComboValue(run, key) / 100)}×`
    : `+${getComboValue(run, key)}`;
  element.style.setProperty('--rarity', '#ffd779');
  element.innerHTML = `<div style="display:flex;align-items:center;gap:12px;">
    <img src="${portraitUrl}" style="width:46px;height:46px;border-radius:50%;border:1px solid #d4af37;flex-shrink:0;" alt="">
    <div style="min-width:0;">
      <small class="tooltip-kicker">${t('Plato de maestría')} · ${message`Niv. ${level}`} · ${comboUsesLabel(uses)}</small>
      <strong style="display:block;margin:1px 0 3px;">${t(combo.name)}</strong>
      <span>${val} · ${t(combo.text(level))}</span>
    </div>
  </div>`;
  positionPower();
}

function openPlatesList() {
  if (!run || modal) return;
  showPower(-1);
  showPlate(-1);
  modal = 'plates';
  const score = preview(run);
  const activeCombos = new Map();
  for (const step of [...score.numberSteps, ...score.colorSteps]) {
    if (!step?.combo) continue;
    const cur = activeCombos.get(step.combo) || { count: 0, points: 0, add: 0 };
    cur.count++;
    cur.points += step.points || 0;
    cur.add += step.add || 0;
    activeCombos.set(step.combo, cur);
  }
  openPlateShelf(run, {
    host: $('play-layout') || document.body,
    activeCombos,
    onClose: () => {
      if (modal === 'plates') modal = null;
    },
  });
}

function positionPower() {
  if (tooltip >= 0) positionTooltip($('power-tooltip'), table.powerAnchor(tooltip));
  else if (tooltipPlate >= 0) positionTooltip($('power-tooltip'), table.plateAnchor(tooltipPlate));
  if (!$('die-tooltip').hidden) positionTooltip($('die-tooltip'), table.dieAnchor(selected));
}

function showUnique() {
  const element = $('die-tooltip');
  const die = selected >= 0 ? at(selected) : null;
  const spec = die ? getDieSpec(run, die) : null;
  const power = spec?.unique ? uniqueDice[spec.unique] : null;
  element.hidden = !power;
  canvas.setAttribute('aria-describedby', power ? 'hint die-tooltip' : 'hint');
  if (power) {
    element.innerHTML = `<small class="tooltip-kicker">${t('Dado único')} · ${power.mark}</small><strong>${t(power.name)}</strong><span>${t(power.text)}</span>`;
    positionPower();
  }
}

function positionTooltip(element, anchor) {
  if (!anchor) return;
  const x = Math.max(5, Math.min(table.width - element.offsetWidth - 5, anchor.x - element.offsetWidth / 2));
  const above = anchor.y - element.offsetHeight - 17;
  // The crown floats over the top of the stage, so a tooltip that would reach it opens below its anchor.
  const ceiling = Math.max(4, $('crown').getBoundingClientRect().bottom + 6);
  const y = Math.max(4, Math.min(table.height - element.offsetHeight - 4, above >= ceiling ? above : anchor.y + 19));
  element.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
}

function scoreTurn() {
  if (!ready()) return;
  const gold = run.gold;
  const score = commit(run);
  if (!score) return;
  vibrate([25, 35, 25]);
  clearSelection();
  save();
  const speedMult = fastSpeed ? 0.6 : 1;
  resolution = { score, gold, at: 0, next: performance.now(), base: 0, multi: 1, steps: [
    ...score.dieSteps.map(step => ({ ...step, phase: 'Dados', time: Math.round(330 * speedMult) })),
    ...score.numberSteps.map(step => ({ ...step, phase: 'Combos numéricos', time: Math.round(550 * speedMult) })),
    ...score.colorSteps.map(step => ({ ...step, phase: 'Multiplicador', time: Math.round(550 * speedMult) })),
    { name: 'Total de la jugada', phase: 'Total', time: Math.round(1000 * speedMult), cells: [] },
    ...(score.order ? [{ name: score.order.label, phase: 'Encargo cumplido', reward: score.order.gold, time: Math.round(1050 * speedMult), cells: [] }] : []),
  ] };
  $('sequence').hidden = false;
  setSequenceHeat(0);
  $('sequence-phase').textContent = t('Dados');
  $('sequence-value').innerHTML = chips(0, 1);
  $('sequence-detail').textContent = '';
  render();
}

function scoringFrame(now) {
  if (!resolution || now < resolution.next) return;
  const step = resolution.steps[resolution.at++];
  if (!step) { finishScore(now); return; }
  if (step.points) resolution.base += step.points;
  if (step.add) resolution.multi += step.add / 100;
  if (step.factor) resolution.multi *= step.factor;
  const projected = step.phase === 'Total' || step.reward ? resolution.score.total : Math.round(resolution.base * resolution.multi);
  const { fire, heat } = setSequenceHeat(projected);
  $('sequence-phase').textContent = t(step.phase);
  $('sequence').dataset.phase = step.reward ? 'reward' : step.phase === 'Total' ? 'total' : step.phase === 'Multiplicador' ? 'color' : 'number';
  $('sequence-value').innerHTML = step.reward ? `<span class="sequence-total gold">+${coins(step.reward)}</span>`
    : step.phase === 'Total' ? `<span class="sequence-total">+${resolution.score.total}</span>`
    : chips(resolution.base, resolution.multi, Boolean(step.points), Boolean(step.add || step.factor));
  const bonus = step.points ? ` · +${step.points}` : step.add ? ` · +${decimal(step.add / 100)}×` : step.factor ? ` · ×${decimal(step.factor)}` : '';
  $('sequence-detail').textContent = step.phase === 'Total' ? `${resolution.score.base} × ${decimal(resolution.score.multiplier)}`
    : step.reward ? t(step.name) : `${scoreText(step.name)}${bonus}`;
  table.lightCells(step.cells);
  table.pulsePlate(step.combo ?? null);
  const platePoint = step.combo ? table.plateAnchor(comboKeys.indexOf(step.combo)) : null;
  if (platePoint && step.points) popup(`+${step.points}`, [], '', { anchor: platePoint });
  else if (platePoint && step.add) popup(`+${decimal(step.add / 100)}×`, [], 'mult', { anchor: platePoint });
  else if (step.reward) popup(message`+${step.reward} oro`, [], 'gold');
  else if (step.phase === 'Total') { popup(`+${resolution.score.total}`, [], 'total', { heat, fire }); shake(heat >= 3); }
  if (!reducedMotion.matches || step.phase === 'Total') note(step.phase === 'Total' ? 'score' : step.phase === 'Multiplicador' ? 'color' : 'count');
  resolution.next = now + step.time;
}

function finishScore(now = performance.now()) {
  if (!resolution) return;
  const rolled = resolution.score.drawn;
  resolution = null;
  hideSequence();
  table.lightCells([]);
  table.pulsePlate(null);
  const animate = rolled.length > 0 && !reducedMotion.matches;
  lockUntil = animate ? now + ROLL_TIME : 0;
  table.sync(run, now, { roll: new Set(animate ? rolled : []) });
  if (animate) note('roll');
  render();
  if (run.phase === 'play') return;
  // Let the final board and the banner breathe before opening the next screen.
  if (run.phase === 'lost') popup(run.board.every(Boolean) && run.turns ? t('¡Tablero bloqueado!') : t('¡Sin turnos!'), [], 'banner defeat');
  else popup(run.phase === 'won' ? t('¡Campaña completada!') : t('¡Mosaico completado!'), [], 'banner');
  pendingOutcome = now + (reducedMotion.matches ? 300 : 1500);
}

// Every small dialog is an arched window: a crown with emblem and title, then a body.
function windowMarkup({ title: heading, eyebrow = '', emblem = 'star', body = '', actions = '' }) {
  return `<div class="window"><div class="window-crown"><span class="emblem emblem-${emblem}" aria-hidden="true">${icon(emblem === 'moon' ? 'moon' : 'star-fill')}</span>
    <h2 id="dialog-title">${heading}</h2>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}</div>
    ${body ? `<div class="window-body">${body}</div>` : ''}${actions ? `<div class="window-actions">${actions}</div>` : ''}</div>`;
}

const action = (name, label, glyph = '', kind = 'quiet') =>
  `<button class="btn btn-${kind}${kind === 'gold' ? ' btn-big' : ''}" type="button" data-action="${name}">${glyph ? icon(glyph) : ''}${label}</button>`;

function showDialog(mode, content, tone = '') {
  cancelPointer();
  modal = mode;
  dialog.dataset.tone = tone;
  dialog.dataset.kind = mode;
  dialog.innerHTML = content;
  if (!dialog.open) dialog.showModal();
}

function showCollection(catalogOnly = false) {
  if (resolution) return;
  collectionReturn = modal;
  showDialog('collection', collectionMarkup(catalogOnly ? null : run));
  syncCollectionTips(dialog);
  dialog.scrollTop = 0;
  const body = dialog.querySelector('.book-body');
  if (body) body.scrollTop = 0;
}

function closeCollection() {
  hideCollectionTip();
  modal = collectionReturn;
  collectionReturn = '';
  if (modal === 'outcome') {
    showOutcome();
    dialog.querySelector('[data-action]').focus({ preventScroll: true });
  } else {
    dialog.close();
    delete dialog.dataset.kind;
  }
}

function showWorkshop(mode, content) {
  cancelPointer();
  setCodex(false);
  modal = mode;
  $('play-layout').hidden = true;
  $('game').classList.add('workshop-open');
  document.body.dataset.screen = 'workshop';
  setMusicMood('shop');
  workshop.innerHTML = content;
  workshop.hidden = false;
  workshop.querySelector('h2').focus({ preventScroll: true });
}

function help() {
  showDialog('help', windowMarkup({ title: t('Cómo jugar'), eyebrow: message`${campaignLength} mosaicos · hasta 4 × 4`, emblem: 'moon',
    body: `<p class="lede">${message`Supera ${campaignLength} mosaicos alcanzando su meta de puntos antes de quedarte sin turnos. Al ganar puedes seguir en modo libre.`}</p>
    <ol class="precepts">
      <li><strong>${t("Coloca.")}</strong> ${t("Arrastra dados de la bandeja al tablero, o toca un dado y luego una casilla. Puedes recolocarlos antes de puntuar.")}</li>
      <li><strong>${t("Puntúa.")}</strong> ${message`Los números dan puntos base (parejas, tríos, escaleras, líneas llenas) y los colores multiplican (monocolor o todos distintos). El panel lleno suma ${comboPoints.panel}.`}</li>
      <li><strong>${t("Cincela.")}</strong> ${t("Los dados puntuados se vuelven piedra. Toca una piedra para romperla y liberar la casilla; su número sigue contando mientras esté en la mesa.")}</li>
      <li><strong>${t("Encargos.")}</strong> ${t("Cada tres mosaicos hay un encargo opcional que paga oro una vez.")}</li>
      <li><strong>${t("Zoco y horno.")}</strong> ${message`Tras cada mosaico compras dados, equipas hasta ${tileLimit} azulejos de poder y usas el horno una vez para mejorar un dado.`}</li>
      <li><strong>${t("Bolsa inicial.")}</strong> ${t("Cada partida empieza eligiendo una bolsa de dados distinta.")}</li>
      <li><strong>${t("Jefes.")}</strong> ${message`Cada ${BOSS_EVERY} mosaicos llega un jefe con una regla especial. El zoco te avisa antes y vencerlo da ${BOSS_GOLD} de oro extra.`}</li>
      <li><strong>${t("Dados únicos.")}</strong> ${t("Cuentan como cualquier color. Selecciónalos para leer su poder.")}</li>
    </ol>
    <p class="keys"><kbd>1–4</kbd> ${t("elige dado ·")} <kbd>${t("flechas")}</kbd> ${language === "en" ? "and" : language === "ca" ? "i" : language === "fr" ? "et" : "e"} <kbd>${t("Intro")}</kbd> ${t("colocan ·")} <kbd>${t("Espacio")}</kbd> ${t("puntúa ·")} <kbd>${t("Retroceso")}</kbd> ${t("retira ·")} <kbd>V</kbd> ${t("cenital ·")} <kbd>R</kbd> ${t("centra ·")} <kbd>Esc</kbd> ${t("pausa")}</p>`,
    actions: action('back', t('¡Entendido!'), 'check', 'gold') }));
}

function pause() {
  if (!playing || modal || resolution || pendingOutcome) return;
  const diffName = ` · ${t(difficulties[run.difficulty ?? 0].name)} (Niv. ${(run.difficulty ?? 0) + 1})`;
  showDialog('pause', windowMarkup({ title: t('Pausa'), eyebrow: `${message`Mosaico ${run.stage + 1}`} · ${t(stageAt(run.stage, run.difficulty ?? 0).name)}${diffName}`, emblem: 'moon',
    actions: action('back', t('Continuar'), 'play', 'gold') +
      action('options', t('Ajustes'), 'settings') +
      action('help', t('Cómo jugar'), 'help') +
      action('music', message`Música: ${musicOn ? t('sí') : t('no')}`, musicOn ? 'music' : 'music-off') +
      (document.fullscreenEnabled ? action('fullscreen', t('Pantalla completa'), 'expand') : '') +
      action('title', t('Volver al patio'), 'door') }));
}

function showOptions() {
  if (resolution) return;
  optionsReturn = modal;
  showDialog('options', optionsMarkup());
  bindOptionsEvents();
}

function closeOptions() {
  const previous = optionsReturn;
  optionsReturn = '';
  modal = '';
  if (previous === 'pause') {
    pause();
  } else if (previous === 'outcome') {
    showOutcome();
    dialog.querySelector('[data-action]')?.focus({ preventScroll: true });
  } else {
    dialog.close();
    delete dialog.dataset.kind;
  }
  if (playing && !modal) render();
}

function optionsMarkup() {
  return `
    <div class="window window-options">
      <div class="window-crown">
        <span class="emblem emblem-moon" aria-hidden="true">${icon('settings')}</span>
        <h2 id="dialog-title">${t('Ajustes')}</h2>
        <p class="eyebrow">${t('Bescuit: Dau i Forn')}</p>
      </div>
      <div class="window-body options-body">
        
        <!-- Idioma / Language / Langue -->
        <section class="opt-group">
          <h3 class="opt-heading">${icon('codex')} ${t('Idioma')}</h3>
          <div class="opt-lang-picker" role="radiogroup" aria-label="${t('Idioma')}">
            <button type="button" class="opt-lang-btn ${language === 'es' ? 'active' : ''}" data-lang="es">
              <span class="lang-badge">ES</span>
              <span>Español</span>
            </button>
            <button type="button" class="opt-lang-btn ${language === 'ca' ? 'active' : ''}" data-lang="ca">
              <span class="lang-badge">VA</span>
              <span>Valencià</span>
            </button>
            <button type="button" class="opt-lang-btn ${language === 'en' ? 'active' : ''}" data-lang="en">
              <span class="lang-badge">EN</span>
              <span>English</span>
            </button>
            <button type="button" class="opt-lang-btn ${language === 'fr' ? 'active' : ''}" data-lang="fr">
              <span class="lang-badge">FR</span>
              <span>Français</span>
            </button>
          </div>
          ${isLanguageAutoDetected ? `<p class="opt-hint">${icon('check')} ${t('Idioma detectado automáticamente')}</p>` : ''}
        </section>

        <!-- Sonido y música -->
        <section class="opt-group">
          <h3 class="opt-heading">${icon('sound')} ${t('Sonido y música')}</h3>
          
          <!-- Música -->
          <div class="opt-row">
            <div class="opt-label-wrap">
              <span class="opt-label">${icon('music')} ${t('Música')}</span>
              <button type="button" class="opt-toggle ${musicOn ? 'active' : ''}" id="opt-music-toggle" aria-pressed="${musicOn}">
                ${musicOn ? t('sí') : t('no')}
              </button>
            </div>
            <div class="opt-slider-wrap">
              <input type="range" min="0" max="100" value="${Math.round(musicVolume * 100)}" id="opt-music-vol" aria-label="${t('Volumen de música')}" ${musicOn ? '' : 'disabled'}>
              <span class="opt-val" id="opt-music-val">${Math.round(musicVolume * 100)}%</span>
            </div>
          </div>

          <!-- Efectos SFX -->
          <div class="opt-row">
            <div class="opt-label-wrap">
              <span class="opt-label">${icon('sound')} ${t('Efectos de sonido')}</span>
              <div class="opt-sub-actions">
                <button type="button" class="opt-btn-test" id="opt-sound-test" title="${t('Probar sonido')}">
                  ${icon('play')} ${t('Probar')}
                </button>
                <button type="button" class="opt-toggle ${!muted ? 'active' : ''}" id="opt-sound-toggle" aria-pressed="${!muted}">
                  ${!muted ? t('sí') : t('no')}
                </button>
              </div>
            </div>
            <div class="opt-slider-wrap">
              <input type="range" min="0" max="100" value="${Math.round(sfxVolume * 100)}" id="opt-sfx-vol" aria-label="${t('Volumen de efectos')}" ${!muted ? '' : 'disabled'}>
              <span class="opt-val" id="opt-sfx-val">${Math.round(sfxVolume * 100)}%</span>
            </div>
          </div>

          <p class="opt-credit">${icon('music')} <span>${t('Música de fondo:')} «The vale path» · <a href="https://umbriamusic.bandcamp.com/" target="_blank" rel="noopener noreferrer">Umbría</a></span></p>
        </section>

        <!-- Ajustes Generales -->
        <section class="opt-group">
          <h3 class="opt-heading">${icon('star')} ${t('General')}</h3>
          
          <!-- Vibración háptica -->
          <div class="opt-row">
            <div class="opt-label-wrap">
              <span class="opt-label">${t('Vibración háptica')}</span>
              <button type="button" class="opt-toggle ${hapticsEnabled ? 'active' : ''}" id="opt-haptics-toggle" aria-pressed="${hapticsEnabled}">
                ${hapticsEnabled ? t('sí') : t('no')}
              </button>
            </div>
          </div>

          <!-- Velocidad animaciones -->
          <div class="opt-row">
            <div class="opt-label-wrap">
              <span class="opt-label">${t('Velocidad de animaciones')}</span>
              <div class="opt-pill-group">
                <button type="button" class="opt-pill ${!fastSpeed ? 'active' : ''}" data-speed="normal">${t('Normal')}</button>
                <button type="button" class="opt-pill ${fastSpeed ? 'active' : ''}" data-speed="fast">${t('Rápida')}</button>
              </div>
            </div>
          </div>

          ${document.fullscreenEnabled ? `
          <div class="opt-row">
            <div class="opt-label-wrap">
              <span class="opt-label">${t('Pantalla completa')}</span>
              <button type="button" class="btn btn-small" id="opt-fullscreen-toggle">
                ${icon('expand')} ${document.fullscreenElement ? t('Salir') : t('Pantalla completa')}
              </button>
            </div>
          </div>` : ''}
        </section>

      </div>
      <div class="window-actions">
        ${action('close-options', t('Guardar y cerrar'), 'check', 'gold')}
      </div>
    </div>
  `;
}

function bindOptionsEvents() {
  dialog.querySelectorAll('.opt-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      if (lang === language) return;
      setLanguage(lang, true);
    });
  });

  const musicToggle = $('opt-music-toggle');
  const musicSlider = $('opt-music-vol');
  const musicVal = $('opt-music-val');
  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      toggleMusic();
      musicToggle.classList.toggle('active', musicOn);
      musicToggle.setAttribute('aria-pressed', String(musicOn));
      musicToggle.textContent = musicOn ? t('sí') : t('no');
      if (musicSlider) musicSlider.disabled = !musicOn;
    });
  }

  if (musicSlider) {
    musicSlider.addEventListener('input', () => {
      musicVolume = Number(musicSlider.value) / 100;
      write(musicVolumeStorage, String(musicVolume));
      if (musicVal) musicVal.textContent = `${Math.round(musicVolume * 100)}%`;
      music?.setVolume(musicVolume);
    });
  }

  const soundToggle = $('opt-sound-toggle');
  const soundSlider = $('opt-sfx-vol');
  const soundVal = $('opt-sfx-val');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      muted = !muted;
      write(soundStorage, muted ? 'off' : 'on');
      soundToggle.classList.toggle('active', !muted);
      soundToggle.setAttribute('aria-pressed', String(!muted));
      soundToggle.textContent = !muted ? t('sí') : t('no');
      if (soundSlider) soundSlider.disabled = muted;
      if (!muted) note('pick');
      else if (sound) sound.suspend().catch(() => {});
      syncMusic();
      $('sound').setAttribute('aria-pressed', String(!muted));
    });
  }

  if (soundSlider) {
    soundSlider.addEventListener('input', () => {
      sfxVolume = Number(soundSlider.value) / 100;
      write(soundVolumeStorage, String(sfxVolume));
      if (soundVal) soundVal.textContent = `${Math.round(sfxVolume * 100)}%`;
    });
  }

  const soundTest = $('opt-sound-test');
  if (soundTest) {
    soundTest.addEventListener('click', () => {
      if (muted) {
        muted = false;
        write(soundStorage, 'on');
        if (soundToggle) {
          soundToggle.classList.add('active');
          soundToggle.setAttribute('aria-pressed', 'true');
          soundToggle.textContent = t('sí');
        }
        if (soundSlider) soundSlider.disabled = false;
        $('sound').setAttribute('aria-pressed', 'true');
      }
      note('score');
      vibrate([20]);
    });
  }

  const hapticsToggle = $('opt-haptics-toggle');
  if (hapticsToggle) {
    hapticsToggle.addEventListener('click', () => {
      hapticsEnabled = !hapticsEnabled;
      write(hapticsStorage, hapticsEnabled ? 'on' : 'off');
      hapticsToggle.classList.toggle('active', hapticsEnabled);
      hapticsToggle.setAttribute('aria-pressed', String(hapticsEnabled));
      hapticsToggle.textContent = hapticsEnabled ? t('sí') : t('no');
      if (hapticsEnabled) vibrate([30]);
    });
  }

  dialog.querySelectorAll('.opt-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      fastSpeed = (pill.dataset.speed === 'fast');
      write(speedStorage, fastSpeed ? 'fast' : 'normal');
      dialog.querySelectorAll('.opt-pill').forEach(p => p.classList.toggle('active', p === pill));
      vibrate([15]);
    });
  });

  const fsBtn = $('opt-fullscreen-toggle');
  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    });
  }
}

function showOutcome() {
  pendingOutcome = 0;
  if (run.phase === 'shop') { window.scrollTo(0, 0); market.open(run); return; }
  const total = run.results.reduce((sum, points) => sum + points, 0);
  const stat = (value, label) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
  if (run.phase === 'won') {
    const { newlyUnlockedDeck, newlyUnlockedDiff } = recordVictory(run);
    setMusicMood('title');
    let extraPraise = '';
    if (newlyUnlockedDeck) {
      extraPraise += `<p class="victory-unlock">${icon('lock')}${message`¡Has desbloqueado la ${t(decks[newlyUnlockedDeck].name)}!`}</p>`;
    }
    if (newlyUnlockedDiff) {
      extraPraise += `<p class="victory-unlock">${icon('crown')}${message`¡Nueva dificultad desbloqueada para ${t(decks[run.deck].name)}!`}</p>`;
    }
    const diffName = `${t(difficulties[run.difficulty ?? 0]?.name ?? 'Normal')} (Niv. ${(run.difficulty ?? 0) + 1})`;
    showDialog('outcome', windowMarkup({ title: t('¡Campaña completada!'), eyebrow: `${message`${campaignLength} de ${campaignLength} mosaicos`} · ${t(decks[run.deck].name)} · ${t(diffName)}`,
      body: `<div class="stats">${stat(total, t('Puntos'))}${stat(run.orders.length, t('Encargos'))}</div>${extraPraise}`,
      actions: action('endless', t('Modo libre'), 'play', 'gold') + action('collection', t('Ver bolsa y azulejos'), 'bag') + action('title', t('Volver al patio'), 'door') }), 'victory');
    return;
  }
  if (!musicHalted) {
    musicHalted = true;
    music?.windDown();
  }
  const heading = run.turns && run.board.every(Boolean) ? t('Tablero bloqueado') : t('Sin turnos');
  const boss = bossAt(run);
  showDialog('outcome', windowMarkup({ title: heading, eyebrow: `${run.endless ? message`Mosaico ${run.stage + 1}` : `${t('Mosaico')} ${run.stage + 1}/${campaignLength}`} · ${boss ? message`Jefe: ${t(bosses[boss.key].name)}` : t(stageAt(run.stage, run.difficulty ?? 0).name)}`,
    body: `<div class="stats">${stat(`${run.points}/${run.goal}`, t('Este mosaico'))}${stat(total + run.points, t('Total partida'))}</div>`,
    actions: action('restart', t('Volver a jugar'), 'refresh', 'gold') + action('collection', t('Ver bolsa y azulejos'), 'bag') + action('title', t('Volver al patio'), 'door') }), 'defeat');
}

function back() {
  closeDialog();
  if (playing) {
    if (!lockUntil && !pendingOutcome && run.phase !== 'play') showOutcome();
    else { render(); canvas.focus({ preventScroll: true }); }
  }
}

dialog.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'back': back(); break;
    case 'options': showOptions(); break;
    case 'close-options': closeOptions(); break;
    case 'collection': showCollection(); break;
    case 'close-collection': closeCollection(); break;
    case 'break-unique': {
      const index = Number(button.dataset.index);
      if (breakUnique(run, index)) {
        save();
        table.sync(run, performance.now());
        showCollection();
        render();
      }
      break;
    }
    case 'title': title(); break;
    case 'endless':
      if (continueEndless(run)) { save(); closeDialog(); showOutcome(); }
      break;
    case 'help': help(); break;
    case 'music':
      toggleMusic();
      button.innerHTML = `${icon(musicOn ? 'music' : 'music-off')}${message`Música: ${musicOn ? t('sí') : t('no')}`}`;
      break;
    case 'fullscreen':
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
      break;
    case 'restart': chooseBag(); break;
    case 'pick-bag': {
      const bagKey = button.dataset.bag;
      openDifficultyScreen(bagKey);
      break;
    }
    case 'back-to-bags': {
      openBagScreen();
      break;
    }
    case 'diff-prev': {
      const prev = Math.max(0, selectedDiffLevel - 1);
      const prog = getProgression();
      const maxCompleted = prog.completed[selectedDeckKey] ?? -1;
      const maxAvailable = Math.min(5, maxCompleted + 1);
      updateDifficultyDetails(prev, maxAvailable);
      break;
    }
    case 'diff-next': {
      const prog = getProgression();
      const maxCompleted = prog.completed[selectedDeckKey] ?? -1;
      const maxAvailable = Math.min(5, maxCompleted + 1);
      const next = Math.min(maxAvailable, selectedDiffLevel + 1);
      updateDifficultyDetails(next, maxAvailable);
      break;
    }
    case 'pick-diff': {
      const level = Number(button.dataset.level);
      const prog = getProgression();
      const maxCompleted = prog.completed[selectedDeckKey] ?? -1;
      const maxAvailable = Math.min(5, maxCompleted + 1);
      if (level <= maxAvailable) {
        updateDifficultyDetails(level, maxAvailable);
      }
      break;
    }
    case 'start-with-diff': {
      const bag = button.dataset.bag || selectedDeckKey;
      const level = Number(button.dataset.level ?? selectedDiffLevel);
      startRun(bag, level);
      break;
    }
  }
});

dialog.addEventListener('cancel', event => {
  event.preventDefault();
  if (modal === 'collection') closeCollection();
  else if (modal === 'options') closeOptions();
  else if (modal === 'outcome') title();
  else back();
});

function cancelPointer() {
  if (!pointer) return;
  const ended = pointer;
  pointer = null;
  if (canvas.hasPointerCapture(ended.id)) canvas.releasePointerCapture(ended.id);
  if (ended.drag && run) table.sync(run, performance.now());
  canvas.style.cursor = '';
}

canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (!playing || modal || pointer || event.button !== 0 && event.button !== 2) return;
  const target = table.pick(event.clientX, event.clientY);
  if (target >= POWER && target < UNIQUE && event.button === 0) { showPlate(-1); showPower(target - POWER, true); return; }
  showPower(-1);
  showPlate(-1);
  const plateHit = target >= PLATE && target < PLATE + 9 && event.button === 0 ? target - PLATE : null;
  const touch = event.pointerType !== 'mouse';
  const orbit = event.button === 2 || touch && target < 0;
  if (armed >= 0 && target !== armed) { armed = -1; render(); }
  if (!orbit && plateHit == null && (!ready() || target < 0)) return;
  canvas.focus({ preventScroll: true });
  focused = -1;
  hovered = target;
  pointer = { id: event.pointerId, orbit, touch, target, plate: plateHit, movable: !orbit && plateHit == null && movable(target), x: event.clientX, y: event.clientY, drag: false, moved: false };
  canvas.setPointerCapture(event.pointerId);
  if (orbit) canvas.style.cursor = 'grabbing';
  updateFocus();
});

canvas.addEventListener('pointermove', event => {
  if (!playing || modal) return;
  if (pointer?.id === event.pointerId) {
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (pointer.orbit) {
      table.orbit(dx, dy);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      return;
    }
    if (pointer.movable && (pointer.drag || Math.hypot(dx, dy) > 6) && ready()) {
      if (!pointer.drag) { pointer.drag = true; select(pointer.target, true); }
      table.drag(at(pointer.target), event.clientX, event.clientY);
    } else if (!pointer.movable && Math.hypot(dx, dy) > TAP_SLOP) {
      // A slide that starts on a stone or an empty cell is never a tap, so it can't spend a chisel charge.
      pointer.moved = true;
      if (pointer.touch) {
        // On touch screens the slide rotates the camera instead.
        pointer.orbit = true;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        armed = -1;
        updateFocus();
        return;
      }
    }
  }
  focused = -1;
  const previous = hovered;
  hovered = table.pick(event.clientX, event.clientY, Boolean(pointer?.drag && (selected >= HAND || selected >= UNIQUE)));
  if (!pointer && !pinned && event.pointerType === 'mouse' && previous !== hovered) {
    if (hovered >= POWER && hovered < UNIQUE) { showPlate(-1); showPower(hovered - POWER); }
    else if (hovered >= PLATE && hovered < PLATE + 9) { showPower(-1); showPlate(hovered - PLATE); }
    else { showPower(-1); showPlate(-1); }
  }
  canvas.style.cursor = pointer?.drag ? 'grabbing' : hovered >= 0 ? 'pointer' : 'default';
  if (ready() && previous !== hovered) $('hint').textContent = hint(run.board.filter(isFresh).length);
  updateFocus();
});

canvas.addEventListener('pointerup', event => {
  if (pointer?.id !== event.pointerId) return;
  const gesture = pointer;
  pointer = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (!gesture.orbit && !gesture.moved && gesture.plate != null) {
    openPlatesList();
  } else if (!gesture.orbit && !gesture.moved && ready()) {
    const stone = gesture.target >= 0 && gesture.target < HAND && Boolean(run.board[gesture.target]?.stone);
    const wasArmed = armed;
    const confirmed = wasArmed === gesture.target;
    armed = -1;
    if (wasArmed >= 0 && !confirmed) render();
    if (gesture.drag) {
      const target = table.pick(event.clientX, event.clientY, selected >= HAND || selected >= UNIQUE);
      const accepted = (target >= HAND && target < POWER) || target >= UNIQUE ? returnDie() : applyCell(target, false);
      if (!accepted) table.sync(run, performance.now());
    } else if (stone && gesture.touch && !confirmed) {
      // Touch screens have no hover preview, so the first tap only arms the stone.
      selected = -1;
      if (run.chisels) {
        armed = focused = gesture.target;
        note('pick');
      }
      render();
      if (!run.chisels) $('hint').textContent = t('Has agotado las cargas del cincel.');
    } else if (((gesture.target >= HAND && gesture.target < POWER) || gesture.target >= UNIQUE) && !gesture.movable && selected < HAND) {
      returnDie();
    } else if (gesture.target < HAND && (selected >= HAND || selected >= UNIQUE) && canTarget(gesture.target)) {
      applyCell(gesture.target);
    } else if (gesture.movable) select(gesture.target);
    else applyCell(gesture.target);
  }
  canvas.style.cursor = '';
});
canvas.addEventListener('pointercancel', cancelPointer);
canvas.addEventListener('lostpointercapture', cancelPointer);
canvas.addEventListener('pointerleave', () => {
  if (!pointer && playing) { hovered = -1; if (!pinned) showPower(-1); updateFocus(); }
});
canvas.addEventListener('wheel', event => {
  if (!playing || modal) return;
  event.preventDefault();
  table.zoomBy(Math.exp(Math.max(-100, Math.min(100, event.deltaY)) * .0016));
}, { passive: false });
canvas.addEventListener('webglcontextrestored', () => { if (table) table.dirty = true; });

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal === 'workshop') {
    if (!market.back()) title();
    return;
  }
  if (event.key === 'Escape' && playing && !modal) {
    if (resolution) finishScore();
    else if (pendingOutcome) pendingOutcome = 1;
    else if (selected >= 0 || tooltip >= 0 || armed >= 0) { cancelPointer(); clearSelection(); render(); }
    else if (codexOpen) {
      const inside = codex.contains(document.activeElement);
      setCodex(false);
      if (inside) $('codex-toggle').focus({ preventScroll: true });
    }
    else pause();
    return;
  }
  if (!ready() || pointer || event.altKey || event.ctrlKey || event.metaKey) return;
  if (/^[1-4]$/.test(event.key)) {
    if (!event.repeat) {
      const slot = Number(event.key) - 1;
      const empty = run.board.indexOf(null);
      focused = empty >= 0 ? empty : run.board.findIndex((_, cell) => canPlace(run, slot, cell));
      select(HAND + slot);
      canvas.focus({ preventScroll: true });
    }
    event.preventDefault();
    return;
  }
  if (event.key.startsWith('Arrow')) {
    if (focused < 0) focused = 0;
    else if (event.key === 'ArrowLeft' && focused % run.cols > 0) focused--;
    else if (event.key === 'ArrowRight' && focused % run.cols < run.cols - 1) focused++;
    else if (event.key === 'ArrowUp' && focused >= run.cols) focused -= run.cols;
    else if (event.key === 'ArrowDown' && focused + run.cols < run.board.length) focused += run.cols;
    hovered = -1;
    canvas.focus({ preventScroll: true });
    updateFocus();
    event.preventDefault();
    return;
  }
  if (event.repeat || event.target instanceof HTMLButtonElement) return;
  if (event.key === 'Enter') {
    if (!applyCell(focused) && movable(focused)) select(focused);
    event.preventDefault();
  }
  if (event.code === 'Space') { scoreTurn(); event.preventDefault(); }
  if (event.key === 'Backspace' && returnDie()) event.preventDefault();
  if (event.key.toLowerCase() === 'v') topCamera();
  if (event.key.toLowerCase() === 'r') centerCamera();
});

$('play').addEventListener('click', () => {
  if (ongoing()) { save(); enter(); } else chooseBag();
});
$('new').addEventListener('click', () => showDialog('restart', windowMarkup({ title: t('¿Empezar de nuevo?'), emblem: 'star',
  body: `<p class="lede">${t('La partida actual se perderá y volverás al primer mosaico.')}</p>`,
  actions: action('restart', t('Nueva partida'), 'refresh', 'danger') + action('back', t('Cancelar')) }), 'defeat'));
document.querySelector('[data-help]').addEventListener('click', help);
$('pause').addEventListener('click', pause);
$('options-button')?.addEventListener('click', showOptions);
$('title-options')?.addEventListener('click', showOptions);
$('top').addEventListener('click', topCamera);
$('reset-camera').addEventListener('click', centerCamera);
$('catalog').addEventListener('click', () => showCollection(true));
$('collection-button').addEventListener('click', () => showCollection());
$('power-tooltip').addEventListener('click', () => { pinned = false; showPower(-1); showPlate(-1); });
$('die-tooltip').addEventListener('click', () => { $('die-tooltip').hidden = true; });
$('recall').addEventListener('click', returnDie);
$('skip-score').addEventListener('click', () => finishScore());
$('confirm').addEventListener('click', scoreTurn);
$('codex-toggle').addEventListener('click', () => setCodex(!codexOpen));
$('codex-close').addEventListener('click', () => { setCodex(false); $('codex-toggle').focus({ preventScroll: true }); });
$('codex-plates')?.addEventListener('click', () => { setCodex(false); openPlatesList(); });
$('sound').addEventListener('click', () => {
  muted = !muted;
  write(soundStorage, muted ? 'off' : 'on');
  if (!muted) note('pick');
  else if (sound) sound.suspend().catch(() => {});
  syncMusic();
  render();
});
$('music').addEventListener('click', toggleMusic);
// Browsers only allow audio after a gesture, so music starts with the first touch or key.
for (const type of ['pointerdown', 'keydown']) addEventListener(type, () => {
  if (musicOn && !muted && (!music?.running || sound?.state === 'suspended' || music?.paused)) syncMusic();
}, { capture: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    music?.stop();
    if (sound) sound.suspend().catch(() => {});
  } else if (!muted && sound) {
    sound.resume().catch(() => {});
    syncMusic();
  }
});

$('world').addEventListener('animationend', event => {
  if (event.target === event.currentTarget) event.currentTarget.classList.remove('shake', 'shake-big');
});

function frame(now) {
  if (counters.size) tickCounters(now);
  if (playing) {
    if (resolution) scoringFrame(now);
    if (lockUntil && now >= lockUntil) { lockUntil = 0; render(); }
    if (pendingOutcome && now >= pendingOutcome && !modal) showOutcome();
    if (!modal) { table.frame(now); positionPower(); }
    else market?.frame(now);
  }
  requestAnimationFrame(frame);
}

setCodex(false);
paintMusic();
try {
  const art = new DiceArt();
  table = new Table(canvas, $('world-labels'), art);
  await table.load();
  market = new MarketUI(art, workshop, { open: showWorkshop, changed: () => { save(); render(); }, note, bump, advance: nextMosaic, exit: title, collection: () => showCollection() }, table.porcelain.map);
  title();
  requestAnimationFrame(frame);
} catch (error) {
  console.error('No se pudo iniciar la mesa 3D', error);
  $('play-label').textContent = t('Mesa 3D no disponible');
  $('boot').textContent = t('Prueba a recargar la página en un navegador con WebGL 2.');
  $('boot').hidden = false;
}
