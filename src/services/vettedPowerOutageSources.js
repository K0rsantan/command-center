import { SOURCE_TYPES } from './sourceRegistry.js';

const VERIFIED_AT = '2026-06-02T12:30:15Z';
const KUBRA_SUMMARY_TEMPLATE = 'Resolve data.interval_generation_data from currentState, then fetch https://kubra.io/{interval_generation_data}/public/summary-1/data.json';

export const VETTED_POWER_OUTAGE_SOURCES = Object.freeze([
  {
    id: 'dte-kubra-summary',
    name: 'DTE Energy Kubra outage summary',
    type: SOURCE_TYPES.UTILITY_OUTAGE,
    platform: 'kubra-storm-center',
    authority: 'DTE Energy',
    states: ['MI'],
    coverage: 'DTE Energy electric service territory in Michigan',
    url: 'https://kubra.io/stormcenter/api/v1/stormcenters/4fbb3ad3-e01d-4d71-9575-d453769c1171/views/8ed2824a-bd92-474e-a7c4-848b812b7f9b/currentState?preview=false',
    currentStateUrl: 'https://kubra.io/stormcenter/api/v1/stormcenters/4fbb3ad3-e01d-4d71-9575-d453769c1171/views/8ed2824a-bd92-474e-a7c4-848b812b7f9b/currentState?preview=false',
    outageMapUrl: 'https://outage.dteenergy.com/map',
    access: 'public-json',
    enabled: false,
    refreshMinutes: 10,
    verifiedAt: VERIFIED_AT,
    verification: {
      method: 'HTTP GET currentState, then GET derived Kubra summary JSON',
      currentStateStatus: 200,
      summaryStatus: 200,
      summaryDataUrlTemplate: KUBRA_SUMMARY_TEMPLATE,
      observedFields: ['total_cust_a.val', 'total_percent_cust_a.val', 'total_cust_s', 'total_outages', 'date_generated'],
    },
    notes: 'Verified public Kubra JSON source. Keep disabled until a Kubra summary connector maps summary totals into normalized outage events.',
  },
  {
    id: 'peco-kubra-summary',
    name: 'PECO Kubra outage summary',
    type: SOURCE_TYPES.UTILITY_OUTAGE,
    platform: 'kubra-storm-center',
    authority: 'PECO',
    states: ['PA'],
    coverage: 'PECO electric service territory in southeastern Pennsylvania',
    url: 'https://kubra.io/stormcenter/api/v1/stormcenters/39e6d9f3-fdea-4539-848f-b8631945da6f/views/74de8a50-3f45-4f6a-9483-fd618bb9165d/currentState?preview=false',
    currentStateUrl: 'https://kubra.io/stormcenter/api/v1/stormcenters/39e6d9f3-fdea-4539-848f-b8631945da6f/views/74de8a50-3f45-4f6a-9483-fd618bb9165d/currentState?preview=false',
    outageMapUrl: 'https://www.peco.com/outages/experiencing-an-outage/outage-map',
    access: 'public-json',
    enabled: false,
    refreshMinutes: 10,
    verifiedAt: VERIFIED_AT,
    verification: {
      method: 'HTTP GET currentState, then GET derived Kubra summary JSON',
      currentStateStatus: 200,
      summaryStatus: 200,
      summaryDataUrlTemplate: KUBRA_SUMMARY_TEMPLATE,
      observedFields: ['total_cust_a.val', 'total_percent_cust_a.val', 'total_cust_s', 'total_outages', 'date_generated'],
    },
    notes: 'Verified public Kubra JSON source. Keep disabled until a Kubra summary connector maps summary totals into normalized outage events.',
  },
  {
    id: 'lge-ku-kubra-summary',
    name: 'LG&E/KU Kubra outage summary',
    type: SOURCE_TYPES.UTILITY_OUTAGE,
    platform: 'kubra-storm-center',
    authority: 'LG&E and KU Energy',
    states: ['KY'],
    coverage: 'Louisville Gas and Electric and Kentucky Utilities service territories',
    url: 'https://kubra.io/stormcenter/api/v1/stormcenters/877fd1e9-4162-473f-b782-d8a53a85326b/views/a6cee9e4-312b-4b77-9913-2ae371eb860d/currentState?preview=false',
    currentStateUrl: 'https://kubra.io/stormcenter/api/v1/stormcenters/877fd1e9-4162-473f-b782-d8a53a85326b/views/a6cee9e4-312b-4b77-9913-2ae371eb860d/currentState?preview=false',
    outageMapUrl: 'https://stormcenter.lge-ku.com/default.html',
    access: 'public-json',
    enabled: false,
    refreshMinutes: 10,
    verifiedAt: VERIFIED_AT,
    verification: {
      method: 'HTTP GET currentState, then GET derived Kubra summary JSON',
      currentStateStatus: 200,
      summaryStatus: 200,
      summaryDataUrlTemplate: KUBRA_SUMMARY_TEMPLATE,
      observedFields: ['total_cust_a.val', 'total_percent_cust_a.val', 'total_cust_s', 'total_outages', 'date_generated'],
    },
    notes: 'Verified public Kubra JSON source. Existing civic-tech usage documented this same currentState pattern; keep disabled until connector support lands.',
  },
  {
    id: 'austin-energy-kubra-summary',
    name: 'Austin Energy Kubra outage summary',
    type: SOURCE_TYPES.UTILITY_OUTAGE,
    platform: 'kubra-storm-center',
    authority: 'Austin Energy',
    states: ['TX'],
    coverage: 'Austin Energy electric service territory in central Texas',
    url: 'https://kubra.io/stormcenter/api/v1/stormcenters/dd9c446f-f6b8-43f9-8f80-83f5245c60a1/views/76446308-a901-4fa3-849c-3dd569933a51/currentState?preview=false',
    currentStateUrl: 'https://kubra.io/stormcenter/api/v1/stormcenters/dd9c446f-f6b8-43f9-8f80-83f5245c60a1/views/76446308-a901-4fa3-849c-3dd569933a51/currentState?preview=false',
    outageMapUrl: 'https://outagemap.austinenergy.com/',
    access: 'public-json',
    enabled: false,
    refreshMinutes: 10,
    verifiedAt: VERIFIED_AT,
    verification: {
      method: 'HTTP GET currentState, then GET derived Kubra summary JSON',
      currentStateStatus: 200,
      summaryStatus: 200,
      summaryDataUrlTemplate: KUBRA_SUMMARY_TEMPLATE,
      observedFields: ['total_cust_a.val', 'total_percent_cust_a.val', 'total_cust_s', 'total_outages', 'date_generated'],
    },
    notes: 'Verified public Kubra JSON source. Keep disabled until a Kubra summary connector maps summary totals into normalized outage events.',
  },
  {
    id: 'teco-outage-map-config',
    name: 'Tampa Electric outage map config',
    type: SOURCE_TYPES.UTILITY_OUTAGE,
    platform: 'azure-outage-map',
    authority: 'Tampa Electric',
    states: ['FL'],
    coverage: 'Tampa Electric service territory in west-central Florida',
    url: 'https://outage-data-prod-hrcadje2h9aje9c9.a03.azurefd.net/api/v1/config',
    currentStateUrl: 'https://outage-data-prod-hrcadje2h9aje9c9.a03.azurefd.net/api/v1/config',
    outageMapUrl: 'https://www.tampaelectric.com/poweroutages/',
    access: 'public-json',
    enabled: false,
    refreshMinutes: 10,
    verifiedAt: VERIFIED_AT,
    verification: {
      method: 'HTTP GET outage map config JSON',
      currentStateStatus: 200,
      summaryStatus: 200,
      summaryEndpointPattern: 'Public config confirms map backend and tile container; outage tile query shape still needs connector-specific validation before enabling ingestion.',
      observedFields: ['tileContainer', 'ClusteringEnabled', 'CenterPosition', 'mapUnavailableMessage'],
    },
    notes: 'Verified public JSON config only. This is vetted as a source candidate, not a ready summary feed, because tile ingestion needs one more validation pass.',
  },
]);

export function getVettedUtilityOutageSources() {
  return VETTED_POWER_OUTAGE_SOURCES.filter(source => source.type === SOURCE_TYPES.UTILITY_OUTAGE);
}

export function getVettedPowerOutageSourcesByState(stateCode) {
  const normalizedState = String(stateCode || '').trim().toUpperCase();
  return getVettedUtilityOutageSources().filter(source => source.states.includes(normalizedState));
}

export function getProductionPowerOutageSources() {
  return getVettedUtilityOutageSources()
    .filter(source => source.platform === 'kubra-storm-center')
    .map(source => ({ ...source, enabled: true }));
}
