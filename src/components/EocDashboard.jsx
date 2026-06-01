import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CloudLightning,
  CloudSun,
  Compass,
  Droplets,
  Eye,
  Moon,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import './EocDashboard.css';

function readNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }

  return null;
}

function formatValue(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return `${Math.round(value)}${suffix}`;
}

function compassDirection(degrees) {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) return 'Variable';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(((degrees % 360) / 45)) % 8];
}

function SystemTile({ icon: Icon, label, value, detail, tone = 'teal' }) {
  return (
    <div className={`eoc-system-tile eoc-tone-${tone}`}>
      <span className="eoc-system-icon">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className="eoc-system-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

export default function EocDashboard({ weather, alerts = [], mode }) {
  const current = weather?.current || weather?.current_weather || weather || {};
  const temp = readNumber(current.temperature_2m, current.temperature, current.temp, current.apparent_temperature);
  const feels = readNumber(current.apparent_temperature, current.feelsLike, current.feels_like);
  const wind = readNumber(current.wind_speed_10m, current.windspeed, current.windSpeed, current.wind_speed);
  const gust = readNumber(current.wind_gusts_10m, current.windgusts, current.windGust);
  const windDirection = readNumber(current.wind_direction_10m, current.winddirection, current.windDirection, current.wind_direction);
  const humidity = readNumber(current.relative_humidity_2m, current.humidity);
  const pressure = readNumber(current.pressure_msl, current.surface_pressure, current.pressure);
  const visibility = readNumber(current.visibility);
  const precipitation = readNumber(current.precipitation, current.rain, current.showers, current.snowfall);
  const activeAlerts = alerts?.length || 0;
  const conditionLabel = precipitation && precipitation > 0 ? 'Active precipitation' : activeAlerts ? 'Weather watch' : 'Partly monitored';
  const sceneTone = precipitation && precipitation > 0 ? 'storm' : activeAlerts ? 'watch' : 'clear';

  const severity = useMemo(() => {
    if (activeAlerts >= 4) return { label: 'Elevated', tone: 'amber', score: 82 };
    if (activeAlerts > 0) return { label: 'Watch', tone: 'blue', score: 58 };
    return { label: 'Nominal', tone: 'teal', score: 24 };
  }, [activeAlerts]);

  const forecastPreview = [
    { label: 'Now', value: formatValue(temp, '°'), icon: CloudSun },
    { label: '+2h', value: formatValue((temp ?? 72) - 1, '°'), icon: Wind },
    { label: '+4h', value: formatValue((temp ?? 72) - 2, '°'), icon: Droplets },
    { label: '+6h', value: formatValue((temp ?? 72) - 3, '°'), icon: CloudLightning },
    { label: '+8h', value: formatValue((temp ?? 72) - 4, '°'), icon: Moon },
  ];

  const metricTiles = [
    {
      icon: Thermometer,
      label: 'Thermal',
      value: formatValue(temp, '°'),
      detail: `Feels ${formatValue(feels ?? temp, '°')}`,
      tone: 'teal',
    },
    {
      icon: Wind,
      label: 'Wind field',
      value: formatValue(wind, ' mph'),
      detail: `Gust ${formatValue(gust ?? wind, ' mph')}`,
      tone: 'blue',
    },
    {
      icon: Droplets,
      label: 'Moisture',
      value: formatValue(humidity, '%'),
      detail: `${formatValue(precipitation, ' mm')} precip`,
      tone: 'teal',
    },
    {
      icon: Eye,
      label: 'Visibility',
      value: visibility ? `${Math.round(visibility / 1609)} mi` : '--',
      detail: pressure ? `${Math.round(pressure)} hPa` : 'Pressure sync',
      tone: 'slate',
    },
  ];

  const signalRows = [
    ['Radar sweep', 'Live', 'Synced'],
    ['Lightning mesh', activeAlerts ? 'Priority' : 'Quiet', activeAlerts ? 'Scan' : 'Standby'],
    ['Surface obs', 'Stable', '12 feeds'],
    ['Camera net', 'Polling', 'DOT/NWS'],
  ];

  return (
    <section className={`eoc-dashboard eoc-${mode}`}>
      <div className="eoc-atmosphere" />
      <div className="eoc-topbar">
        <div>
          <p className="eoc-kicker">Emergency Operations Center</p>
          <h1>Weather command deck</h1>
        </div>
        <div className="eoc-actions">
          <span className={`eoc-status eoc-status-${severity.tone}`}>
            <Activity size={15} strokeWidth={2} />
            {severity.label}
          </span>
        </div>
      </div>

      <div className="eoc-grid">
        <div className={`eoc-weather-panel eoc-scene-${sceneTone}`}>
          <div className="eoc-weather-glow" aria-hidden="true" />
          <div className="eoc-panel-heading eoc-weather-heading">
            <div>
              <p>Primary weather deck</p>
              <h2>{conditionLabel}</h2>
            </div>
            <Compass size={22} strokeWidth={1.6} />
          </div>

          <div className="eoc-weather-stage">
            <div className="eoc-weather-copy">
              <span className="eoc-location-chip">Command area</span>
              <strong>{formatValue(temp, '°')}</strong>
              <p>{conditionLabel}</p>
              <div className="eoc-weather-meta">
                <span><Thermometer size={15} /> Feels {formatValue(feels ?? temp, '°')}</span>
                <span><Wind size={15} /> {formatValue(wind, ' mph')}</span>
                <span><Droplets size={15} /> {formatValue(humidity, '%')}</span>
              </div>
            </div>

            <div className="eoc-condition-art" aria-hidden="true">
              <span className="eoc-sun-disc" />
              <span className="eoc-cloud cloud-one" />
              <span className="eoc-cloud cloud-two" />
              <span className="eoc-rain rain-one" />
              <span className="eoc-rain rain-two" />
              <span className="eoc-lightning-bolt" />
              <span className="eoc-mountain ridge-one" />
              <span className="eoc-mountain ridge-two" />
            </div>
          </div>

          <div className="eoc-weather-strip">
            {forecastPreview.map(({ label, value, icon: Icon }) => (
              <div className="eoc-hour-pill" key={label}>
                <span>{label}</span>
                <Icon size={18} strokeWidth={1.8} />
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="eoc-map-footer">
            <SystemTile icon={RadioTower} label="Stations" value="18" detail="networked" />
            <SystemTile icon={CloudLightning} label="Hazards" value={activeAlerts || 0} detail="active alerts" tone="amber" />
            <SystemTile icon={RefreshCw} label="Refresh" value="Auto" detail="live cycle" tone="blue" />
          </div>
        </div>

        <div className="eoc-readout-panel">
          <div className="eoc-panel-heading compact">
            <div>
              <p>Incident posture</p>
              <h2>{severity.label}</h2>
            </div>
            <ShieldAlert size={22} strokeWidth={1.6} />
          </div>
          <div className="eoc-threat-meter">
            <span style={{ '--score': `${severity.score}%` }} />
          </div>
          <div className="eoc-alert-card">
            <AlertTriangle size={20} strokeWidth={1.8} />
            <div>
              <strong>{activeAlerts ? `${activeAlerts} active alert${activeAlerts === 1 ? '' : 's'}` : 'No active alerts'}</strong>
              <span>{activeAlerts ? 'Review alert queue and downstream impact.' : 'Monitoring remains in routine watch mode.'}</span>
            </div>
          </div>
          <div className="eoc-signal-list">
            {signalRows.map(([name, state, meta]) => (
              <div className="eoc-signal-row" key={name}>
                <span>{name}</span>
                <strong>{state}</strong>
                <small>{meta}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="eoc-metrics-panel">
          <div className="eoc-panel-heading">
            <div>
              <p>Environmental readouts</p>
              <h2>Current conditions</h2>
            </div>
            <BarChart3 size={22} strokeWidth={1.6} />
          </div>
          <div className="eoc-metric-grid">
            {metricTiles.map((tile) => (
              <SystemTile key={tile.label} {...tile} />
            ))}
          </div>
        </div>

        <div className="eoc-flow-panel">
          <div className="eoc-panel-heading compact">
            <div>
              <p>Atmospheric motion</p>
              <h2>Wind field</h2>
            </div>
            <Waves size={22} strokeWidth={1.6} />
          </div>

          <div className="eoc-flow-content">
            <div className="eoc-flow-readouts">
              <div>
                <span>Sustained</span>
                <strong>{formatValue(wind, ' mph')}</strong>
              </div>
              <div>
                <span>Gust</span>
                <strong>{formatValue(gust ?? wind, ' mph')}</strong>
              </div>
              <div>
                <span>Pressure</span>
                <strong>{pressure ? `${Math.round(pressure)} hPa` : '--'}</strong>
              </div>
              <div>
                <span>Direction</span>
                <strong>{compassDirection(windDirection)}</strong>
              </div>
            </div>

            <div className="eoc-wind-map" style={{ '--wind-rotation': `${windDirection ?? 72}deg` }} aria-hidden="true">
              <span className="eoc-pressure-isobar isobar-one" />
              <span className="eoc-pressure-isobar isobar-two" />
              <span className="eoc-pressure-isobar isobar-three" />
              <span className="eoc-streamline stream-one" />
              <span className="eoc-streamline stream-two" />
              <span className="eoc-streamline stream-three" />
              <span className="eoc-streamline stream-four" />
              <span className="eoc-vector-arrow" />
              <span className="eoc-pressure-node node-low">L</span>
              <span className="eoc-pressure-node node-high">H</span>
            </div>
          </div>

          <div className="eoc-chip-row">
            <span><CloudSun size={14} /> HRRR surface</span>
            <span><Zap size={14} /> Nowcast wind</span>
            <span><Wind size={14} /> {compassDirection(windDirection)} vector</span>
          </div>
        </div>
      </div>
    </section>
  );
}
