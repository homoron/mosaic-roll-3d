import english from './ingles.js?v=esmaltes-30';
import french from './frances.js?v=esmaltes-30';
import valencian from './valenciano.js?v=esmaltes-30';
import { diceName, glazes } from './catalogo.js?v=esmaltes-30';

const preferenceKey = 'mosaic-roll/language';
export const supported = value => value === 'es' || value === 'ca' || value === 'en' || value === 'fr';

function detectBrowserLanguage() {
  const list = (navigator.languages?.length ? navigator.languages : [navigator.language || ''])
    .map(l => (l || '').toLowerCase());
  for (const l of list) {
    if (l.startsWith('ca') || l.startsWith('va')) return 'ca';
    if (l.startsWith('fr')) return 'fr';
    if (l.startsWith('es')) return 'es';
    if (l.startsWith('en')) return 'en';
  }
  return 'es';
}

const requested = new URLSearchParams(location.search).get('lang');
let preference;
try {
  preference = localStorage.getItem(preferenceKey);
  if (supported(requested)) localStorage.setItem(preferenceKey, requested);
} catch { /* The language in the URL works without local storage. */ }

export let language = supported(requested)
  ? requested
  : supported(preference)
    ? preference
    : detectBrowserLanguage();

export const isLanguageAutoDetected = !supported(requested) && !supported(preference);

export const t = text => {
  if (language === 'ca' && Object.hasOwn(valencian, text)) return valencian[text];
  if (language === 'en' && Object.hasOwn(english, text)) return english[text];
  if (language === 'fr' && Object.hasOwn(french, text)) return french[text];
  return text;
};

export function message(parts, ...values) {
  const key = parts.reduce((text, part, index) => text + (index ? `{${index - 1}}` : '') + part, '');
  return t(key).replace(/\{(\d+)\}/g, (_, index) => values[Number(index)]);
}

export function displayDie(spec) {
  return displayItem(diceName(spec));
}

export function displayBossRule(boss, bossText) {
  if (boss.key === 'eclipse') {
    return message`Los dados de ${t(glazes[boss.color].name)} no suman puntos ni cuentan para los combos de color.`;
  }
  return t(bossText(boss));
}

export function displayComboGain(comboKey, nextLevel) {
  if (comboKey === 'pair') return message`+${6 + (nextLevel - 1) * 3} puntos base por pareja (+${3} por nivel)`;
  if (comboKey === 'trio') return message`+${12 + (nextLevel - 1) * 5} puntos base por trío (+${5} por nivel)`;
  if (comboKey === 'quartet') return message`+${23 + (nextLevel - 1) * 8} puntos base por cuarteto (+${8} por nivel)`;
  if (comboKey === 'straight') return message`+${10 + (nextLevel - 1) * 5} puntos base por escalera (+${5} por nivel)`;
  if (comboKey === 'longStraight') return message`+${17 + (nextLevel - 1) * 7} puntos base por escalera larga (+${7} por nivel)`;
  if (comboKey === 'line') return message`+${3 + (nextLevel - 1) * 2} puntos base por línea llena (+${2} por nivel)`;
  if (comboKey === 'mono') {
    const val = ((40 + (nextLevel - 1) * 15) / 100).toFixed(2);
    return message`+${val}× al multiplicador por monocolor (+${'0,15'}× por nivel)`;
  }
  if (comboKey === 'chromatic') {
    const val = ((25 + (nextLevel - 1) * 10) / 100).toFixed(2);
    return message`+${val}× al multiplicador por colores distintos (+${'0,10'}× por nivel)`;
  }
  if (comboKey === 'panel') return message`+${10 + (nextLevel - 1) * 6} puntos base por panel lleno (+${6} por nivel)`;
  return '';
}

export function displayItem(name) {
  if (!name.startsWith('Quimera de ')) return t(name);
  const colors = name.slice('Quimera de '.length).split(' y ');
  const translate = color => t(glazes.find(glaze => glaze.name.toLowerCase() === color)?.name ?? color);
  if (language === 'ca') {
    return `Quimera de ${colors.map(translate).join(' i ')}`;
  }
  if (language === 'en') {
    return `${colors.map(translate).join(' & ')} Chimera`;
  }
  if (language === 'fr') {
    return `Chimère ${colors.map(translate).join(' et ')}`;
  }
  return t(name);
}

export function scoreText(label) {
  if (language === 'es') return label;
  return label.split(' + ').map(combo => {
    const match = combo.match(/^(.+?)( \d+(?: × \d+)?)(?: · (eclipsado|impar))?$/);
    if (!match) return t(combo);
    const [, name, value, block] = match;
    return t(name) + value + (block ? ` · ${t(block)}` : '');
  }).join(' + ');
}

export function translateNodes(root = document.documentElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.data.trim();
    if (!text) continue;
    if (!node._original) node._original = text;
    const translated = t(node._original);
    if (translated !== node.data) node.data = node.data.replace(node._original, translated);
  }
  for (const element of root.querySelectorAll('[aria-label], [title], meta[name="description"]')) {
    for (const attribute of ['aria-label', 'title', 'content']) {
      if (element.hasAttribute(attribute)) {
        const origAttr = 'data-orig-' + attribute;
        if (!element.hasAttribute(origAttr)) element.setAttribute(origAttr, element.getAttribute(attribute));
        element.setAttribute(attribute, t(element.getAttribute(origAttr)));
      }
    }
  }
}

export function setLanguage(newLang, reload = false) {
  if (!supported(newLang)) return;
  language = newLang;
  try { localStorage.setItem(preferenceKey, newLang); } catch {}
  document.documentElement.lang = newLang;
  translateNodes(document.documentElement);
  const picker = document.getElementById('language');
  if (picker) picker.value = newLang;
  const url = new URL(location.href);
  url.searchParams.set('lang', newLang);
  if (reload) {
    location.assign(url);
  } else {
    history.replaceState(null, '', url);
  }
}

export function setupLanguage() {
  document.documentElement.lang = language;
  if (language !== 'es') translateNodes(document.documentElement);
  const picker = document.getElementById('language');
  if (picker) {
    picker.value = language;
    picker.addEventListener('change', () => {
      setLanguage(picker.value, true);
    });
  }
}
