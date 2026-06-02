import assert from 'node:assert/strict';
import test from 'node:test';

import { DISRUPTION_SOURCE_REGISTRY, SOURCE_HEALTH_STATUSES, SOURCE_TYPES, buildSourceUrl, getSourceDefinition } from '../src/services/sourceRegistry.js';
import { fetchDisruptiveEventsForState, fetchNwsActiveAlertsByState, normalizeNwsAlertFeature, scoreNwsAlert } from '../src/services/disruptiveEvents.js';
import { classifyStateDisruption, groupEventsByRegion } from '../src/services/usDisruptionRegions.js';
import { fetchConfiguredPowerOutages, fetchKubraOutageSummary, normalizePowerOutageRecord, normalizeKubraSummaryRecord, summarizeOutageEvents } from '../src/services/powerOutages.js';
import { VETTED_POWER_OUTAGE_SOURCES, getProductionPowerOutageSources, getVettedPowerOutageSourcesByState, getVettedUtilityOutageSources } from '../src/services/vettedPowerOutageSources.js';

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

test('state disruption classification supports the USA map overview', () => {
  assert.equal(classifyStateDisruption([]).label, 'Quiet');
  assert.equal(classifyStateDisruption([{ disruptionScore: 55, status: 'active' }]).label, 'Watch');
  assert.equal(classifyStateDisruption([{ disruptionScore: 75, status: 'active' }]).label, 'Elevated');
  assert.equal(classifyStateDisruption([{ disruptionScore: 95, status: 'active' }]).label, 'Severe');
});

test('events group by city county or region for state drilldowns', () => {
  const grouped = groupEventsByRegion([
    { id: 'a', city: 'Tampa' },
    { id: 'b', county: 'Hillsborough County' },
    { id: 'c', region: 'Hillsborough County' },
  ]);

  assert.equal(grouped.Tampa.length, 1);
  assert.equal(grouped['Hillsborough County'].length, 2);
});

test('power outage records normalize into the shared disruptive event model', () => {
  const event = normalizePowerOutageRecord({
    id: 'outage-1',
    state: 'FL',
    county: 'Pinellas County',
    affectedCustomers: 12000,
    totalCustomers: 100000,
    estimatedRestorationAt: '2026-06-02T07:00:00Z',
  }, {
    id: 'utility-test',
    name: 'Utility Test Source',
    url: 'https://utility.example/outages.json',
    enabled: true,
  });

  assert.equal(event.sourceType, SOURCE_TYPES.UTILITY_OUTAGE);
  assert.equal(event.category, 'power');
  assert.equal(event.eventType, 'Power outage');
  assert.equal(event.state, 'FL');
  assert.equal(event.region, 'Pinellas County');
  assert.equal(event.affectedCustomers, 12000);
  assert.equal(event.severity, 'Moderate');
});

test('power outage summary totals active affected customers', () => {
  const summary = summarizeOutageEvents([
    { affectedCustomers: 10, disruptionScore: 20, status: 'active' },
    { affectedCustomers: 25, disruptionScore: 50, status: 'active' },
  ]);

  assert.equal(summary.activeEvents, 2);
  assert.equal(summary.affectedCustomers, 35);
  assert.equal(summary.maxScore, 50);
});

test('power outage fetch reports coverage gap when no vetted endpoint is enabled', async () => {
  const result = await fetchConfiguredPowerOutages({ sources: [] });

  assert.deepEqual(result.events, []);
  assert.equal(result.health[0].status, SOURCE_HEALTH_STATUSES.UNCHECKED);
  assert.match(result.health[0].message, /No vetted utility outage endpoint/i);
});

test('vetted power outage source list only exposes verified public utility feeds', () => {
  assert.ok(VETTED_POWER_OUTAGE_SOURCES.length >= 4);

  for (const source of VETTED_POWER_OUTAGE_SOURCES) {
    assert.equal(source.type, SOURCE_TYPES.UTILITY_OUTAGE);
    assert.equal(source.access, 'public-json');
    assert.equal(source.enabled, false);
    assert.match(source.url, /^https:\/\//);
    assert.match(source.currentStateUrl, /^https:\/\//);
    assert.ok(source.verifiedAt);
    assert.ok(source.verification?.summaryDataUrlTemplate || source.verification?.summaryEndpointPattern);
    assert.match(source.notes, /verified/i);
  }
});

test('vetted power outage sources can be selected by state without enabling ingestion automatically', () => {
  const paSources = getVettedPowerOutageSourcesByState('pa');
  const utilitySources = getVettedUtilityOutageSources();
  const productionSources = getProductionPowerOutageSources();

  assert.equal(paSources.length, 1);
  assert.equal(paSources[0].id, 'peco-kubra-summary');
  assert.ok(utilitySources.every(source => source.type === SOURCE_TYPES.UTILITY_OUTAGE));
  assert.ok(utilitySources.every(source => source.enabled === false));
  assert.ok(productionSources.some(source => source.id === 'dte-kubra-summary' && source.enabled === true));
  assert.ok(productionSources.every(source => source.platform === 'kubra-storm-center'));
});

test('Kubra summary records normalize into power outage events', () => {
  const source = { ...getVettedPowerOutageSourcesByState('mi')[0], enabled: true };
  const event = normalizeKubraSummaryRecord({
    summaryTotalId: 'total-1',
    total_cust_a: { val: 96 },
    total_percent_cust_a: { val: 0.01 },
    total_cust_s: 2261541,
    total_outages: 24,
  }, {
    source,
    generatedAt: '2026-06-02T12:22:13.883105315Z',
    summaryUrl: 'https://kubra.io/data/example/public/summary-1/data.json',
  });

  assert.equal(event.id, 'dte-kubra-summary-total-1');
  assert.equal(event.sourceId, 'dte-kubra-summary');
  assert.equal(event.state, 'MI');
  assert.equal(event.region, 'DTE Energy electric service territory in Michigan');
  assert.equal(event.affectedCustomers, 96);
  assert.equal(event.totalCustomers, 2261541);
  assert.equal(event.raw.total_outages, 24);
  assert.equal(event.lastUpdatedAt, '2026-06-02T12:22:13.883105315Z');
});

test('Kubra summary connector follows currentState data pointer and returns health context', async () => {
  const source = { ...getVettedPowerOutageSourcesByState('pa')[0], enabled: true };
  const requestedUrls = [];
  const fetchImpl = async url => {
    requestedUrls.push(url);
    if (url.includes('/currentState')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { interval_generation_data: 'data/peco-sample' } }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        summaryFileData: {
          date_generated: '2026-06-02T12:21:47.782681020Z',
          totals: [{
            summaryTotalId: 'total-1',
            total_cust_a: { val: 508 },
            total_cust_s: 1704347,
            total_outages: 54,
          }],
        },
      }),
    };
  };

  const result = await fetchKubraOutageSummary(source, { fetchImpl });

  assert.equal(requestedUrls[0], source.currentStateUrl);
  assert.equal(requestedUrls[1], 'https://kubra.io/data/peco-sample/public/summary-1/data.json');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].affectedCustomers, 508);
  assert.equal(result.health.status, SOURCE_HEALTH_STATUSES.OK);
  assert.equal(result.health.recordCount, 1);
});

test('configured power outage fetch ingests enabled vetted Kubra sources', async () => {
  const source = { ...getVettedPowerOutageSourcesByState('tx')[0], enabled: true };
  const fetchImpl = async url => ({
    ok: true,
    status: 200,
    json: async () => url.includes('/currentState')
      ? { data: { interval_generation_data: 'data/austin-sample' } }
      : { summaryFileData: { date_generated: '2026-06-02T12:26:31.955832759Z', totals: [{ summaryTotalId: 'total-1', total_cust_a: { val: 12 }, total_cust_s: 590091, total_outages: 3 }] } },
  });

  const result = await fetchConfiguredPowerOutages({ sources: [source], fetchImpl });

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].sourceId, 'austin-energy-kubra-summary');
  assert.equal(result.events[0].affectedCustomers, 12);
  assert.equal(result.health[0].status, SOURCE_HEALTH_STATUSES.OK);
});
