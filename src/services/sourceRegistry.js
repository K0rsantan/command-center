export const SOURCE_TYPES = Object.freeze({
  NWS_ALERTS: 'nws-alerts-api',
  NHC_RSS: 'nhc-rss',
  SPC_RSS: 'spc-rss',
  DOT_511: 'dot-511',
  SOCRATA: 'socrata-dataset',
  ARCGIS_FEATURE_SERVER: 'arcgis-feature-server',
  VENUE_CALENDAR: 'venue-calendar',
  SPORTS_SCHEDULE: 'sports-schedule',
  UTILITY_OUTAGE: 'utility-power-outage',
  APPROVED_MEDIA_REFERENCE: 'approved-media-reference',
});

export const SOURCE_HEALTH_STATUSES = Object.freeze({
  OK: 'ok',
  DEGRADED: 'degraded',
  FAILED: 'failed',
  RATE_LIMITED: 'rate_limited',
  STALE: 'stale',
  UNCHECKED: 'unchecked',
});

export const DISRUPTION_SOURCE_REGISTRY = Object.freeze([
  {
    id: 'nws-alerts-active-by-state',
    name: 'NWS Active Alerts by State',
    type: SOURCE_TYPES.NWS_ALERTS,
    authority: 'National Weather Service',
    url: 'https://api.weather.gov/alerts/active?area={STATE}',
    coverage: 'US states and territories',
    enabled: true,
    refreshMinutes: 10,
    notes: 'Official weather alert source. Query by two-letter state/territory code.',
  },
  {
    id: 'nhc-atlantic-rss',
    name: 'NHC Atlantic RSS',
    type: SOURCE_TYPES.NHC_RSS,
    authority: 'National Hurricane Center',
    url: 'https://www.nhc.noaa.gov/index-at.xml',
    coverage: 'Atlantic tropical cyclone basin',
    enabled: true,
    refreshMinutes: 15,
    notes: 'Initial registry entry; connector is intentionally separate from the normalized event model.',
  },
  {
    id: 'spc-watches-rss',
    name: 'SPC Watches RSS',
    type: SOURCE_TYPES.SPC_RSS,
    authority: 'Storm Prediction Center',
    url: 'https://www.spc.noaa.gov/products/spcwwrss.xml',
    coverage: 'US severe thunderstorm and tornado watches',
    enabled: true,
    refreshMinutes: 10,
    notes: 'Initial registry entry; connector is intentionally separate from the normalized event model.',
  },
  {
    id: 'socrata-planned-events-proof',
    name: 'Socrata Planned Events Proof of Concept',
    type: SOURCE_TYPES.SOCRATA,
    authority: 'City/county open data portals',
    url: 'https://{domain}/resource/{dataset}.json',
    coverage: 'City/county planned events where an approved dataset is configured',
    enabled: false,
    refreshMinutes: 60,
    notes: 'Template entry for the first vetted Socrata planned-event dataset; disabled until a dataset is selected.',
  },
  {
    id: 'future-dot-511-incidents',
    name: 'DOT/511 Incidents and Closures',
    type: SOURCE_TYPES.DOT_511,
    authority: 'State and regional transportation agencies',
    url: 'varies-by-agency',
    coverage: 'Road incidents, closures, and traveler information feeds',
    enabled: false,
    refreshMinutes: 15,
    notes: 'Future connector family for transportation disruptions.',
  },
  {
    id: 'future-arcgis-event-layers',
    name: 'ArcGIS Event Layers',
    type: SOURCE_TYPES.ARCGIS_FEATURE_SERVER,
    authority: 'Public agency ArcGIS/FeatureServer layers',
    url: 'https://{host}/arcgis/rest/services/{service}/FeatureServer/{layer}/query',
    coverage: 'Agency-specific incidents, closures, permits, and public safety layers',
    enabled: false,
    refreshMinutes: 30,
    notes: 'Future connector family for GIS-backed disruptive event layers.',
  },
  {
    id: 'future-utility-outages',
    name: 'Utility Power Outage Sources',
    type: SOURCE_TYPES.UTILITY_OUTAGE,
    authority: 'Electric utilities and outage aggregators',
    url: 'varies-by-utility',
    coverage: 'Power outage counts, affected customers, and restoration estimates',
    enabled: false,
    refreshMinutes: 10,
    notes: 'Future connector family for issue #2 without changing the normalized event shape.',
  },
  {
    id: 'future-public-event-calendars',
    name: 'Venue, Convention, and Sports Calendars',
    type: SOURCE_TYPES.VENUE_CALENDAR,
    authority: 'Approved event calendars and schedules',
    url: 'varies-by-source',
    coverage: 'Major public gatherings that can affect traffic, staffing, or emergency posture',
    enabled: false,
    refreshMinutes: 240,
    notes: 'Future connector family for non-weather planned disruption awareness.',
  },
]);

export function getSourceDefinition(sourceId) {
  return DISRUPTION_SOURCE_REGISTRY.find(source => source.id === sourceId) || null;
}

export function buildSourceUrl(source, params = {}) {
  if (!source?.url) return '';

  return Object.entries(params).reduce(
    (url, [key, value]) => url.replaceAll(`{${key.toUpperCase()}}`, encodeURIComponent(value)),
    source.url,
  );
}

export function createUncheckedSourceHealth(source, checkedAt = null) {
  return {
    sourceId: source.id,
    status: SOURCE_HEALTH_STATUSES.UNCHECKED,
    checkedAt,
    lastSuccessfulFetchAt: null,
    message: 'Source has not been checked in this session.',
    stale: false,
  };
}
