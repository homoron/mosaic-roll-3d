import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { glazes, hasFace, powers, rarities } from './catalogo.js?v=esmaltes-30';

const pips = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
const stoneGlaze = { color: '#65737c', light: '#a7adb1', darkPips: true };
const rainbow = ['#ef8a76', '#f1c563', '#a0cf9d', '#69a7db', '#9874c1', '#de8aaf'];
// The devices correspond to the powers and stay legible on every face.
const relics = {
  bud:     { light: '#edf5d6', color: '#9ad187', ink: '#184e35', trim: '#34784d', cut: .16, device: 'M64 35V26 M64 33Q46 33 39 17Q57 16 64 30Q71 16 89 17Q82 33 64 33 M29 94Q16 83 17 66 M99 94Q112 83 111 66' },
  matrix:  { light: '#f4cbdc', color: '#dd8eaa', ink: '#5b193d', trim: '#993c69', cut: .105, device: 'M40 17H88 M35 25H93 M42 33H86 M13 52H27 M13 61H27 M101 52H115 M101 61H115 M24 102H104' },
  glass:   { light: '#e0f6f8', color: '#8fcbe1', ink: '#193f65', trim: '#347c9c', cut: .23, device: 'M64 12 103 51 110 44 79 13 M49 13 18 44 25 51 64 12 M13 65 42 94 28 108 M115 65 86 94 100 108 M42 94 64 113 86 94' },
  twin:    { light: '#f7eadd', color: '#d9a9aa', ink: '#4e2948', trim: '#8c4d73', cut: .15, device: 'M64 24 49 13 34 24 49 35Z M64 24 79 13 94 24 79 35Z M25 47V87 M31 47V87 M97 47V87 M103 47V87' },
  steps:   { light: '#e5e3fe', color: '#b0a9e0', ink: '#352568', trim: '#6356a1', cut: .075, device: 'M36 31H49V25H61V19H73V13H91 M18 75H28V60H38V45 M90 86H100V71H110V56 M34 105H49V99H63V93' },
  seal:    { light: '#fcf0cb', color: '#e5bd66', ink: '#5f3a1b', trim: '#8e5932', cut: .19, device: 'M64 12 69 21 78 26 69 31 64 40 59 31 50 26 59 21Z M31 19H38 M90 19H97 M31 109H38 M90 109H97 M16 47V81 M112 47V81' },
  kiln:    { light: '#ffddd0', color: '#ed9b70', ink: '#6c2a20', trim: '#aa422e', cut: .12, device: 'M64 12Q55 21 57 29Q46 25 48 36H80Q86 25 71 17Q75 26 67 29Q69 19 64 12 M21 87Q20 69 30 56 M107 87Q108 69 98 56 M34 107Q64 97 94 107' },
  compass: { light: '#dbf2e7', color: '#83c8b3', ink: '#14524e', trim: '#258477', cut: .215, device: 'M64 11 69 22 80 27 69 32 64 43 59 32 48 27 59 22Z M18 61V76 M14 68H24 M110 61V76 M104 68H114 M64 98V113 M54 105H74' },
  invert:  { light: '#f4ecc9', color: '#d4c284', ink: '#48461f', trim: '#6d7737', cut: .09, device: 'M81 18H47L54 12 M47 18 54 24 M47 33H81L74 27 M81 33 74 39 M16 50 27 43 M16 77 27 70 M101 63 112 56 M101 90 112 83' },
  bridge:  { light: '#f6dfcf', color: '#d4a08b', ink: '#582e32', trim: '#974b47', cut: .175, device: 'M34 36V32Q64 0 94 32V36 M48 36V33Q64 16 80 33V36 M35 100Q43 94 51 100T67 100T83 100T99 100 M35 108Q43 102 51 108T67 108T83 108T99 108' },
};

function relicFace(ctx, spec, face, stone) {
  const art = relics[spec.unique];
  const glaze = stone ? stoneGlaze : spec.tint == null ? art : glazes[spec.tint];
  const pale = stone ? '#d7d5c8' : spec.tint == null ? art.light : '#edf1f4';
  const trim = stone ? '#45545c' : spec.echo ? '#157769' : spec.tint == null ? art.trim : '#1c467b';
  const ink = stone ? '#26323a' : art.ink;
  const wash = ctx.createLinearGradient(7, 0, 118, 123);
  wash.addColorStop(0, glaze.light);
  wash.addColorStop(1, glaze.color);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.roundRect(9, 9, 110, 110, 14);
  ctx.lineWidth = 4;
  ctx.strokeStyle = trim;
  ctx.stroke();
  ctx.fillStyle = pale;
  ctx.beginPath();
  ctx.roundRect(33, 39, 62, 59, 17);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(art.device));
  ctx.font = 'bold 54px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  ctx.fillText(spec.faces[face], 64, 70);
  if (spec.sealed && !stone) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('×2', 98, 103);
  }
}

function comboFace(ctx, spec, face, stone) {
  const glaze = glazes[spec.glaze ?? 4];
  const wash = ctx.createLinearGradient(0, 0, 128, 128);
  if (spec.rainbow) rainbow.forEach((color, i) => wash.addColorStop(i / (rainbow.length - 1), color));
  else {
    wash.addColorStop(0, glaze.light);
    wash.addColorStop(1, glaze.color);
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 128, 128);

  ctx.beginPath();
  ctx.roundRect(8, 8, 112, 112, 14);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#d4af37';
  ctx.stroke();

  ctx.fillStyle = '#111e38';
  ctx.beginPath();
  ctx.roundRect(18, 22, 92, 84, 12);
  ctx.fill();
  ctx.strokeStyle = '#f1c563';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd779';
  ctx.fillText(spec.name || 'COMBO', 64, 42);

  ctx.font = 'bold 24px Georgia';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Niv. ${spec.level || 1}`, 64, 72);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(`→ Niv. ${spec.nextLevel || 2}`, 64, 94);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('★', 64, 15);
}

function texture(canvas) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function dieFace(spec, face, stone) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (spec.combo) {
    comboFace(ctx, spec, face, stone);
    return canvas;
  }
  if (spec.unique) {
    relicFace(ctx, spec, face, stone);
    return canvas;
  }
  const tinted = !stone && spec.tint != null;
  const gilded = !stone && hasFace(spec.gild, face);
  const glaze = stone ? stoneGlaze : tinted ? glazes[spec.tint] : glazes[spec.glaze];
  const wash = ctx.createLinearGradient(5, 7, 124, 115);
  if (spec.rainbow && !tinted && !stone) rainbow.forEach((color, i) => wash.addColorStop(i / (rainbow.length - 1), color));
  else {
    wash.addColorStop(0, glaze.light);
    if (spec.second != null && !stone && !tinted) {
      wash.addColorStop(.49, glaze.color);
      wash.addColorStop(.51, glazes[spec.second].light);
      wash.addColorStop(1, glazes[spec.second].color);
    } else wash.addColorStop(1, glaze.color);
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 128, 128);
  if (spec.obsidian) {
    const obs = ctx.createLinearGradient(0, 0, 128, 128);
    obs.addColorStop(0, '#1f182e');
    obs.addColorStop(0.5, '#0b0912');
    obs.addColorStop(1, '#2a1d42');
    ctx.strokeStyle = obs;
    ctx.lineWidth = 18;
    ctx.strokeRect(5, 5, 118, 118);
    ctx.strokeStyle = '#9b7be8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(14, 14, 100, 100, 10);
    ctx.stroke();
  }
  ctx.strokeStyle = spec.numberChanged || spec.sealed ? '#efc9ff' : spec.obsidian ? '#b79cff' : stone ? '#d0d0cba0' : spec.eternal ? '#15171e' : gilded ? '#ffe392' : '#f6e7c7b9';
  ctx.lineWidth = (spec.eternal && !stone) || spec.obsidian ? 2.6 : 1.8;
  ctx.beginPath();
  ctx.roundRect(11, 11, 106, 106, 11);
  ctx.stroke();
  for (const x of [23, 105]) for (const y of [23, 105]) {
    ctx.beginPath();
    ctx.arc(x, y, 5.8, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }
  if (gilded) {
    const disc = ctx.createRadialGradient(54, 50, 6, 64, 64, 45);
    disc.addColorStop(0, '#fff7c2');
    disc.addColorStop(0.55, '#f2c75c');
    disc.addColorStop(1, '#b87b16');
    ctx.beginPath();
    ctx.arc(64, 64, 44, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffe999';
    ctx.stroke();
  }
  const dark = gilded || glaze.darkPips || spec.rainbow && !tinted;
  const ink = gilded ? '#2c1e05' : stone || dark ? '#212f3e' : '#fff1d4';
  if (!stone && hasFace(spec.wild, face) && !spec.numberChanged) {
    ctx.font = '54px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.fillText('★', 64, 64);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(spec.faces[face], 64, 100);
  } else for (const pip of pips[spec.faces[face]]) {
    const x = 37 + pip % 3 * 27, y = 37 + Math.floor(pip / 3) * 27;
    ctx.beginPath();
    ctx.arc(x, y + 1.3, 7.9, 0, 2 * Math.PI);
    ctx.fillStyle = '#18273277';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 7.1, 0, 2 * Math.PI);
    ctx.fillStyle = ink;
    ctx.fill();
  }
  if (!stone && (hasFace(spec.boost, face) || spec.sealed)) {
    ctx.fillStyle = '#182433';
    ctx.beginPath();
    ctx.roundRect(75, 90, 35, 20, 5);
    ctx.fill();
    ctx.fillStyle = '#ffda87';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mult = (hasFace(spec.boost, face) ? (spec.boostMult || 2) : 1) * (spec.sealed ? 2 : 1);
    ctx.fillText(`×${mult}`, 92, 100);
  }
  if (!stone && spec.eternal) {
    ctx.fillStyle = '#10121a';
    ctx.strokeStyle = '#fff1d4';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(43, 9, 42, 21, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff1d4';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('∞', 64, 19);
  }
  return canvas;
}

const portraits = new WeakMap();

export function diePortrait(spec) {
  if (!portraits.has(spec)) {
    const mark = spec.gild | spec.boost | spec.wild;
    const face = spec.faces.findIndex((_, index) => hasFace(mark, index));
    portraits.set(spec, dieFace(spec, Math.max(0, face), false).toDataURL());
  }
  return portraits.get(spec);
}

export class DiceArt {
  constructor() {
    this.geometry = new RoundedBoxGeometry(.86, .86, .86, 3, .106);
    this.relicGeometry = Object.fromEntries(Object.entries(relics).map(([key, art]) => [key, new RoundedBoxGeometry(.86, .86, .86, 3, art.cut)]));
    this.cache = new Map();
  }

  create(spec, stone = false) {
    const key = JSON.stringify([stone, spec.faces, spec.unique, spec.numberChanged, Boolean(spec.obsidian), stone ? 0 : [spec.glaze, spec.second, spec.boost, spec.gild, spec.wild, spec.eternal, spec.rainbow, spec.tint, spec.echo, spec.sealed]]);
    let item = this.cache.get(key);
    if (!item) {
      const materials = [2, 3, 0, 5, 1, 4].map(face => new THREE.MeshPhysicalMaterial({ map: texture(dieFace(spec, face, stone)),
        roughness: stone ? .66 : .32, clearcoat: stone ? 0 : .27, clearcoatRoughness: .36 }));
      item = { count: 0, materials };
      this.cache.set(key, item);
    }
    item.count++;
    const mesh = new THREE.Mesh(spec.unique ? this.relicGeometry[spec.unique] : this.geometry, item.materials);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.art = key;
    return mesh;
  }

  release(mesh) {
    const key = mesh.userData.art;
    const item = this.cache.get(key);
    if (!item || --item.count) return;
    item.materials.forEach(material => { material.map.dispose(); material.dispose(); });
    this.cache.delete(key);
  }

  createPlateMesh(comboKey, level = 1, size = 1) {
    return createPlateMesh(comboKey, level, size);
  }
}

const tiles = new Map();

const tileMotifs = {
  chisel: 'M38 83 78 43 87 51 47 91 32 96Z M74 38 80 32 97 48 92 55 M40 64H26 M48 52 41 42 M58 42V28',
  midas: 'M31 86 63 54 73 64 41 96 26 101Z M60 48 69 39 88 58 79 68 M90 28V48 M80 38H100 M94 71V88 M85 80H103',
  aces: 'M65 31 92 43V71Q88 90 65 100 40 90 37 71V43Z M55 57 65 48V79 M55 81H77',
  colonnade: 'M27 51 64 31 101 51Z M29 94H99 M35 85H93 M43 55V82 M64 55V82 M85 55V82',
  acanthus: 'M63 98C60 77 52 57 34 43Q68 43 67 71Q71 42 93 32Q98 57 74 77 M68 97Q79 76 98 77Q91 93 68 97 M60 90Q39 89 29 72Q49 70 60 90',
  cobalt: 'M64 55 73 64 64 73 55 64Z M45 46Q25 64 45 82 M82 46Q102 64 82 82 M35 35Q7 64 35 93 M93 35Q121 64 93 93',
  frieze: 'M26 88H102V98H26Z M32 80 27 47 49 64 64 35 79 64 101 47 96 80Z M64 57 70 69 64 78 58 69Z',
  prism: 'M61 30 91 86H36Z M24 56 49 66 67 66 102 46 M68 67 105 66 M68 68 101 89',
  patience: 'M40 30H88 M40 98H88 M45 32Q46 54 64 64Q46 75 45 96 M83 32Q82 54 64 64Q82 75 83 96 M52 88 64 78 76 88Z',
  mortar: 'M42 35 70 29 94 47 99 71 85 93 54 99 33 82 28 58Z M66 30 54 51 69 64 52 77 54 97 M69 64 95 50 M52 77 33 80',
  basalt: 'M37 84Q44 77 44 60A20 20 0 0 1 84 60Q84 77 91 84Z M55 91Q64 107 73 91 M64 33V26 M34 48 27 41 M94 48 101 41',
  alhambra: 'M33 97V62Q33 45 64 29Q95 45 95 62V97Z M48 97V67Q48 57 64 47Q80 57 80 67V97 M23 97H105 M64 68V97',
  sixes: 'M64 28L94 45V83L64 100L34 83V45Z M74 44Q50 42 50 66Q50 84 65 84Q79 84 79 70Q79 58 64 58Q54 58 50 66',
  fourfold: 'M36 36H58V58H36Z M70 36H92V58H70Z M36 70H58V92H36Z M70 70H92V92H70Z',
  doublePair: 'M32 64A18 18 0 1 1 68 64A18 18 0 1 1 32 64 M60 64A18 18 0 1 1 96 64A18 18 0 1 1 60 64',
  corners: 'M34 50V34H50 M78 34H94V50 M34 78V94H50 M78 94H94V78 M64 56L72 64L64 72L56 64Z',
  glazedSteps: 'M32 88H54V68H74V48H96V36 M32 98H96',
  saffron: 'M64 28V40 M64 88V100 M28 64H40 M88 64H100 M39 39L47 47 M81 81L89 89 M89 39L81 47 M47 81L39 89 M50 64A14 14 0 1 1 78 64A14 14 0 1 1 50 64',
  emerald: 'M64 30Q76 50 74 72H54Q52 50 64 30Z M42 84H86 M48 94H80 M64 72V84',
  terracotta: 'M54 32H74 M57 32L55 44Q42 56 44 74Q46 92 64 96Q82 92 84 74Q86 56 73 44L71 32 M53 48Q40 48 40 60Q40 68 46 70 M75 48Q88 48 88 60Q88 68 82 70',
  lattice: 'M32 86V60Q32 46 43 44Q54 46 54 60V86 M53 86V56Q53 40 64 38Q75 40 75 56V86 M74 86V60Q74 46 85 44Q96 46 96 60V86 M28 86H100',
  livingGlaze: 'M34 78L44 48L58 40 M94 78L84 48L70 40 M36 86H92 M64 28L76 52L64 76L52 52Z',
  symmetry: 'M36 90V48Q36 34 52 34V90Z M92 90V48Q92 34 76 34V90Z M64 52L70 62L64 72L58 62Z',
  chiselDust: 'M36 86L68 54L76 62L44 94L32 96Z M42 36L46 46 M64 28V40 M84 36L78 46 M70 86H96',
  stainedGlass: 'M34 64H94 M64 34V94 M40 64A24 24 0 1 1 88 64A24 24 0 1 1 40 64 M54 64L64 54L74 64L64 74Z',
  nasridStar: 'M39 39H89V89H39Z M64 29L99 64L64 99L29 64Z M56 64L64 56L72 64L64 72Z',
};

const tilePalettes = {
  chisel: ['#27527e', '#9ab8c5', '#efe2bf'], midas: ['#86441c', '#d49b42', '#fff0c5'],
  aces: ['#8e3744', '#c5665e', '#f9dfca'], sixes: ['#3c2b14', '#e0a938', '#fff5d8'],
  fourfold: ['#364d24', '#9ab858', '#f2f5df'], colonnade: ['#34566a', '#7ca897', '#e7efe0'],
  acanthus: ['#205b3d', '#79a454', '#edf1ce'], doublePair: ['#1e3a6e', '#e59a3c', '#f8ebd2'],
  corners: ['#2c3645', '#d9b25f', '#e9edf2'], glazedSteps: ['#133a54', '#2bb5a8', '#e2f4f0'],
  cobalt: ['#1c408c', '#507bbf', '#dbeafa'], saffron: ['#994400', '#f59e0b', '#fef3c7'],
  emerald: ['#064e3b', '#34d399', '#dcfce7'], terracotta: ['#7c2d12', '#ea580c', '#ffedd5'],
  frieze: ['#6a3d73', '#b87ca2', '#f0ddeb'], prism: ['#1f5b69', '#579ba3', '#dcefe5'],
  patience: ['#715436', '#bc9666', '#f1e5be'], lattice: ['#1e1b4b', '#38bdf8', '#e0f2fe'],
  mortar: ['#584556', '#c08653', '#f3e0cf'], basalt: ['#383f52', '#8b9ca2', '#e2e7e4'],
  livingGlaze: ['#262b36', '#22d3ee', '#e2e8f0'], symmetry: ['#4c1d95', '#c084fc', '#f3e8ff'],
  chiselDust: ['#291d2e', '#fbbf24', '#ede4f5'], alhambra: ['#6e3030', '#c99553', '#f6e0b2'],
  stainedGlass: ['#581c87', '#f472b6', '#fef08a'], nasridStar: ['#0f2454', '#facc15', '#e0f7fa'],
};

export function tileArt(key) {
  if (tiles.has(key)) return tiles.get(key);
  const { rarity } = powers[key];
  const { color } = rarities[rarity];
  const [ink, accent, clay] = tilePalettes[key];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const glaze = ctx.createLinearGradient(8, 6, 117, 126);
  glaze.addColorStop(0, '#fff8e8');
  glaze.addColorStop(1, clay);
  ctx.fillStyle = glaze;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 8;
  ctx.strokeRect(5, 5, 118, 118);
  ctx.lineWidth = 2;
  ctx.strokeStyle = rarity ? color : accent;
  ctx.strokeRect(5, 5, 118, 118);
  const rosette = new Path2D();
  for (let point = 0; point < 16; point++) {
    const angle = point * Math.PI / 8;
    const radius = point % 2 ? 43 : 56;
    const x = 64 + radius * Math.cos(angle), y = 64 + radius * Math.sin(angle);
    if (point === 0) rosette.moveTo(x, y); else rosette.lineTo(x, y);
  }
  rosette.closePath();
  ctx.fillStyle = accent;
  ctx.fill(rosette);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.6;
  ctx.stroke(rosette);
  ctx.beginPath();
  ctx.arc(64, 64, 44, 0, Math.PI * 2);
  ctx.fillStyle = glaze;
  ctx.fill();
  ctx.stroke();
  if (key === 'stainedGlass') {
    const quadColors = ['rgba(30,64,175,0.22)', 'rgba(217,119,6,0.24)', 'rgba(4,120,87,0.22)', 'rgba(185,28,28,0.22)'];
    for (let q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.moveTo(64, 64);
      ctx.arc(64, 64, 43, q * Math.PI / 2, (q + 1) * Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = quadColors[q];
      ctx.fill();
    }
  }
  const corner = new Path2D('M16 17Q24 16 32 17Q26 20 24 25Q20 26 17 32Q16 24 16 17Z M20 20Q26 27 30 30');
  ctx.fillStyle = ink;
  ctx.strokeStyle = accent;
  for (let quadrant = 0; quadrant < 4; quadrant++) {
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(quadrant * Math.PI / 2);
    ctx.translate(-64, -64);
    ctx.fill(corner);
    ctx.stroke(corner);
    ctx.restore();
  }
  const motif = new Path2D(tileMotifs[key]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#fff7e3';
  ctx.stroke(motif);
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = ink;
  ctx.stroke(motif);
  const result = { map: texture(canvas), url: canvas.toDataURL() };
  tiles.set(key, result);
  return result;
}

const plates = new Map();

const comboPlatesConfig = {
  pair: { glaze: { color: '#d97706', light: '#fef3c7', ink: '#78350f' } },
  trio: { glaze: { color: '#7e22ce', light: '#f3e8ff', ink: '#4c1d95' } },
  quartet: { glaze: { color: '#b91c1c', light: '#fee2e2', ink: '#7f1d1d' } },
  straight: { glaze: { color: '#1d4ed8', light: '#dbeafe', ink: '#1e3a8a' } },
  longStraight: { glaze: { color: '#047857', light: '#dcfce7', ink: '#064e3b' } },
  line: { glaze: { color: '#475569', light: '#f8fafc', ink: '#1e293b' } },
  mono: { glaze: { color: '#b45309', light: '#fef08a', ink: '#713f12' } },
  chromatic: { rainbow: true, glaze: { color: '#6366f1', light: '#e0e7ff', ink: '#312e81' } },
  panel: { glaze: { color: '#1e1b4b', light: '#fbbf24', ink: '#0f172a' } },
};

export function plateArt(key, level = 1) {
  const cacheKey = `${key}-${level}`;
  if (plates.has(cacheKey)) return plates.get(cacheKey);

  const spec = comboPlatesConfig[key] || comboPlatesConfig.pair;
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = 128, cy = 128;

  // 1. Plato exterior: borde de latón/oro
  const rimGrad = ctx.createLinearGradient(0, 0, size, size);
  rimGrad.addColorStop(0, '#5a3d12');
  rimGrad.addColorStop(0.25, '#d4af37');
  rimGrad.addColorStop(0.5, '#fff2a8');
  rimGrad.addColorStop(0.75, '#c59b27');
  rimGrad.addColorStop(1, '#5a3d12');

  ctx.beginPath();
  ctx.arc(cx, cy, 122, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 114, 0, Math.PI * 2);
  ctx.fillStyle = '#22150a';
  ctx.fill();

  const marliGrad = ctx.createRadialGradient(cx, cy, 90, cx, cy, 114);
  marliGrad.addColorStop(0, '#1a1410');
  marliGrad.addColorStop(1, '#3a2818');
  ctx.beginPath();
  ctx.arc(cx, cy, 112, 0, Math.PI * 2);
  ctx.fillStyle = marliGrad;
  ctx.fill();

  ctx.fillStyle = '#f1c563';
  for (let i = 0; i < 32; i++) {
    const angle = (i * Math.PI * 2) / 32;
    const px = cx + Math.cos(angle) * 103;
    const py = cy + Math.sin(angle) * 103;
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 94, 0, Math.PI * 2);
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. Fondo del plato (cerámica esmaltada cóncava)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.clip();

  if (spec.rainbow) {
    const rainbowColors = ['#ef8a76', '#f1c563', '#a0cf9d', '#69a7db', '#9874c1', '#de8aaf'];
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 95, (i * Math.PI) / 6, ((i + 1) * Math.PI) / 6);
      ctx.closePath();
      ctx.fillStyle = rainbowColors[i % rainbowColors.length];
      ctx.fill();
    }
    const rShade = ctx.createRadialGradient(cx, cy, 20, cx, cy, 95);
    rShade.addColorStop(0, 'rgba(255,255,255,0.25)');
    rShade.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    rShade.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = rShade;
    ctx.fill();
  } else {
    const dishGrad = ctx.createRadialGradient(cx - 20, cy - 25, 15, cx, cy, 95);
    dishGrad.addColorStop(0, spec.glaze.light);
    dishGrad.addColorStop(0.65, spec.glaze.color);
    dishGrad.addColorStop(1, spec.glaze.ink);
    ctx.fillStyle = dishGrad;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.2;
  for (let r = 35; r <= 80; r += 22) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Roseta / Motivo central
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  const medGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 48);
  medGrad.addColorStop(0, 'rgba(17, 24, 39, 0.95)');
  medGrad.addColorStop(1, 'rgba(10, 15, 25, 0.98)');
  ctx.fillStyle = medGrad;
  ctx.fill();
  ctx.strokeStyle = '#f1c563';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#ffd779';
  ctx.fillStyle = '#fff4ce';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (key === 'pair') {
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sign * 14, 0, 10, 22, sign * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sign * 14, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === 'trio') {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const x = Math.cos(a) * 16, y = Math.sin(a) * 16;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (key === 'quartet') {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const x = Math.cos(a) * 17, y = Math.sin(a) * 17;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'straight') {
    ctx.beginPath();
    ctx.moveTo(-20, 18);
    ctx.lineTo(-12, 18); ctx.lineTo(-12, 9);
    ctx.lineTo(-4, 9); ctx.lineTo(-4, 0);
    ctx.lineTo(4, 0); ctx.lineTo(4, -9);
    ctx.lineTo(12, -9); ctx.lineTo(12, -18);
    ctx.lineTo(20, -18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(16, -22, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'longStraight') {
    ctx.beginPath();
    for (let p = 0; p < 16; p++) {
      const a = (p * Math.PI) / 8;
      const r = p % 2 === 0 ? 25 : 13;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'line') {
    ctx.beginPath();
    ctx.moveTo(-25, 0); ctx.lineTo(25, 0);
    ctx.stroke();
    for (const x of [-16, 0, 16]) {
      ctx.beginPath();
      ctx.moveTo(x, -9); ctx.lineTo(x + 7, 0); ctx.lineTo(x, 9); ctx.lineTo(x - 7, 0);
      ctx.closePath();
      ctx.fillStyle = '#f1c563';
      ctx.fill();
      ctx.stroke();
    }
  } else if (key === 'mono') {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c563';
    ctx.fill();
    ctx.stroke();
  } else if (key === 'chromatic') {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const x = Math.cos(a) * 14, y = Math.sin(a) * 14;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4ce';
    ctx.fill();
  } else if (key === 'panel') {
    ctx.beginPath();
    for (let p = 0; p < 32; p++) {
      const a = (p * Math.PI) / 16;
      const r = p % 2 === 0 ? 26 : 16;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (p === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c563';
    ctx.fill();
  }
  ctx.restore();

  // 4. Cartela de Nivel
  const cartW = 74, cartH = 26;
  const cartX = cx - cartW / 2, cartY = cy + 54;
  ctx.beginPath();
  ctx.roundRect(cartX, cartY, cartW, cartH, 8);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = level > 1 ? '#ffd779' : '#a1782e';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = level > 1 ? '#ffd779' : '#e2e8f0';
  ctx.fillText(`NIV. ${level}`, cx, cartY + cartH / 2 + 1);

  // 5. Brillo especular
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 90, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(cx - 10, cy - 50, 70, 32, -0.2, 0, Math.PI * 2);
  const shineGrad = ctx.createLinearGradient(cx, cy - 80, cx, cy - 20);
  shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
  shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shineGrad;
  ctx.fill();
  ctx.restore();

  const tex = texture(canvas);
  const result = { map: tex, url: canvas.toDataURL(), canvas };
  plates.set(cacheKey, result);
  return result;
}

export function platePortrait(spec) {
  const comboKey = spec.combo ?? spec.key;
  const level = spec.nextLevel ?? spec.level ?? 1;
  return plateArt(comboKey, level).url;
}

export function createPlateMesh(comboKey, level = 1, size = 1) {
  const art = plateArt(comboKey, level);
  const group = new THREE.Group();

  const radius = 0.44 * size;
  const height = 0.07 * size;
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.9, height, 32);

  const sideMat = new THREE.MeshStandardMaterial({ color: 0xc89d3a, roughness: 0.35, metalness: 0.8 });
  const topMat = new THREE.MeshStandardMaterial({
    map: art.map,
    roughness: 0.22,
    metalness: 0.15,
  });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x825433, roughness: 0.65 });

  const plateMesh = new THREE.Mesh(geometry, [sideMat, topMat, backMat]);
  plateMesh.rotation.x = Math.PI / 2 - 0.32;
  plateMesh.castShadow = true;
  plateMesh.receiveShadow = true;
  group.add(plateMesh);

  // Atril de latón
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xa87332, roughness: 0.35, metalness: 0.7 });
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36 * size, 0.03 * size, 0.22 * size), brassMat);
  foot.position.set(0, -0.38 * size, 0.02 * size);
  group.add(foot);
  for (const sign of [-1, 1]) {
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.04 * size, 0.08 * size, 0.04 * size), brassMat);
    tab.position.set(sign * 0.15 * size, -0.34 * size, 0.11 * size);
    group.add(tab);
  }
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * size, 0.018 * size, 0.42 * size, 8), brassMat);
  strut.position.set(0, -0.22 * size, -0.10 * size);
  strut.rotation.x = -0.35;
  group.add(strut);

  group.userData = { combo: comboKey, level, isPlate: true };
  return group;
}

