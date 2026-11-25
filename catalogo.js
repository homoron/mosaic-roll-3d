import { uniqueDice } from './unicos.js?v=esmaltes-30';

export const glazes = [
  { name: 'Cobalto', color: '#1e40af', light: '#72a9db' },
  { name: 'Amarillo azafrán', color: '#d97706', light: '#f2c772' },
  { name: 'Verde esmeralda', color: '#047857', light: '#86c5a2' },
  { name: 'Terracota', color: '#b91c1c', light: '#e99a7d' },
  { name: 'Amatista', color: '#7e22ce', light: '#c29ae1' },
  { name: 'Mármol de Carrara', color: '#bdc7d5', light: '#f5f0e6', darkPips: true },
  { name: 'Oro Kintsugi', color: '#dba52b', light: '#fff0a1', darkPips: true },
];

const colorFaces = [
  [1, 2, 2, 4, 6, 6], // Cobalto
  [1, 2, 3, 3, 6, 6], // Azafrán
  [1, 1, 4, 4, 5, 6], // Esmeralda
  [2, 2, 3, 4, 5, 5], // Terracota
];
export const basicColors = colorFaces.map((_, id) => id);

export const rarities = [
  { name: 'Común', color: '#abc2d0', ink: '#244c78', price: 3 },
  { name: 'Poco común', color: '#7bd9b8', ink: '#1a6b58', price: 5 },
  { name: 'Raro', color: '#78c8ff', ink: '#1d5c9b', price: 7 },
  { name: 'Épico', color: '#d4a2ff', ink: '#723ca3', price: 10 },
  { name: 'Legendario', color: '#ffd779', ink: '#a16a24', price: 13 },
  { name: 'Único', color: '#f3e2ff', ink: '#694486', price: 12 },
];

export const powers = {
  chisel: { name: 'Cincel de Hefesto', price: 4, rarity: 0, text: '+1 carga de cincel por mosaico.' },
  midas: { name: 'Cincel de Midas', price: 4, rarity: 0, text: '+2 de oro cada vez que cincelas.' },
  aces: { name: 'Ases de artesano', price: 4, rarity: 0, text: '+5 puntos base por cada dado activo de valor 1.' },
  sixes: { name: 'Seises de taller', price: 4, rarity: 0, text: '+4 puntos base por cada dado activo de valor 6.' },
  fourfold: { name: 'Compás de cuatro', price: 4, rarity: 0, text: '+7 puntos base y +1 de oro si colocas 4 dados en el mismo turno.' },
  colonnade: { name: 'Columnata', price: 5, rarity: 1, text: '+3 puntos por cada combo numérico en columna.' },
  acanthus: { name: 'Acanto', price: 5, rarity: 1, text: '+5 puntos base por cada escalera.' },
  doublePair: { name: 'Doble compás', price: 5, rarity: 1, text: '+12 puntos base si activas 2 o más parejas en la misma jugada.' },
  corners: { name: 'Bisel de esquina', price: 5, rarity: 1, text: '+5 puntos base por cada dado activo en las 4 esquinas del tablero.' },
  glazedSteps: { name: 'Peldaños vidriados', price: 5, rarity: 1, text: 'Cada escalera añade +0,15× al multiplicador además de sus puntos.' },
  cobalt: { name: 'Resonancia cobalto', price: 6, rarity: 2, text: '+0,15× por cada dado activo que cuente como cobalto.' },
  saffron: { name: 'Sol de azafrán', price: 6, rarity: 2, text: '+4 puntos base por cada dado activo que cuente como azafrán (si hay 3 o más, +2 de oro).' },
  emerald: { name: 'Jardín esmeralda', price: 6, rarity: 2, text: '+0,12× y +2 puntos base por cada dado activo que cuente como esmeralda.' },
  terracotta: { name: 'Arcilla viva', price: 6, rarity: 2, text: '+6 puntos base por cada dado activo que cuente como terracota (+2 extra si toca una piedra).' },
  frieze: { name: 'Friso real', price: 6, rarity: 2, text: '+0,25× adicional por cada línea monocolor.' },
  prism: { name: 'Lente prismática', price: 6, rarity: 2, text: '+0,15× adicional por cada línea de colores distintos.' },
  patience: { name: 'Paciencia del artesano', price: 6, rarity: 2, text: '+1 de oro por cada turno sin usar al superar un mosaico.' },
  lattice: { name: 'Celosía de tres', price: 7, rarity: 2, text: 'Monocolor y Colores distintos también se activan con 3 dados seguidos.' },
  mortar: { name: 'Mortero Kintsugi', price: 8, rarity: 3, text: 'Las piedras de combos numéricos suman su valor una vez por turno.' },
  basalt: { name: 'Campanas de basalto', price: 8, rarity: 3, text: '+0,08× por cada piedra que haya en el tablero.' },
  livingGlaze: { name: 'Esmalte vivo', price: 9, rarity: 3, text: 'Las piedras conservan su color para formar Monocolor y Colores distintos.' },
  symmetry: { name: 'Simetría gemela', price: 9, rarity: 3, text: '+0,45× al multiplicador si activas 2 o más parejas (+0,15× por cada pareja adicional).' },
  chiselDust: { name: 'Polvo de cincel', price: 8, rarity: 3, text: '+0,12× durante este mosaico por cada piedra que cinceles.' },
  alhambra: { name: 'Gran Alhambra', price: 11, rarity: 4, text: 'Multiplica por 1,35 la jugada si el tablero está lleno.' },
  stainedGlass: { name: 'Vidriera del Sultán', price: 12, rarity: 4, text: 'Tu dado nuevo de mayor valor cuenta como todos los colores y suma +0,20× por cada combo de color en el que participe.' },
  nasridStar: { name: 'Estrella nazarí', price: 12, rarity: 4, text: 'Multiplica por 1,30 la jugada si activas a la vez al menos un combo numérico y uno de color.' },
};

export const comboCatalog = {
  pair: {
    key: 'pair',
    name: 'Pareja',
    glaze: 1,
    faces: [2, 2, 4, 4, 6, 6],
    basePoints: 6,
    gainPerLevel: 3,
    basePrice: 5,
    text: level => `+${6 + (level - 1) * 3} puntos base por pareja (+3 por nivel)`,
  },
  trio: {
    key: 'trio',
    name: 'Trío',
    glaze: 4,
    faces: [3, 3, 3, 5, 5, 5],
    basePoints: 12,
    gainPerLevel: 5,
    basePrice: 7,
    text: level => `+${12 + (level - 1) * 5} puntos base por trío (+5 por nivel)`,
  },
  quartet: {
    key: 'quartet',
    name: 'Cuarteto',
    glaze: 6,
    faces: [4, 4, 4, 4, 6, 6],
    basePoints: 23,
    gainPerLevel: 8,
    basePrice: 9,
    text: level => `+${23 + (level - 1) * 8} puntos base por cuarteto (+8 por nivel)`,
  },
  straight: {
    key: 'straight',
    name: 'Escalera',
    glaze: 0,
    faces: [1, 2, 3, 4, 5, 6],
    basePoints: 10,
    gainPerLevel: 5,
    basePrice: 6,
    text: level => `+${10 + (level - 1) * 5} puntos base por escalera (+5 por nivel)`,
  },
  longStraight: {
    key: 'longStraight',
    name: 'Escalera larga',
    glaze: 2,
    faces: [1, 2, 3, 4, 5, 6],
    basePoints: 17,
    gainPerLevel: 7,
    basePrice: 8,
    text: level => `+${17 + (level - 1) * 7} puntos base por escalera larga (+7 por nivel)`,
  },
  line: {
    key: 'line',
    name: 'Línea llena',
    glaze: 3,
    faces: [1, 2, 3, 4, 5, 6],
    basePoints: 3,
    gainPerLevel: 2,
    basePrice: 5,
    text: level => `+${3 + (level - 1) * 2} puntos base por línea llena (+2 por nivel)`,
  },
  mono: {
    key: 'mono',
    name: 'Monocolor',
    glaze: 0,
    faces: [2, 2, 4, 4, 6, 6],
    baseAdd: 40,
    gainPerLevel: 15,
    basePrice: 7,
    text: level => `+${((40 + (level - 1) * 15) / 100).toFixed(2)}× al multiplicador por monocolor (+0,15× por nivel)`,
  },
  chromatic: {
    key: 'chromatic',
    name: 'Colores distintos',
    glaze: 4,
    rainbow: true,
    faces: [1, 2, 3, 4, 5, 6],
    baseAdd: 25,
    gainPerLevel: 10,
    basePrice: 6,
    text: level => `+${((25 + (level - 1) * 10) / 100).toFixed(2)}× al multiplicador por colores distintos (+0,10× por nivel)`,
  },
  panel: {
    key: 'panel',
    name: 'Panel completo',
    glaze: 6,
    faces: [6, 6, 6, 6, 6, 6],
    basePoints: 10,
    gainPerLevel: 6,
    basePrice: 8,
    text: level => `+${10 + (level - 1) * 6} puntos base por panel lleno (+6 por nivel)`,
  },
};

export function comboOffer(key, currentLevel = 1) {
  const item = comboCatalog[key];
  const rarity = Math.min(4, Math.max(1, currentLevel));
  return {
    combo: key,
    name: item.name,
    level: currentLevel,
    nextLevel: currentLevel + 1,
    rarity,
    price: item.basePrice + (currentLevel - 1) * 2,
    glaze: item.glaze ?? 0,
    rainbow: Boolean(item.rainbow),
    gild: item.gild ?? 0,
    boost: 0,
    wild: 0,
    faces: [...item.faces],
  };
}

export const upgrades = {
  double: { name: 'Cristal de bismuto', price: 0, slots: 1, text: 'Todas las caras se vuelven ×2 (primera mejora) o ×4 (segunda mejora).' },
  gild: { name: 'Caras doradas', price: 0, slots: 1, text: 'Todas las caras se vuelven doradas (primera mejora) y dan el doble de oro al jugarse (segunda mejora).' },
  wild: { name: 'Cara comodín', price: 0, slots: 1, text: 'Graba estrellas comodín en 3 caras (primera mejora) o en todas las caras (segunda mejora).' },
  dye: { name: 'Añadir esmalte', price: 0, slots: 1, text: 'Añade un segundo color al dado (primera mejora) o lo vuelve multicolor total (segunda mejora).' },
  raise: { name: 'Talla +1', price: 0, slots: 1, text: 'Sube en uno todas las caras que estén por debajo de 6 (hasta 2 mejoras).' },
  uniform: { name: 'Talla armónica', price: 0, slots: 1, text: 'Copia a todas las caras un valor elegido al azar de este dado.' },
  eternal: { name: 'Esmalte eterno', price: 0, slots: 1, text: 'El dado conserva el color y sigue puntuando en cada jugada.' },
  obsidian: { name: 'Temple de obsidiana', price: 0, slots: 1, text: 'Como piedra, aporta +4 base (primera mejora) o +8 base (segunda mejora) a dados vecinos.' },
};

export const hasFace = (mask, face) => Boolean(mask & (1 << face));
export const diceName = spec => spec.unique ? uniqueDice[spec.unique].name : spec.combo ? `Mejora de ${comboCatalog[spec.combo].name}` : spec.rainbow ? 'Dado multicolor' : spec.second == null ? glazes[spec.glaze].name : `Quimera de ${glazes[spec.glaze].name.toLowerCase()} y ${glazes[spec.second].name.toLowerCase()}`;
export const dieCount = run => run.bag.filter(Boolean).length;
export const getDieSpec = (state, die) => die?.isUnique ? state.uniques?.[die.uniqueIndex] : state.bag?.[die?.id];
const indices = [0, 1, 2, 3, 4, 5];

export function plainDie(glaze, faces = [1, 2, 3, 4, 5, 6]) {
  return { glaze, faces: [...faces], rarity: 0, boost: 0, boostMult: 1, gild: 0, goldYield: 3, wild: 0, eternal: false, rainbow: false, obsidian: false, obsidianBonus: 4, upgrades: {} };
}

export const colorDie = glaze => plainDie(glaze, colorFaces[glaze]);
export const uniqueDie = key => ({ ...plainDie(0, uniqueDice[key].faces), unique: key, rarity: 5, rainbow: true });

function pick(items, random) { return items[Math.floor(random() * items.length)]; }

export function choose(items, count, random) {
  const pool = [...items];
  const result = [];
  while (result.length < count && pool.length) result.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return result;
}

export const ovenOffers = random => choose(Object.keys(upgrades), 2, random);

export function stockDie(rarity, random, glaze = pick(basicColors, random)) {
  const die = colorDie(glaze);
  die.rarity = rarity;
  if (rarity === 1) die.faces[0] = 6;
  if (rarity === 2) {
    const trait = pick(['boost', 'gild', 'wild'], random);
    die[trait] |= 1 << pick(indices, random);
  }
  if (rarity === 3) {
    const trait = pick(['rainbow', 'eternal', 'obsidian'], random);
    die[trait] = true;
    die.boost = 1 << pick(indices, random);
  }
  if (rarity === 4) {
    die.rainbow = true;
    die.faces = [2, 3, 4, 5, 6, 6];
    die.gild = (1 << 4) | (1 << 5);
    die.boost = 1 << 5;
  }
  return die;
}

export function market(stage, owned, random, bag = [], uniques = [], comboLevels = {}) {
  const ownedUniques = new Set([...bag.map(spec => spec?.unique), ...uniques.map(spec => spec?.unique)].filter(Boolean));
  const availableUniques = Object.keys(uniqueDice).filter(key => !ownedUniques.has(key));
  
  const comboKeys = choose(Object.keys(comboCatalog), 3, random);
  const exhibits = [];

  // Provide 1 unique die offer if available and random/stage conditions match, otherwise combo upgrade
  const offerUnique = availableUniques.length > 0 && (uniques.length < 3 || random() < 0.65);
  const uniqueSlot = offerUnique ? Math.floor(random() * 3) : -1;

  for (let slot = 0; slot < 3; slot++) {
    if (slot === uniqueSlot && availableUniques.length) {
      const uniqueKey = availableUniques[Math.floor(random() * availableUniques.length)];
      exhibits.push(uniqueDie(uniqueKey));
    } else {
      const comboKey = comboKeys[slot];
      const level = comboLevels[comboKey] || 1;
      exhibits.push(comboOffer(comboKey, level));
    }
  }

  const availableTiles = Object.keys(powers).filter(key => !owned.includes(key));
  const tiles = [];
  for (const minimum of [0, 1, 2]) {
    const pool = availableTiles.filter(key => !tiles.includes(key));
    const maximum = Math.min(4, Math.floor(stage / 3) + 2);
    const possible = pool.filter(key => powers[key].rarity >= minimum && powers[key].rarity <= maximum);
    if (pool.length) tiles.push(pick(possible.length ? possible : pool, random));
  }
  return { dice: exhibits, tiles, oven: ovenOffers(random), forged: false, purchased: [] };
}

export function canEnchant(spec, key, color) {
  if (!spec || spec.unique || !Object.hasOwn(upgrades, key)) return false;
  const upgradesMap = spec.upgrades || {};
  const tier = upgradesMap[key] || 0;
  if (tier >= 2) return false;
  switch (key) {
    case 'raise': return spec.faces.some(value => value < 6);
    case 'dye':
      if (tier === 0) return basicColors.includes(color) && color !== spec.glaze && !spec.rainbow;
      return !spec.rainbow;
    case 'gild':
      if (tier === 0) return spec.gild !== 63;
      return (spec.goldYield || 3) < 6;
    case 'double':
      if (tier === 0) return spec.boost !== 63;
      return (spec.boostMult || 2) < 4;
    case 'wild':
      if (tier === 0) return spec.wild !== 63;
      return spec.wild !== 63 || tier < 2;
    case 'obsidian':
      if (tier === 0) return !spec.obsidian;
      return (spec.obsidianBonus || 4) < 8;
    case 'eternal':
      return !spec.eternal;
    case 'uniform':
      return spec.faces.some(value => value !== spec.faces[0]);
    default:
      return false;
  }
}

export function enchant(spec, key, color, random) {
  if (!canEnchant(spec, key, color)) return null;
  const die = {
    ...spec,
    faces: [...spec.faces],
    upgrades: { ...(spec.upgrades || {}) },
    rarity: Math.max(spec.rarity, key === 'eternal' || key === 'dye' ? 2 : 1),
  };
  const tier = die.upgrades[key] || 0;
  const nextTier = tier + 1;
  die.upgrades[key] = nextTier;

  switch (key) {
    case 'raise':
      die.faces = die.faces.map(value => Math.min(6, value + 1));
      break;
    case 'dye':
      if (tier === 0) {
        die.second = color;
      } else {
        die.rainbow = true;
      }
      break;
    case 'gild':
      die.gild = 63;
      if (tier === 0) {
        die.goldYield = 3;
      } else {
        die.goldYield = 6;
      }
      break;
    case 'double':
      die.boost = 63;
      if (tier === 0) {
        die.boostMult = 2;
      } else {
        die.boostMult = 4;
      }
      break;
    case 'wild':
      if (tier === 0) {
        const nonWild = indices.filter(face => !hasFace(die.wild, face));
        const picked = choose(nonWild, Math.min(3, nonWild.length), random);
        for (const face of picked) die.wild |= (1 << face);
      } else {
        die.wild = 63;
      }
      break;
    case 'obsidian':
      die.obsidian = true;
      die.obsidianBonus = nextTier === 1 ? 4 : 8;
      break;
    case 'eternal':
      die.eternal = true;
      break;
    case 'uniform':
      die.faces.fill(pick(die.faces, random));
      break;
  }
  return die;
}

export function fuse(first, second) {
  return null;
}
