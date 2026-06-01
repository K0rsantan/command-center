import { useState } from 'react';
import { CloudLightning, Globe, Satellite as SatIcon, ExternalLink, RefreshCw } from 'lucide-react';

const BASINS = [
  { id: 'atl', label: 'Atlantic', nhcId: 'atl' },
  { id: 'epac', label: 'E. Pacific', nhcId: 'pac' },
  { id: 'cpac', label: 'C. Pacific', nhcId: 'cpac' },
];

const NHC_PRODUCTS = {
  outlook_7d: { label: '7-Day Outlook', getUrl: (basin) => `https://www.nhc.noaa.gov/xgtwo/two_${basin}_7d0.png` },
  outlook_2d: { label: '2-Day Outlook', getUrl: (basin) => `https://www.nhc.noaa.gov/xgtwo/two_${basin}_2d0.png` },
};

const GOES_SECTORS = {
  taw: { label: 'Tropical Atlantic (Wide)', sat: 'GOES16' },
  gm: { label: 'Gulf of Mexico', sat: 'GOES16' },
  car: { label: 'Caribbean', sat: 'GOES16' },
  eus: { label: 'East US', sat: 'GOES16' },
  tpw: { label: 'Tropical Pacific (Wide)', sat: 'GOES18' },
};

const GOES_SECTOR_KEYS = Object.keys(GOES_SECTORS);

export default function TropicalTracker() {
  const [basin, setBasin] = useState('atl');
  const [outlookType, setOutlookType] = useState('outlook_7d');
  const [goesSector, setGoesSector] = useState('taw');
  const [imgKey, setImgKey] = useState(0);

  const nhcBasinId = BASINS.find(b => b.id === basin)?.nhcId || 'atl';
  const outlookUrl = NHC_PRODUCTS[outlookType]?.getUrl(nhcBasinId);

  const sectorInfo = GOES_SECTORS[goesSector];
  const goesUrl = `https://cdn.star.nesdis.noaa.gov/${sectorInfo.sat}/ABI/SECTOR/${goesSector}/GEOCOLOR/latest.jpg`;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <CloudLightning size={20} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">Tropical Tracker</h3>
          <p className="text-sm text-neutral-500">
            NHC tropical outlooks + GOES satellite imagery for tropical basins
          </p>
        </div>
      </div>

      {/* Basin selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Globe size={13} className="text-neutral-500" />
        {BASINS.map(b => (
          <button key={b.id} onClick={() => setBasin(b.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${basin === b.id
                ? 'bg-red-500/25 text-red-300 border border-red-500/50'
                : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40 hover:text-neutral-200'}`}>
            {b.label}
          </button>
        ))}
        <button onClick={() => setImgKey(k => k + 1)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800/60 text-neutral-400 border border-neutral-700/40 hover:text-neutral-200 transition-all ml-auto flex items-center gap-1">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* Tropical Outlook selector */}
      <div className="flex items-center gap-1.5">
        {Object.entries(NHC_PRODUCTS).map(([key, val]) => (
          <button key={key} onClick={() => setOutlookType(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${outlookType === key
                ? 'bg-orange-500/25 text-orange-300 border border-orange-500/50'
                : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40 hover:text-neutral-200'}`}>
            {val.label}
          </button>
        ))}
      </div>

      {/* NHC Tropical Outlook Image */}
      <div className="glass-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-700/30 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-300">
            NHC {NHC_PRODUCTS[outlookType]?.label} -- {BASINS.find(b => b.id === basin)?.label}
          </span>
          <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noopener noreferrer"
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
            <ExternalLink size={11} /> NHC
          </a>
        </div>
        <div className="relative bg-neutral-900">
          <img
            key={`outlook-${imgKey}`}
            src={`${outlookUrl}?v=${imgKey}`}
            alt={`NHC ${NHC_PRODUCTS[outlookType]?.label} - ${BASINS.find(b => b.id === basin)?.label}`}
            className="w-full h-auto"
            onError={(e) => { e.target.style.opacity = '0.3'; e.target.alt = 'Image unavailable'; }}
          />
        </div>
      </div>

      {/* GOES Satellite imagery */}
      <div className="glass-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-700/30 flex items-center gap-2">
          <SatIcon size={14} className="text-cyan-400" />
          <span className="text-sm font-medium text-neutral-300">GOES Tropical Satellite -- GeoColor</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 border-b border-neutral-700/20">
          {GOES_SECTOR_KEYS.map(s => (
            <button key={s} onClick={() => setGoesSector(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${goesSector === s
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                  : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40 hover:text-neutral-200'}`}>
              {GOES_SECTORS[s].label}
            </button>
          ))}
        </div>
        <div className="relative bg-neutral-900">
          <img
            key={`goes-${goesSector}-${imgKey}`}
            src={`${goesUrl}?v=${imgKey}`}
            alt={`GOES Satellite - ${GOES_SECTORS[goesSector]?.label}`}
            className="w-full h-auto"
            onError={(e) => { e.target.style.opacity = '0.3'; e.target.alt = 'Satellite image unavailable'; }}
          />
        </div>
      </div>

      {/* Link to Tropical Tidbits for detailed tracking */}
      <a href="https://www.tropicaltidbits.com/storminfo/" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-all text-sm font-medium">
        <ExternalLink size={16} />
        View Active Tropical Systems on Tropical Tidbits
      </a>

      <p className="text-[11px] text-neutral-600 text-center">
        Tropical data from NOAA National Hurricane Center + GOES satellite imagery
      </p>
    </div>
  );
}
