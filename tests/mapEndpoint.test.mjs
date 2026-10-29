import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serverSource = await readFile(
  new URL('../backend/src/server.js', import.meta.url),
  'utf8',
);
const endpointStart = serverSource.indexOf("'/api/map/places'");
assert.notEqual(endpointStart, -1, 'debe existir el endpoint del mapa');
const endpointEnd = serverSource.indexOf('\n/*', endpointStart);
const endpoint = serverSource.slice(
  endpointStart,
  endpointEnd === -1 ? undefined : endpointEnd,
);

test('el endpoint del mapa usa únicamente map_places y necesidades abiertas', () => {
  assert.match(endpoint, /FROM map_places/);
  assert.match(endpoint, /FROM needs n/);
  assert.match(endpoint, /n\.status = 'open'/);
  assert.doesNotMatch(endpoint, /community_posts/);
  assert.doesNotMatch(endpoint, /'community' AS source/);
});

test('el endpoint filtra coordenadas fuera de rango', () => {
  assert.match(endpoint, /latitude BETWEEN -90 AND 90/);
  assert.match(endpoint, /longitude BETWEEN -180 AND 180/);
});
