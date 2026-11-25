import { t } from './idioma.js?v=esmaltes-30';
import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';
import { rarities } from './catalogo.js?v=esmaltes-30';

// Dice in the workshop are a little smaller than on the table so the whole scene fits on phones.
const DIE_SCALE = .8;
const DIE_HALF = .43 * DIE_SCALE;
const FLOOR = -.26;
// Half the visible world, per scene, before the aspect ratio widens one of the axes.
const VIEWS = {
  gallery: { width: 3.1, height: 2.02, eye: new THREE.Vector3(0, 5, 8), target: new THREE.Vector3(0, 1.0, -.1) },
  kiln: { width: 2.55, height: 2.16, eye: new THREE.Vector3(0, 6, 7), target: new THREE.Vector3(0, 1.0, -.35) },
};
const HEARTH = -.45;
const BENCH = 1.45;
const MOUTH = new THREE.Vector3(0, .62, -2.05);
const RESULT = new THREE.Vector3(0, .98, HEARTH);

// Outline of a Nasrid horseshoe arch: a circle of radius r centred at height cy whose arc runs
// past the semicircle by `spring` radians on each side before the jambs drop to `base`.
function archPath(path, r, cy, spring, base = 0) {
  const x = r * Math.cos(spring);
  path.moveTo(-x, base);
  path.lineTo(-x, cy - r * Math.sin(spring));
  path.absarc(0, cy, r, Math.PI + spring, -spring, true);
  path.lineTo(x, base);
  path.lineTo(-x, base);
  return path;
}

// Scales the 0…1 UVs of a plane or box face so a repeating texture keeps square tiles of `tile` units.
function tileUV(geometry, width, height, tile) {
  const uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index++) uv.setXY(index, uv.getX(index) * width / tile, uv.getY(index) * height / tile);
  return geometry;
}

// Planar UVs taken from the vertex positions of a flat shape, in tiles of `tile` units.
function shapeUV(geometry, tile) {
  geometry.computeBoundingBox();
  const { min } = geometry.boundingBox;
  const position = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let index = 0; index < uv.count; index++) uv.setXY(index, (position.getX(index) - min.x) / tile, (position.getY(index) - min.y) / tile);
  return geometry;
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Flame tongues rising from a glowing bed of coals, painted once and animated by scaling.
function flameTexture() {
  return canvasTexture(128, 256, (context, width, height) => {
    const tongues = [[.5, .1, .34], [.3, .34, .24], [.7, .3, .24], [.17, .58, .16], [.83, .55, .16], [.42, .24, .2], [.6, .2, .2]];
    for (const [x, top, spread] of tongues) {
      const gradient = context.createLinearGradient(0, height, 0, top * height);
      gradient.addColorStop(0, 'rgba(255, 236, 170, 1)');
      gradient.addColorStop(.35, 'rgba(255, 160, 60, .9)');
      gradient.addColorStop(.75, 'rgba(220, 70, 20, .55)');
      gradient.addColorStop(1, 'rgba(160, 30, 10, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo((x - spread) * width, height);
      context.bezierCurveTo((x - spread * .9) * width, height * .62, (x - spread * .25) * width, height * (top + .2), x * width, top * height);
      context.bezierCurveTo((x + spread * .25) * width, height * (top + .2), (x + spread * .9) * width, height * .62, (x + spread) * width, height);
      context.fill();
    }
    const bed = context.createRadialGradient(width / 2, height, 0, width / 2, height, width * .7);
    bed.addColorStop(0, 'rgba(255, 245, 200, .95)');
    bed.addColorStop(.5, 'rgba(255, 150, 50, .5)');
    bed.addColorStop(1, 'rgba(255, 90, 20, 0)');
    context.fillStyle = bed;
    context.fillRect(0, 0, width, height);
  });
}

// Back of the kiln: dark brick warmed from below by the fire.
function hearthTexture() {
  return canvasTexture(128, 128, (context, width, height) => {
    context.fillStyle = '#1c0703';
    context.fillRect(0, 0, width, height);
    const glow = context.createRadialGradient(width / 2, height * 1.05, 0, width / 2, height * 1.05, height);
    glow.addColorStop(0, 'rgba(255, 190, 90, 1)');
    glow.addColorStop(.4, 'rgba(200, 70, 25, .75)');
    glow.addColorStop(1, 'rgba(60, 12, 6, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(0, 0, 0, .28)';
    context.lineWidth = 2;
    for (let row = 0; row < 8; row++) {
      const y = row * 16 + 8;
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
      for (let column = 0; column < 5; column++) {
        const x = column * 32 + (row % 2) * 16;
        context.beginPath(); context.moveTo(x, y); context.lineTo(x, y + 16); context.stroke();
      }
    }
  });
}

function dotTexture() {
  return canvasTexture(32, 32, (context, width) => {
    const gradient = context.createRadialGradient(width / 2, width / 2, 0, width / 2, width / 2, width / 2);
    gradient.addColorStop(0, 'rgba(255, 240, 200, 1)');
    gradient.addColorStop(.35, 'rgba(255, 170, 70, .85)');
    gradient.addColorStop(1, 'rgba(255, 110, 30, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, width);
  });
}

export class Workshop {
  constructor(art, tileMap) {
    this.art = art;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    // Skins may tint the workshop backdrop through the --scene-workshop custom property.
    this.scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--scene-workshop').trim() || 0x2a1a12);
    this.camera = new THREE.OrthographicCamera(-3, 3, 2, -2, .1, 30);
    this.ray = new THREE.Raycaster();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.5);
    this.pieces = new THREE.Group();
    this.socketGroup = new THREE.Group();
    this.models = new Map();
    this.exhibits = new Map();
    this.sockets = [];
    this.beams = new Map();
    this.scene.add(this.pieces, this.socketGroup, new THREE.HemisphereLight(0xf2e4cf, 0x2a3c6e, 1.35));
    this.lamp = new THREE.DirectionalLight(0xffe7c4, 2.2);
    this.lamp.position.set(-3, 6, 5);
    this.fireLight = new THREE.PointLight(0xff9440, 0, 7.5, 1.4);
    this.fireLight.position.set(0, .7, -1.45);
    this.scene.add(this.lamp, this.fireLight);

    // A repeating copy of the azulejo; each surface scales its own UVs to keep the tiles square.
    this.tiles = tileMap.clone();
    this.tiles.wrapS = this.tiles.wrapT = THREE.RepeatWrapping;
    this.tiles.needsUpdate = true;
    this.textures = [this.tiles];
    this.lapis = new THREE.MeshStandardMaterial({ color: 0x1d3166, roughness: .62 });
    this.night = new THREE.MeshStandardMaterial({ color: 0x0d1838, roughness: .9 });
    this.clay = new THREE.MeshStandardMaterial({ color: 0x7e3b22, roughness: .86 });
    this.clayDark = new THREE.MeshStandardMaterial({ color: 0x6b2f1b, roughness: .85 });
    this.cream = new THREE.MeshStandardMaterial({ color: 0xe9dcbd, roughness: .5 });
    this.plaster = new THREE.MeshStandardMaterial({ color: 0xcfbd97, roughness: .7 });
    this.brass = new THREE.MeshStandardMaterial({ color: 0xc89a4e, roughness: .35, metalness: .55 });
    this.porcelain = new THREE.MeshStandardMaterial({ map: tileMap, roughness: .42 });
    this.dado = new THREE.MeshStandardMaterial({ map: this.tiles, color: 0xb9c4e0, roughness: .5 });
    this.permanent = new Set([this.lapis, this.night, this.clay, this.clayDark, this.cream, this.plaster, this.brass, this.porcelain, this.dado]);

    const floor = new THREE.Mesh(tileUV(new THREE.PlaneGeometry(26, 16), 26, 16, 1.25), new THREE.MeshStandardMaterial({ map: this.tiles, color: 0x3c4c80, roughness: .75 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = FLOOR;
    this.scene.add(floor);

    this.canvas.addEventListener('pointerdown', event => this.down(event));
    this.canvas.addEventListener('pointermove', event => this.move(event));
    this.canvas.addEventListener('pointerup', event => this.up(event));
    this.canvas.addEventListener('pointercancel', () => this.cancel());
    this.canvas.addEventListener('lostpointercapture', () => this.cancel());
    this.canvas.addEventListener('pointerleave', () => { if (!this.pointer) this.hover = null; });
  }

  attach(container) { container.prepend(this.canvas); }

  clear() {
    this.cancel();
    this.mode = null;
    this.celebration = null;
    this.fire = null;
    this.hover = null;
    this.fireLight.intensity = 0;
    this.removeModels();
    this.disposeGroup(this.pieces);
    this.disposeGroup(this.socketGroup);
    this.exhibits.clear();
    this.beams.clear();
    this.sockets = [];
    this.width = this.height = 0;
    this.canvas.remove();
  }

  disposeGroup(group) {
    group.traverse(object => {
      if (object === group) return;
      object.geometry?.dispose();
      for (const material of new Set([object.material].flat().filter(Boolean))) {
        if (this.permanent.has(material)) continue;
        if (material.map && !this.textures.includes(material.map)) material.map.dispose();
        material.dispose();
      }
    });
    group.clear();
  }

  removeModels() {
    for (const item of this.models.values()) {
      this.scene.remove(item.mesh);
      this.art.release(item.mesh);
    }
    this.models.clear();
  }

  piece(geometry, material, x, y, z, group = this.pieces) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  model(spec, id, x, y, z) {
    const mesh = this.art.create(spec);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(DIE_SCALE);
    mesh.userData.id = id;
    this.scene.add(mesh);
    const item = { mesh, home: mesh.position.clone(), target: mesh.position.clone(), lift: 0 };
    this.models.set(id, item);
    return item;
  }

  plateModel(spec, id, x, y, z) {
    const mesh = this.art.createPlateMesh(spec.combo, spec.nextLevel ?? spec.level, 0.95);
    mesh.position.set(x, y, z);
    mesh.userData.id = id;
    mesh.userData.isPlate = true;
    this.scene.add(mesh);
    const item = { mesh, home: mesh.position.clone(), target: mesh.position.clone(), lift: 0, isPlate: true };
    this.models.set(id, item);
    return item;
  }

  setView(name) {
    this.view = VIEWS[name];
    this.camera.position.copy(this.view.eye);
    this.camera.lookAt(this.view.target);
    this.width = this.height = 0;
  }

  // A tiled wall with a glazed dado runs behind both rooms of the workshop.
  wall(z) {
    this.piece(new THREE.PlaneGeometry(26, 9), this.night, 0, FLOOR + 4.5, z);
    this.piece(tileUV(new THREE.PlaneGeometry(26, .62), 26, .62, .62), this.dado, 0, FLOOR + .31, z + .01);
    this.piece(new THREE.BoxGeometry(26, .05, .05), this.brass, 0, FLOOR + .64, z + .03);
  }

  // Stalls: three horseshoe niches with a lit pedestal in front of each one.
  gallery(specs, purchased) {
    this.clear();
    this.mode = 'gallery';
    this.setView('gallery');
    this.selected = -1;
    this.wall(-1.62);
    const niche = shapeUV(new THREE.ShapeGeometry(archPath(new THREE.Shape(), .62, 1.22, .42, FLOOR), 24), .58);
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-.86, FLOOR); frameShape.lineTo(.86, FLOOR); frameShape.lineTo(.86, 2.2); frameShape.lineTo(-.86, 2.2); frameShape.lineTo(-.86, FLOOR);
    frameShape.holes.push(archPath(new THREE.Path(), .6, 1.22, .42, FLOOR + .12));
    const frame = new THREE.ExtrudeGeometry(frameShape, { depth: .16, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 1, curveSegments: 32 });
    // Gilded moulding that follows the horseshoe of each niche.
    const spring = .42, cy = 1.22, inner = .6, outer = .67;
    const band = new THREE.Shape();
    band.moveTo(Math.cos(Math.PI + spring) * outer, cy + Math.sin(Math.PI + spring) * outer);
    band.absarc(0, cy, outer, Math.PI + spring, -spring, true);
    band.lineTo(Math.cos(-spring) * inner, cy + Math.sin(-spring) * inner);
    band.absarc(0, cy, inner, -spring, Math.PI + spring, false);
    const moulding = new THREE.ExtrudeGeometry(band, { depth: .05, bevelEnabled: false, curveSegments: 40 });
    const jamb = cy - inner * Math.sin(spring) - FLOOR - .12;
    specs.forEach((spec, index) => {
      const x = (index - 1) * 2.12;
      const color = rarities[spec.rarity].color;
      this.piece(index ? frame.clone() : frame, this.lapis, x, 0, -1.6);
      this.piece(index ? niche.clone() : niche, this.dado, x, 0, -1.6);
      this.piece(index ? moulding.clone() : moulding, this.brass, x, 0, -1.43);
      for (const side of [-1, 1]) this.piece(new THREE.BoxGeometry(.07, jamb, .05), this.brass, x + side * (inner + .035) * Math.cos(spring), FLOOR + .12 + jamb / 2, -1.405);
      this.piece(new THREE.BoxGeometry(1.5, .04, .04), this.brass, x, 2.1, -1.42);
      const column = this.piece(new THREE.CylinderGeometry(.5, .56, .64, 8), [this.lapis, this.brass, this.lapis], x, FLOOR + .32, .15);
      column.rotation.y = Math.PI / 8;
      const glow = new THREE.MeshBasicMaterial({ color, toneMapped: false });
      this.piece(new THREE.CylinderGeometry(.4, .4, .02, 32), glow, x, FLOOR + .65, .15);
      const beam = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      this.piece(new THREE.CylinderGeometry(.7, .4, 1.5, 32, 1, true), beam, x, FLOOR + 1.4, .15);
      this.beams.set(index, { glow, beam });
      if (purchased.includes(index)) this.sold(index);
      else if (spec.combo) this.plateModel(spec, index, x, 1.05, .15);
      else this.model(spec, index, x, .98, .15);
      // Hit area from just above the die down to the foot of the pedestal.
      this.exhibits.set(`inspect/${index}`, { top: new THREE.Vector3(x, 1.62, .15), bottom: new THREE.Vector3(x, FLOOR, .72),
        left: new THREE.Vector3(x - .8, .4, .15), right: new THREE.Vector3(x + .8, .4, .15) });
    });
  }

  sold(index) {
    const item = this.models.get(index);
    if (item) {
      this.scene.remove(item.mesh);
      if (!item.isPlate) this.art.release(item.mesh);
      this.models.delete(index);
    }
    const light = this.beams.get(index);
    if (light) { light.glow.color.multiplyScalar(.35); light.beam.opacity = .035; }
  }

  // The kiln: a clay horseshoe arch with banded voussoirs, a fire inside and an octagonal hearth in front.
  kiln(ids, bag, slots, lit, onSelect, onDrop) {
    this.clear();
    this.mode = 'kiln';
    this.setView('kiln');
    this.onSelect = onSelect;
    this.onDrop = onDrop;
    this.wall(-2.5);
    const depth = .9, front = -1.5, back = front - depth;
    const body = archPath(new THREE.Shape(), 1.62, .9, .3, FLOOR + .01);
    const inner = { r: .6, cy: .95, spring: .45 };
    body.holes.push(archPath(new THREE.Path(), inner.r, inner.cy, inner.spring));
    this.piece(new THREE.ExtrudeGeometry(body, { depth, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2, curveSegments: 40 }), this.clay, 0, 0, back);
    // Alternating cream and red voussoirs, as in the arches of Córdoba.
    const count = 15, start = Math.PI + inner.spring, sweep = (Math.PI + inner.spring * 2) / count, outer = .8, gap = .012;
    const wedgeRed = new THREE.MeshStandardMaterial({ color: 0x9e3322, roughness: .55 });
    for (let index = 0; index < count; index++) {
      const a0 = start - index * sweep - gap, a1 = start - (index + 1) * sweep + gap;
      const wedge = new THREE.Shape();
      wedge.moveTo(Math.cos(a0) * outer, inner.cy + Math.sin(a0) * outer);
      wedge.absarc(0, inner.cy, outer, a0, a1, true);
      wedge.lineTo(Math.cos(a1) * inner.r, inner.cy + Math.sin(a1) * inner.r);
      wedge.absarc(0, inner.cy, inner.r, a1, a0, false);
      this.piece(new THREE.ExtrudeGeometry(wedge, { depth: .08, bevelEnabled: false, curveSegments: 6 }), index % 2 ? wedgeRed : this.cream, 0, 0, front + .02);
    }
    // Alfiz: the rectangular gilded frame around the arch.
    const alfiz = (width, height, x, y) => this.piece(new THREE.BoxGeometry(width, height, .05), this.brass, x, y, front + .08);
    alfiz(1.86, .05, 0, 1.86);
    alfiz(.05, 1.86 - FLOOR - .04, -.93, (1.86 + FLOOR) / 2 + .02);
    alfiz(.05, 1.86 - FLOOR - .04, .93, (1.86 + FLOOR) / 2 + .02);
    // Glazed plinths on both sides of the mouth and a crowning finial.
    for (const side of [-1, 1]) this.piece(tileUV(new THREE.BoxGeometry(.5, .34, .06), .5, .34, .25), this.dado, side * 1.25, FLOOR + .18, front + .04);
    [[2.62, .1], [2.8, .075], [2.93, .05]].forEach(([y, r]) => this.piece(new THREE.SphereGeometry(r, 20, 12), this.brass, 0, y, back + depth / 2));

    // Inside: warm brick, coals and flame tongues.
    this.fireMaterials = {
      back: new THREE.MeshBasicMaterial({ map: hearthTexture(), toneMapped: false }),
      flame: new THREE.MeshBasicMaterial({ map: flameTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      ember: new THREE.PointsMaterial({ map: dotTexture(), size: 7, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      coal: new THREE.MeshStandardMaterial({ color: 0x3a1a10, emissive: 0xff6a22, emissiveIntensity: 1, roughness: .9 }),
    };
    this.piece(new THREE.PlaneGeometry(1.4, 1.8), this.fireMaterials.back, 0, .82, back - .01);
    const flames = [[0, 1, 1.05, back + .2], [-.2, .72, .78, back + .45], [.2, .7, .8, back + .55]].map(([x, width, height, z]) => {
      const flame = this.piece(new THREE.PlaneGeometry(width, height), this.fireMaterials.flame, x, height / 2 + .02, z);
      flame.geometry.translate(0, height / 2, 0);
      flame.position.y = .03;
      return flame;
    });
    for (let index = 0; index < 7; index++) {
      const coal = this.piece(new THREE.DodecahedronGeometry(.1 + (index % 3) * .025, 0), this.fireMaterials.coal, -.39 + index * .13, .06, back + .3 + (index % 2) * .22);
      coal.rotation.set(index, index * 1.7, 0);
    }
    const embers = new THREE.BufferGeometry();
    const seeds = Array.from({ length: 28 }, (_, index) => ({ x: (Math.random() - .5) * .9, phase: Math.random(), speed: .16 + Math.random() * .22, sway: Math.random() * 6, z: back + .3 + Math.random() * .9 }));
    embers.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seeds.length * 3), 3));
    const points = new THREE.Points(embers, this.fireMaterials.ember);
    this.pieces.add(points);
    this.fire = { flames, points, seeds, lit, flare: 0 };

    // Octagonal hearth with an azulejo inlay, and a low bench for the dice of the workshop hand.
    const hearth = this.piece(new THREE.CylinderGeometry(.8, .86, .34, 8), [this.lapis, this.porcelain, this.lapis], 0, FLOOR + .17, HEARTH);
    hearth.rotation.y = Math.PI / 8;
    hearth.scale.set(1.36, 1, 1);
    const rim = this.piece(new THREE.CylinderGeometry(.83, .83, .05, 8), this.brass, 0, FLOOR + .31, HEARTH);
    rim.rotation.y = Math.PI / 8;
    rim.scale.set(1.36, 1, 1);
    this.piece(new RoundedBoxGeometry(4.7, .2, .95, 2, .07), this.lapis, 0, FLOOR + .1, BENCH);
    this.piece(new THREE.BoxGeometry(4.66, .04, .04), this.brass, 0, FLOOR + .19, BENCH + .48);
    this.setSlots(slots);
    ids.forEach((id, index) => {
      const item = this.model(bag[id], id, (index - (ids.length - 1) / 2) * 1.12, FLOOR + .2 + DIE_HALF, BENCH);
      item.mesh.rotation.y = .22 * (index - 1.5);
    });
    this.heat(lit);
  }

  setSlots(count) {
    this.disposeGroup(this.socketGroup);
    this.sockets = [];
    for (let index = 0; index < count; index++) {
      const x = (index - (count - 1) / 2) * .92;
      // Each ring owns its material so it can glow while a dragged die hovers over it.
      const ring = this.piece(new THREE.TorusGeometry(.36, .045, 10, 40), this.brass.clone(), x, FLOOR + .36, HEARTH, this.socketGroup);
      ring.rotation.x = -Math.PI / 2;
      const hole = this.piece(new THREE.CylinderGeometry(.34, .34, .02, 40), this.night, x, FLOOR + .35, HEARTH, this.socketGroup);
      hole.userData.slot = index;
      hole.userData.ring = ring;
      this.sockets.push(hole);
    }
  }

  heat(lit) {
    if (!this.fire) return;
    this.fire.lit = lit;
    this.fire.points.visible = lit;
    this.fireMaterials.back.color.setScalar(lit ? 1 : .22);
    this.fireMaterials.coal.emissiveIntensity = lit ? 1 : .12;
    for (const flame of this.fire.flames) flame.visible = lit;
  }

  // Places a finished die on the hearth, used when the kiln was fired earlier in this workshop.
  display(spec) {
    this.model(spec, -1, RESULT.x, RESULT.y, RESULT.z).mesh.scale.setScalar(1);
    this.mode = 'result';
    this.celebration = { spec, ids: [], start: -Infinity, finished: true };
  }

  // Sizes the HTML hit areas over each stall from the projected 3D geometry (all values in % of the stage).
  anchors(layer) {
    const project = point => {
      const screen = point.clone().project(this.camera);
      return { x: (screen.x + 1) * 50, y: (1 - screen.y) * 50 };
    };
    for (const button of layer.children) {
      const spot = this.exhibits.get(button.dataset.anchor);
      if (!spot) continue;
      const top = project(spot.top), bottom = project(spot.bottom);
      button.style.left = `${top.x}%`;
      button.style.top = `${top.y}%`;
      button.style.height = `${bottom.y - top.y}%`;
      button.style.width = `${project(spot.right).x - project(spot.left).x}%`;
      // Without room under the pedestal the nameplate rests on it instead.
      button.classList.toggle('tight', (100 - bottom.y) / 100 * this.height < 58);
    }
  }

  socketsFor(ids) {
    for (const [id, item] of this.models) {
      const index = ids.indexOf(id);
      item.target.copy(index < 0 || !this.sockets[index] ? item.home : this.sockets[index].position);
      if (index >= 0 && this.sockets[index]) item.target.y = FLOOR + .36 + DIE_HALF;
    }
  }

  // The chosen dice fly into the kiln; the rest of the bench stays where it is.
  celebrate(spec, ids, now) {
    this.cancel();
    this.hover = null;
    this.mode = 'result';
    for (const [id, item] of this.models) {
      if (ids.includes(id)) item.home.copy(item.mesh.position);
      else item.mesh.position.copy(item.home);
    }
    this.celebration = { spec, ids, start: now, finished: false };
  }

  cast(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2), this.camera);
  }

  hit(event) {
    this.cast(event);
    return this.ray.intersectObjects([...this.models.values()].map(item => item.mesh))[0]?.object.userData.id ?? null;
  }

  down(event) {
    if (this.mode !== 'kiln' || this.pointer || event.button !== 0) return;
    const id = this.hit(event);
    if (id == null) return;
    this.pointer = { pointerId: event.pointerId, id, x: event.clientX, y: event.clientY, moving: false };
    this.canvas.setPointerCapture(event.pointerId);
  }

  move(event) {
    if (this.mode !== 'kiln') return;
    if (!this.pointer) {
      this.hover = event.pointerType === 'mouse' ? this.hit(event) : null;
      this.canvas.style.cursor = this.hover == null ? '' : 'pointer';
      return;
    }
    if (this.pointer.pointerId !== event.pointerId) return;
    if (!this.pointer.moving && Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) < 6) return;
    this.pointer.moving = true;
    this.canvas.style.cursor = 'grabbing';
    this.cast(event);
    const target = this.ray.ray.intersectPlane(this.dragPlane, new THREE.Vector3());
    if (!target) return;
    // On touch screens the die rides a little ahead of the finger so it stays visible.
    if (event.pointerType !== 'mouse') target.z -= .4;
    this.models.get(this.pointer.id)?.mesh.position.copy(target);
    this.glow(this.nearestSocket(target));
  }

  // Sockets are judged by distance on the hearth plane, not by a ray: the die is dragged
  // above the hearth, so a ray through the finger would land behind the small socket discs.
  nearestSocket(position) {
    let best = null, distance = .85;
    for (const socket of this.sockets) {
      const gap = Math.hypot(position.x - socket.position.x, position.z - socket.position.z);
      if (gap < distance) [best, distance] = [socket, gap];
    }
    return best;
  }

  glow(socket) {
    for (const hole of this.sockets) hole.userData.ring.material.emissive.setHex(hole === socket ? 0x8a5a18 : 0x000000);
  }

  up(event) {
    const pointer = this.pointer;
    if (pointer?.pointerId !== event.pointerId) return;
    this.cancel();
    if (!pointer.moving) { this.onSelect(pointer.id); return; }
    const item = this.models.get(pointer.id);
    const socket = item && this.nearestSocket(item.mesh.position);
    // A die dropped anywhere else leaves its socket and returns to the bench.
    this.onDrop(pointer.id, socket ? socket.userData.slot : -1);
  }

  cancel() {
    const pointer = this.pointer;
    this.pointer = null;
    this.canvas.style.cursor = '';
    if (this.sockets.length) this.glow(null);
    if (pointer && this.canvas.hasPointerCapture(pointer.pointerId)) this.canvas.releasePointerCapture(pointer.pointerId);
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    const halfHeight = Math.max(this.view.height, this.view.width * height / width);
    const halfWidth = halfHeight * width / height;
    Object.assign(this.camera, { top: halfHeight, bottom: -halfHeight, left: -halfWidth, right: halfWidth });
    this.camera.updateProjectionMatrix();
  }

  animateFire(t) {
    const fire = this.fire;
    fire.flare = Math.max(0, fire.flare - .02);
    const flicker = Math.sin(t * 9.1) * .5 + Math.sin(t * 15.7 + 1.3) * .3 + Math.sin(t * 4.3) * .2;
    this.fireLight.intensity = fire.lit ? 7 + flicker * 1.6 + fire.flare * 30 : 1 + fire.flare * 30;
    fire.flames.forEach((flame, index) => {
      flame.scale.set(1 + Math.sin(t * 5 + index) * .04 + fire.flare * .5, 1 + Math.sin(t * 7.3 + index * 2.1) * .1 + Math.sin(t * 12.9 + index) * .05 + fire.flare * .9, 1);
      flame.position.x = (index ? (index === 1 ? -.2 : .2) : 0) + Math.sin(t * 3.1 + index * 1.7) * .025;
    });
    if (!fire.lit && !fire.flare) return;
    const positions = fire.points.geometry.attributes.position;
    fire.seeds.forEach((seed, index) => {
      const life = (t * seed.speed + seed.phase) % 1;
      positions.setXYZ(index, seed.x * (1 - life * .4) + Math.sin(t * 2 + seed.sway) * .06, .15 + life * 1.45, seed.z);
    });
    positions.needsUpdate = true;
  }

  frame(now) {
    if (!this.mode || !this.canvas.clientWidth || !this.canvas.clientHeight) return;
    this.resize();
    const t = now / 1000;
    if (this.fire) this.animateFire(t);
    if (this.mode === 'gallery') for (const [id, item] of this.models) {
      const chosen = this.selected === id;
      if (item.isPlate) {
        item.mesh.position.y = item.home.y + Math.sin(t * 1.8 + id * 1.2) * .04 + (chosen ? .08 : 0);
        item.mesh.rotation.y = Math.sin(t * 1.2 + id * 0.7) * .22;
        item.mesh.scale.setScalar(chosen ? 1.05 : 0.95);
      } else {
        item.mesh.position.y = item.home.y + Math.sin(t * 2.1 + id * 1.4) * .09 + (chosen ? .12 : 0);
        item.mesh.rotation.set(.33 + Math.sin(t + id) * .19, t * (.6 + id * .09) + id * .9, .16 + Math.cos(t + id) * .12);
        item.mesh.scale.setScalar(chosen ? .98 : .86);
      }
    }
    if (this.mode === 'kiln') for (const [id, item] of this.models) {
      if (this.pointer?.moving && this.pointer.id === id) continue;
      item.lift += ((this.hover === id ? .12 : 0) - item.lift) * .2;
      item.mesh.position.lerp(item.target, .22);
      item.mesh.position.y += item.lift * .2;
    }
    if (this.mode === 'result') {
      const effect = this.celebration;
      const elapsed = (now - effect.start) / 1400;
      const k = Math.min(1, elapsed);
      if (k < .5) for (const id of effect.ids) {
        const item = this.models.get(id);
        if (!item) continue;
        const p = k / .5, ease = p * p;
        item.mesh.position.lerpVectors(item.home, MOUTH, ease);
        item.mesh.position.y += Math.sin(p * Math.PI) * .6;
        item.mesh.rotation.y += .18;
        item.mesh.scale.setScalar(DIE_SCALE * (1 - ease * .75));
      } else {
        if (!effect.finished) {
          for (const id of effect.ids) {
            const item = this.models.get(id);
            if (item) { this.scene.remove(item.mesh); this.art.release(item.mesh); this.models.delete(id); }
          }
          this.model(effect.spec, -1, MOUTH.x, MOUTH.y, MOUTH.z);
          effect.finished = true;
          if (this.fire) this.fire.flare = 1;
        }
        const item = this.models.get(-1);
        const p = Math.min(1, (k - .5) / .5), ease = 1 - (1 - p) ** 3;
        item.mesh.position.lerpVectors(MOUTH, RESULT, ease);
        item.mesh.position.y += Math.sin(p * Math.PI) * .5 + (p >= 1 ? Math.sin(t * 2) * .05 : 0);
        item.mesh.rotation.set(.32, t * 1.1, .14);
        item.mesh.scale.setScalar(.3 + ease * .7);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
