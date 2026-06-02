import {
  SOURCE_HEALTH_STATUSES,
  SOURCE_TYPES,
  buildSourceUrl,
  getSourceDefinition,
} from './sourceRegistry.js';

const NWS_ALERTS_SOURCE_ID = 'nws-alerts-active-by-state';
const DEFAULT_HEADERS = { 'User-Agent': 'TheEOC Command Center (https://github.com/K0rsantan/command-center)' };
const STALE_AFTER_MS = 30 * 60 * 1000;

const NWS_SEVERITY_SCORES = Object.freeze({
  Extreme: 100,
  Severe: 80,
  Moderate: 55,
  Minor: 30,
  Unknown: 15,
});

const NWS_URGENCY_BOOSTS = Object.freeze({
  Immediate: 10,
  Expected: 5,
  Future: 0,
  Past: -10,
  Unknown: 0,
});

export function createSourceHealth({
  sourceId,
  status = SOURCE_HEALTH_STATUSES.UNCHECKED,
  checkedAt = new Date().toISOString(),
  lastSuccessfulFetchAt = null,
  message = '',
  stale = false,
  recordCount = null,
}) {
  return {
    sourceId,
    status,
    checkedAt,
    lastSuccessfulFetchAt,
    message,
    stale,
    recordCount,
  };
}

export function getEventStatus(startTime, endTime, now = new Date()) {
  const starts = startTime ? new Date(startTime) : null;
  const ends = endTime ? new Date(endTime) : null;

  if (Number.isNaN(starts?.getTime()) || Number.isNaN(ends?.getTime())) return 'active';
  if (ends && ends < now) return 'expired';
  if (starts && starts > now) return 'scheduled';
  return 'active';
}

export function scoreNwsAlert(properties = {}) {
  const severityScore = NWS_SEVERITY_SCORES[properties.severity] ?? NWS_SEVERITY_SCORES.Unknown;
  const urgencyBoost = NWS_URGENCY_BOOSTS[properties.urgency] ?? 0;
  return Math.max(0, Math.min(100, severityScore + urgencyBoost));
}

function getAreaLabel(properties = {}) {
  return properties.areaDesc || properties.geocode?.UGC?.join(', ') || 'Unknown area';
}

function normalizeGeometry(geometry) {
  if (!geometry) return null;

  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const [lon, lat] = geometry.coordinates;
    return { lat, lon, geometry };
  }

  return { lat: null, lon: null, geometry };
}

export function normalizeNwsAlertFeature(feature, { state, source } = {}) {
  const properties = feature?.properties || {};
  const normalizedGeometry = normalizeGeometry(feature?.geometry);
  const sourceDefinition = source || getSourceDefinition(NWS_ALERTS_SOURCE_ID);
  const sourceUrl = state
    ? buildSourceUrl(sourceDefinition, { state })
    : properties['@id'] || sourceDefinition?.url || '';

  return {
    id: feature?.id || properties.id || properties['@id'],
    source: sourceDefinition?.name || 'National Weather Service',
    sourceId: sourceDefinition?.id || NWS_ALERTS_SOURCE_ID,
    sourceType: SOURCE_TYPES.NWS_ALERTS,
    sourceUrl,
    title: properties.headline || properties.event || 'Weather alert',
    eventType: properties.event || 'Weather alert',
    category: 'weather',
    severity: properties.severity || 'Unknown',
    disruptionScore: scoreNwsAlert(properties),
    state: state || properties.geocode?.SAME?.[0] || null,
    city: null,
    county: null,
    region: getAreaLabel(properties),
    lat: normalizedGeometry?.lat ?? null,
    lon: normalizedGeometry?.lon ?? null,
    geometry: normalizedGeometry?.geometry ?? null,
    startTime: properties.onset || properties.effective || null,
    endTime: properties.ends || properties.expires || null,
    status: getEventStatus(properties.onset || properties.effective, properties.ends || properties.expires),
    lastCheckedAt: new Date().toISOString(),
    lastUpdatedAt: properties.updated || properties.sent || null,
    sourceHealthStatus: SOURCE_HEALTH_STATUSES.OK,
    confidence: 'high',
    coverageNotes: properties.senderName
      ? `Official alert issued by ${properties.senderName}`
      : 'Official National Weather Service alert.',
    raw: feature,
  };
}

export async function fetchNwsActiveAlertsByState(state, { fetchImpl = fetch, now = new Date() } = {}) {
  const normalizedState = String(state || '').trim().toUpperCase();
  const source = getSourceDefinition(NWS_ALERTS_SOURCE_ID);
  const checkedAt = now.toISOString();

  if (!/^[A-Z]{2}$/.test(normalizedState)) {
    return {
      events: [],
      health: createSourceHealth({
        sourceId: source.id,
        status: SOURCE_HEALTH_STATUSES.FAILED,
        checkedAt,
        message: 'A two-letter state code is required for NWS active alerts.',
      }),
    };
  }

  const url = buildSourceUrl(source, { state: normalizedState });

  try {
    const response = await fetchImpl(url, { headers: DEFAULT_HEADERS });

    if (response.status === 429) {
      return {
        events: [],
        health: createSourceHealth({
          sourceId: source.id,
          status: SOURCE_HEALTH_STATUSES.RATE_LIMITED,
          checkedAt,
          message: 'NWS active alerts source is rate limited. Preserve last-known data and mark it stale.',
          stale: true,
        }),
      };
    }

    if (!response.ok) {
      return {
        events: [],
        health: createSourceHealth({
          sourceId: source.id,
          status: SOURCE_HEALTH_STATUSES.FAILED,
          checkedAt,
          message: `NWS active alerts request failed with HTTP ${response.status}.`,
          stale: true,
        }),
      };
    }

    const payload = await response.json();
    const events = (payload.features || []).map(feature => normalizeNwsAlertFeature(feature, {
      state: normalizedState,
      source,
    }));

    const fetchedAt = new Date(payload.updated || checkedAt);
    const stale = now.getTime() - fetchedAt.getTime() > STALE_AFTER_MS;

    return {
      events,
      health: createSourceHealth({
        sourceId: source.id,
        status: stale ? SOURCE_HEALTH_STATUSES.STALE : SOURCE_HEALTH_STATUSES.OK,
        checkedAt,
        lastSuccessfulFetchAt: checkedAt,
        message: stale
          ? 'NWS source responded, but the payload timestamp is stale.'
          : 'NWS source responded successfully.',
        stale,
        recordCount: events.length,
      }),
    };
  } catch (error) {
    return {
      events: [],
      health: createSourceHealth({
        sourceId: source.id,
        status: SOURCE_HEALTH_STATUSES.FAILED,
        checkedAt,
        message: `NWS active alerts source failed: ${error.message}`,
        stale: true,
      }),
    };
  }
}

export async function fetchDisruptiveEventsForState(state, options = {}) {
  const nws = await fetchNwsActiveAlertsByState(state, options);

  return {
    events: nws.events,
    sourceHealth: [nws.health],
    coverageNotes: [
      'Currently populated by official NWS active alerts. NHC, SPC, Socrata, DOT/511, ArcGIS, utility outage, and event-calendar sources are registered for future connectors.',
    ],
  };
}
