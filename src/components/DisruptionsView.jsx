import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Map, Power, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { fetchDisruptiveEventsForState } from '../services/disruptiveEvents.js';
import { fetchConfiguredPowerOutages, summarizeOutageEvents } from '../services/powerOutages.js';
import { SOURCE_HEALTH_STATUSES } from '../services/sourceRegistry.js';
import { US_STATE_REGIONS, classifyStateDisruption, getStateDisplayName, groupEventsByRegion } from '../services/usDisruptionRegions.js';
import { getProductionPowerOutageSources } from '../services/vettedPowerOutageSources.js';

const DEFAULT_STATE = 'FL';

function toneClasses(tone) {
  switch (tone) {
    case 'red': return 'border-red-400/50 bg-red-500/15 text-red-100';
    case 'amber': return 'border-amber-400/50 bg-amber-500/15 text-amber-100';
    case 'blue': return 'border-sky-400/50 bg-sky-500/15 text-sky-100';
    default: return 'border-slate-500/40 bg-slate-800/60 text-slate-200';
  }
}

function healthTone(status) {
  switch (status) {
    case SOURCE_HEALTH_STATUSES.OK: return 'text-emerald-300';
    case SOURCE_HEALTH_STATUSES.STALE:
    case SOURCE_HEALTH_STATUSES.DEGRADED: return 'text-amber-300';
    case SOURCE_HEALTH_STATUSES.FAILED:
    case SOURCE_HEALTH_STATUSES.RATE_LIMITED: return 'text-red-300';
    default: return 'text-slate-400';
  }
}

function formatTime(value) {
  if (!value) return 'Time unavailable';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function DisruptionsView() {
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);
  const [stateData, setStateData] = useState({});
  const [outageData, setOutageData] = useState({ events: [], health: [] });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const selectedEvents = useMemo(() => stateData[selectedState]?.events || [], [stateData, selectedState]);
  const selectedHealth = stateData[selectedState]?.sourceHealth || [];
  const selectedClassification = classifyStateDisruption(selectedEvents);
  const groupedEvents = useMemo(() => groupEventsByRegion(selectedEvents), [selectedEvents]);
  const outageSummary = useMemo(() => summarizeOutageEvents(outageData.events), [outageData.events]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedState() {
      setLoading(true);
      const result = await fetchDisruptiveEventsForState(selectedState);
      if (!cancelled) {
        setStateData(previous => ({ ...previous, [selectedState]: result }));
        setLastRefresh(new Date().toISOString());
        setLoading(false);
      }
    }

    loadSelectedState();
    return () => { cancelled = true; };
  }, [selectedState]);

  useEffect(() => {
    let cancelled = false;

    async function loadOutages() {
      const result = await fetchConfiguredPowerOutages({ sources: getProductionPowerOutageSources() });
      if (!cancelled) setOutageData(result);
    }

    loadOutages();
    return () => { cancelled = true; };
  }, []);

  const refreshSelected = async () => {
    setLoading(true);
    const result = await fetchDisruptiveEventsForState(selectedState);
    setStateData(previous => ({ ...previous, [selectedState]: result }));
    setLastRefresh(new Date().toISOString());
    setLoading(false);
  };

  return (
    <section className="space-y-5 animate-slide-up">
      <div className="glass-panel p-5 border border-cyan-400/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">National disruption awareness</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">USA disruption map</h2>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              Live official NWS alerts populate normalized disruptive events by state. Source health and coverage gaps are shown instead of fake production data.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-400/20"
            onClick={refreshSelected}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh {selectedState}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <Map size={17} className="text-cyan-300" />
              State coverage map
            </div>
            <span className="text-xs text-neutral-500">{lastRefresh ? `Last checked ${formatTime(lastRefresh)}` : 'Loading live source'}</span>
          </div>

          <div className="space-y-4">
            {US_STATE_REGIONS.map(({ region, states }) => (
              <div key={region}>
                <div className="mb-2 text-xs uppercase tracking-[0.24em] text-neutral-500">{region}</div>
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-9">
                  {states.map(state => {
                    const events = stateData[state]?.events || [];
                    const classification = state === selectedState ? selectedClassification : classifyStateDisruption(events);
                    return (
                      <button
                        key={state}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${state === selectedState ? 'ring-2 ring-cyan-300/60 ' : ''}${toneClasses(classification.tone)}`}
                        title={`${getStateDisplayName(state)}: ${events.length ? `${events.length} event(s)` : state === selectedState && loading ? 'loading' : 'not checked this session'}`}
                        onClick={() => setSelectedState(state)}
                      >
                        <span>{state}</span>
                        <small className="block text-[10px] opacity-70">{events.length || (state === selectedState && loading ? '…' : '—')}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className={`rounded-2xl border p-4 ${toneClasses(selectedClassification.tone)}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] opacity-70">Selected state</p>
                <h3 className="text-xl font-semibold">{getStateDisplayName(selectedState)} / {selectedState}</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{selectedEvents.length}</div>
                <div className="text-xs opacity-75">normalized events</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <ShieldAlert size={16} />
              {selectedClassification.label} posture · max score {selectedClassification.score || 0}
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200">
              <CheckCircle2 size={16} className="text-emerald-300" /> Source health
            </h3>
            <div className="space-y-2">
              {selectedHealth.map(health => (
                <div key={health.sourceId} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-neutral-200">{health.sourceId}</span>
                    <span className={`text-xs uppercase tracking-wide ${healthTone(health.status)}`}>{health.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{health.message}</p>
                </div>
              ))}
              {!selectedHealth.length && <p className="text-sm text-neutral-500">No source check yet. Select or refresh a state.</p>}
            </div>
          </div>

          <div className="glass-panel p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200">
              <Power size={16} className="text-amber-300" /> Power outage awareness
            </h3>
            <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <span className="text-neutral-500">Active outage events</span>
                <strong className="block text-lg text-neutral-100">{outageSummary.activeEvents}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <span className="text-neutral-500">Affected customers</span>
                <strong className="block text-lg text-neutral-100">{outageSummary.affectedCustomers.toLocaleString()}</strong>
              </div>
            </div>
            <div className="space-y-2">
              {outageData.health.map(source => (
                <div key={source.sourceId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-neutral-200">{source.sourceId}</span>
                    <span className={`text-xs uppercase tracking-wide ${healthTone(source.status)}`}>{source.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{source.message}</p>
                </div>
              ))}
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">
                Power outage records now normalize into the same event model as weather alerts. Vetted Kubra utility summaries are live where configured; other vetted candidates stay disabled until their connector shape is validated.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
            <AlertTriangle size={16} className="text-amber-300" /> State/city drilldowns
          </h3>
          <span className="text-xs text-neutral-500">{Object.keys(groupedEvents).length} area group(s)</span>
        </div>

        {loading && <p className="text-sm text-neutral-400">Checking official sources…</p>}
        {!loading && !selectedEvents.length && (
          <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
            No active NWS disruptive events returned for {getStateDisplayName(selectedState)}. This is live source output, not mock data.
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(groupedEvents).map(([area, events]) => (
            <div key={area} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-semibold text-neutral-100">{area}</h4>
                <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">{events.length} event(s)</span>
              </div>
              <div className="space-y-3">
                {events.map(event => (
                  <article key={event.id} className="border-l-2 border-amber-300/60 pl-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
                      <Zap size={14} className="text-amber-300" /> {event.title}
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">{event.eventType} · {event.severity} · score {event.disruptionScore}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatTime(event.startTime)} → {formatTime(event.endTime)}</p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
