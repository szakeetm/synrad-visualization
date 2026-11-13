import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

function createDocument() {
  const nodes = [], ids = new Map();
  const context = new Proxy({}, {
    get: (_, name) => name === 'createLinearGradient' ? () => ({addColorStop() {}}) : () => {},
    set: () => true,
  });
  function node(tagName = 'div') {
    const attributes = new Map(), classes = new Set();
    const element = {
      tagName: tagName.toUpperCase(), children: [], dataset: {}, style: {setProperty() {}}, events: {},
      clientWidth: 760, scrollLeft: 0,
      classList: {
        toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
        add(name) { classes.add(name); },
      },
      set id(value) { this._id = value; ids.set(value, this); },
      get id() { return this._id; },
      set src(value) { attributes.set('src', value); },
      get src() { return attributes.get('src'); },
      append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } },
      replaceChildren(...children) { this.children = []; this.append(...children); },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name); },
      hasAttribute(name) { return attributes.has(name); },
      removeAttribute(name) { attributes.delete(name); },
      addEventListener(name, handler) { this.events[name] = handler; },
      getContext() { return context; },
      closest() { let parent = this.parent; while (parent && parent.className !== 'control') parent = parent.parent; return parent; },
    };
    nodes.push(element);
    return element;
  }
  const document = {
    hidden: false,
    activeElement: {tagName: 'BODY'},
    getElementById(id) { if (!ids.has(id)) node().id = id; return ids.get(id); },
    createElement: node,
    createElementNS: (_, tagName) => node(tagName),
    createTextNode: text => ({textContent: text}),
    querySelectorAll: () => nodes.filter(e => e.dataset.id),
    querySelector: selector => document.getElementById(selector),
  };
  return document;
}

test('suite navigation embeds local synrad2d, returns to experiments and includes it in the next-tab cycle', async () => {
  const names = ['document', 'window', 'location', 'matchMedia', 'ResizeObserver', 'requestAnimationFrame'];
  const previous = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const document = createDocument(), events = {};
  let hash = '#synrad2d';
  Object.assign(globalThis, {
    document,
    window: {addEventListener(name, handler) { events[name] = handler; }},
    location: {get hash() { return hash; }, set hash(value) { hash = value.startsWith('#') ? value : `#${value}`; }},
    matchMedia: () => ({matches: false}),
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: () => {},
  });
  const element = id => document.getElementById(id);
  try {
    await import('../src/app.js');
    const link = document.querySelectorAll().find(e => e.dataset.id === 'synrad2d');
    assert.equal(link.href, '#synrad2d');
    assert.equal(link.target, undefined);
    assert.equal(link.getAttribute('aria-current'), 'page');
    assert.equal(element('synrad2d-panel').hidden, false);
    assert.equal(element('experiment-workspace').hidden, true);
    assert.equal(element('experiment-model').hidden, true);
    assert.equal(element('synrad2d-frame').src, './synrad2d/index.html');
    assert.match(element('description').textContent, /Tsumoru Shintake/);

    element('next').events.click();
    assert.equal(hash, '#spectrum');
    events.hashchange();
    assert.equal(element('synrad2d-panel').hidden, true);
    assert.equal(element('experiment-workspace').hidden, false);
    assert.equal(element('experiment-model').hidden, false);
    assert.equal(element('synrad2d-frame').hasAttribute('src'), false);
    assert.equal(link.getAttribute('aria-current'), undefined);

    hash = '#monte-carlo'; events.hashchange();
    element('next').events.click();
    assert.equal(hash, '#synrad2d');
    events.hashchange();
    assert.equal(element('synrad2d-panel').hidden, false);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete globalThis[name];
      else globalThis[name] = previous[name];
    }
  }
});

test('bundled page retains local entry assets, license and full original-author credit', async () => {
  const page = await readFile(new URL('../synrad2d/index.html', import.meta.url), 'utf8');
  assert.match(page, /Tsumoru Shintake/);
  assert.doesNotMatch(page, /T\. Shintake/);
  for (const path of ['synrad2d/style.css', 'synrad2d/src/app.js', 'synrad2d/LICENSE', 'synrad2d/README.md']) {
    assert.ok((await readFile(new URL(`../${path}`, import.meta.url))).length > 0);
  }
  assert.match(page, /src="src\/app.js"/);
  assert.match(page, /href="style.css"/);
});
