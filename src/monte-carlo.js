// Every photon is submitted to the renderer before it enters the statistics.
const runs = new WeakMap();

export function createMonteCarloRun(state) {
  const target = Math.max(10, Math.min(1000000, Math.round(state.photons ?? 10)));
  const duration = Math.max(1, Math.min(30, state.duration ?? 5));
  const reflected = state.reflection ? .3 : 0;
  const scattered = state.scattering ? .2 : 0;
  let randomState = (state.sampleSeed ?? 41) >>> 0;
  const random = () => {
    randomState = (randomState + 0x6D2B79F5) >>> 0;
    let value = randomState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    target, duration, n: 0, checkpoint: 1, history: [],
    counts: {absorbed: 0, reflected: 0, scattered: 0},
    expected: {absorbed: 1 - reflected - scattered, reflected, scattered},
    nextPhoton() {
      const roll = random(), position = random(), direction = random();
      const outcome = roll < reflected ? 'reflected' : roll < reflected + scattered ? 'scattered' : 'absorbed';
      return {outcome, position, direction};
    },
  };
}

export function resetMonteCarloRun(state) {
  runs.delete(state);
}

export function getMonteCarloRun(state) {
  const key = `${state.photons}/${!!state.reflection}/${!!state.scattering}/${state.sampleSeed}/${state.duration}`;
  let entry = runs.get(state);
  if (!entry || entry.key !== key) {
    entry = {key, run: createMonteCarloRun(state)};
    runs.set(state, entry);
  }
  return entry.run;
}

export function advanceMonteCarlo(run, seconds, drawBatch) {
  const target = Math.floor(run.target * Math.max(0, Math.min(1, seconds / run.duration)));
  const batch = [];
  for (let i = run.n; i < target; i++) batch.push(run.nextPhoton());
  if (!batch.length) return;
  drawBatch(batch);
  for (const photon of batch) {
    run.counts[photon.outcome]++;
    run.n++;
    if (run.n === run.checkpoint || run.n === run.target) {
      run.history.push([run.n, run.counts.absorbed / run.n]);
      run.checkpoint = Math.max(run.n + 1, Math.ceil(run.n * 1.05));
    }
  }
}
