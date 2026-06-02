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

function unwrapKubraValue(value, fallback = 0) {
  if (value && typeof value === 'object' && 'val' in value) return Number(value.val ?? fallback);
  return Number(value ?? fallback);
}

function buildKubraSummaryUrl(intervalGenerationData) {
  const normalizedPath = String(intervalGenerationData || '').replace(/^\/+/, '');
  if (!normalizedPath) return '';
  return `https://kubra.io/${normalizedPath}/public/summary-1/data.json`;
}

export function normalizeKubraSummaryRecord(record = {}, { source = {}, generatedAt = null, summaryUrl = '' } = {}) {
  const event = normalizePowerOutageRecord({
    id: `${source.id || 'kubra-summary'}-${record.summaryTotalId || 'total'}`,
    title: `${source.authority || source.name || 'Utility'} outage summary`,
    state: source.states?.[0] || null,
    region: source.coverage || source.authority || source.name,
    affectedCustomers: unwrapKubraValue(record.total_cust_a),
    totalCustomers: unwrapKubraValue(record.total_cust_s),
    status: 'active',
    lastUpdatedAt: generatedAt,
    lastCheckedAt: new Date().toISOString(),
    sourceUrl: summaryUrl,
    coverageNotes: `Kubra outage summary for ${source.coverage || source.authority || source.name}.`,
  }, {
    ...source,
    url: summaryUrl || source.url,
    enabled: true,
  });

  return {
    ...event,
    raw: record,
  };
}

export async function fetchKubraOutageSummary(source, { fetchImpl = fetch } = {}) {
  const checkedAt = new Date().toISOString();

  try {
    const currentStateResponse = await fetchImpl(source.currentStateUrl || source.url);
    if (!currentStateResponse.ok) {
      return {
        events: [],
        health: {
          sourceId: source.id,
          status: currentStateResponse.status === 429 ? SOURCE_HEALTH_STATUSES.RATE_LIMITED : SOURCE_HEALTH_STATUSES.FAILED,
          checkedAt,
          lastSuccessfulFetchAt: null,
          message: `Kubra currentState failed with HTTP ${currentStateResponse.status}.`,
          stale: true,
          recordCount: 0,
        },
      };
    }

    const currentState = await currentStateResponse.json();
    const summaryUrl = buildKubraSummaryUrl(currentState?.data?.interval_generation_data);
    if (!summaryUrl) throw new Error('Kubra currentState did not include data.interval_generation_data.');

    const summaryResponse = await fetchImpl(summaryUrl);
    if (!summaryResponse.ok) {
      return {
        events: [],
        health: {
          sourceId: source.id,
          status: summaryResponse.status === 429 ? SOURCE_HEALTH_STATUSES.RATE_LIMITED : SOURCE_HEALTH_STATUSES.FAILED,
          checkedAt,
          lastSuccessfulFetchAt: null,
          message: `Kubra summary failed with HTTP ${summaryResponse.status}.`,
          stale: true,
          recordCount: 0,
        },
      };
    }

    const summary = await summaryResponse.json();
    const totals = summary?.summaryFileData?.totals || [];
    const generatedAt = summary?.summaryFileData?.date_generated || checkedAt;
    const events = totals.map(record => normalizeKubraSummaryRecord(record, { source, generatedAt, summaryUrl }));

    return {
      events,
      health: {
        sourceId: source.id,
        status: SOURCE_HEALTH_STATUSES.OK,
        checkedAt,
        lastSuccessfulFetchAt: checkedAt,
        message: `Kubra summary responded successfully with ${events.length} outage summary record(s).`,
        stale: false,
        recordCount: events.length,
        summaryUrl,
      },
    };
  } catch (error) {
    return {
      events: [],
      health: {
        sourceId: source.id,
        status: SOURCE_HEALTH_STATUSES.FAILED,
        checkedAt,
        lastSuccessfulFetchAt: null,
        message: `Kubra outage source failed: ${error.message}`,
        stale: true,
        recordCount: 0,
      },
    };
  }
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
    if (source.platform === 'kubra-storm-center') {
      return fetchKubraOutageSummary(source, { fetchImpl });
    }

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
