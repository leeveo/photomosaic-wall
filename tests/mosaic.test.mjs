import test from 'node:test'
import assert from 'node:assert/strict'
import { availablePositions, loadCanvasImage } from '../lib/mosaic.ts'

test('a full mosaic terminates with no available cells', () => {
  assert.deepEqual(availablePositions(1, 2, [{row:0,col:0},{row:0,col:1}]), [])
})
test('only unoccupied positions in the grid can be assigned', () => {
  assert.deepEqual(availablePositions(2, 2, [{row:0,col:0},{row:1,col:1},{row:9,col:9}]), [{row:0,col:1},{row:1,col:0}])
})
test('invalid grid sizes cannot produce positions', () => {
  for (const value of [0, -1, NaN, 1.5]) assert.deepEqual(availablePositions(value, 2, []), [])
})
test('image loaders register handlers before a cached image loads and reject failures', async () => {
  const original = globalThis.Image
  globalThis.Image = class {
    set src(value) { if (value === 'bad') this.onerror(); else this.onload() }
  }
  try {
    assert.ok(await loadCanvasImage('cached'))
    await assert.rejects(loadCanvasImage('bad'), /Impossible de charger/)
  } finally { globalThis.Image = original }
})
