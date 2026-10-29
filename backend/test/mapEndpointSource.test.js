import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(here, '..', 'src', 'server.js'), 'utf8');
const endpointStart = serverSource.indexOf("'/api/map/places'");
const endpointEnd = serverSource.indexOf("app.post(\n    '/api/ai/assistant'", endpointStart);
const endpointSource = serverSource.slice(endpointStart, endpointEnd === -1 ? undefined : endpointEnd);

test('map endpoint only queries places and needs, not community posts', () => {
  assert.notEqual(endpointStart, -1, 'map endpoint should exist');
  assert.match(endpointSource, /FROM map_places/);
  assert.match(endpointSource, /FROM needs n/);
  assert.doesNotMatch(endpointSource, /FROM community_posts/);
  assert.doesNotMatch(endpointSource, /'community' AS source/);
});

test('map endpoint validates latitude and longitude ranges for both sources', () => {
  assert.equal((endpointSource.match(/latitude BETWEEN -90 AND 90/g) || []).length, 2);
  assert.equal((endpointSource.match(/longitude BETWEEN -180 AND 180/g) || []).length, 2);
});

test('map endpoint only includes open needs with coordinates', () => {
  assert.match(endpointSource, /n\.status = 'open'/);
  assert.match(endpointSource, /n\.latitude IS NOT NULL/);
  assert.match(endpointSource, /n\.longitude IS NOT NULL/);
});
