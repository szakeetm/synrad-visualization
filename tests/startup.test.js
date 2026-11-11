import test from 'node:test';

test('browser rendering modules load without syntax or import errors', async () => {
  await Promise.all([
    import('../src/material-scenes.js'),
    import('../src/source-scenes.js'),
    import('../src/magnet-scenes.js'),
    import('../src/polarization-scenes.js'),
    import('../src/cavity-scene.js'),
    import('../src/cavity-lobes.js'),
  ]);
});
