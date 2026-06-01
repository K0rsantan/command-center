import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X, Bookmark, BookmarkCheck, RefreshCw, Navigation } from 'lucide-react';
import { searchLocations } from '../services/geocodingApi';
import './Header.css';

export default function Header({
  location, savedLocations, onSelectLocation, onDetectLocation,
  onSaveLocation, onRemoveLocation, onRefresh, lastUpdate,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const savedRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      const r = await searchLocations(query);
      setResults(r);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowResults(false);
      }
      if (savedRef.current && !savedRef.current.contains(e.target)) {
        setShowSaved(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectLocation = (loc) => {
    onSelectLocation(loc);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const isSaved = location && savedLocations.some(
    s => s.latitude === location.latitude && s.longitude === location.longitude
  );

  return (
    <header className="sticky top-0 z-50 eoc-command-header px-4 py-3">
      <div className="max-w-7xl mx-auto eoc-header-frame">
        <div className="eoc-brand-block">
          <div className="eoc-brand-mark">
            <span>EOC</span>
          </div>
          <div className="eoc-brand-copy">
            <h1>EOC</h1>
            <p>Emergency Operation Center</p>
          </div>
        </div>

        <div className="relative eoc-header-search" ref={dropdownRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 eoc-search-icon" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length) setShowResults(true); }}
              placeholder="Search city or state..."
              className="eoc-search-input"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 eoc-icon-button compact">
                <X size={14} />
              </button>
            )}
          </div>

          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 eoc-header-menu py-1 shadow-xl max-h-64 overflow-y-auto z-50">
              {results.map((r) => (
                <button key={r.id} onClick={() => selectLocation(r)}
                  className="w-full text-left px-3 py-2.5 eoc-menu-row flex items-center gap-2 transition-colors">
                  <MapPin size={14} className="shrink-0" />
                  <div>
                    <div className="text-sm">{r.name}</div>
                    <div className="text-xs">{r.admin1}{r.country ? `, ${r.country}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="eoc-header-actions">
          <button onClick={onDetectLocation} title="Detect location"
            className="eoc-icon-button">
            <Navigation size={16} />
          </button>

          {location && (
            <button onClick={() => isSaved
              ? onRemoveLocation(savedLocations.find(s => s.latitude === location.latitude)?.id)
              : onSaveLocation(location)
            } title={isSaved ? 'Remove bookmark' : 'Bookmark location'}
              className="eoc-icon-button">
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          )}

          <div className="relative" ref={savedRef}>
            <button onClick={() => setShowSaved(!showSaved)} title="Saved locations"
              className="eoc-icon-button">
              <MapPin size={16} />
              {savedLocations.length > 0 && (
                <span className="eoc-action-count">{savedLocations.length}</span>
              )}
            </button>
            {showSaved && savedLocations.length > 0 && (
              <div className="absolute top-full right-0 mt-2 eoc-header-menu py-1 shadow-xl w-56 z-50">
                <div className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider">Saved Locations</div>
                {savedLocations.map(s => (
                  <div key={s.id}
                    className="w-full text-left px-3 py-2 eoc-menu-row flex items-center justify-between transition-colors cursor-pointer"
                    onClick={() => { onSelectLocation(s); setShowSaved(false); }}>
                    <span className="text-sm">{s.label || s.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveLocation(s.id); }}
                      className="eoc-menu-remove p-0.5"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={onRefresh} title="Refresh data"
            className="eoc-icon-button">
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="eoc-header-meta">
          {location && (
            <>
              <MapPin size={11} />
              <span>{location.label || location.name}</span>
              {lastUpdate && (
                <>
                  <span className="eoc-meta-divider">|</span>
                  <span>Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
