export const US_STATE_REGIONS = Object.freeze([
  {
    region: 'Northeast',
    states: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  },
  {
    region: 'Midwest',
    states: ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  },
  {
    region: 'South',
    states: ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'DC', 'WV', 'AL', 'KY', 'MS', 'TN', 'AR', 'LA', 'OK', 'TX'],
  },
  {
    region: 'West',
    states: ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'],
  },
]);

export const US_STATE_NAMES = Object.freeze({
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
});

export function getAllStateCodes() {
  return US_STATE_REGIONS.flatMap(region => region.states);
}

export function getStateDisplayName(stateCode) {
  return US_STATE_NAMES[stateCode] || stateCode;
}

export function classifyStateDisruption(events = []) {
  const maxScore = events.reduce((max, event) => Math.max(max, event.disruptionScore || 0), 0);
  const activeCount = events.filter(event => event.status === 'active').length;

  if (maxScore >= 90 || activeCount >= 8) return { label: 'Severe', tone: 'red', score: maxScore };
  if (maxScore >= 70 || activeCount >= 4) return { label: 'Elevated', tone: 'amber', score: maxScore };
  if (maxScore >= 35 || activeCount > 0) return { label: 'Watch', tone: 'blue', score: maxScore };
  return { label: 'Quiet', tone: 'slate', score: 0 };
}

export function groupEventsByRegion(events = []) {
  return events.reduce((groups, event) => {
    const key = event.city || event.county || event.region || 'Unknown area';
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {});
}
