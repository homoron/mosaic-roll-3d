import { glazes, rarities, powers, upgrades, basicColors, plainDie, colorDie, uniqueDie, market, ovenOffers, hasFace, choose, dieCount, diceName, canEnchant, enchant, comboCatalog, getDieSpec } from './catalogo.js?v=esmaltes-30';
import { projectBoard, uniqueDice } from './unicos.js?v=esmaltes-30';

const names = ['Patio de cal', 'Claustro azul', 'El mirador', 'Galería del azahar', 'Sala de la fuente', 'Taller del maestro'];
const campaignGoals = [55, 88, 110, 150, 170, 185, 198, 217, 242, 275, 312, 350];

export const difficulties = [
  { level: 0, name: 'Barro cocido', title: 'Normal', text: 'Reglas estándar del alfarero.' },
  { level: 1, name: 'Esmalte de cobre', title: 'Puntos +20%', text: 'La exigencia aumenta: necesitas un 20% más de puntuación en cada mosaico.' },
  { level: 2, name: 'Esmalte de plata', title: 'Economía austera', text: 'Menos oro en el zoco (recompensa base y jefes a la mitad; turnos sobrantes no pagan sin Paciencia).' },
  { level: 3, name: 'Esmalte de oro', title: 'Horno de pago', text: 'Cocer una mejora en el horno cuesta 6 de oro. El horno se puede saltar.' },
  { level: 4, name: 'Lapislázuli imperial', title: 'Puntos +44%', text: 'La exigencia de puntuación vuelve a subir otro 20% acumulativo.' },
  { level: 5, name: 'Rubí del Sultán', title: 'Juicio del Sultán', text: 'Solo 1 cincel inicial por mosaico y los jefes exigen un +15% de puntos adicional.' },
];
const orders = [
  { key: 'straight', label: 'Puntúa una escalera', combos: ['Escalera', 'Escalera larga'], gold: 2 },
  { key: 'mono', label: 'Puntúa una línea monocolor', combos: ['Monocolor'], gold: 3 },
  { key: 'quartet', label: 'Puntúa un cuarteto', combos: ['Cuarteto'], gold: 4 },
  { key: 'panel', label: 'Puntúa con el panel lleno', combos: ['Panel completo'], gold: 5 },
];
export const campaignLength = campaignGoals.length;
export const orderAt = stage => orders[Math.floor(stage / 3)];
export const handSize = 4;

// Starting bags, chosen when a run begins, like the decks of a deck-builder.
const classicGlazes = [0, 1, 2, 3, 0, 3, 0, 3, 1, 2, 1, 2];
const evenFaces = [2, 2, 4, 4, 6, 6];
const marble = 5;
const randomGlaze = random => basicColors[Math.floor(random() * basicColors.length)];
export const decks = {
  classic: { name: 'Bolsa del alfarero', text: 'Los doce dados de siempre: tres de cada color.',
    start: () => classicGlazes.map(colorDie), filler: random => colorDie(randomGlaze(random)) },
  saffron: { name: 'Bolsa de azafrán', text: 'Doce dados amarillos. Las líneas monocolor salen solas; los colores distintos tendrán que esperar al zoco.',
    start: () => classicGlazes.map(() => colorDie(1)), filler: () => colorDie(1) },
  even: { name: 'Bolsa par', text: 'Todas las caras son 2, 4 o 6. Más puntos por dado y parejas fáciles, pero ninguna escalera.',
    start: () => classicGlazes.map(glaze => plainDie(glaze, evenFaces)), filler: random => plainDie(randomGlaze(random), evenFaces) },
  relics: { name: 'Tres reliquias', text: 'Empiezas con tres dados únicos al azar en tu repisa. El resto de la bolsa se rellena con dados de mármol del 1 al 6.',
    start: random => classicGlazes.map(() => plainDie(marble, [1, 2, 3, 4, 5, 6])), filler: () => plainDie(marble, [1, 2, 3, 4, 5, 6]) },
};

// Sample dice shown on the bag picker; portraits show the first face, so it is moved to the front.
const showing = (spec, value) => ({ ...spec, faces: [value, ...spec.faces.filter((_, index) => index !== spec.faces.indexOf(value))] });
export function deckSample(key) {
  if (key === 'relics') return [showing(uniqueDie('glass'), 4), showing(uniqueDie('twin'), 2), showing(uniqueDie('compass'), 5), plainDie(marble, [5, 1, 2, 3, 4, 6])];
  if (key === 'saffron') return [6, 3, 2, 6].map(value => showing(colorDie(1), value));
  if (key === 'even') return basicColors.map((glaze, index) => showing(plainDie(glaze, evenFaces), [6, 4, 2, 4][index]));
  return basicColors.map((glaze, index) => showing(colorDie(glaze), [6, 3, 5, 4][index]));
}

// Every fourth mosaic is a boss with a rule of its own; beating it pays extra gold.
export const BOSS_EVERY = 4;
export const BOSS_GOLD = 4;
export const bosses = {
  eclipse: { name: 'El eclipse', about: 'Los dados de un color al azar no suman puntos ni cuentan para los combos de color.',
    text: boss => `Los dados de ${glazes[boss.color].name.toLowerCase()} no suman puntos ni cuentan para los combos de color.` },
  scarcity: { name: 'La mano corta', text: () => 'Solo hay tres dados en la bandeja.' },
  hourglass: { name: 'El reloj de arena', text: () => 'Tienes un turno menos para llegar a la meta.' },
  whitewash: { name: 'La cal', text: () => 'Los colores no multiplican: no hay monocolor, colores distintos ni resonancia cobalto.' },
  slumber: { name: 'El sueño del sultán', text: () => 'Tus azulejos de poder no funcionan en este mosaico.' },
  balance: { name: 'La balanza', text: () => 'Los dados con número impar no suman sus puntos.' },
};
export const isBossStage = stage => (stage + 1) % BOSS_EVERY === 0;
export const bossAt = (state, stage = state.stage) => isBossStage(stage) ? state.bosses?.[(stage + 1) / BOSS_EVERY - 1] ?? null : null;
export const bossText = boss => bosses[boss.key].text(boss);
const bossKey = state => bossAt(state)?.key;

function rollBoss(state, random) {
  const recent = state.bosses.slice(-2).map(boss => boss.key);
  // The even bag would never notice the balance boss.
  const keys = Object.keys(bosses).filter(key => !recent.includes(key) && !(key === 'balance' && state.deck === 'even'));
  const key = keys[Math.floor(random() * keys.length)];
  if (key !== 'eclipse') return { key };
  // A saffron bag would lose every die to a yellow eclipse.
  const colors = basicColors.filter(color => state.deck !== 'saffron' || color !== 1);
  return { key, color: colors[Math.floor(random() * colors.length)] };
}

// Bosses are drawn ahead of time so the zoco can announce the next one.
function ensureBoss(state, stage, random) {
  if (!isBossStage(stage)) return;
  const index = (stage + 1) / BOSS_EVERY - 1;
  while (state.bosses.length <= index) state.bosses.push(rollBoss(state, random));
}

// Power tiles fall asleep during the slumber boss.
const has = (state, key) => state.powers.includes(key) && bossKey(state) !== 'slumber';
const handLimit = state => bossKey(state) === 'scarcity' ? handSize - 1 : handSize;
export const tileLimit = 5;
export const isFresh = die => Boolean(die && !die.fixed);
export const comboPoints = { line: 3, pair: 6, trio: 12, quartet: 23, straight: 10, longStraight: 17, panel: 10, mono: .4, chromatic: .25 };

export function getComboValue(state, key) {
  const level = state?.comboLevels?.[key] ?? 1;
  const def = comboCatalog[key];
  if (!def) return comboPoints[key] ?? 0;
  if (def.baseAdd !== undefined) return def.baseAdd + (level - 1) * def.gainPerLevel;
  return def.basePoints + (level - 1) * def.gainPerLevel;
}

export function stageAt(index, difficulty = 0) {
  const group = Math.floor(index / 3);
  const cols = group < 2 ? 3 : 4;
  const rows = group === 0 ? 2 : group < 3 ? 3 : 4;
  let goal = campaignGoals[index] ?? 385 + (index - campaignLength) * 38;
  if (difficulty >= 1) goal = Math.round(goal * 1.20);
  if (difficulty >= 4) goal = Math.round(goal * 1.20);
  if (difficulty >= 5 && isBossStage(index)) goal = Math.round(goal * 1.15);
  return { name: names[index % names.length], cols, rows, goal, turns: index < 6 ? 4 : 5 };
}

function stockBag(state, gift, random) {
  const count = Math.max(gift ? 1 : 0, state.rows * state.cols + handSize - dieCount(state));
  const filler = (decks[state.deck] ?? decks.classic).filler;
  for (let index = 0; index < count; index++) state.bag.push(filler(random));
}

function replenish(state, random) {
  const occupied = new Set([...state.board, ...state.hand].filter(Boolean).map(die => die.id));
  const available = state.bag.flatMap((spec, id) => spec && !occupied.has(id) ? [id] : []);
  const drawn = [];
  for (let slot = 0; slot < handLimit(state) && available.length; slot++) {
    if (state.hand[slot]) continue;
    const [id] = available.splice(Math.floor(random() * available.length), 1);
    const face = Math.floor(random() * 6);
    state.hand[slot] = { id, slot, face, value: state.bag[id].faces[face], stone: false, fixed: false };
    drawn.push(id);
  }
  return drawn;
}

function startStage(state, random) {
  const stage = stageAt(state.stage, state.difficulty ?? 0);
  ensureBoss(state, state.stage, random);
  state.phase = 'play';
  state.cols = stage.cols;
  state.rows = stage.rows;
  state.goal = stage.goal;
  state.points = state.lastScore = 0;
  state.turns = state.maxTurns = stage.turns - (bossKey(state) === 'hourglass' ? 1 : 0);
  const baseChisels = (state.difficulty ?? 0) >= 5 ? 1 : 2;
  state.chisels = baseChisels + (has(state, 'chisel') ? 1 : 0);
  state.chiselCount = 0;
  // The short-handed boss sends the fourth die of the tray back to the bag.
  if (handLimit(state) < handSize) state.hand = state.hand.map((die, slot) => slot < handLimit(state) ? die : null);
  state.board = Array(state.rows * state.cols).fill(null);
  state.market = null;
  state.forgeHand = [];

  // Setup unique rack from state.uniques
  state.uniques ??= [];
  state.uniqueRack = Array(3).fill(null);
  const uniqueRolls = [];
  state.uniques.forEach((spec, index) => {
    const face = Math.floor(random() * 6);
    state.uniqueRack[index] = {
      isUnique: true,
      uniqueIndex: index,
      slot: index,
      face,
      value: spec.faces[face],
      stone: false,
      fixed: false,
    };
    uniqueRolls.push(`u_${index}`);
  });

  stockBag(state, state.stage > 0, random);
  return [...replenish(state, random), ...uniqueRolls];
}

const defaultComboLevels = () => ({ pair: 1, trio: 1, quartet: 1, straight: 1, longStraight: 1, line: 1, mono: 1, chromatic: 1, panel: 1 });
const defaultComboCounts = () => ({ pair: 0, trio: 0, quartet: 0, straight: 0, longStraight: 0, line: 0, mono: 0, chromatic: 0, panel: 0 });

export function newRun(deck = 'classic', difficulty = 0, random = Math.random) {
  if (typeof difficulty === 'function') {
    random = difficulty;
    difficulty = 0;
  }
  if (!Object.hasOwn(decks, deck)) deck = 'classic';
  difficulty = Math.max(0, Math.min(5, Number(difficulty) || 0));
  let uniques = [];
  let bag;
  if (deck === 'relics') {
    uniques = choose(Object.keys(uniqueDice), 3, random).map(uniqueDie);
    bag = classicGlazes.map(() => plainDie(marble, [1, 2, 3, 4, 5, 6]));
  } else {
    bag = decks[deck].start(random);
  }
  const die = (id, face, slot) => ({ id, slot, face, value: bag[id].faces[face], stone: false, fixed: false });
  const hand = deck === 'classic' ? [[0, 2], [1, 3], [4, 4], [2, 5]].map(([id, value], slot) => die(id, bag[id].faces.indexOf(value), slot))
    : Array(handSize).fill(null);
  const comboLevels = defaultComboLevels();
  const comboCounts = defaultComboCounts();
  const state = { version: 7, deck, difficulty, stage: 0, gold: 0, powers: [], results: [], orders: [], history: [], endless: false, bag, hand, bosses: [], comboLevels, comboCounts, uniques, uniqueRack: [null, null, null] };
  for (let stage = BOSS_EVERY - 1; stage < campaignLength; stage += BOSS_EVERY) ensureBoss(state, stage, random);
  startStage(state, random);
  return state;
}

export function canPlace(state, slot, cell, fromUnique = false) {
  const target = state.board[cell];
  const source = fromUnique ? state.uniqueRack?.[slot] : state.hand[slot];
  return state.phase === 'play' && Boolean(source) &&
    (target === null || (isFresh(target) && (target.isUnique ? !state.uniqueRack?.[target.uniqueIndex] : !state.hand[target.slot])));
}

export function place(state, slot, cell, fromUnique = false) {
  if (!canPlace(state, slot, cell, fromUnique)) return false;
  if (state.board[cell]) recall(state, cell);
  if (fromUnique) {
    const die = state.uniqueRack[slot];
    state.board[cell] = die;
    state.uniqueRack[slot] = null;
  } else {
    state.board[cell] = state.hand[slot];
    state.hand[slot] = null;
  }
  return true;
}

export function canMove(state, from, to) {
  const target = state.board[to];
  return state.phase === 'play' && from !== to && isFresh(state.board[from]) && (target === null || isFresh(target));
}

export function move(state, from, to) {
  if (!canMove(state, from, to)) return false;
  [state.board[from], state.board[to]] = [state.board[to], state.board[from]];
  return true;
}

export function recall(state, cell) {
  const die = state.board[cell];
  if (state.phase !== 'play' || !isFresh(die)) return false;
  delete die.extra;
  delete die.numberChanged;
  if (die.isUnique) {
    if (state.uniqueRack[die.uniqueIndex]) return false;
    const spec = state.uniques?.[die.uniqueIndex];
    if (spec && die.face != null) die.value = spec.faces[die.face];
    state.uniqueRack[die.uniqueIndex] = die;
    state.board[cell] = null;
    return true;
  }
  if (state.hand[die.slot]) return false;
  const spec = state.bag?.[die.id];
  if (spec && die.face != null) die.value = spec.faces[die.face];
  state.hand[die.slot] = die;
  state.board[cell] = null;
  return true;
}

export function chip(state, cell, random = Math.random) {
  if (state.phase !== 'play' || !state.chisels || !state.board[cell]?.stone) return null;
  state.board[cell] = null;
  state.chisels--;
  state.chiselCount = (state.chiselCount || 0) + 1;
  if (has(state, 'midas')) state.gold += 2;
  return !state.hand.some(Boolean) && !state.board.some(isFresh) ? replenish(state, random) : [];
}

// Dice of the colour hidden by the eclipse boss.
function eclipsed(state, spec) {
  const boss = bossAt(state);
  return boss?.key === 'eclipse' && !spec.rainbow && (spec.glaze === boss.color || spec.second === boss.color);
}

function colors(state, spec, die, cell = -1, stainedCell = -1) {
  if (!spec) return [];
  if (eclipsed(state, spec)) return [];
  if (cell >= 0 && cell === stainedCell) return glazes.map((_, color) => color);
  if (die.tint != null) return [die.tint];
  return spec.rainbow ? glazes.map((_, color) => color) : spec.second == null ? [spec.glaze] : [spec.glaze, spec.second];
}

function distinct(options, at = 0, used = new Set()) {
  if (at === options.length) return true;
  for (const color of options[at]) {
    if (used.has(color)) continue;
    used.add(color);
    if (distinct(options, at + 1, used)) return true;
    used.delete(color);
  }
  return false;
}

function numericPatterns(state, board, cells, column) {
  const candidates = [];
  const colonnade = column && has(state, 'colonnade') ? 3 : 0;
  const acanthus = has(state, 'acanthus') ? 5 : 0;
  for (let length = cells.length; length >= 1; length--) {
    for (let index = 0; index + length <= cells.length; index++) {
      const segment = cells.slice(index, index + length);
      const dice = segment.map(cell => board[cell]);
      if (dice.some(die => !die) || !dice.some(isFresh)) continue;
      let variants = [[]];
      for (const die of dice) {
        const spec = getDieSpec(state, die);
        const value = !die.stone && !die.numberChanged && spec && hasFace(spec.wild, die.face) ? null : die.value;
        const choices = die.extra == null ? [[value]] : [[value], [die.extra], [value, die.extra], [die.extra, value]];
        variants = variants.flatMap(prefix => choices.map(choice => [...prefix, ...choice]));
      }
      let repetitions = 0, straight = 0;
      for (const values of variants) {
        const count = values.length;
        if (count < 2 || count > 4) continue;
        const concrete = values.filter(value => value != null);
        if (concrete.every(value => value === concrete[0])) repetitions = Math.max(repetitions, count);
        if (count >= 3 && [1, -1].some(direction => [1, 2, 3, 4, 5, 6].some(start => {
          const last = start + (count - 1) * direction;
          return last >= 1 && last <= 6 && values.every((value, offset) => value == null || value === start + offset * direction);
        }))) straight = Math.max(straight, count);
      }
      if (repetitions) {
        const [combo, name, points] = repetitions === 4 ? ['quartet', 'Cuarteto', getComboValue(state, 'quartet')] : repetitions === 3 ? ['trio', 'Trío', getComboValue(state, 'trio')] : ['pair', 'Pareja', getComboValue(state, 'pair')];
        candidates.push({ combo, name, points: points + colonnade, cells: segment });
      }
      if (straight) candidates.push({ combo: straight === 4 ? 'longStraight' : 'straight', name: straight === 4 ? 'Escalera larga' : 'Escalera',
        points: (straight === 4 ? getComboValue(state, 'longStraight') : getComboValue(state, 'straight')) + colonnade + acanthus, cells: segment });
    }
  }
  const taken = new Set();
  return candidates.sort((a, b) => b.points - a.points).filter(item => {
    if (item.cells.some(cell => taken.has(cell))) return false;
    item.cells.forEach(cell => taken.add(cell));
    return true;
  });
}

function evaluateLine(state, board, cells, column, axis, score, stones, stainedCell = -1) {
  const dice = cells.map(cell => board[cell]);
  if (!dice.some(isFresh)) return;
  const numeric = numericPatterns(state, board, cells, column);
  const full = dice.every(Boolean);
  const numbers = full ? [{ combo: 'line', name: 'Línea llena', points: getComboValue(state, 'line'), cells }, ...numeric] : numeric;
  const highlighted = new Set(numbers.flatMap(item => item.cells));
  numeric.flatMap(item => item.cells).filter(cell => board[cell].stone).forEach(cell => stones.add(cell));
  score.numberSteps.push(...numbers);
  const eligibleColor = die => Boolean(die && (!die.stone || has(state, 'livingGlaze')));
  const checkColorSegment = seg => {
    const segDice = seg.map(c => board[c]);
    if (!segDice.some(isFresh) || !segDice.every(eligibleColor)) return null;
    const options = segDice.flatMap((die, i) => {
      const choices = colors(state, getDieSpec(state, die), die, seg[i], stainedCell);
      return die.extra == null ? [choices] : [choices, choices];
    });
    if (!options.length || options.some(list => !list.length)) return null;
    if (options[0].some(shade => options.every(list => list.includes(shade)))) {
      return { combo: 'mono', name: 'Monocolor', add: getComboValue(state, 'mono') + (has(state, 'frieze') ? 25 : 0), cells: seg };
    }
    if (distinct(options)) {
      return { combo: 'chromatic', name: 'Colores distintos', add: getComboValue(state, 'chromatic') + (has(state, 'prism') ? 15 : 0), cells: seg };
    }
    return null;
  };
  let color = null;
  if (bossKey(state) !== 'whitewash') {
    if (full) color = checkColorSegment(cells);
    if (!color && has(state, 'lattice') && cells.length >= 3) {
      for (let start = 0; start + 3 <= cells.length; start++) {
        const candidate = checkColorSegment(cells.slice(start, start + 3));
        if (candidate && (!color || candidate.combo === 'mono' && color.combo !== 'mono')) {
          color = candidate;
          if (color.combo === 'mono') break;
        }
      }
    }
    if (color) {
      score.colorSteps.push(color);
      color.cells.forEach(cell => highlighted.add(cell));
      if (stainedCell >= 0 && color.cells.includes(stainedCell)) {
        score.colorSteps.push({ name: 'Vidriera del Sultán', add: 20, cells: [stainedCell] });
      }
    }
  }
  if (highlighted.size) score.matches.push({ column, axis, cells: cells.filter(cell => highlighted.has(cell)),
    name: numeric.map(item => item.name).join(' + ') || color?.name || 'Línea',
    points: numbers.reduce((sum, item) => sum + item.points, 0), add: color?.add ?? 0 });
}

export function preview(state) {
  const score = { count: 0, base: 0, multiplier: 1, total: 0, gold: 0, matches: [], powerMarks: [], dieSteps: [], numberSteps: [], colorSteps: [] };
  const fresh = state.board.filter(isFresh);
  score.count = fresh.length;
  if (!score.count) return score;
  const { cols, rows } = state;
  const { board, numberSteps, colorSteps } = projectBoard(state);
  let stainedCell = -1;
  if (has(state, 'stainedGlass')) {
    let bestVal = -1;
    board.forEach((die, cell) => {
      if (!die || die.stone || !isFresh(die)) return;
      const v = Math.max(die.value, die.extra ?? -1);
      if (v > bestVal) { bestVal = v; stainedCell = cell; }
    });
  }
  const stones = new Set();
  for (let row = 0; row < rows; row++) evaluateLine(state, board, Array.from({ length: cols }, (_, col) => row * cols + col), false, row, score, stones, stainedCell);
  for (let col = 0; col < cols; col++) evaluateLine(state, board, Array.from({ length: rows }, (_, row) => row * cols + col), true, col, score, stones, stainedCell);
  score.numberSteps.push(...numberSteps);
  score.colorSteps.push(...colorSteps);
  score.powerMarks = [...numberSteps, ...colorSteps];
  if (has(state, 'mortar')) for (const cell of stones) score.numberSteps.push({ name: 'Mortero Kintsugi', points: board[cell].value, cells: [cell] });

  const cornerSet = new Set([0, cols - 1, (rows - 1) * cols, rows * cols - 1]);
  const basalt = [], cobalt = [], saffron = [], emerald = [], terracottaCells = [], cornerCells = [], freshCells = [];
  let terracottaPts = 0;
  board.forEach((die, cell) => {
    if (!die) return;
    if (die.stone) { basalt.push(cell); return; }
    if (isFresh(die)) freshCells.push(cell);
    const spec = getDieSpec(state, die);
    if (!spec) return;
    const factor = (hasFace(spec.boost, die.face) ? (spec.boostMult || 2) : 1) * (die.sealed ? 2 : 1);
    const values = die.extra == null ? [die.value] : [die.value, die.extra];
    for (const value of values) {
      const label = die.echo ? 'Copia' : spec.unique ? uniqueDice[spec.unique].name : 'Dado';
      // Boss rules can cancel a die's own points; the step stays so the sequence explains why.
      const cancelled = eclipsed(state, spec) ? 'eclipsado' : bossKey(state) === 'balance' && value % 2 ? 'impar' : '';
      if (cancelled) score.dieSteps.push({ name: `${label} ${value} · ${cancelled}`, points: 0, cells: [cell] });
      else score.dieSteps.push({ name: factor > 1 ? `${label} ${value} × ${factor}` : `${label} ${value}`, points: value * factor, cells: [cell] });
      if (value === 1 && has(state, 'aces')) score.numberSteps.push({ name: 'Ases de artesano', points: 5, cells: [cell] });
      if (value === 6 && has(state, 'sixes')) score.numberSteps.push({ name: 'Seises de taller', points: 4, cells: [cell] });
    }
    if (cornerSet.has(cell) && has(state, 'corners')) cornerCells.push(cell);
    if (isFresh(die) && hasFace(spec.gild, die.face)) score.gold += (spec.goldYield || 3);
    const dieColors = colors(state, spec, die, cell, stainedCell);
    if (dieColors.includes(0)) cobalt.push(...values.map(() => cell));
    if (dieColors.includes(1)) saffron.push(...values.map(() => cell));
    if (dieColors.includes(2)) emerald.push(...values.map(() => cell));
    const row = Math.floor(cell / cols), col = cell % cols;
    const orthogonal = [col > 0 ? cell - 1 : -1, col < cols - 1 ? cell + 1 : -1,
      row > 0 ? cell - cols : -1, row < rows - 1 ? cell + cols : -1];
    const hasStoneNeighbor = orthogonal.some(index => board[index]?.stone);
    if (dieColors.includes(3)) {
      terracottaCells.push(cell);
      terracottaPts += values.length * (hasStoneNeighbor ? 8 : 6);
    }
    const adjacent = orthogonal.filter(index => {
      const neighbor = board[index];
      return neighbor?.stone && getDieSpec(state, neighbor)?.obsidian;
    });
    if (adjacent.length) {
      const bonus = getDieSpec(state, board[adjacent[0]])?.obsidianBonus || 4;
      score.numberSteps.push({ name: 'Obsidiana', points: adjacent.length * bonus * values.length, cells: [cell, ...adjacent] });
    }
  });
  if (score.count >= 4 && has(state, 'fourfold')) {
    score.numberSteps.push({ name: 'Compás de cuatro', points: 7, cells: freshCells });
    score.gold += 1;
  }
  if (cornerCells.length && has(state, 'corners')) {
    score.numberSteps.push({ name: 'Bisel de esquina', points: cornerCells.length * 5, cells: cornerCells });
  }
  const pairSteps = score.numberSteps.filter(step => step.combo === 'pair');
  if (pairSteps.length >= 2) {
    const pairCells = [...new Set(pairSteps.flatMap(step => step.cells))];
    if (has(state, 'doublePair')) score.numberSteps.push({ name: 'Doble compás', points: 12, cells: pairCells });
    if (has(state, 'symmetry')) score.colorSteps.push({ name: 'Simetría gemela', add: 45 + (pairSteps.length - 2) * 15, cells: pairCells });
  }
  const stairSteps = score.numberSteps.filter(step => step.combo === 'straight' || step.combo === 'longStraight');
  if (stairSteps.length && has(state, 'glazedSteps')) {
    score.colorSteps.push({ name: 'Peldaños vidriados', add: stairSteps.length * 15, cells: [...new Set(stairSteps.flatMap(step => step.cells))] });
  }
  if (basalt.length && has(state, 'basalt')) score.colorSteps.push({ name: 'Campanas de basalto', add: basalt.length * 8, cells: basalt });
  if (bossKey(state) !== 'whitewash') {
    if (cobalt.length && has(state, 'cobalt')) score.colorSteps.push({ name: 'Resonancia cobalto', add: cobalt.length * 15, cells: [...new Set(cobalt)] });
    if (saffron.length && has(state, 'saffron')) {
      const sCells = [...new Set(saffron)];
      score.numberSteps.push({ name: 'Sol de azafrán', points: saffron.length * 4, cells: sCells });
      if (sCells.length >= 3) score.gold += 2;
    }
    if (emerald.length && has(state, 'emerald')) {
      const eCells = [...new Set(emerald)];
      score.numberSteps.push({ name: 'Jardín esmeralda', points: emerald.length * 2, cells: eCells });
      score.colorSteps.push({ name: 'Jardín esmeralda', add: emerald.length * 12, cells: eCells });
    }
    if (terracottaCells.length && has(state, 'terracotta')) {
      score.numberSteps.push({ name: 'Arcilla viva', points: terracottaPts, cells: terracottaCells });
    }
  }
  if ((state.chiselCount || 0) > 0 && has(state, 'chiselDust')) {
    score.colorSteps.push({ name: 'Polvo de cincel', add: state.chiselCount * 12, cells: [] });
  }
  if (board.every(Boolean)) {
    const cells = board.map((_, index) => index);
    score.numberSteps.push({ combo: 'panel', name: 'Panel completo', points: getComboValue(state, 'panel'), cells });
    if (has(state, 'alhambra')) score.colorSteps.push({ name: 'Gran Alhambra', factor: 1.35, cells });
  }
  if (has(state, 'nasridStar') && score.numberSteps.some(step => Boolean(step.combo)) &&
      score.colorSteps.some(step => step.combo === 'mono' || step.combo === 'chromatic')) {
    score.colorSteps.push({ name: 'Estrella nazarí', factor: 1.30, cells: [...new Set(score.matches.flatMap(m => m.cells))] });
  }
  const order = orderAt(state.stage);
  if (order && !state.orders.includes(order.key) && [...score.numberSteps, ...score.colorSteps].some(step => order.combos.includes(step.name))) {
    score.order = order;
    score.gold += order.gold;
  }
  score.base = [...score.dieSteps, ...score.numberSteps].reduce((sum, item) => sum + item.points, 0);
  score.multiplier = score.colorSteps.reduce((multiplier, item) => item.factor ? multiplier * item.factor : multiplier + item.add / 100, 1);
  score.total = Math.round(score.base * score.multiplier);
  return score;
}

function openShop(state, random) {
  state.phase = 'shop';
  const diff = state.difficulty ?? 0;
  const baseGold = diff >= 2 ? 5 + Math.min(3, Math.floor(state.stage / 8)) : 10 + Math.min(6, Math.floor(state.stage / 4));
  const turnGold = diff >= 2 ? (has(state, 'patience') ? state.turns : 0) : state.turns * (has(state, 'patience') ? 2 : 1);
  const bossGold = bossAt(state) ? (diff >= 2 ? Math.floor(BOSS_GOLD / 2) : BOSS_GOLD) : 0;
  state.gold += baseGold + turnGold + bossGold;
  state.market = market(state.stage, state.powers, random, state.bag, state.uniques, state.comboLevels);
  ensureBoss(state, state.stage + 1, random);
  const held = state.hand.filter(die => die && !state.bag[die.id]?.unique).map(die => die.id);
  const rest = state.bag.flatMap((spec, id) => spec && !spec.unique && !held.includes(id) ? [id] : []);
  state.forgeHand = choose([...held, ...choose(rest, handSize - held.length, random)], handSize, random);
}

export function commit(state, random = Math.random) {
  if (state.phase !== 'play') return null;
  const score = preview(state);
  if (!score.count) return null;
  state.turns--;
  state.points += score.total;
  state.lastScore = score.total;
  state.gold += score.gold;
  if (score.order) state.orders.push(score.order.key);
  if (!state.comboCounts || typeof state.comboCounts !== 'object') state.comboCounts = defaultComboCounts();
  for (const step of [...score.numberSteps, ...score.colorSteps]) {
    if (step.combo) state.comboCounts[step.combo] = (state.comboCounts[step.combo] || 0) + 1;
  }

  const { board } = projectBoard(state);
  for (let cell = 0; cell < state.board.length; cell++) {
    const projected = board[cell];
    const actual = state.board[cell];
    if (actual && projected) {
      if (projected.numberChanged) {
        actual.value = projected.value;
        actual.numberChanged = true;
        const spec = getDieSpec(state, actual);
        const matchFace = spec?.faces?.indexOf(actual.value);
        if (matchFace != null && matchFace >= 0) actual.face = matchFace;
      }
      if (projected.extra != null) {
        actual.extra = projected.extra;
      }
    }
  }

  for (const die of state.board) if (isFresh(die)) {
    const spec = getDieSpec(state, die);
    die.fixed = true;
    die.stone = !spec?.eternal;
  }
  // Re-roll unplayed unique dice in uniqueRack
  const reRolledUniques = [];
  if (Array.isArray(state.uniqueRack)) {
    for (let slot = 0; slot < 3; slot++) {
      const die = state.uniqueRack[slot];
      if (die && state.uniques?.[die.uniqueIndex]) {
        const spec = state.uniques[die.uniqueIndex];
        const face = Math.floor(random() * 6);
        die.face = face;
        die.value = spec.faces[face];
        reRolledUniques.push(`u_${die.uniqueIndex}`);
      }
    }
  }
  const blocked = state.board.every(Boolean) && (!state.chisels || !state.board.some(die => die.stone));
  if (state.points >= state.goal) {
    state.results.push(state.points);
    if (state.stage + 1 === campaignLength && !state.endless) state.phase = 'won';
    else openShop(state, random);
  } else if (!state.turns || blocked) state.phase = 'lost';
  const drawn = state.phase === 'play' ? replenish(state, random) : [];
  score.drawn = [...drawn, ...reRolledUniques];
  return score;
}

export function continueEndless(state, random = Math.random) {
  if (state.phase !== 'won') return false;
  state.endless = true;
  openShop(state, random);
  return true;
}

export function canBuy(state, kind, key) {
  if (state.phase !== 'shop') return false;
  if (kind === 'tile') return state.market.tiles.includes(key) && !state.powers.includes(key) &&
    state.powers.length < tileLimit && state.gold >= powers[key].price;
  const item = state.market.dice[key];
  if (!item || state.market.purchased.includes(key)) return false;
  if (item.combo) return state.gold >= item.price;
  if (item.unique) {
    const alreadyOwned = state.uniques.some(spec => spec?.unique === item.unique);
    return !alreadyOwned && state.gold >= rarities[item.rarity].price;
  }
  return false;
}

export function buy(state, kind, key, replaceIndex = null) {
  if (!canBuy(state, kind, key)) return false;
  if (kind === 'tile') {
    const tile = powers[key];
    state.gold -= tile.price;
    state.powers.push(key);
    state.history.push({ stage: state.stage, action: 'Azulejo comprado', item: tile.name, gold: -tile.price });
  } else {
    const item = state.market.dice[key];
    if (item.combo) {
      state.gold -= item.price;
      state.comboLevels[item.combo] = (state.comboLevels[item.combo] || 1) + 1;
      state.market.purchased.push(key);
      state.history.push({ stage: state.stage, action: 'Mejora de combo', item: `${comboCatalog[item.combo].name} Niv. ${state.comboLevels[item.combo]}`, gold: -item.price });
    } else if (item.unique) {
      const price = rarities[item.rarity].price;
      state.gold -= price;
      if (state.uniques.length < 3) {
        state.uniques.push({ ...item, faces: [...item.faces] });
      } else if (replaceIndex != null && replaceIndex >= 0 && replaceIndex < 3) {
        state.uniques[replaceIndex] = { ...item, faces: [...item.faces] };
      }
      state.market.purchased.push(key);
      state.history.push({ stage: state.stage, action: 'Dado único comprado', item: diceName(item), faces: [...item.faces], gold: -price });
    }
  }
  return true;
}

export function breakUnique(state, index) {
  if (!state.uniques || index < 0 || index >= state.uniques.length) return false;
  const spec = state.uniques[index];
  state.uniques.splice(index, 1);
  if (state.uniqueRack) {
    state.uniqueRack.splice(index, 1);
    state.uniqueRack.push(null);
    state.uniqueRack.forEach((d, i) => { if (d) { d.uniqueIndex = i; d.slot = i; } });
  }
  if (state.board) {
    for (let c = 0; c < state.board.length; c++) {
      const d = state.board[c];
      if (d?.isUnique) {
        if (d.uniqueIndex === index) state.board[c] = null;
        else if (d.uniqueIndex > index) d.uniqueIndex--;
      }
    }
  }
  state.history.push({ stage: state.stage, action: 'Dado único roto', item: uniqueDice[spec.unique]?.name || 'Dado único', gold: 0 });
  return true;
}

export function sellTile(state, key) {
  const index = state.powers.indexOf(key);
  if (state.phase !== 'shop' || index < 0) return false;
  state.powers.splice(index, 1);
  const gold = Math.floor(powers[key].price / 2);
  state.gold += gold;
  state.history.push({ stage: state.stage, action: 'Azulejo vendido', item: powers[key].name, gold });
  return true;
}

export const OVEN_COST = 6;
export const ovenCost = state => ((state?.difficulty ?? 0) >= 3 ? OVEN_COST : 0);

export function canForge(state, key, ids, color) {
  const upgrade = upgrades[key];
  const cost = ovenCost(state);
  return state.phase === 'shop' && !state.market.forged && state.market.oven.includes(key) &&
    state.gold >= cost &&
    ids.length === 1 && ids.every(id => state.forgeHand.includes(id) && state.bag[id] && !state.bag[id].unique) &&
    canEnchant(state.bag[ids[0]], key, color);
}

export function forge(state, key, ids, color, random = Math.random) {
  if (!canForge(state, key, ids, color)) return null;
  const cost = ovenCost(state);
  state.gold -= cost;
  const [first] = ids;
  const spec = enchant(state.bag[first], key, color, random);
  state.market.forged = true;
  state.bag[first] = spec;
  for (const die of [...state.board, ...state.hand]) if (die?.id === first) die.value = spec.faces[die.face];
  state.history.push({ stage: state.stage, action: upgrades[key].name, item: diceName(spec), faces: [...spec.faces], gold: -cost });
  return spec;
}

export function advance(state, random = Math.random) {
  if (state.phase !== 'shop') return [];
  state.stage++;
  return startStage(state, random);
}

function validSpec(spec) {
  if (spec?.combo) return Object.hasOwn(comboCatalog, spec.combo) && Number.isInteger(spec.level);
  if (spec?.unique != null) return Object.hasOwn(uniqueDice, spec.unique) && spec.rarity === 5 && spec.rainbow === true &&
    Array.isArray(spec.faces) && spec.faces.length === 6 && spec.faces.every((value, face) => value === uniqueDice[spec.unique].faces[face]);
  return Boolean(glazes[spec?.glaze] && (spec.second == null || glazes[spec.second]) && rarities[spec.rarity] &&
    spec.rarity !== 5 &&
    Array.isArray(spec.faces) && spec.faces.length === 6 && spec.faces.every(value => Number.isInteger(value) && value >= 1 && value <= 6) &&
    [spec.gild, spec.boost, spec.wild].every(mask => Number.isInteger(mask) && mask >= 0 && mask <= 63));
}

const validBoss = boss => Boolean(boss && Object.hasOwn(bosses, boss.key) && (boss.key !== 'eclipse' || basicColors.includes(boss.color)));

export function validSave(state) {
  if (state?.version !== 7 || !Object.hasOwn(decks, state.deck) ||
      (state.difficulty != null && (!Number.isInteger(state.difficulty) || state.difficulty < 0 || state.difficulty > 5)) ||
      !Array.isArray(state.bosses) || !state.bosses.every(validBoss) || !['play', 'shop', 'won', 'lost'].includes(state.phase) || !Number.isSafeInteger(state.goal) || state.goal < 1 ||
      ![state.stage, state.points, state.turns, state.maxTurns, state.gold, state.chisels].every(value => Number.isSafeInteger(value) && value >= 0) ||
      ![3, 4].includes(state.cols) || ![2, 3, 4].includes(state.rows) || !Array.isArray(state.board) || state.board.length !== state.rows * state.cols ||
      !Array.isArray(state.hand) || state.hand.length !== handSize || !Array.isArray(state.bag) || !Array.isArray(state.powers) ||
      !Array.isArray(state.results) || !Array.isArray(state.forgeHand) || !state.powers.every(key => Object.hasOwn(powers, key)) ||
      state.powers.length > tileLimit || state.results.length !== state.stage + (['shop', 'won'].includes(state.phase) ? 1 : 0) || dieCount(state) < handSize ||
      typeof state.endless !== 'boolean' || state.phase === 'won' && (state.stage !== campaignLength - 1 || state.endless) ||
      !Array.isArray(state.orders) || !state.orders.every(key => orders.some(order => order.key === key)) ||
      !Array.isArray(state.history) || !state.history.every(entry => entry && Number.isSafeInteger(entry.stage) && entry.stage >= 0 &&
        typeof entry.action === 'string' && typeof entry.item === 'string' && Number.isSafeInteger(entry.gold) &&
        (entry.faces == null || Array.isArray(entry.faces) && entry.faces.length === 6 && entry.faces.every(value => Number.isInteger(value) && value >= 1 && value <= 6))) ||
      !state.comboLevels || typeof state.comboLevels !== 'object' ||
      !state.comboCounts || typeof state.comboCounts !== 'object' ||
      !Number.isInteger(state.chiselCount) || state.chiselCount < 0 ||
      !Array.isArray(state.uniques) || state.uniques.length > 3) return false;
  const active = [...state.board, ...state.hand].filter(Boolean);
  return state.bag.every(spec => spec === null || validSpec(spec)) &&
    (state.phase !== 'shop' || (Array.isArray(state.market?.dice) && state.market.dice.every(validSpec) && Array.isArray(state.market.tiles) &&
      state.market.tiles.every(key => Object.hasOwn(powers, key)) && Array.isArray(state.market.purchased) && state.forgeHand.every(id => state.bag[id]) &&
      typeof state.market.forged === 'boolean' && Array.isArray(state.market.oven) && state.market.oven.length === 2 &&
      new Set(state.market.oven).size === 2 && state.market.oven.every(key => Object.hasOwn(upgrades, key))));
}

export function restoreRun(old, random = Math.random) {
  if (validSave(old)) return old;
  if (old?.version === 6 || old?.version === 7) {
    const difficulty = Number.isInteger(old.difficulty) && old.difficulty >= 0 && old.difficulty <= 5 ? old.difficulty : 0;
    const comboLevels = { ...defaultComboLevels(), ...(old.comboLevels || {}) };
    const comboCounts = { ...defaultComboCounts(), ...(old.comboCounts || {}) };
    const chiselCount = Number.isInteger(old.chiselCount) && old.chiselCount >= 0 ? old.chiselCount : 0;
    const uniques = Array.isArray(old.uniques) ? old.uniques : [];
    const uniqueRack = Array.isArray(old.uniqueRack) ? old.uniqueRack : Array(3).fill(null);
    let market = old.market;
    if (old.phase === 'shop' && market) {
      const oven = Array.isArray(market.oven) && market.oven.every(k => Object.hasOwn(upgrades, k)) && market.oven.length === 2
        ? market.oven : ovenOffers(random);
      market = { ...market, forged: Boolean(market.forged), oven };
    }
    const state = { ...old, version: 7, difficulty, comboLevels, comboCounts, chiselCount, uniques, uniqueRack, market };
    return validSave(state) ? state : null;
  }
  // Runs from before bags and bosses keep the classic bag and get their bosses now.
  if (old?.version === 5) {
    const state = { ...old, version: 6, deck: 'classic', bosses: [] };
    for (let stage = BOSS_EVERY - 1; stage <= Math.max(campaignLength - 1, (state.stage ?? 0) + 1); stage += BOSS_EVERY) ensureBoss(state, stage, random);
    return restoreRun(state, random);
  }
  if (old?.version === 4) {
    const state = { ...old, version: 5, orders: [], history: [], endless: Array.isArray(old.results) && old.results.length >= campaignLength };
    return restoreRun(state, random);
  }
  if (old?.version === 3) {
    const index = old.stage;
    const goal = index < 9 ? [46, 56, 66, 77, 87, 97, 110, 122, 133][index]
      : 144 + Math.round(103 * (1 - Math.exp(-(index - 9) / 22)));
    const legacy = { ...old, version: 4, goal, bag: Array.isArray(old.bag) ? [...old.bag] : old.bag, hand: Array.isArray(old.hand) ? [...old.hand] : old.hand };
    if (legacy.phase === 'shop' && legacy.market) legacy.market = { ...legacy.market, oven: ovenOffers(random), forged: false };
    const state = restoreRun(legacy, random);
    if (!state) return null;
    if (state.phase === 'play') {
      stockBag(state, false, random);
      if (!state.board.some(isFresh)) replenish(state, random);
    }
    return state;
  }
  if (old?.version !== 2 || ![0, 1, 2].includes(old.stage) || !Array.isArray(old.bag) || !Array.isArray(old.board) ||
      !Array.isArray(old.hand) || !Array.isArray(old.results) || !Array.isArray(old.powers)) return null;
  const state = { ...old, version: 3, cols: 3, rows: old.board.length / 3, maxTurns: 4,
    bag: old.bag.map(spec => plainDie(spec.glaze)), market: null, forgeHand: [],
    powers: old.powers.filter(key => Object.hasOwn(powers, key)) };
  const convert = die => die ? { id: die.id, slot: die.slot, face: die.value - 1, value: die.value, stone: Boolean(die.stone), fixed: Boolean(die.stone) } : null;
  state.board = old.board.map(convert);
  state.hand = old.hand.map(convert);
  if (old.phase === 'shop' || old.phase === 'won') {
    const oldGold = state.gold;
    openShop(state, random);
    if (old.phase === 'shop') state.gold = oldGold;
  }
  return restoreRun(state, random);
}
