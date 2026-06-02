import {
  LayoutDashboard, Map, Calendar, AlertTriangle, Wind, Camera,
  Satellite, BarChart3, Snowflake, History, Radio,
  LineChart, Building2, CloudLightning, Layers, Siren
} from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'disruptions', label: 'Disruptions', icon: Siren },
  { id: 'radar', label: 'Radar', icon: Map },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'models', label: 'Models', icon: BarChart3 },
  { id: 'surface', label: 'Surface', icon: Layers },
  { id: 'tropical', label: 'Tropical', icon: CloudLightning },
  { id: 'forecast', label: '10-Day', icon: Calendar },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'airquality', label: 'Air', icon: Wind },
  { id: 'pws', label: 'PWS', icon: Radio },
  { id: 'meteograms', label: 'Meteograms', icon: LineChart },
  { id: 'nws', label: 'NWS', icon: Building2 },
  { id: 'snow', label: 'Snow', icon: Snowflake },
  { id: 'historical', label: 'History', icon: History },
  { id: 'cameras', label: 'Cameras', icon: Camera },
];

export default function Navigation({ activeTab, onTabChange, alertCount = 0 }) {
  return (
    <nav className="sticky top-[92px] z-40 eoc-command-nav">
      <div className="eoc-nav-frame">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`eoc-nav-tab
                ${isActive
                  ? 'eoc-nav-tab-active'
                  : ''}`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'alerts' && alertCount > 0 && (
                <span className="eoc-nav-count animate-pulse-glow">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
