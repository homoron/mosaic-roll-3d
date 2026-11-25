import { t, message, displayDie, displayBossRule, displayComboGain } from './idioma.js?v=esmaltes-30';
import { glazes, basicColors, rarities, powers, upgrades, comboCatalog } from './catalogo.js?v=esmaltes-30';
import { buy, canBuy, sellTile, forge, canForge, ovenCost, tileLimit, stageAt, handSize, bossAt, bossText, bosses, BOSS_GOLD } from './reglas.js?v=esmaltes-30';
import { diePortrait, tileArt, platePortrait } from './arte.js?v=esmaltes-30';
import { Workshop } from './taller.js?v=esmaltes-30';
import { uniqueDice } from './unicos.js?v=esmaltes-30';
import { dieFaces, dieTraits, openPlateShelf, comboUsesLabel, comboUsesSentence } from './coleccion.js?v=esmaltes-30';
import { icon } from './iconos.js?v=esmaltes-30';

const coins = value => `<span class="coins">${value}<i class="coin" aria-hidden="true"></i></span>`;
// Time the kiln animation needs before the finished die is presented.
const FIRING_TIME = 1450;
// Grace period that lets the mouse travel from an item to its tooltip.
const HOVER_GRACE = 160;

// Why a die cannot take a recipe, in the potter's words.
const refusals = {
  raise: t('Todas sus caras ya valen 6. Elige otro dado.'),
  dye: t('Ya tiene ese esmalte. Elige otro color.'),
  gild: t('Todas sus caras ya están doradas.'),
  double: t('Todas sus caras ya duplican sus puntos.'),
  wild: t('Todas sus caras ya son comodín.'),
  eternal: t('Este dado ya es eterno. Elige otro.'),
  rainbow: t('Este dado ya es multicolor. Elige otro.'),
  obsidian: t('Este dado ya es de obsidiana. Elige otro.'),
  uniform: t('Todas sus caras ya son iguales. Elige otro.'),
};

// Workshop controller: the «zoco» (dice stalls and power tiles) and the kiln, each one screen tall.
export class MarketUI {
  constructor(art, element, callbacks, tileMap) {
    this.art = art;
    this.element = element;
    this.callbacks = callbacks;
    this.tileMap = tileMap;
    this.mode = null;
    this.tip = null;
    this.tipElement = Object.assign(document.createElement('div'), { className: 'ztip', hidden: true, id: 'ztip' });
    this.tipElement.setAttribute('role', 'dialog');
    this.tipElement.setAttribute('aria-labelledby', 'ztip-title');
    this.toastElement = Object.assign(document.createElement('p'), { className: 'ztoast' });
    this.toastElement.setAttribute('role', 'status');
    document.body.append(this.tipElement, this.toastElement);

    for (const target of [element, this.tipElement]) target.addEventListener('click', event => this.click(event));
    this.tipElement.addEventListener('pointerdown', event => event.stopPropagation());
    element.addEventListener('pointerover', event => {
      const item = event.target.closest('[data-tip]');
      if (item && event.pointerType === 'mouse' && !item.disabled) this.showTip(item, false);
    });
    element.addEventListener('pointerout', event => {
      const item = event.target.closest('[data-tip]');
      if (item && !item.contains(event.relatedTarget) && !this.tipElement.contains(event.relatedTarget)) this.leave(item);
    });
    this.tipElement.addEventListener('pointerover', () => clearTimeout(this.closing));
    this.tipElement.addEventListener('pointerout', event => {
      if (this.tip && !this.tipElement.contains(event.relatedTarget) && !this.tip.anchor.contains(event.relatedTarget)) this.leave(this.tip.anchor);
    });
    element.addEventListener('focusin', event => {
      const item = event.target.closest('[data-tip]');
      if (item && item.matches(':focus-visible') && this.tip?.anchor !== item) this.showTip(item, false);
    });
    for (const target of [element, this.tipElement]) target.addEventListener('focusout', event => {
      if (this.tip && !this.tip.pinned && !this.tipElement.contains(event.relatedTarget) && !this.tip.anchor.contains(event.relatedTarget)) this.closeTip();
    });
    element.addEventListener('change', event => {
      if (event.target.name === 'dye') { this.color = Number(event.target.value); this.refreshForge(); }
    });
    document.addEventListener('pointerdown', event => {
      if (this.tip && !this.tipElement.contains(event.target) && !this.tip.anchor.contains(event.target)) this.closeTip();
    });
    addEventListener('resize', () => this.closeTip());
  }

  // ---------- Screens ----------

  open(run) {
    this.run = run;
    this.lastForged = null;
    this.recipe = null;
    this.show('shop');
  }

  show(mode) {
    this.closeTip();
    this.mode = mode;
    this.result = null;
    const body = mode === 'shop' ? this.shopMarkup() : this.ovenMarkup();
    this.callbacks.open('workshop', `${this.headerMarkup()}<div class="zoco-body zoco-${mode}">${body}</div>${this.footerMarkup()}`);
    const stage = this.element.querySelector('.workshop-stage');
    this.layer = stage.querySelector('.exhibits');
    this.layoutSize = '';
    try {
      this.scene ??= new Workshop(this.art, this.tileMap);
      if (mode === 'shop') this.scene.gallery(this.run.market.dice, this.run.market.purchased);
      else this.mountKiln();
      this.scene.attach(stage);
    } catch (error) {
      console.warn('El visor del taller no pudo iniciarse', error);
      stage.classList.add('scene-unavailable');
    }
    if (mode === 'oven') {
      this.refreshForge();
      if (this.run.market.forged) this.showForged();
    }
  }

  headerMarkup() {
    const run = this.run;
    const tab = (key, glyph, label, extra = '') => `<button type="button" class="zoco-tab" data-market="view" data-key="${key}"${this.mode === key ? ' aria-current="page"' : ''}>
      ${icon(glyph)}<span>${label}</span>${extra}</button>`;
    const oven = run.market.forged ? `<span class="tab-note">${t('usado')}</span>` : '<span class="tab-ember" aria-hidden="true"></span>';
    return `<header class="zoco-head">
      <div class="zoco-heading"><span class="zoco-kicker">${bossAt(run) ? message`Jefe vencido · +${BOSS_GOLD} de oro` : message`Mosaico ${run.stage + 1} superado`} · ${message`${run.points} puntos`}</span>
        <h2 id="workshop-title" tabindex="-1">${this.mode === 'shop' ? t('El zoco') : t('El horno')}</h2></div>
      <nav class="zoco-tabs" aria-label="${t("Secciones del taller")}">${tab('shop', 'store', t('Puestos'))}${tab('oven', 'flame', t('Horno'), oven)}</nav>
      <div class="zoco-tools">
        <button class="orb orb-small" type="button" data-market="plates" aria-label="${t("Ver repisa de platos")}" title="${t("Repisa de platos")}">${icon('plate')}</button>
        <button class="orb orb-small" type="button" data-market="collection" aria-label="${t("Ver bolsa y azulejos")}" title="${t("Bolsa y azulejos")}">${icon('bag')}</button>
        <div class="purse" id="workshop-gold">${this.purseMarkup()}</div>
      </div></header>`;
  }

  purseMarkup() {
    return `<i class="coin" aria-hidden="true"></i><strong>${this.run.gold}</strong><span class="sr-only"> ${t('de oro')}</span>`;
  }

  footerMarkup() {
    const next = this.run.stage + 1;
    const boss = bossAt(this.run, next);
    // The next boss is announced here, with its rule one tap away.
    const goal = boss ? `<button type="button" class="boss-pill" data-tip="boss" data-key="${next}" aria-haspopup="dialog" aria-expanded="false">
        ${icon('crown')}<span class="boss-pill-name">${t(bosses[boss.key].name)}</span><small>${message`Meta ${stageAt(next, this.run.difficulty ?? 0).goal}`}</small></button>`
      : `<span class="goal-pill">${icon('star')}${t('Meta')} <strong>${stageAt(next, this.run.difficulty ?? 0).goal}</strong></span>`;

    let nextBtn;
    if (this.mode === 'shop') {
      nextBtn = `<button type="button" class="btn btn-gold btn-big" data-market="to-oven"><span>${t("Ir al horno")}</span>${icon('flame')}</button>`;
    } else {
      const skipHint = !this.run.market.forged ? ` title="${t('Avanzar al siguiente mosaico sin usar el horno')}"` : '';
      nextBtn = `<button type="button" class="btn btn-gold btn-big${boss ? ' btn-boss' : ''}" data-market="advance"${skipHint}><span>${message`Mosaico ${next + 1}`}</span>${icon('arrow')}</button>`;
    }

    return `<footer class="zoco-foot">
      <button type="button" class="btn btn-quiet zoco-exit" data-market="exit" aria-label="${t("Guardar y salir")}">${icon('exit')}<span>${t("Guardar y salir")}</span></button>
      <div class="zoco-next">${goal}${nextBtn}</div></footer>`;
  }

  // ---------- Stalls ----------

  shopMarkup() {
    const { market, gold } = this.run;
    return `<section class="stall" aria-label="${t("Puestos del taller")}">
        <div class="workshop-stage" id="draft-scene"><div class="exhibits" role="group" aria-label="${t("Artículos a la venta")}">${market.dice.map((spec, index) => {
          const rarity = rarities[spec.rarity];
          const sold = market.purchased.includes(index);
          const price = spec.price ?? rarity.price;
          const isCombo = Boolean(spec.combo);
          const uses = isCombo ? (this.run.comboCounts?.[spec.combo] || 0) : 0;
          const title = isCombo ? t(spec.name) : displayDie(spec);
          const kicker = isCombo ? message`Niv. ${spec.level} → ${spec.nextLevel}` : t(rarity.name);
          const comboMeta = isCombo ? `<span class="exhibit-combo-meta">${kicker} · ${comboUsesLabel(uses)}</span>` : '';
          const ariaExtra = isCombo ? `${kicker}, ${comboUsesSentence(uses)}` : kicker;
          return `<button type="button" class="exhibit${!sold && gold < price ? ' dear' : ''}" data-tip="${isCombo ? 'combo' : 'die'}" data-key="${index}" data-anchor="inspect/${index}"
            aria-haspopup="dialog" aria-expanded="false" aria-label="${title}, ${ariaExtra}, ${sold ? (isCombo ? t('mejorado') : t('comprado')) : message`${price} de oro`}" style="--rarity:${rarity.color}"${sold ? ' disabled' : ''}>
            <span class="exhibit-plate"><strong>${title}</strong>${comboMeta}<small>${isCombo ? '' : `<span class="rarity-name">${kicker}</span>`}${sold ? `${icon('check')}${isCombo ? t('Mejorado') : t('Comprado')}` : coins(price)}</small></span></button>`;
        }).join('')}</div></div>
      </section>
      <section class="wall" aria-label="${t("Azulejos de poder")}">${this.wallMarkup()}</section>`;
  }

  wallMarkup() {
    const { market, powers: owned, gold } = this.run;
    const forSale = market.tiles.map(key => {
      const tile = powers[key], rarity = rarities[tile.rarity];
      const equipped = owned.includes(key);
      return `<button type="button" class="wall-tile${equipped ? ' taken' : gold < tile.price ? ' dear' : ''}" data-tip="tile" data-key="${key}" aria-haspopup="dialog" aria-expanded="false"
        aria-label="${t(tile.name)}, ${equipped ? t('equipado') : message`${tile.price} de oro`}" style="--rarity:${rarity.color}"><img src="${tileArt(key).url}" alt="">
        <span class="wall-price">${equipped ? `${icon('check')}${t('Tuyo')}` : coins(tile.price)}</span></button>`;
    }).join('');
    const mine = owned.map(key => `<button type="button" class="wall-tile owned" data-tip="owned" data-key="${key}" aria-haspopup="dialog" aria-expanded="false"
      aria-label="${t(powers[key].name)}, ${t('equipado')}" style="--rarity:${rarities[powers[key].rarity].color}"><img src="${tileArt(key).url}" alt=""></button>`).join('');
    return `<div class="wall-row"><h3 class="wall-label">${t("Azulejos a la venta")}</h3>
        <div class="wall-tiles">${forSale || `<span class="wall-empty">${t('Agotado')}</span>`}</div></div>
      <div class="wall-row"><h3 class="wall-label">${t('Equipados')} <span class="count">${owned.length}/${tileLimit}</span></h3>
        <div class="wall-tiles wall-owned">${mine}${'<span class="niche-empty" aria-hidden="true"></span>'.repeat(Math.max(0, tileLimit - owned.length))}</div></div>
      <p class="wall-note">${icon('help')}${t('Toca un artículo o un azulejo para ver qué hace.')}</p>`;
  }

  refreshShop() {
    const gold = this.run.gold;
    this.element.querySelector('#workshop-gold').innerHTML = this.purseMarkup();
    this.callbacks.bump?.(this.element.querySelector('#workshop-gold'));
    for (const button of this.element.querySelectorAll('.exhibit')) {
      const index = Number(button.dataset.key);
      const spec = this.run.market.dice[index];
      const sold = this.run.market.purchased.includes(index);
      const price = spec.price ?? rarities[spec.rarity].price;
      const isCombo = Boolean(spec.combo);
      button.disabled = sold;
      button.classList.toggle('dear', !sold && gold < price);
      if (sold) {
        if (isCombo) {
          const uses = this.run.comboCounts?.[spec.combo] || 0;
          const meta = button.querySelector('.exhibit-combo-meta');
          if (meta) meta.textContent = `${message`Niv. ${spec.nextLevel}`} · ${comboUsesLabel(uses)}`;
          button.querySelector('small').innerHTML = `${icon('check')}${t('Mejorado')}`;
        } else {
          button.querySelector('small').innerHTML = `<span class="rarity-name">${t(rarities[spec.rarity].name)}</span>${icon('check')}${t('Comprado')}`;
        }
        button.setAttribute('aria-label', `${isCombo ? t(spec.name) : displayDie(spec)}, ${isCombo ? t('mejorado') : t('comprado')}`);
      }
    }
    const wall = this.element.querySelector('.wall');
    if (wall) wall.innerHTML = this.wallMarkup();
  }

  // ---------- Tooltips ----------

  tipMarkup(kind, key) {
    const run = this.run;
    if (kind === 'boss') {
      const boss = bossAt(run, key);
      return { color: '#f0a184', html: `<div class="ztip-card"><span class="ztip-emblem" aria-hidden="true">${icon('crown')}</span><div class="ztip-text">
        <small class="ztip-kicker">${message`Jefe · mosaico ${key + 1}`}</small><strong id="ztip-title">${t(bosses[boss.key].name)}</strong><p>${displayBossRule(boss, bossText)}</p>
        <p class="ztip-plain">${message`Meta ${stageAt(key, this.run.difficulty ?? 0).goal}. Vencerlo da ${BOSS_GOLD} de oro extra.`}</p></div></div>` };
    }
    if (kind === 'combo') {
      const spec = run.market.dice[key];
      const combo = comboCatalog[spec.combo];
      const uses = run.comboCounts?.[spec.combo] || 0;
      const sold = run.market.purchased.includes(key);
      const price = spec.price;
      const label = sold ? t('Mejorado') : run.gold < price ? message`Te faltan ${price - run.gold} de oro` : message`Mejorar · ${coins(price)}`;
      const action = `<button class="btn btn-gold ztip-action" type="button" data-market="combo" data-key="${key}"${!sold && run.gold >= price ? '' : ' disabled'}>${label}</button>`;
      return {
        color: rarities[spec.rarity].color,
        html: `<div class="ztip-card"><img class="ztip-plate" src="${platePortrait(spec)}" alt=""><div class="ztip-text">
          <small class="ztip-kicker">${t('Plato de maestría')} · ${message`Nivel ${spec.level}`} · ${comboUsesLabel(uses)}</small><strong id="ztip-title">${t(spec.name)}</strong>
          <p class="ztip-combo-gain">${displayComboGain(spec.combo, spec.nextLevel) || combo.text(spec.nextLevel)}</p>
          <p class="ztip-plain">${comboUsesSentence(uses)}</p>
        </div></div>${action}`
      };
    }
    if (kind === 'die' || kind === 'candidate') {
      const spec = kind === 'die' ? run.market.dice[key] : run.bag[key];
      const rarity = rarities[spec.rarity], unique = spec.unique && uniqueDice[spec.unique], traits = dieTraits(spec);
      let action = '';
      if (kind === 'die') {
        const sold = run.market.purchased.includes(key);
        const owned = spec.unique && run.uniques?.some(other => other?.unique === spec.unique);
        const atCapacity = spec.unique && (run.uniques?.length || 0) >= 3;
        const label = sold ? t('Comprado') : owned ? t('Ya tienes este dado') : atCapacity ? (run.gold < rarity.price ? message`Te faltan ${rarity.price - run.gold} de oro` : message`Comprar y cambiar · ${coins(rarity.price)}`) : run.gold < rarity.price ? message`Te faltan ${rarity.price - run.gold} de oro` : message`Comprar · ${coins(rarity.price)}`;
        action = `<button class="btn btn-gold ztip-action" type="button" data-market="die" data-key="${key}"${canBuy(run, 'die', key) ? '' : ' disabled'}>${label}</button>`;
      } else {
        const inKiln = this.slots.indexOf(key) >= 0;
        const btnClass = inKiln ? 'btn btn-quiet ztip-action' : 'btn btn-gold ztip-action';
        const btnLabel = inKiln ? t('Sacar del horno') : t('Meter al horno');
        action = `<button class="${btnClass}" type="button" data-market="candidate-slot" data-key="${key}"${run.market.forged ? ' disabled' : ''}>${icon('flame')}${btnLabel}</button>`;
      }
      return { color: rarity.color, html: `<div class="ztip-card"><img class="ztip-die" src="${diePortrait(spec)}" alt=""><div class="ztip-text">
        <small class="ztip-kicker">${t(rarity.name)}${unique ? ` · ${unique.mark}` : ''}</small><strong id="ztip-title">${displayDie(spec)}</strong>${dieFaces(spec)}
        ${unique ? `<p>${t(unique.text)}</p>` : traits ? `<p>${traits}</p>` : `<p class="ztip-plain">${t('Sin efectos especiales.')}</p>`}</div></div>${action}` };
    }
    const tile = powers[key], rarity = rarities[tile.rarity];
    let action;
    if (kind === 'owned') action = `<button class="btn btn-quiet ztip-action" type="button" data-market="sell" data-key="${key}">${icon('refresh')}${message`Vender · +${coins(Math.floor(tile.price / 2))}`}</button>`;
    else {
      const label = run.powers.includes(key) ? t('Ya equipado') : run.powers.length >= tileLimit ? message`Repisa llena (${tileLimit}/${tileLimit})`
        : run.gold < tile.price ? message`Te faltan ${tile.price - run.gold} de oro` : message`Comprar · ${coins(tile.price)}`;
      action = `<button class="btn btn-gold ztip-action" type="button" data-market="tile" data-key="${key}"${canBuy(run, 'tile', key) ? '' : ' disabled'}>${label}</button>`;
    }
    return { color: rarity.color, html: `<div class="ztip-card"><img class="ztip-tile" src="${tileArt(key).url}" alt=""><div class="ztip-text">
      <small class="ztip-kicker">${t(rarity.name)}${kind === 'owned' ? ` · ${t('Equipado')}` : ''}</small><strong id="ztip-title">${t(tile.name)}</strong><p>${t(tile.text)}</p></div></div>${action}` };
  }

  showTip(anchor, pinned) {
    clearTimeout(this.closing);
    if (this.tip?.anchor === anchor) { this.tip.pinned ||= pinned; return; }
    this.closeTip();
    const kind = anchor.dataset.tip;
    const key = kind === 'tile' || kind === 'owned' ? anchor.dataset.key : Number(anchor.dataset.key);
    const { color, html } = this.tipMarkup(kind, key);
    this.tip = { anchor, pinned, kind };
    this.tipElement.style.setProperty('--rarity', color);
    this.tipElement.dataset.kind = kind;
    this.tipElement.innerHTML = html;
    this.tipElement.hidden = false;
    anchor.setAttribute('aria-expanded', 'true');
    if (kind === 'die' && this.scene) this.scene.selected = key;
    this.placeTip();
  }

  placeTip() {
    if (!this.tip) return;
    const tip = this.tipElement, rect = this.tip.anchor.getBoundingClientRect();
    if (!rect.width) { this.closeTip(); return; }
    const width = tip.offsetWidth, height = tip.offsetHeight, margin = 8, gap = 12;
    const clampX = x => Math.round(Math.max(margin, Math.min(innerWidth - width - margin, x)));
    const clampY = y => Math.round(Math.max(margin, Math.min(innerHeight - height - margin, y)));
    let side, left, top;
    if (this.tip.kind === 'die') {
      // Dice float above their pedestals, so the tooltip opens beside the die and never covers it.
      const die = { y: rect.top + rect.height * .34 };
      if (rect.right + gap + width <= innerWidth - margin) [side, left] = ['right', rect.right + gap];
      else if (rect.left - gap - width >= margin) [side, left] = ['left', rect.left - gap - width];
      if (side) top = clampY(die.y - height / 2);
      else {
        const plate = this.tip.anchor.querySelector('.exhibit-plate').getBoundingClientRect();
        side = plate.bottom + gap + height <= innerHeight - margin ? 'below' : 'above';
        left = clampX(plate.left + plate.width / 2 - width / 2);
        top = clampY(side === 'below' ? plate.bottom + gap : rect.top - gap - height);
      }
      tip.style.setProperty('--arrow-y', `${Math.round(Math.max(18, Math.min(height - 18, die.y - top)))}px`);
    } else {
      side = rect.top - gap - height >= margin ? 'above' : 'below';
      left = clampX(rect.left + rect.width / 2 - width / 2);
      top = clampY(side === 'above' ? rect.top - gap - height : rect.bottom + gap);
    }
    const anchorX = this.tip.kind === 'die' && (side === 'below' || side === 'above')
      ? this.tip.anchor.querySelector('.exhibit-plate').getBoundingClientRect() : rect;
    tip.dataset.side = side;
    tip.style.setProperty('--arrow', `${Math.round(Math.max(18, Math.min(width - 18, anchorX.left + anchorX.width / 2 - left)))}px`);
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  leave(anchor) {
    if (!this.tip || this.tip.pinned || this.tip.anchor !== anchor) return;
    clearTimeout(this.closing);
    this.closing = setTimeout(() => { if (this.tip && !this.tip.pinned) this.closeTip(); }, HOVER_GRACE);
  }

  closeTip() {
    clearTimeout(this.closing);
    if (!this.tip) return;
    this.tip.anchor.setAttribute('aria-expanded', 'false');
    if (this.tip.kind === 'die' && this.scene) this.scene.selected = -1;
    this.tip = null;
    this.tipElement.hidden = true;
    this.tipElement.innerHTML = '';
  }

  toast(message) {
    clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.classList.remove('visible');
    void this.toastElement.offsetWidth;
    this.toastElement.classList.add('visible');
    this.toastTimer = setTimeout(() => this.toastElement.classList.remove('visible'), 2600);
  }

  // ---------- Kiln ----------

  ovenMarkup() {
    const { market, gold } = this.run;
    const forged = market.forged;
    const cost = ovenCost(this.run);
    if (!this.recipe || !market.oven.includes(this.recipe)) this.recipe = market.oven[0];
    this.forgeCandidates = this.run.forgeHand.filter(id => this.run.bag[id] && !this.run.bag[id].unique);
    this.slots = Array(upgrades[this.recipe].slots).fill(null);
    this.color = basicColors[0];
    const recipes = market.oven.map(key => {
      const recipe = upgrades[key];
      const costBadge = cost > 0 ? `${icon('coin')}${message`${cost} oro`}` : `${icon('flame')}${t('Gratis')}`;
      return `<button type="button" class="recipe" data-market="recipe" data-key="${key}" aria-pressed="${key === this.recipe}"${forged ? ' disabled' : ''}>
        <span class="recipe-top"><span class="recipe-name">${t(recipe.name)}</span><span class="recipe-free">${costBadge}</span></span>
        <span class="recipe-desc">${t(recipe.text)}</span></button>`;
    }).join('');
    const candidates = this.forgeCandidates.map(id => `<button type="button" class="candidate" data-market="candidate" data-tip="candidate" data-key="${id}" aria-pressed="false"
      aria-label="${message`${displayDie(this.run.bag[id])}, caras ${this.run.bag[id].faces.join(' ')}`}"${forged ? ' disabled' : ''}><img src="${diePortrait(this.run.bag[id])}" alt=""><span class="candidate-slot" aria-hidden="true"></span></button>`).join('');
    const swatches = basicColors.map(id => `<label class="swatch" style="--glaze:${glazes[id].color};--glaze-light:${glazes[id].light}" title="${t(glazes[id].name)}">
      <input type="radio" name="dye" value="${id}"${id === this.color ? ' checked' : ''}><span class="sr-only">${t(glazes[id].name)}</span></label>`).join('');
    const ovenStateText = forged ? `${icon('moon')}${t('Horno en reposo')}` : (cost > 0 ? `${icon('flame')}${message`Horno encendido · ${cost} oro`}` : `${icon('flame')}${t('Horno encendido · Gratis')}`);
    const recipeSubtitle = cost > 0 ? message`mejora opcional · ${cost} oro` : t('mejora opcional y gratis');
    return `<section class="stall kiln-stall" aria-label="${t("Horno")}">
        <div class="workshop-stage kiln-stage" id="kiln-scene">
          <span class="kiln-state" id="kiln-state">${ovenStateText}</span>
          <fieldset class="dye-bar" id="dye-bar" hidden><legend>${t("Segundo color")}</legend><div class="swatches">${swatches}</div></fieldset>
          <div class="kiln-result" id="kiln-result" hidden></div>
        </div>
      </section>
      <section class="kiln-panel" aria-label="${t("Recetas del horno")}">
        <h3 class="panel-label">${t('Recetas de hoy')} <small>${recipeSubtitle}</small></h3>
        <div class="recipes" role="group" aria-label="${t("Recetas")}">${recipes}</div>
        <p class="recipe-text" id="recipe-text" aria-hidden="true"></p>
        <h3 class="panel-label">${t('Dados del banco')} <small>${this.forgeCandidates.length ? t('toca para examinar o arrastra al horno') : t('sin dados disponibles')}</small></h3>
        <div class="candidates" role="group" aria-label="${t("Dados del banco")}">${candidates}</div>
        <p class="kiln-status" id="forge-status" role="status"></p>
        <button class="btn btn-gold btn-big kiln-fire" type="button" data-market="forge" disabled>${icon('flame')}<span class="fire-label"></span></button>
      </section>`;
  }

  mountKiln() {
    const forged = this.run.market.forged;
    // After firing, the finished die waits on the hearth instead of on the bench.
    const bench = this.forgeCandidates.filter(id => !forged || id !== this.lastForged?.id);
    this.scene.kiln(bench, this.run.bag, this.slots.length, !forged,
      id => this.inspectCandidate(id), (id, slot) => this.pickForge(id, slot));
    if (forged && this.lastForged) this.scene.display(this.lastForged.spec);
  }

  // Opens the die inspection tooltip before committing a bench die to the kiln.
  inspectCandidate(id) {
    if (this.mode !== 'oven' || this.result || this.run.market.forged) return;
    const button = this.element.querySelector(`.candidate[data-key="${id}"]`);
    if (!button) return;
    if (this.tip?.anchor === button && this.tip.pinned) {
      this.closeTip();
      return;
    }
    this.showTip(button, true);
  }

  selectRecipe(key) {
    if (this.run.market.forged || this.result || key === this.recipe || !this.run.market.oven.includes(key)) return;
    this.recipe = key;
    const placed = this.slots.filter(id => id != null);
    this.slots = Array(upgrades[key].slots).fill(null).map((_, slot) => placed[slot] ?? null);
    this.scene?.setSlots(this.slots.length);
    this.refreshForge();
  }

  // slot < 0 toggles the die; a slot index drops it there (from the bench or another socket).
  pickForge(id, slot = null) {
    if (this.mode !== 'oven' || this.result || this.run.market.forged || !this.forgeCandidates.includes(id)) return;
    const current = this.slots.indexOf(id);
    if (slot === -1) { if (current >= 0) this.slots[current] = null; }
    else if (slot == null && current >= 0) this.slots[current] = null;
    else {
      // With a single socket a new die simply replaces the one inside.
      const target = slot ?? (this.slots.length === 1 ? 0 : this.slots.indexOf(null));
      if (target < 0 || target >= this.slots.length) return;
      if (current >= 0) this.slots[current] = this.slots[target];
      this.slots[target] = id;
      this.callbacks.note('pick');
    }
    // A die cannot take the glaze it already has, so the dye recipe offers the next colour.
    const first = this.slots[0];
    if (this.recipe === 'dye' && first != null && this.run.bag[first].glaze === this.color) {
      this.color = basicColors.find(color => color !== this.run.bag[first].glaze);
    }
    this.refreshForge();
  }

  forgeState() {
    const run = this.run, recipe = upgrades[this.recipe];
    const cost = ovenCost(run);
    const ids = this.slots.filter(id => id != null);
    if (run.market.forged) return { text: t('El horno ya coció en este taller. Puedes avanzar al siguiente mosaico.') };
    if (ids.length < this.slots.length) {
      return { text: t('Elige un dado del banco para meterlo en el horno.') };
    }
    if (cost > 0 && run.gold < cost) {
      return { text: message`Necesitas ${cost} de oro para usar el horno (tienes ${run.gold}). Puedes avanzar al siguiente mosaico sin cocer.`, warn: true };
    }
    if (!canForge(run, this.recipe, ids, this.color)) {
      const spec = run.bag[ids[0]];
      return { text: this.recipe === 'dye' && spec.rainbow ? t('Un dado multicolor no admite otro esmalte.') : refusals[this.recipe] ?? t('Este dado ya tiene el máximo de mejoras de este tipo.'), warn: true };
    }
    return { ready: true, text: cost > 0 ? message`${displayDie(run.bag[ids[0]])} listo para cocer por ${cost} de oro. Pulsa «Cocer» para aplicar la receta.` : message`${displayDie(run.bag[ids[0]])} listo para cocer gratis. Pulsa «Cocer» para aplicar la receta.` };
  }

  refreshForge() {
    if (this.mode !== 'oven') return;
    const recipe = upgrades[this.recipe];
    const cost = ovenCost(this.run);
    for (const button of this.element.querySelectorAll('[data-market="recipe"]')) button.setAttribute('aria-pressed', String(button.dataset.key === this.recipe));
    this.element.querySelector('#recipe-text').textContent = t(recipe.text);
    for (const button of this.element.querySelectorAll('[data-market="candidate"]')) {
      const slot = this.slots.indexOf(Number(button.dataset.key));
      button.setAttribute('aria-pressed', String(slot >= 0));
      button.querySelector('.candidate-slot').textContent = slot >= 0 && this.slots.length > 1 ? slot + 1 : '';
    }
    const dye = this.element.querySelector('#dye-bar');
    dye.hidden = this.recipe !== 'dye' || this.run.market.forged;
    for (const input of dye.querySelectorAll('input')) {
      input.checked = Number(input.value) === this.color;
      const first = this.slots[0];
      input.disabled = first != null && this.run.bag[first].glaze === Number(input.value);
    }
    const state = this.forgeState();
    const status = this.element.querySelector('#forge-status');
    status.textContent = state.text;
    status.classList.toggle('warn', Boolean(state.warn));
    status.classList.toggle('ready', Boolean(state.ready));
    const fire = this.element.querySelector('[data-market="forge"]');
    fire.disabled = !state.ready;
    fire.querySelector('.fire-label').innerHTML = this.run.market.forged ? t('Horno usado') : (cost > 0 ? message`Cocer (${cost} oro)` : t('Cocer gratis'));
    this.scene?.socketsFor(this.slots);
  }

  apply() {
    if (this.result) return;
    const ids = this.slots.filter(id => id != null);
    const recipe = this.recipe;
    const spec = forge(this.run, recipe, ids, this.color);
    if (!spec) return;
    const now = performance.now();
    this.result = { spec, recipe, id: ids[0], readyAt: now + FIRING_TIME };
    this.closeTip();
    this.scene?.celebrate(spec, ids, now);
    this.callbacks.changed();
    this.callbacks.note('forge');
    this.element.querySelector('#workshop-gold').innerHTML = this.purseMarkup();
    for (const button of this.element.querySelectorAll('button')) button.disabled = true;
    this.element.querySelector('.kiln-panel').classList.add('firing');
    this.element.querySelector('#dye-bar').hidden = true;
    this.element.querySelector('#forge-status').textContent = t('El horno está cociendo el dado…');
  }

  showResult() {
    const { spec, recipe, id } = this.result;
    this.result = null;
    this.lastForged = { spec, recipe, id };
    this.scene?.heat(false);
    const panel = this.element.querySelector('.kiln-panel');
    panel.classList.remove('firing');
    for (const button of this.element.querySelectorAll('.zoco-tabs button, .zoco-tools button, .zoco-foot button')) button.disabled = false;
    this.element.querySelector('.tab-ember')?.replaceWith(Object.assign(document.createElement('span'), { className: 'tab-note', textContent: t('usado') }));
    this.element.querySelector('#kiln-state').innerHTML = `${icon('moon')}${t('Horno en reposo')}`;
    this.showForged();
    this.refreshForge();
    const foot = this.element.querySelector('.zoco-foot');
    if (foot) foot.outerHTML = this.footerMarkup();
    this.toast(message`${displayDie(spec)} ha vuelto a tu bolsa.`);
    this.element.querySelector('[data-market="advance"]')?.focus({ preventScroll: true });
  }

  // Card over the kiln with the die that came out of it in this workshop.
  showForged() {
    const card = this.element.querySelector('#kiln-result');
    if (!card || !this.lastForged) return;
    const { spec, recipe } = this.lastForged;
    const traits = dieTraits(spec);
    card.innerHTML = `<small class="ztip-kicker">${t(upgrades[recipe]?.name || 'Mejora')}</small><strong>${displayDie(spec)}</strong>${dieFaces(spec)}${traits ? `<p>${traits}</p>` : ''}`;
    card.hidden = false;
  }

  // ---------- Actions ----------

  click(event) {
    const actionButton = event.target.closest('[data-market]');
    const tipButton = event.target.closest('[data-tip]');
    if (!this.mode) return;
    if (tipButton) {
      if (tipButton.disabled) return;
      if (this.tip?.anchor === tipButton && this.tip.pinned) { this.closeTip(); return; }
      this.showTip(tipButton, true);
      // Keyboard users land on the tooltip action right away.
      if (event.detail === 0) this.tipElement.querySelector('.ztip-action:not(:disabled)')?.focus({ preventScroll: true });
      return;
    }
    if (!actionButton || actionButton.disabled) {
      if (this.tipElement.contains(event.target)) this.closeTip();
      return;
    }
    const { market, key } = actionButton.dataset;
    if (market === 'to-oven') this.show('oven');
    else if (market === 'combo') this.purchaseCombo(Number(key));
    else if (market === 'die' || market === 'tile') this.purchase(market, market === 'die' ? Number(key) : key);
    else if (market === 'replace-unique') {
      const replaceIndex = Number(actionButton.dataset.replace);
      this.purchase('die', Number(key), replaceIndex);
    }
    else if (market === 'sell') this.sell(key);
    else if (market === 'view') { if (key !== this.mode) this.show(key); }
    else if (market === 'recipe') this.selectRecipe(key);
    else if (market === 'candidate-slot') { this.pickForge(Number(key)); this.closeTip(); }
    else if (market === 'candidate') this.pickForge(Number(key));
    else if (market === 'forge') this.apply();
    else if (market === 'collection') { this.closeTip(); this.callbacks.collection(); }
    else if (market === 'plates') { this.closeTip(); this.showPlateShelfCelebration(null, 0, 0); }
    else if (market === 'exit') this.callbacks.exit();
    else if (market === 'advance') this.callbacks.advance();
  }

  purchaseCombo(key) {
    const spec = this.run.market.dice[key];
    const oldLevel = this.run.comboLevels[spec.combo] || 1;
    if (!buy(this.run, 'combo', key)) return;
    const newLevel = this.run.comboLevels[spec.combo];
    this.closeTip();
    this.callbacks.note('levelUp');
    this.callbacks.changed();
    this.scene?.sold(key);
    this.refreshShop();
    this.showPlateShelfCelebration(spec.combo, oldLevel, newLevel);
  }

  showPlateShelfCelebration(upgradedKey, oldLevel, newLevel) {
    openPlateShelf(this.run, { host: this.element, upgradedKey, oldLevel, newLevel });
  }

  purchase(kind, key, replaceIndex = null) {
    if (kind === 'die') {
      const spec = this.run.market.dice[key];
      if (spec?.unique && (this.run.uniques?.length || 0) >= 3 && replaceIndex == null) {
        this.promptBreakUnique(key);
        return;
      }
    }
    if (!buy(this.run, kind, key, replaceIndex)) return;
    this.closeTip();
    this.callbacks.note('place');
    this.callbacks.changed();
    if (kind === 'die') {
      this.scene?.sold(key);
      const spec = this.run.market.dice[key];
      this.toast(spec?.unique ? message`¡${displayDie(spec)} añadido a tus dados únicos!` : message`${displayDie(spec)} se une a tu bolsa.`);
    } else this.toast(message`${t(powers[key].name)} equipado.`);
    this.refreshShop();
  }

  promptBreakUnique(dieKey) {
    this.closeTip();
    document.getElementById('unique-replace-modal')?.remove();
    const spec = this.run.market.dice[dieKey];
    if (!spec) return;
    const price = rarities[spec.rarity].price;
    const incomingUnique = uniqueDice[spec.unique];

    const dialog = document.createElement('div');
    dialog.className = 'plate-shelf-dialog-backdrop';
    dialog.id = 'unique-replace-modal';
    dialog.innerHTML = `
      <div class="plate-shelf-dialog unique-replace-dialog" role="dialog" aria-modal="true" aria-labelledby="replace-title">
        <div class="plate-shelf-head">
          <span class="shelf-kicker">${t('Repisa de dados únicos llena (3/3)')}</span>
          <h2 class="shelf-title" id="replace-title">${t('Elige qué dado sustituir')}</h2>
          <p class="shelf-subtitle">${t('Toca uno para ver su efecto y reemplazarlo.')}</p>
        </div>

        <div class="replace-body">
          <div class="replace-incoming" style="--rarity:${rarities[spec.rarity].color}">
            <img class="replace-incoming-img" src="${diePortrait(spec)}" alt="">
            <div class="replace-incoming-info">
              <small class="ztip-kicker">${t('Nuevo dado')}${incomingUnique ? ` · ${incomingUnique.mark}` : ''}</small>
              <strong>${displayDie(spec)}</strong>
              <p>${incomingUnique ? t(incomingUnique.text) : ''}</p>
            </div>
            <span class="replace-incoming-price">${coins(price)}</span>
          </div>

          <section class="plate-tier" aria-label="${t('Tus 3 dados únicos')}">
            <h3 class="shelf-tier-label">${t('Tus 3 dados únicos')}</h3>
            <div class="replace-owned-grid">
              ${this.run.uniques.map((u, i) => {
                const uDef = uniqueDice[u.unique];
                return `<button type="button" class="replace-owned-card" data-replace-pick="${i}" aria-pressed="false" style="--rarity:${rarities[u.rarity].color}">
                  <img src="${diePortrait(u)}" alt="">
                  ${uDef ? `<span class="replace-owned-mark">${uDef.mark}</span>` : ''}
                  <strong>${displayDie(u)}</strong>
                </button>`;
              }).join('')}
            </div>
          </section>
        </div>

        <div class="plate-tip replace-tip" id="replace-tip" role="dialog" aria-label="${t('Dado único')}" hidden></div>

        <div class="plate-shelf-foot">
          <button type="button" class="btn btn-quiet btn-continue" data-action="close-unique-replace">${t('Cancelar')}</button>
        </div>
      </div>
    `;

    const card = dialog.querySelector('.unique-replace-dialog');
    const tip = dialog.querySelector('#replace-tip');
    let selectedIdx = null;

    const hideTip = () => {
      if (selectedIdx == null) return;
      selectedIdx = null;
      tip.hidden = true;
      for (const btn of dialog.querySelectorAll('.replace-owned-card')) {
        btn.classList.remove('selected');
        btn.setAttribute('aria-pressed', 'false');
      }
    };

    const showOwnedTip = (idx, anchorBtn) => {
      if (selectedIdx === idx) { hideTip(); return; }
      hideTip();
      const u = this.run.uniques[idx];
      if (!u || !anchorBtn) return;
      const uDef = uniqueDice[u.unique];
      selectedIdx = idx;
      anchorBtn.classList.add('selected');
      anchorBtn.setAttribute('aria-pressed', 'true');
      tip.innerHTML = `
        <div class="plate-tip-card">
          <img class="plate-tip-img" src="${diePortrait(u)}" alt="">
          <div class="plate-tip-text">
            <small class="ztip-kicker">${t('Dado único')}${uDef ? ` · ${uDef.mark}` : ''}</small>
            <strong>${displayDie(u)}</strong>
            ${dieFaces(u)}
            <p>${uDef ? t(uDef.text) : ''}</p>
          </div>
          <button type="button" class="plate-tip-close" data-action="close-replace-tip" aria-label="${t('Cerrar')}">${icon('close')}</button>
        </div>
        <button type="button" class="btn btn-gold replace-confirm-btn" data-action="confirm-replace-unique">${message`Reemplazar · ${coins(price)}`}</button>
      `;
      tip.hidden = false;
      const cardRect = card.getBoundingClientRect();
      const btnRect = anchorBtn.getBoundingClientRect();
      const tipHeight = tip.offsetHeight;
      const aboveTop = btnRect.top - cardRect.top - tipHeight - 8;
      const belowTop = btnRect.bottom - cardRect.top + 8;
      const top = aboveTop >= 8 ? aboveTop : Math.min(cardRect.height - tipHeight - 8, belowTop);
      tip.style.top = `${Math.max(8, Math.round(top))}px`;
    };

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener('keydown', onKeyDown, true);
      dialog.classList.add('closing');
      setTimeout(() => dialog.remove(), 180);
    };

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (selectedIdx != null) hideTip();
        else close();
      }
    };

    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-action="close-unique-replace"]')) {
        close();
        return;
      }
      if (event.target.closest('[data-action="close-replace-tip"]')) {
        hideTip();
        return;
      }
      if (event.target.closest('[data-action="confirm-replace-unique"]')) {
        if (selectedIdx == null) return;
        const idx = selectedIdx;
        close();
        this.purchase('die', dieKey, idx);
        return;
      }
      const pickBtn = event.target.closest('[data-replace-pick]');
      if (pickBtn) {
        showOwnedTip(Number(pickBtn.dataset.replacePick), pickBtn);
        return;
      }
      if (selectedIdx != null) hideTip();
    });

    window.addEventListener('keydown', onKeyDown, true);
    this.element.append(dialog);
    setTimeout(() => dialog.querySelector('.replace-owned-card')?.focus({ preventScroll: true }), 50);
  }

  sell(key) {
    if (!sellTile(this.run, key)) return;
    this.closeTip();
    this.callbacks.changed();
    this.callbacks.note('chip');
    this.toast(message`${t(powers[key].name)} vendido por ${Math.floor(powers[key].price / 2)} de oro.`);
    this.refreshShop();
  }

  back() {
    const replaceModal = document.getElementById('unique-replace-modal');
    if (replaceModal) { replaceModal.remove(); return true; }
    if (this.tip) { this.closeTip(); return true; }
    if (this.result) return true;
    if (this.mode === 'oven') { this.show('shop'); return true; }
    return false;
  }

  close() {
    document.getElementById('unique-replace-modal')?.remove();
    this.closeTip();
    this.mode = null;
    this.result = null;
    this.layer = null;
    this.scene?.clear();
  }

  frame(now) {
    if (!this.mode) return;
    this.scene?.frame(now);
    if (this.layer && this.scene?.width && this.scene.height) {
      const size = `${this.scene.width}/${this.scene.height}`;
      if (size !== this.layoutSize) {
        this.scene.anchors(this.layer);
        this.layoutSize = size;
      }
    }
    if (this.tip) this.placeTip();
    if (this.result && now >= this.result.readyAt) this.showResult();
  }
}
