import { SOURCE_HEALTH_STATUSES, SOURCE_TYPES } from './sourceRegistry.js';

export function normalizePowerOutageRecord(record = {}, source = {}) {
  const affectedCustomers = Number(record.affectedCustomers ?? record.customersOut ?? record.outage_count ?? 0);
  const totalCustomers = Number(record.totalCustomers ?? record.customersServed ?? record.total_count ?? 0);
  const percentOut = totalCustomers > 0 ? (affectedCustomers / totalCustomers) * 100 : null;
  const disruptionScore = Math.max(0, Math.min(100, Math.round(
    percentOut !== null ? percentOut * 4 : Math.log10(Math.max(affectedCustomers, 1)) * 18,
  )));

  return {
    id: record.id || `${source.id || 'power-outage'}-${record.state || 'unknown'}-${record.region || record.county || record.city || 'area'}`,
    source: source.name || 'Utility outage source',
    sourceId: source.id || 'utility-power-outage',
    sourceType: SOURCE_TYPES.UTILITY_OUTAGE,
    sourceUrl: source.url || record.sourceUrl || '',
    title: record.title || `Power outage: ${record.region || record.county || record.city || record.state || 'reported area'}`,
    eventType: 'Power outage',
    category: 'power',
    severity: affectedCustomers >= 50000 || disruptionScore >= 80 ? 'Severe' : affectedCustomers >= 5000 || disruptionScore >= 45 ? 'Moderate' : 'Minor',
    disruptionScore,
    state: record.state || null,
    city: record.city || null,
    county: record.county || null,
    region: record.region || record.county || record.city || record.state || 'Unknown area',
    lat: record.lat ?? null,
    lon: record.lon ?? null,
    geometry: record.geometry || null,
    startTime: record.startedAt || record.startTime || null,
    endTime: record.estimatedRestorationAt || record.endTime || null,
    status: record.status || 'active',
    lastCheckedAt: record.lastCheckedAt || new Date().toISOString(),
    lastUpdatedAt: record.lastUpdatedAt || null,
    sourceHealthStatus: SOURCE_HEALTH_STATUSES.OK,
    confidence: source.enabled ? 'medium' : 'unverified',
    coverageNotes: record.coverageNotes || 'Utility outage event normalized from an approved source connector.',
    affectedCustomers,
    totalCustomers,
    percentOut,
    raw: record,
  };
}

export function summarizeOutageEvents(events = []) {
  const affectedCustomers = events.reduce((sum, event) => sum + (Number(event.affectedCustomers) || 0), 0);
  const maxScore = events.reduce((max, event) => Math.max(max, event.disruptionScore || 0), 0);
  const activeEvents = events.filter(event => event.status !== 'expired').length;

  return {
    activeEvents,
    affectedCustomers,
    maxScore,
    status: activeEvents > 0 ? SOURCE_HEALTH_STATUSES.OK : SOURCE_HEALTH_STATUSES.UNCHECKED,
  };
}

export async function fetchConfiguredPowerOutages({ sources = [], fetchImpl = fetch } = {}) {
  const enabledSources = sources.filter(source => source.enabled && source.type === SOURCE_TYPES.UTILITY_OUTAGE && source.url?.startsWith('https://'));

  if (!enabledSources.length) {
    return {
      events: [],
      health: [{
        sourceId: 'utility-power-outage',
        status: SOURCE_HEALTH_STATUSES.UNCHECKED,
        checkedAt: new Date().toISOString(),
        lastSuccessfulFetchAt: null,
        message: 'No vetted utility outage endpoint is enabled yet. The page shows this gap honestly instead of using mock outage data.',
        stale: false,
        recordCount: 0,
      }],
    };
  }

  const results = await Promise.all(enabledSources.map(async source => {
    try {
      const response = await fetchImpl(source.url);
      if (!response.ok) {
        return {
          events: [],
          health: {
            sourceId: source.id,
            status: response.status === 429 ? SOURCE_HEALTH_STATUSES.RATE_LIMITED : SOURCE_HEALTH_STATUSES.FAILED,
            checkedAt: new Date().toISOString(),
            lastSuccessfulFetchAt: null,
            message: `Power outage source failed with HTTP ${response.status}.`,
            stale: true,
            recordCount: 0,
          },
        };
      }

      const payload = await response.json();
      const records = Array.isArray(payload) ? payload : payload.records || payload.features || [];
      const events = records.map(record => normalizePowerOutageRecord(record.properties || record, source));

      return {
        events,
        health: {
          sourceId: source.id,
          status: SOURCE_HEALTH_STATUSES.OK,
          checkedAt: new Date().toISOString(),
          lastSuccessfulFetchAt: new Date().toISOString(),
          message: 'Power outage source responded successfully.',
          stale: false,
          recordCount: events.length,
        },
      };
    } catch (error) {
      return {
        events: [],
        health: {
          sourceId: source.id,
          status: SOURCE_HEALTH_STATUSES.FAILED,
          checkedAt: new Date().toISOString(),
          lastSuccessfulFetchAt: null,
          message: `Power outage source failed: ${error.message}`,
          stale: true,
          recordCount: 0,
        },
      };
    }
  }));

  return {
    events: results.flatMap(result => result.events),
    health: results.map(result => result.health),
  };
}
