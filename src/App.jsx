import { useState } from 'react';
import { useLocation } from './hooks/useLocation';
import { useWeather } from './hooks/useWeather';
import Header from './components/Header';
import Navigation from './components/Navigation';
import EocDashboard from './components/EocDashboard';
import RadarMap from './components/RadarMap';
import DailyForecast from './components/DailyForecast';
import AlertsPanel from './components/AlertsPanel';
import AirQuality from './components/AirQuality';
import Cameras from './components/Cameras';
import SatelliteView from './components/SatelliteView';
import DisruptionsView from './components/DisruptionsView';

import ModelsView from './components/ModelsView';
import SurfaceAnalysis from './components/SurfaceAnalysis';
import SnowReport from './components/SnowReport';
import HistoricalWeather from './components/HistoricalWeather';
import PWSNetwork from './components/PWSNetwork';
import Meteograms from './components/Meteograms';
import NWSDiscussion from './components/NWSDiscussion';

import TropicalTracker from './components/TropicalTracker';
import LoadingSpinner from './components/LoadingSpinner';
import { AlertTriangle } from 'lucide-react';
import './components/LightModeFixes.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [themeMode, setThemeMode] = useState('dark');
  const {
    location, loading: locLoading, savedLocations,
    setActiveLocation, detectLocation, saveLocation, removeLocation,
  } = useLocation();

  const {
    weather, airQuality, alerts, loading: weatherLoading,
    error, lastUpdate, refresh,
  } = useWeather(location);

  const isLoading = locLoading || weatherLoading;

  return (
    <div className={`min-h-screen weather-gradient ${themeMode === 'dark' ? 'eoc-shell-dark' : 'eoc-shell-light'}`}>
      <Header
        location={location}
        savedLocations={savedLocations}
        onSelectLocation={setActiveLocation}
        onDetectLocation={detectLocation}
        onSaveLocation={saveLocation}
        onRemoveLocation={removeLocation}
        onRefresh={refresh}
        lastUpdate={lastUpdate}
        mode={themeMode}
        onModeChange={setThemeMode}
      />

      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertCount={alerts.length}
      />

      <main className="max-w-7xl mx-auto px-4 py-4 pb-8">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
        )}

        {isLoading && !weather ? (
          <LoadingSpinner />
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && weather && (
              <EocDashboard
                weather={weather}
                alerts={alerts}
                mode={themeMode}
              />
            )}
            {activeTab === 'disruptions' && <DisruptionsView />}
            {activeTab === 'radar' && <RadarMap location={location} />}
            {activeTab === 'satellite' && <SatelliteView />}

            {activeTab === 'models' && <ModelsView location={location} />}
            {activeTab === 'surface' && <SurfaceAnalysis />}

            {activeTab === 'tropical' && <TropicalTracker />}
            {activeTab === 'forecast' && weather && <DailyForecast weather={weather} />}
            {activeTab === 'alerts' && <AlertsPanel alerts={alerts} />}
            {activeTab === 'airquality' && <AirQuality airQuality={airQuality} weather={weather} />}
            {activeTab === 'pws' && <PWSNetwork location={location} />}
            {activeTab === 'meteograms' && <Meteograms location={location} />}
            {activeTab === 'nws' && <NWSDiscussion location={location} />}
            {activeTab === 'snow' && <SnowReport />}
            {activeTab === 'historical' && <HistoricalWeather location={location} />}
            {activeTab === 'cameras' && <Cameras location={location} />}
          </div>
        )}
      </main>
    </div>
  );
}
