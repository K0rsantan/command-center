import assert from 'node:assert/strict';
import test from 'node:test';

import { DISRUPTION_SOURCE_REGISTRY, SOURCE_HEALTH_STATUSES, SOURCE_TYPES, buildSourceUrl, getSourceDefinition } from '../src/services/sourceRegistry.js';
import { fetchDisruptiveEventsForState, fetchNwsActiveAlertsByState, normalizeNwsAlertFeature, scoreNwsAlert } from '../src/services/disruptiveEvents.js';

const nwsSource = getSourceDefinition('nws-alerts-active-by-state');

const sampleFeature = {
  id: 'https://api.weather.gov/alerts/urn:oid:sample',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-82, 28], [-81, 28], [-81, 29], [-82, 29], [-82, 28]]],
  },
  properties: {
    '@id': 'https://api.weather.gov/alerts/urn:oid:sample',
    event: 'Tornado Warning',
    headline: 'Tornado Warning issued for Hillsborough County',
    severity: 'Extreme',
    urgency: 'Immediate',
    certainty: 'Observed',
    areaDesc: 'Hillsborough County',
    onset: '2026-06-02T04:00:00Z',
    expires: '2026-06-02T05:00:00Z',
    updated: '2026-06-02T04:01:00Z',
    senderName: 'NWS Tampa Bay Ruskin FL',
  },
};

test('source registry includes the required initial source families', () => {
  const sourceTypes = new Set(DISRUPTION_SOURCE_REGISTRY.map(source => source.type));

  assert.equal(buildSourceUrl(nwsSource, { state: 'FL' }), 'https://api.weather.gov/alerts/active?area=FL');
  assert.ok(sourceTypes.has(SOURCE_TYPES.NWS_ALERTS));
  assert.ok(sourceTypes.has(SOURCE_TYPES.NHC_RSS));
  assert.ok(sourceTypes.has(SOURCE_TYPES.SPC_RSS));
  assert.ok(sourceTypes.has(SOURCE_TYPES.SOCRATA));
  assert.ok(sourceTypes.has(SOURCE_TYPES.DOT_511));
  assert.ok(sourceTypes.has(SOURCE_TYPES.ARCGIS_FEATURE_SERVER));
  assert.ok(sourceTypes.has(SOURCE_TYPES.UTILITY_OUTAGE));
});

test('NWS alerts normalize into the disruptive event model', () => {
  const event = normalizeNwsAlertFeature(sampleFeature, { state: 'FL', source: nwsSource });

  assert.equal(event.id, sampleFeature.id);
  assert.equal(event.sourceId, 'nws-alerts-active-by-state');
  assert.equal(event.sourceType, SOURCE_TYPES.NWS_ALERTS);
  assert.equal(event.sourceUrl, 'https://api.weather.gov/alerts/active?area=FL');
  assert.equal(event.title, 'Tornado Warning issued for Hillsborough County');
  assert.equal(event.eventType, 'Tornado Warning');
  assert.equal(event.category, 'weather');
  assert.equal(event.severity, 'Extreme');
  assert.equal(event.disruptionScore, 100);
  assert.equal(event.state, 'FL');
  assert.equal(event.region, 'Hillsborough County');
  assert.equal(event.status, 'expired');
  assert.equal(event.sourceHealthStatus, SOURCE_HEALTH_STATUSES.OK);
  assert.equal(event.confidence, 'high');
  assert.deepEqual(event.geometry, sampleFeature.geometry);
});

test('NWS severity scoring combines severity and urgency without exceeding 100', () => {
  assert.equal(scoreNwsAlert({ severity: 'Extreme', urgency: 'Immediate' }), 100);
  assert.equal(scoreNwsAlert({ severity: 'Severe', urgency: 'Expected' }), 85);
  assert.equal(scoreNwsAlert({ severity: 'Minor', urgency: 'Past' }), 20);
});

test('fetchNwsActiveAlertsByState reports invalid state as testable source health', async () => {
  const result = await fetchNwsActiveAlertsByState('Florida');

  assert.deepEqual(result.events, []);
  assert.equal(result.health.sourceId, 'nws-alerts-active-by-state');
  assert.equal(result.health.status, SOURCE_HEALTH_STATUSES.FAILED);
  assert.match(result.health.message, /two-letter state code/i);
});

test('fetchDisruptiveEventsForState returns normalized events and source health', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      updated: '2026-06-02T04:02:00Z',
      features: [sampleFeature],
    }),
  });

  const result = await fetchDisruptiveEventsForState('fl', {
    fetchImpl,
    now: new Date('2026-06-02T04:03:00Z'),
  });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].state, 'FL');
  assert.equal(result.sourceHealth.length, 1);
  assert.equal(result.sourceHealth[0].status, SOURCE_HEALTH_STATUSES.OK);
  assert.equal(result.sourceHealth[0].recordCount, 1);
  assert.match(result.coverageNotes[0], /NWS active alerts/i);
});

test('rate limited source is marked stale instead of silently clearing without health context', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429 });
  const result = await fetchNwsActiveAlertsByState('FL', { fetchImpl });

  assert.deepEqual(result.events, []);
  assert.equal(result.health.status, SOURCE_HEALTH_STATUSES.RATE_LIMITED);
  assert.equal(result.health.stale, true);
});
