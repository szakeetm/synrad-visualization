import test from 'node:test';
import assert from 'node:assert/strict';
import {experiments} from '../src/experiments.js';

function createDocument() {
  const nodes = [], ids = new Map();
  const context = new Proxy({}, {
    get: (_, name) => {
      if (name === 'createLinearGradient') return () => ({addColorStop() {}});
      if (name === 'createImageData') return (width, height) => ({data: new Uint8ClampedArray(width * height * 4)});
      return (...args) => {
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `Canvas ${String(name)} received ${value}`);
      };
    },
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

let launchCount = 0;
async function withApp(initialHash, check) {
  const names = ['document', 'window', 'location', 'matchMedia', 'ResizeObserver', 'requestAnimationFrame'];
  const previous = Object.fromEntries(names.map(name => [name, globalThis[name]]));
  const document = createDocument(), events = {};
  let hash = initialHash, animationFrame, now = 0;
  Object.assign(globalThis, {
    document,
    window: {addEventListener(name, handler) { events[name] = handler; }},
    location: {get hash() { return hash; }, set hash(value) { hash = value.startsWith('#') ? value : `#${value}`; }},
    matchMedia: () => ({matches: false}),
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: callback => { animationFrame = callback; },
  });
  const element = id => document.getElementById(id);
  try {
    await import(`../src/app.js?test=${++launchCount}`);
    await check({
      element, document,
      frames(count) { for (let i = 0; i < count; i++) { now += 50; animationFrame(now); } },
      navigate(id) { hash = id ? `#${id}` : ''; events.hashchange(); },
      next() { element('next').events.click(); events.hashchange(); },
      input(key, value) { const input = element(`control-${key}`); input.value = value; input.events.input(); },
      preset(key, value) {
        const box = element(`control-${key}`).closest('.control');
        const presets = box.children.find(child => child.className === 'control-presets');
        const button = presets.children.find(child => Number(child.textContent) === value);
        assert.ok(button, `missing ${key} preset ${value}`);
        button.events.click();
      },
      space() { let prevented = false; events.keydown({code: 'Space', preventDefault() { prevented = true; }}); return prevented; },
    });
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete globalThis[name];
      else globalThis[name] = previous[name];
    }
  }
}

test('opening without a fragment selects Radiation2D and navigation unloads and reloads its frame', async () => {
  await withApp('', ({element, document, navigate, next}) => {
    const link = document.querySelectorAll().find(e => e.dataset.id === 'synrad2d');
    assert.equal(link.href, '#synrad2d');
    assert.equal(link.target, undefined);
    assert.equal(link.getAttribute('aria-current'), 'page');
    assert.equal(element('synrad2d-panel').hidden, false);
    assert.equal(element('experiment-workspace').hidden, true);
    assert.equal(element('experiment-model').hidden, true);
    assert.equal(element('synrad2d-frame').src, './synrad2d/index.html');

    next();
    assert.equal(document.querySelectorAll().find(e => e.dataset.id === 'spectrum').getAttribute('aria-current'), 'page');
    assert.equal(element('synrad2d-panel').hidden, true);
    assert.equal(element('experiment-workspace').hidden, false);
    assert.equal(element('experiment-model').hidden, false);
    assert.equal(element('synrad2d-frame').hasAttribute('src'), false);
    assert.equal(link.getAttribute('aria-current'), undefined);

    navigate('monte-carlo');
    next();
    assert.equal(link.getAttribute('aria-current'), 'page');
    assert.equal(element('synrad2d-panel').hidden, false);
    assert.equal(element('synrad2d-frame').src, './synrad2d/index.html');
  });
});

test('deep links, legacy links and unknown links select a usable experiment', async () => {
  await withApp('#cavity', ({element, document, navigate}) => {
    const active = () => document.querySelectorAll().filter(e => e.getAttribute('aria-current') === 'page').map(e => e.dataset.id);
    assert.deepEqual(active(), ['cavity']);
    for (const experiment of experiments) {
      navigate(experiment.id);
      assert.deepEqual(active(), [experiment.id]);
      assert.equal(element('title').textContent, experiment.title);
      assert.equal(element('synrad2d-panel').hidden, true);
      assert.ok(element('metrics').children.length > 0);
      assert.equal(element('monte-carlo-progress').hidden, !['vertical', 'horizontal', 'polarization', 'penetration', 'monte-carlo'].includes(experiment.id));
      for (const control of experiment.controls) assert.equal(typeof element(`control-${control.key}`).events.input, 'function');
    }
    navigate('rough');
    assert.deepEqual(active(), ['reflection']);
    navigate('unknown');
    assert.deepEqual(active(), ['spectrum']);
    navigate('');
    assert.deepEqual(active(), ['synrad2d']);
  });
});

test('cavity energy starts and resets at 0.01 GeV independently of shared beam energy', async () => {
  await withApp('#spectrum', ({element, navigate, input, preset}) => {
    preset('energy', 5);
    navigate('cavity');
    const energy = () => Number(element('control-cavityEnergy').getAttribute('aria-valuenow'));
    assert.equal(energy(), .01);
    preset('cavityEnergy', 1);
    assert.equal(energy(), 1);
    input('cavityEnergy', 0);
    assert.equal(energy(), .000516);
    element('reset').events.click();
    assert.equal(energy(), .01);
    navigate('horizontal');
    assert.equal(Number(element('control-energy').value), 5);
  });
});

test('shared energy follows input, clamps to the destination range and resets with chart scales', async () => {
  await withApp('#spectrum', ({element, navigate, input, preset}) => {
    preset('energy', 500);
    navigate('horizontal');
    assert.equal(Number(element('control-energy').value), 10);
    navigate('spectrum');
    assert.equal(Number(element('control-energy').value), 10);
    navigate('horizontal');
    input('energy', .25);
    navigate('spectrum');
    assert.equal(Number(element('control-energy').value), .25);
    element('x-linear').events.click();
    assert.equal(element('x-linear').getAttribute('aria-pressed'), 'true');
    element('chart-reset').events.click();
    assert.equal(Number(element('control-energy').value), 3);
    assert.equal(element('x-log').getAttribute('aria-pressed'), 'true');
  });
});

test('photon progress completes, pauses and restarts through the app controls', async () => {
  await withApp('#monte-carlo', ({element, frames, preset}) => {
    assert.equal(element('control-reflection').checked, false);
    assert.equal(element('control-scattering').checked, false);
    preset('photons', 100);
    frames(120);
    assert.equal(element('photon-progress').max, 100);
    assert.equal(element('photon-progress').value, 100);
    assert.match(element('photon-progress-status').textContent, /Complete/);
    element('pause').events.click();
    const newSample = element('controls').children.find(child => child.className === 'sample-button');
    newSample.events.click();
    assert.equal(element('photon-progress').value, 0);
    assert.match(element('photon-progress-status').textContent, /Paused/);
    frames(120);
    assert.equal(element('photon-progress').value, 0);
    element('pause').events.click();
    frames(120);
    assert.equal(element('photon-progress').value, 100);
    element('control-reflection').checked = true;
    element('control-reflection').events.input();
    assert.equal(element('photon-progress').value, 0);
    assert.match(element('photon-progress-status').textContent, /Running/);
  });
});

test('space pauses the experiment while preserving keyboard input and dialog interactions', async () => {
  await withApp('#horizontal', ({element, document, navigate, space}) => {
    assert.equal(element('pause').getAttribute('aria-pressed'), 'false');
    assert.equal(space(), true);
    assert.equal(element('pause').getAttribute('aria-pressed'), 'true');
    for (const tagName of ['INPUT', 'SELECT', 'BUTTON', 'A', 'TEXTAREA']) {
      document.activeElement = {tagName};
      assert.equal(space(), false);
      assert.equal(element('pause').getAttribute('aria-pressed'), 'true');
    }
    document.activeElement = {tagName: 'BODY'};
    element('about').open = true;
    assert.equal(space(), false);
    element('about').open = false;
    assert.equal(space(), true);
    assert.equal(element('pause').getAttribute('aria-pressed'), 'false');
    for (const id of ['spectrum', 'synrad2d']) {
      navigate(id);
      assert.equal(space(), false);
      assert.equal(element('pause').getAttribute('aria-pressed'), 'false');
    }
  });
});
