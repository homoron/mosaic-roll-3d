import { t, message, language, displayDie, displayItem, displayComboGain } from './idioma.js?v=esmaltes-30';
import { basicColors, colorDie, dieCount, hasFace, powers, rarities, uniqueDie, glazes, comboCatalog } from './catalogo.js?v=esmaltes-30';
import { diePortrait, tileArt, platePortrait } from './arte.js?v=esmaltes-30';
import { tileLimit, decks, deckSample, bosses, BOSS_EVERY, getComboValue } from './reglas.js?v=esmaltes-30';
import { uniqueDice } from './unicos.js?v=esmaltes-30';
import { icon } from './iconos.js?v=esmaltes-30';

const basicDice = basicColors.map(colorDie);
const specialDice = Object.keys(uniqueDice).map(uniqueDie);
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function dieFaces(spec) {
  return `<span class="face-list" aria-label="${t("Caras del dado")}">${spec.faces.map((value, index) => {
    const gilded = hasFace(spec.gild, index);
    const boostLabel = spec.boostMult === 4 ? '×4' : '×2';
    const goldLabel = spec.goldYield === 6 ? t('oro +6') : t('oro');
    const label = [value, hasFace(spec.boost, index) && boostLabel, gilded && goldLabel, hasFace(spec.wild, index) && '★'].filter(Boolean).join(' ');
    return `<span${gilded ? ' class="gilded"' : ''}>${label}</span>`;
  }).join('')}</span>`;
}

export function dieTraits(spec) {
  const boostText = spec.boostMult === 4 ? t('Puntos cuádruples en caras ×4') : t('Puntos dobles en caras ×2');
  const goldText = spec.goldYield === 6 ? t('Oro x2 en caras doradas') : t('Oro en caras marcadas');
  const dyeText = spec.second != null ? `${t('Segundo color')}: ${t(glazes[spec.second]?.name || '')}` : '';
  return [spec.rainbow && t('Multicolor'), dyeText, spec.eternal && t('Eterno'), spec.obsidian && t('Obsidiana'), spec.gild && goldText,
    spec.boost && boostText, spec.wild && t('Comodín en caras ★')].filter(Boolean).join(' · ');
}

const rarityStyle = rarity => `--rarity:${rarity.color}`;
const tipEntries = new Map();
let tipSeq = 0;

function registerTip(entry) {
  const id = `col-${++tipSeq}`;
  tipEntries.set(id, entry);
  return id;
}

function diceIcon(spec, count = 1, ownedUniqueIndex = null) {
  const rarity = rarities[spec.rarity];
  const tipId = registerTip({ kind: 'die', spec, count, ownedUniqueIndex });
  const label = `${displayDie(spec)}${count > 1 ? ` ×${count}` : ''}`;
  return `<li class="folio-item"><button type="button" class="folio-icon-btn" style="${rarityStyle(rarity)}" data-col-tip="${tipId}" aria-expanded="false" aria-label="${escapeHtml(label)}">
    <span class="folio-niche"><img src="${diePortrait(spec)}" alt=""></span>
    ${count > 1 ? `<span class="folio-badge" aria-hidden="true">×${count}</span>` : ''}
  </button></li>`;
}

function tileIcon(key, equipped = false) {
  const tile = powers[key], rarity = rarities[tile.rarity];
  const tipId = registerTip({ kind: 'tile', key, equipped });
  return `<li class="folio-item"><button type="button" class="folio-icon-btn is-tile" style="${rarityStyle(rarity)}" data-col-tip="${tipId}" aria-expanded="false" aria-label="${escapeHtml(t(tile.name))}">
    <span class="folio-niche"><img src="${tileArt(key).url}" alt=""></span>
  </button></li>`;
}

function bagCard(key) {
  const deck = decks[key];
  return `<li class="folio" style="--rarity:var(--gold-2)"><span class="folio-niche"><img src="${diePortrait(deckSample(key)[0])}" alt="" loading="lazy"></span><div class="folio-text">
    <strong>${t(deck.name)}</strong><small class="folio-rarity">${t("Bolsa inicial")}</small><p>${t(deck.text)}</p></div></li>`;
}

function bossCard(key) {
  const boss = bosses[key];
  return `<li class="folio folio-boss" style="--rarity:var(--terra-2)"><span class="folio-niche">${icon('crown')}</span><div class="folio-text">
    <strong>${t(boss.name)}</strong><small class="folio-rarity">${t("Jefe")}</small><p>${t(boss.about ?? boss.text({ key }))}</p></div></li>`;
}

function groupDice(bag) {
  const groups = new Map();
  for (const spec of bag) {
    if (!spec) continue;
    const key = JSON.stringify([spec.glaze, spec.second, spec.faces, spec.rarity, spec.gild, spec.boost, spec.wild,
      spec.rainbow, spec.eternal, spec.obsidian, spec.unique]);
    if (groups.has(key)) groups.get(key).count++;
    else groups.set(key, { spec, count: 1 });
  }
  return [...groups.values()].sort((a, b) => b.spec.rarity - a.spec.rarity || displayDie(a.spec).localeCompare(displayDie(b.spec), language));
}

function historyMarkup(history) {
  if (!history.length) return `<p class="book-empty">${t('Las compras, ventas y mejoras del horno aparecerán aquí.')}</p>`;
  return `<ol class="ledger">${[...history].reverse().map(entry => `<li>
    <div><small>${message`Mosaico ${entry.stage + 1}`} · ${escapeHtml(t(entry.action))}</small><strong>${escapeHtml(displayItem(entry.item))}</strong>
    ${entry.faces ? `<small aria-label="${t("Caras del dado")}">${entry.faces.join(' · ')}</small>` : ''}</div>
    <span class="${entry.gold > 0 ? 'ledger-earned' : 'ledger-spent'}">${entry.gold > 0 ? '+' : '−'}${Math.abs(entry.gold)} ${t('oro')}</span></li>`).join('')}</ol>`;
}

const chapter = (title, count, body, open = false) =>
  `<details class="chapter"${open ? ' open' : ''}><summary><span class="chapter-mark" aria-hidden="true"></span><span class="chapter-title">${title}</span>${count == null ? '' : `<span class="chapter-count">${count}</span>`}</summary>${body}</details>`;

export function collectionMarkup(run) {
  tipEntries.clear();
  tipSeq = 0;
  const uniquesOwned = run?.uniques?.length ? run.uniques : [];
  const uniquesBody = uniquesOwned.length
    ? `<ul class="folios folios-icons">${uniquesOwned.map((spec, idx) => diceIcon(spec, 1, idx)).join('')}</ul>`
    : `<p class="book-empty">${t('No tienes dados únicos.')}</p>`;
  const owned = run ? chapter(t('Dados únicos en posesión'), `${uniquesOwned.length}/3`, uniquesBody, true) +
    chapter(t('Dados de la bolsa'), dieCount(run), `<ul class="folios folios-icons">${groupDice(run.bag).map(({ spec, count }) => diceIcon(spec, count)).join('')}</ul>`, true) +
    chapter(t('Azulejos equipados'), `${run.powers.length}/${tileLimit}`, run.powers.length ? `<ul class="folios folios-icons">${run.powers.map(key => tileIcon(key, true)).join('')}</ul>`
      : `<p class="book-empty">${t('Todavía no tienes azulejos equipados.')}</p>`) +
    chapter(t('Historial del taller'), run.history.length, historyMarkup(run.history)) : '';
  const catalog = chapter(t('Dados básicos'), basicDice.length, `<ul class="folios folios-icons">${basicDice.map(spec => diceIcon(spec)).join('')}</ul>`, !run) +
    chapter(t('Dados únicos'), specialDice.length, `<ul class="folios folios-icons">${specialDice.map(spec => diceIcon(spec)).join('')}</ul>`) +
    chapter(t('Todos los azulejos'), Object.keys(powers).length, `<ul class="folios folios-icons">${Object.keys(powers).map(key => tileIcon(key, Boolean(run?.powers?.includes(key)))).join('')}</ul>`) +
    chapter(t('Bolsas iniciales'), Object.keys(decks).length, `<ul class="folios">${Object.keys(decks).map(bagCard).join('')}</ul>`) +
    chapter(message`Jefes · cada ${BOSS_EVERY} mosaicos`, Object.keys(bosses).length, `<ul class="folios">${Object.keys(bosses).map(bossCard).join('')}</ul>`);
  return `<div class="book">
    <header class="book-head"><div class="book-heading"><span class="book-kicker">${run ? t('Tu colección') : t('Biblioteca del taller')}</span>
      <h2 id="dialog-title">${run ? t('Bolsa y azulejos') : t('Catálogo')}</h2></div>
      <button class="btn btn-quiet btn-small" type="button" data-action="close-collection" autofocus>${icon('close')}${t('Cerrar')}</button></header>
    <div class="book-body">${owned}${run ? `<details class="chapter chapter-catalog"><summary><span class="chapter-mark" aria-hidden="true"></span><span class="chapter-title">${t("Catálogo")}</span></summary><div class="chapter-nest">${catalog}</div></details>` : catalog}</div></div>
    <div class="ztip book-tip" id="book-tip" role="dialog" aria-labelledby="book-tip-title" hidden></div>`;
}

let tipCtrl = null;

function collectionTipContent(entry) {
  if (entry.kind === 'tile') {
    const tile = powers[entry.key], rarity = rarities[tile.rarity];
    return {
      color: rarity.color,
      hasAction: false,
      html: `<div class="ztip-card"><img class="ztip-tile" src="${tileArt(entry.key).url}" alt=""><div class="ztip-text">
        <small class="ztip-kicker">${t(rarity.name)}${entry.equipped ? ` · ${t('Equipado')}` : ''}</small>
        <strong id="book-tip-title">${t(tile.name)}</strong>
        <p>${t(tile.text)}</p></div></div>`,
    };
  }
  const { spec, count, ownedUniqueIndex } = entry;
  const rarity = rarities[spec.rarity];
  const unique = uniqueDice[spec.unique];
  const effects = dieTraits(spec);
  const body = unique
    ? `<p>${t(unique.text)}</p><small class="folio-note">${t('Comodín de color · Inmodificable')}</small>`
    : effects ? `<p>${effects}</p>` : `<p class="ztip-plain">${t('Sin efectos especiales.')}</p>`;
  const actionBtn = ownedUniqueIndex != null
    ? `<button class="btn btn-quiet btn-small ztip-action" type="button" data-action="break-unique" data-index="${ownedUniqueIndex}">${icon('close')}${t('Romper dado único')}</button>`
    : '';
  return {
    color: rarity.color,
    hasAction: ownedUniqueIndex != null,
    html: `<div class="ztip-card"><img class="ztip-die" src="${diePortrait(spec)}" alt=""><div class="ztip-text">
      <small class="ztip-kicker">${t(rarity.name)}${unique ? ` · ${unique.mark}` : ''}${count > 1 ? ` · ×${count}` : ''}</small>
      <strong id="book-tip-title">${displayDie(spec)}${count > 1 ? ` <span class="folio-count">×${count}</span>` : ''}</strong>
      ${dieFaces(spec)}${body}</div></div>${actionBtn}`,
  };
}

export function hideCollectionTip() {
  if (!tipCtrl) return;
  clearTimeout(tipCtrl.closing);
  if (!tipCtrl.active) return;
  tipCtrl.active.anchor.setAttribute('aria-expanded', 'false');
  tipCtrl.active = null;
  if (tipCtrl.tipEl) {
    tipCtrl.tipEl.hidden = true;
    tipCtrl.tipEl.innerHTML = '';
  }
}

export function syncCollectionTips(dialog) {
  initCollectionTips(dialog);
  hideCollectionTip();
  tipCtrl.tipEl = dialog.querySelector('#book-tip');
  tipCtrl.tipEl?.addEventListener('pointerover', () => clearTimeout(tipCtrl.closing));
  tipCtrl.tipEl?.addEventListener('pointerout', event => {
    const active = tipCtrl.active;
    if (active && !active.pinned && !tipCtrl.tipEl.contains(event.relatedTarget) && !active.anchor.contains(event.relatedTarget)) {
      tipCtrl.scheduleClose(active.anchor);
    }
  });
  dialog.querySelector('.book-body')?.addEventListener('scroll', hideCollectionTip, { passive: true });
}

export function initCollectionTips(dialog) {
  if (tipCtrl?.dialog === dialog) return;
  const ctrl = {
    dialog,
    tipEl: null,
    active: null,
    closing: 0,
    scheduleClose(anchor) {
      clearTimeout(ctrl.closing);
      ctrl.closing = setTimeout(() => {
        if (ctrl.active && !ctrl.active.pinned && ctrl.active.anchor === anchor) hideCollectionTip();
      }, 95);
    },
    place() {
      const tip = ctrl.tipEl, active = ctrl.active;
      if (!tip || !active) return;
      const rect = active.anchor.getBoundingClientRect();
      if (!rect.width) { hideCollectionTip(); return; }
      const width = tip.offsetWidth, height = tip.offsetHeight, margin = 8, gap = 10;
      const left = Math.round(Math.max(margin, Math.min(innerWidth - width - margin, rect.left + rect.width / 2 - width / 2)));
      const side = rect.top - gap - height >= margin ? 'above' : 'below';
      const top = Math.round(Math.max(margin, Math.min(innerHeight - height - margin, side === 'above' ? rect.top - gap - height : rect.bottom + gap)));
      tip.dataset.side = side;
      tip.style.setProperty('--arrow', `${Math.round(Math.max(18, Math.min(width - 18, rect.left + rect.width / 2 - left)))}px`);
      tip.style.transform = `translate(${left}px, ${top}px)`;
    },
    show(anchor, pinned) {
      const tip = ctrl.tipEl;
      if (!tip) return;
      clearTimeout(ctrl.closing);
      if (ctrl.active?.anchor === anchor) {
        ctrl.active.pinned ||= pinned;
        return;
      }
      const entry = tipEntries.get(anchor.dataset.colTip);
      if (!entry) return;
      hideCollectionTip();
      const { color, hasAction, html } = collectionTipContent(entry);
      ctrl.active = { anchor, pinned, hasAction };
      tip.style.setProperty('--rarity', color);
      tip.innerHTML = html;
      tip.hidden = false;
      anchor.setAttribute('aria-expanded', 'true');
      ctrl.place();
    },
  };
  tipCtrl = ctrl;

  dialog.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse') return;
    const btn = event.target.closest('[data-col-tip]');
    if (!btn) return;
    if (ctrl.active?.pinned && ctrl.active.hasAction && ctrl.active.anchor !== btn) return;
    ctrl.show(btn, false);
  });
  dialog.addEventListener('pointerout', event => {
    const btn = event.target.closest('[data-col-tip]');
    if (!btn || btn.contains(event.relatedTarget) || ctrl.tipEl?.contains(event.relatedTarget)) return;
    if (ctrl.active && !ctrl.active.pinned && ctrl.active.anchor === btn) ctrl.scheduleClose(btn);
  });
  dialog.addEventListener('focusin', event => {
    const btn = event.target.closest('[data-col-tip]');
    if (btn && btn.matches(':focus-visible') && ctrl.active?.anchor !== btn) ctrl.show(btn, false);
  });
  dialog.addEventListener('focusout', event => {
    const active = ctrl.active;
    if (active && !active.pinned && !ctrl.tipEl?.contains(event.relatedTarget) && !active.anchor.contains(event.relatedTarget)) {
      hideCollectionTip();
    }
  });
  dialog.addEventListener('click', event => {
    if (!dialog.querySelector('#book-tip')) return;
    const btn = event.target.closest('[data-col-tip]');
    if (btn) {
      if (ctrl.active?.anchor === btn && ctrl.active.pinned) hideCollectionTip();
      else ctrl.show(btn, true);
      return;
    }
    if (ctrl.active && !event.target.closest('[data-action="break-unique"]')) hideCollectionTip();
  });
  dialog.addEventListener('toggle', hideCollectionTip, true);
  addEventListener('resize', hideCollectionTip);
}

export const comboUsesLabel = count => count === 1 ? t('1 uso') : message`${count} usos`;
export const comboUsesSentence = count => count === 1 ? t('Usado 1 vez en esta partida.') : message`Usado ${count} veces en esta partida.`;

export function openPlateShelf(run, { host = document.body, upgradedKey = null, oldLevel = 0, newLevel = 0, activeCombos = null, onClose = null } = {}) {
  document.getElementById('plate-shelf-modal')?.remove();

  const patternKeys = ['line', 'mono', 'chromatic', 'panel'];
  const valueKeys = ['pair', 'trio', 'quartet', 'straight', 'longStraight'];
  const spec = upgradedKey ? comboCatalog[upgradedKey] : null;
  const gainText = upgradedKey ? (displayComboGain(upgradedKey, newLevel) || spec.text(newLevel)) : '';
  const fmtAmount = (key, amount) => (key === 'mono' || key === 'chromatic')
    ? `+${(amount / 100).toFixed(2).replace('.', language === 'en' ? '.' : ',')}×`
    : `+${amount}`;
  const fmtValue = key => fmtAmount(key, getComboValue(run, key));
  const fmtActive = (key, info) => {
    const val = fmtAmount(key, info.add || info.points);
    return info.count > 1 ? `${val} (×${info.count})` : val;
  };

  const renderTier = (keys, label) => `
    <section class="plate-tier" aria-label="${label}">
      <h3 class="shelf-tier-label">${label}</h3>
      <ul class="plate-list">
        ${keys.map(key => {
          const item = comboCatalog[key];
          const level = run?.comboLevels?.[key] || 1;
          const uses = run?.comboCounts?.[key] || 0;
          const isUpgraded = key === upgradedKey;
          const active = activeCombos?.get?.(key);
          const portrait = platePortrait({ combo: key, level });
          const levelText = isUpgraded ? message`Niv. ${oldLevel} → ${newLevel}` : message`Niv. ${level}`;
          const activePill = active
            ? `<span class="plate-active-tag">${active.count > 1 ? `${t('Activa')} ×${active.count}` : t('Activa')}</span>`
            : '';
          const shownVal = active ? fmtAmount(key, active.add || active.points) : fmtValue(key);
          return `<li class="plate-row${isUpgraded ? ' upgraded' : ''}${active ? ' active-play' : ''}" data-combo="${key}">
            <button type="button" class="plate-row-btn" data-combo-tip="${key}" aria-expanded="false">
              <img class="plate-row-img" src="${portrait}" alt="">
              <span class="plate-row-main"><strong class="plate-row-name">${t(item.name)}</strong>${activePill}</span>
              <span class="plate-row-val">${shownVal}</span>
              <span class="plate-level-tag">${levelText}</span>
              <span class="plate-uses-tag${uses > 0 ? ' used' : ''}" aria-label="${comboUsesSentence(uses)}">${comboUsesLabel(uses)}</span>
              <span class="plate-row-more" aria-hidden="true">${icon('help')}</span>
            </button>
          </li>`;
        }).join('')}
      </ul>
    </section>
  `;

  const dialog = document.createElement('div');
  dialog.className = 'plate-shelf-dialog-backdrop';
  dialog.id = 'plate-shelf-modal';
  dialog.innerHTML = `
    <div class="plate-shelf-dialog" role="dialog" aria-modal="true" aria-labelledby="rack-title">
      <div class="plate-shelf-head">
        <span class="shelf-kicker">${t('Alacena del Alfarero')}</span>
        <h2 class="shelf-title" id="rack-title">${t('Colección de Platos de Maestría')}</h2>
        <p class="shelf-subtitle">${t('Toca un plato para ver más detalles.')}</p>
      </div>

      ${upgradedKey ? `
      <div class="shelf-celebration-banner">
        <span class="banner-icon">✨</span>
        <div class="banner-text">
          <strong>${message`¡${t(spec.name)} ha ascendido a Nivel ${newLevel}!`}</strong>
          <span>${gainText}</span>
        </div>
      </div>` : ''}

      <div class="plate-shelf-body">
        ${renderTier(patternKeys, t('Patrones y Esmaltes'))}
        ${renderTier(valueKeys, t('Combinaciones de Dados'))}
      </div>

      <div class="plate-tip" id="plate-tip" role="dialog" aria-label="${t('Plato de maestría')}" hidden></div>

      <div class="plate-shelf-foot">
        <button type="button" class="btn btn-gold btn-continue" data-action="close-plate-shelf">${t('Continuar')} ▷</button>
      </div>
    </div>
  `;

  const card = dialog.querySelector('.plate-shelf-dialog');
  const tip = dialog.querySelector('#plate-tip');
  let activeTipKey = null;

  const hideTip = () => {
    if (!activeTipKey) return;
    activeTipKey = null;
    tip.hidden = true;
    for (const btn of dialog.querySelectorAll('.plate-row-btn[aria-expanded="true"]')) {
      btn.setAttribute('aria-expanded', 'false');
    }
  };

  const showTip = (key, anchorBtn) => {
    if (activeTipKey === key) { hideTip(); return; }
    hideTip();
    const item = comboCatalog[key];
    if (!item || !anchorBtn) return;
    const level = run?.comboLevels?.[key] || 1;
    const uses = run?.comboCounts?.[key] || 0;
    const portrait = platePortrait({ combo: key, level });
    const desc = displayComboGain(key, level) || item.text(level);
    const active = activeCombos?.get?.(key);
    activeTipKey = key;
    anchorBtn.setAttribute('aria-expanded', 'true');
    tip.innerHTML = `
      <div class="plate-tip-card">
        <img class="plate-tip-img" src="${portrait}" alt="">
        <div class="plate-tip-text">
          <small class="ztip-kicker">${t('Plato de maestría')} · ${message`Nivel ${level}`}</small>
          <strong>${t(item.name)} · ${fmtValue(key)}</strong>
          <p>${desc}</p>
          ${active ? `<p class="plate-tip-active">${message`En esta jugada: ${fmtActive(key, active)}`}</p>` : ''}
          <p class="plate-tip-uses">${comboUsesSentence(uses)}</p>
        </div>
        <button type="button" class="plate-tip-close" data-action="close-plate-tip" aria-label="${t('Cerrar')}">${icon('close')}</button>
      </div>
    `;
    tip.hidden = false;
    const cardRect = card.getBoundingClientRect();
    const btnRect = anchorBtn.getBoundingClientRect();
    const tipHeight = tip.offsetHeight;
    const spaceBelow = cardRect.bottom - btnRect.bottom;
    const top = spaceBelow >= tipHeight + 12
      ? btnRect.bottom - cardRect.top + 6
      : Math.max(8, btnRect.top - cardRect.top - tipHeight - 6);
    tip.style.top = `${Math.round(top)}px`;
  };

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKeyDown, true);
    dialog.classList.add('closing');
    setTimeout(() => dialog.remove(), 180);
    onClose?.();
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (activeTipKey) hideTip();
      else close();
      return;
    }
    if ((event.key === ' ' || event.key === 'Enter') && !event.target.closest('.plate-row-btn')) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  let sawPointerDown = false;
  dialog.addEventListener('pointerdown', () => { sawPointerDown = true; }, true);

  dialog.addEventListener('click', event => {
    if (event.detail > 0 && !sawPointerDown) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.target === dialog || event.target.closest('[data-action="close-plate-shelf"]')) {
      close();
      return;
    }
    if (event.target.closest('[data-action="close-plate-tip"]')) {
      hideTip();
      return;
    }
    const rowBtn = event.target.closest('.plate-row-btn');
    if (rowBtn) {
      showTip(rowBtn.dataset.comboTip, rowBtn);
      return;
    }
    if (activeTipKey) hideTip();
  });

  window.addEventListener('keydown', onKeyDown, true);
  host.append(dialog);
  setTimeout(() => dialog.querySelector('.btn-continue')?.focus({ preventScroll: true }), 50);
  return close;
}
