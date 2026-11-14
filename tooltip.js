import { powers, rarities, upgrades, diceName } from './catalogo.js?v=ceramica-1';
import { canBuy, tileLimit } from './reglas.js?v=ceramica-1';
import { dieFaces, dieTraits } from './coleccion.js?v=ceramica-1';
import { tileArt } from './arte.js?v=ceramica-1';
import { uniqueDice } from './unicos.js?v=ceramica-1';

const coins = value => `${value}<i class="coin" aria-hidden="true"></i>`;

// Universal Floating Mediterranean Tooltip Engine with Integrated Details & Actions
class FloatingTooltipManager {
  constructor() {
    this.tip = document.createElement('div');
    this.tip.className = 'float-tooltip';
    this.tip.setAttribute('role', 'tooltip');
    this.tip.setAttribute('aria-hidden', 'true');
    this.tip.innerHTML = `
      <div class="float-tooltip-content">
        <div class="float-tooltip-title"></div>
        <div class="float-tooltip-body"></div>
        <div class="float-tooltip-actions" style="display:none"></div>
      </div>
      <span class="float-tooltip-arrow"></span>
    `;
    document.body.appendChild(this.tip);

    this.titleEl = this.tip.querySelector('.float-tooltip-title');
    this.bodyEl = this.tip.querySelector('.float-tooltip-body');
    this.actionsEl = this.tip.querySelector('.float-tooltip-actions');
    this.arrowEl = this.tip.querySelector('.float-tooltip-arrow');
    this.currentTarget = null;
    this.touchTimer = null;
    this.hoverTimer = null;

    this.initEvents();
  }

  initEvents() {
    // Prevent any pointer or touch events inside the tooltip from bubbling to document
    const stopProp = event => event.stopPropagation();
    this.tip.addEventListener('pointerdown', stopProp);
    this.tip.addEventListener('touchstart', stopProp, { passive: true });
    this.tip.addEventListener('pointerover', stopProp);
    this.tip.addEventListener('pointerout', stopProp);

    // Delegate clicks inside the tooltip (Buy, Sell, Choose Recipe buttons)
    this.tip.addEventListener('click', event => {
      event.stopPropagation();
      const button = event.target.closest('[data-market]');
      if (!button || button.disabled) return;
      if (window.marketUI) {
        window.marketUI.click(button);
        this.hide();
      }
    });

    // Intercept mouse hover on desktop with safe-zone grace timer
    document.addEventListener('pointerover', event => {
      if (event.pointerType === 'touch') return;
      if (event.target.closest('.float-tooltip')) {
        clearTimeout(this.hoverTimer);
        return;
      }
      const target = this.findTarget(event.target);
      if (target) {
        clearTimeout(this.hoverTimer);
        if (target !== this.currentTarget) {
          this.show(target);
        }
      }
    });

    document.addEventListener('pointerout', event => {
      if (event.pointerType === 'touch') return;
      if (this.currentTarget) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = setTimeout(() => {
          if (this.currentTarget && !this.currentTarget.matches(':hover') && !this.tip.matches(':hover')) {
            this.hide();
          }
        }, 160);
      }
    });

    // Touch support & dismiss when tapping outside
    document.addEventListener('pointerdown', event => {
      if (event.target.closest('.float-tooltip')) return;

      if (event.pointerType === 'touch') {
        const target = this.findTarget(event.target);
        if (target) {
          if (this.currentTarget === target && !this.tip.classList.contains('is-interactive')) {
            this.hide();
          } else {
            this.show(target);
            clearTimeout(this.touchTimer);
            if (!this.tip.classList.contains('is-interactive')) {
              this.touchTimer = setTimeout(() => this.hide(), 4000);
            }
          }
        } else {
          this.hide();
        }
      } else {
        // Desktop click outside target and tooltip dismisses
        if (!this.findTarget(event.target)) {
          this.hide();
        }
      }
    });

    // Focus / blur for keyboard navigation
    document.addEventListener('focusin', event => {
      if (event.target.closest('.float-tooltip')) return;
      const target = this.findTarget(event.target);
      if (target) this.show(target);
    });

    document.addEventListener('focusout', event => {
      if (event.relatedTarget && this.tip.contains(event.relatedTarget)) return;
      setTimeout(() => {
        if (this.currentTarget && !this.tip.contains(document.activeElement) && !this.currentTarget.contains(document.activeElement)) {
          this.hide();
        }
      }, 100);
    });

    // Window scroll or resize reposition
    window.addEventListener('scroll', () => { if (this.currentTarget) this.reposition(); }, { passive: true });
    window.addEventListener('resize', () => { if (this.currentTarget) this.reposition(); }, { passive: true });
  }

  findTarget(el) {
    if (!el || !(el instanceof Element) || el.closest('.float-tooltip')) return null;
    return el.closest(`
      [data-tooltip],
      [data-power],
      .res,
      #score-pill,
      #pause,
      #sound,
      #collection-button,
      .patterns-toggle-btn,
      #recall,
      #skip-score,
      .order,
      .shop-tile,
      .exhibit,
      #new,
      #catalog,
      #workshop-leave,
      #workshop-next,
      .nav-pill,
      #mobile-confirm,
      #confirm,
      [data-market="view"],
      [data-market="collection"],
      [data-market="exit"],
      [data-market="advance"],
      [data-market="candidate"],
      [data-market="remove"],
      [title]
    `);
  }

  getInfo(target) {
    const run = window.marketUI?.run || window.run;

    // 1. Explicit data-tooltip
    if (target.dataset.tooltip) {
      return {
        title: target.dataset.tooltipTitle || '',
        desc: target.dataset.tooltip,
        color: target.dataset.tooltipColor || ''
      };
    }

    // 2. Dice in the workshop gallery with face details and Buy Button
    if (target.matches('.exhibit[data-market="inspect"]')) {
      const index = Number(target.dataset.key);
      const spec = run?.market?.dice?.[index];
      if (spec) {
        const rarity = rarities[spec.rarity];
        const unique = uniqueDice[spec.unique];
        const traits = dieTraits(spec);
        const sold = run.market.purchased.includes(index);
        const buyable = canBuy(run, 'die', index);

        let actionHtml = '';
        if (sold) {
          actionHtml = `<span class="tip-status-tag sold">Comprado</span>`;
        } else if (buyable) {
          actionHtml = `<button type="button" class="button primary small tip-action-btn" data-market="die" data-key="${index}">Comprar · ${coins(rarity.price)}</button>`;
        } else {
          const reason = run.gold < rarity.price ? 'Falta oro' : 'Bolsa llena';
          actionHtml = `<button type="button" class="button primary small tip-action-btn" data-market="die" data-key="${index}" disabled>${reason} · ${coins(rarity.price)}</button>`;
        }

        return {
          title: `<span class="tip-rarity-pill" style="--tag-bg:${rarity.color};--tag-ink:${rarity.ink}">${rarity.name}</span> <span>${diceName(spec)}</span>`,
          bodyHtml: `
            <div class="tip-die-faces">${dieFaces(spec)}</div>
            ${unique ? `<p class="tip-subtext">${unique.text}</p><small class="tip-extra">Comodín de color · Inmodificable</small>` : traits ? `<p class="tip-subtext">${traits}</p>` : ''}
          `,
          actionHtml,
          ink: rarity.ink,
          interactive: !sold
        };
      }
    }

    // 3. Shop tiles in workshop with tile image, power details and Buy/Sell Button
    if (target.matches('.shop-tile')) {
      const key = target.dataset.key;
      const p = powers[key];
      if (p) {
        const r = rarities[p.rarity];
        const isOwned = target.dataset.market === 'owned-inspect';
        const equipped = run?.powers?.includes(key);

        let actionHtml = '';
        if (isOwned) {
          const refund = Math.floor(p.price / 2);
          actionHtml = `<button type="button" class="button quiet small tip-action-btn" data-market="sell" data-key="${key}">Vender · +${coins(refund)}</button>`;
        } else {
          const buyable = run ? canBuy(run, 'tile', key) : false;
          if (equipped) {
            actionHtml = `<button type="button" class="button small tip-action-btn" disabled>Equipado</button>`;
          } else if (run && run.powers.length >= tileLimit) {
            actionHtml = `<button type="button" class="button small tip-action-btn" disabled>Repisa llena (${tileLimit}/${tileLimit})</button>`;
          } else if (buyable) {
            actionHtml = `<button type="button" class="button primary small tip-action-btn" data-market="tile" data-key="${key}">Comprar · ${coins(p.price)}</button>`;
          } else {
            actionHtml = `<button type="button" class="button primary small tip-action-btn" data-market="tile" data-key="${key}" disabled>Falta oro · ${coins(p.price)}</button>`;
          }
        }

        return {
          title: `<span class="tip-rarity-pill" style="--tag-bg:${r.color};--tag-ink:${r.ink}">${r.name}</span> <span>${p.name}</span>`,
          bodyHtml: `
            <div class="tip-tile-preview">
              <img class="tip-tile-thumb" src="${tileArt(key).url}" alt="">
              <p class="tip-tile-desc">${p.text}</p>
            </div>
          `,
          actionHtml,
          ink: r.ink,
          interactive: true
        };
      }
    }

    // 4. Exhibits in kiln (Horno) with recipe details and Choose Recipe Button
    if (target.matches('.exhibit[data-market="effect-inspect"]')) {
      const key = target.dataset.key;
      const effect = upgrades[key];
      if (effect) {
        const usable = run && !run.market.forged && run.gold >= effect.price;
        const forged = run?.market?.forged;

        let actionHtml = '';
        if (forged) {
          actionHtml = `<button type="button" class="button small tip-action-btn" disabled>Horno ya usado</button>`;
        } else if (usable) {
          actionHtml = `<button type="button" class="button primary small tip-action-btn" data-market="effect" data-key="${key}">Elegir receta · ${coins(effect.price)}</button>`;
        } else {
          actionHtml = `<button type="button" class="button primary small tip-action-btn" data-market="effect" data-key="${key}" disabled>Falta oro · ${coins(effect.price)}</button>`;
        }

        return {
          title: `<span>${effect.name}</span>`,
          bodyHtml: `
            <p class="tip-tile-desc">${effect.text}</p>
            <small class="tip-extra">${effect.slots} ${effect.slots === 1 ? 'ranura requerida' : 'ranuras requeridas'}</small>
          `,
          actionHtml,
          interactive: !forged
        };
      }
    }

    // 5. Equipped Azulejos in gameplay [data-power]
    if (target.matches('[data-power]')) {
      const index = Number(target.dataset.power);
      let p = null;
      const key = run?.powers?.[index];
      if (key && powers[key]) {
        p = powers[key];
      } else {
        const label = target.getAttribute('aria-label') || '';
        p = Object.values(powers).find(item => item.name === label);
      }
      if (p) {
        const r = rarities[p.rarity];
        return {
          title: `<span class="tip-rarity-pill" style="--tag-bg:${r.color};--tag-ink:${r.ink}">${r.name}</span> <span>${p.name}</span>`,
          bodyHtml: `<p class="tip-tile-desc">${p.text}</p>`,
          ink: r.ink
        };
      }
      const label = target.getAttribute('aria-label');
      if (label) return { title: label, desc: 'Azulejo de poder equipado.' };
    }

    // 6. Generic exhibits fallback
    if (target.matches('.exhibit')) {
      const label = target.getAttribute('aria-label');
      if (label) {
        const parts = label.split('·').map(s => s.trim());
        return {
          title: parts[0] || 'Dado de cerámica',
          desc: parts[1] ? parts[1] : 'Toca para inspeccionar sus caras o comprarlo.'
        };
      }
    }

    // 7. Resource bar items
    if (target.matches('#score-pill, .res-score')) {
      return {
        title: 'Puntuación y objetivo',
        desc: 'Puntos acumulados en la jugada y meta necesaria para superar este mosaico.'
      };
    }

    if (target.matches('.res[title*="Turnos"], [title*="Turnos"]')) {
      return {
        title: 'Turnos restantes',
        desc: 'Jugadas disponibles antes de que termine el mosaico actual.'
      };
    }

    if (target.matches('.res[title*="Cincel"], [title*="Cincel"]')) {
      return {
        title: 'Cargas de cincel',
        desc: 'Toca una casilla de piedra para romperla y ganar espacio libre.'
      };
    }

    if (target.matches('.res-gold, [title*="Oro"]')) {
      return {
        title: 'Monedas de oro',
        desc: 'Oro ahorrado para comprar dados y azulejos entre mosaicos en el taller.'
      };
    }

    if (target.matches('.res-bag, [title*="bolsa"]')) {
      return {
        title: 'Dados en la bolsa',
        desc: 'Total de dados que componen tu reserva activa.'
      };
    }

    // 8. Action buttons
    if (target.id === 'pause') {
      return { title: 'Pausa', desc: 'Abre el menú con opciones de partida y ayuda.' };
    }
    if (target.id === 'sound') {
      return { title: 'Efectos sonoros', desc: 'Activa o silencia el sonido del juego.' };
    }
    if (target.id === 'collection-button') {
      return { title: 'Bolsa y colección', desc: 'Consulta todos los dados de tu bolsa y el catálogo de azulejos.' };
    }
    if (target.matches('.patterns-toggle-btn')) {
      return { title: 'Tabla de combinaciones', desc: 'Consulta los puntos base y multiplicadores de cada combinación.' };
    }
    if (target.id === 'recall') {
      return { title: 'Retirar dado', desc: 'Devuelve a la bandeja el último dado que colocaste.' };
    }
    if (target.id === 'skip-score') {
      return { title: 'Saltar animación', desc: 'Pasa directamente al resultado total de la jugada.' };
    }
    if (target.matches('.order')) {
      return {
        title: 'Encargo opcional',
        desc: 'Completa esta combinación específica durante este mosaico para recibir oro adicional.'
      };
    }

    // 9. Title screen & workshop navigation buttons
    if (target.id === 'new') {
      return { title: 'Nueva partida', desc: 'Comienza una nueva travesía artesanal desde el primer mosaico.' };
    }
    if (target.id === 'catalog') {
      return { title: 'Catálogo de arte', desc: 'Explora todos los azulejos de poder, esmaltes y combinaciones.' };
    }
    if (target.id === 'workshop-leave' || target.matches('[data-market="exit"]')) {
      return { title: 'Guardar y salir', desc: 'Guarda tu progreso actual y vuelve al menú principal.' };
    }
    if (target.id === 'workshop-next' || target.matches('[data-market="advance"]')) {
      return { title: 'Siguiente mosaico', desc: 'Inicia el próximo mosaico con tus dados y azulejos actuales.' };
    }
    if (target.matches('.nav-pill[data-market="gallery"], [data-market="view"][data-key="dice"]')) {
      return { title: 'Mercado de artesano', desc: 'Compra dados torneados y azulejos esmaltados.' };
    }
    if (target.matches('.nav-pill[data-market="forge"], [data-market="view"][data-key="oven"]')) {
      return { title: 'Horno de alquimia', desc: 'Transmuta, dora o perfecciona las caras de tus dados.' };
    }
    if (target.matches('.nav-pill[data-market="collection"], [data-market="collection"]')) {
      return { title: 'Bolsa de dados', desc: 'Inspecciona la composición completa de tu reserva.' };
    }
    if (target.matches('[data-market="candidate"]')) {
      return { title: 'Dado de tu bolsa', desc: 'Toca para colocar este dado en la ranura del horno.' };
    }
    if (target.matches('[data-market="remove"]')) {
      return { title: 'Ranura del horno', desc: 'Toca para retirar el dado de esta ranura.' };
    }
    if (target.matches('[data-market="forge"]')) {
      return { title: 'Fundir en el horno', desc: 'Aplica el efecto alquímico a los dados preparados.' };
    }

    // 10. Generic title attribute fallback
    if (target.title) {
      const titleText = target.title;
      target.dataset.tooltip = titleText;
      target.removeAttribute('title');
      return { title: '', desc: titleText };
    }

    return null;
  }

  show(target) {
    const info = this.getInfo(target);
    if (!info || (!info.title && !info.bodyHtml && !info.desc)) {
      this.hide();
      return;
    }

    this.currentTarget = target;

    // Remove native title if still present to avoid double tooltips
    if (target.hasAttribute('title')) {
      target.dataset.savedTitle = target.getAttribute('title');
      target.removeAttribute('title');
    }

    if (info.title) {
      this.titleEl.innerHTML = info.title;
      this.titleEl.style.display = 'flex';
      if (info.ink) this.titleEl.style.color = info.ink;
      else if (info.color) this.titleEl.style.color = info.color;
      else this.titleEl.style.color = '';
    } else {
      this.titleEl.style.display = 'none';
    }

    if (info.bodyHtml) {
      this.bodyEl.innerHTML = info.bodyHtml;
      this.bodyEl.style.display = 'block';
    } else if (info.desc) {
      this.bodyEl.innerHTML = `<p class="float-tooltip-desc">${info.desc}</p>`;
      this.bodyEl.style.display = 'block';
    } else {
      this.bodyEl.style.display = 'none';
    }

    if (info.actionHtml) {
      this.actionsEl.innerHTML = info.actionHtml;
      this.actionsEl.style.display = 'flex';
    } else {
      this.actionsEl.innerHTML = '';
      this.actionsEl.style.display = 'none';
    }

    if (info.interactive) {
      this.tip.classList.add('is-interactive');
    } else {
      this.tip.classList.remove('is-interactive');
    }

    this.tip.setAttribute('aria-hidden', 'false');
    this.tip.classList.add('visible');

    this.reposition();
  }

  reposition() {
    if (!this.currentTarget) return;
    const rect = this.currentTarget.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      this.hide();
      return;
    }

    const tipWidth = this.tip.offsetWidth;
    const tipHeight = this.tip.offsetHeight;

    // Horizontal centering with clamp
    let left = rect.left + (rect.width - tipWidth) / 2;
    left = Math.max(8, Math.min(window.innerWidth - tipWidth - 8, left));

    // Vertical positioning: prefer above target, fallback to below
    let top = rect.top - tipHeight - 9;
    let placement = 'top';
    if (top < 10) {
      top = rect.bottom + 9;
      placement = 'bottom';
      if (top + tipHeight > window.innerHeight - 10) {
        top = Math.max(10, (window.innerHeight - tipHeight) / 2);
      }
    }

    this.tip.style.left = `${Math.round(left)}px`;
    this.tip.style.top = `${Math.round(top)}px`;
    this.tip.dataset.placement = placement;

    // Position arrow relative to target center
    const targetCenterX = rect.left + rect.width / 2;
    const arrowX = Math.max(14, Math.min(tipWidth - 14, targetCenterX - left));
    this.arrowEl.style.left = `${Math.round(arrowX)}px`;
  }

  hide() {
    if (this.currentTarget) {
      if (this.currentTarget.dataset.savedTitle) {
        this.currentTarget.setAttribute('title', this.currentTarget.dataset.savedTitle);
      }
      this.currentTarget = null;
    }
    clearTimeout(this.touchTimer);
    this.tip.classList.remove('visible');
    this.tip.classList.remove('is-interactive');
    this.tip.setAttribute('aria-hidden', 'true');
  }
}

// Instantiate once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { window.floatingTooltips = new FloatingTooltipManager(); });
} else {
  window.floatingTooltips = new FloatingTooltipManager();
}
