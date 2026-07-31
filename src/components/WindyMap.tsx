'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Search, Wind, Check, Plus, Minus, Maximize2,
  MapPin, Clock, X, ChevronRight, Layers, Activity,
  Droplets, Flame, Zap, Leaf, Circle, AlertTriangle, ShieldCheck
} from 'lucide-react';

export interface CityData {
  id_ville: number;
  nom: string;
  pays: string;
  latitude: number;
  longitude: number;
  latestReading: {
    aqi: number | null;
    co: number | null;
    no: number | null;
    no2: number | null;
    o3: number | null;
    so2: number | null;
    pm2_5: number | null;
    pm10: number | null;
    nh3: number | null;
    timestamp: string | null;
  } | null;
}

function aqiColor(aqi: number | null): string {
  if (aqi === null) return '#607080';
  if (aqi <= 50)  return '#10b981';
  if (aqi <= 100) return '#fbbf24';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#881337';
}

function aqiTextColor(aqi: number | null): string {
  if (aqi === null) return '#fff';
  if (aqi <= 100) return '#000';
  return '#fff';
}

function aqiLabel(aqi: number | null): string {
  if (aqi === null) return 'N/A';
  if (aqi <= 50)  return 'Excellent';
  if (aqi <= 100) return 'Modéré';
  if (aqi <= 150) return 'Sensible';
  if (aqi <= 200) return 'Mauvais';
  if (aqi <= 300) return 'Très Mauvais';
  return 'Dangereux';
}

function healthInsight(aqi: number | null) {
  if (aqi === null) return { text: 'Données insuffisantes.', icon: Clock };
  if (aqi <= 50) return { text: 'Air pur. Idéal pour les activités en plein air.', icon: ShieldCheck };
  if (aqi <= 100) return { text: 'Qualité acceptable. Léger risque pour les personnes sensibles.', icon: Activity };
  if (aqi <= 150) return { text: 'Les personnes sensibles devraient limiter l\'effort prolongé.', icon: AlertTriangle };
  if (aqi <= 200) return { text: 'Effets possibles sur la santé. Réduisez l\'effort en extérieur.', icon: AlertTriangle };
  return { text: 'Alerte sanitaire. Restez à l\'intérieur.', icon: AlertTriangle };
}

function pollutantPercentage(name: string, val: number | null): number {
  if (val === null) return 0;
  const limits: Record<string, number> = {
    'PM₂.₅': 50,
    'PM₁₀': 100,
    'NO₂': 50,
    'O₃': 150,
    'SO₂': 50,
    'CO': 5000,
    'NO': 100,
    'NH₃': 200
  };
  const limit = limits[name] || 100;
  return Math.min((val / limit) * 100, 100);
}

function fmt(val: number | null): string {
  if (val === null) return '—';
  return val < 10 ? val.toFixed(1) : Math.round(val).toString();
}

const LAYERS = [
  { id: 'aqi',   label: 'Qualité de l\'air', Icon: Activity,  accentColor: '#3b82f6' },
  { id: 'pm25',  label: 'PM 2.5',            Icon: Droplets,  accentColor: '#f97316' },
  { id: 'pm10',  label: 'PM 10',             Icon: Droplets,  accentColor: '#fb923c' },
  { id: 'no2',   label: 'Dioxyde d\'azote (NO₂)', Icon: Zap,  accentColor: '#a855f7' },
  { id: 'o3',    label: 'Ozone (O₃)',        Icon: Leaf,      accentColor: '#10b981' },
  { id: 'so2',   label: 'Dioxyde de soufre (SO₂)', Icon: Flame, accentColor: '#fbbf24' },
  { id: 'co',    label: 'Monoxyde de carbone (CO)', Icon: Circle, accentColor: '#94a3b8' },
];

function getLayerValue(city: CityData, layerId: string): number | null {
  const r = city.latestReading;
  if (!r) return null;
  switch (layerId) {
    case 'aqi':  return r.aqi;
    case 'pm25': return r.pm2_5;
    case 'pm10': return r.pm10;
    case 'no2':  return r.no2;
    case 'o3':   return r.o3;
    case 'so2':  return r.so2;
    case 'co':   return r.co;
    default:     return r.aqi;
  }
}

interface WindyMapProps {
  cities: CityData[];
  dbError: string | null;
}

export default function WindyMap({ cities, dbError }: WindyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [activeLayer, setActiveLayer] = useState('aqi');
  const [search, setSearch] = useState('');
  const [activeCityId, setActiveCityId] = useState<number | null>(null);
  const [showMobileLayers, setShowMobileLayers] = useState(false);

  const filteredCities = search.trim()
    ? cities.filter(c =>
        c.nom.toLowerCase().includes(search.toLowerCase()) ||
        c.pays.toLowerCase().includes(search.toLowerCase())
      )
    : cities;

  const flyToCity = useCallback((city: CityData) => {
    setSelectedCity(city);
    setActiveCityId(city.id_ville);
    setShowMobileLayers(false);
    leafletMapRef.current?.flyTo([city.latitude, city.longitude], 7, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    let destroyed = false;

    import('leaflet').then((L) => {
      if (destroyed || !mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const lats = cities.map(c => c.latitude);
      const lngs = cities.map(c => c.longitude);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      const map = L.map(mapRef.current!, {
        center: [centerLat || -18.9, centerLng || 47.5],
        zoom: 3,
        zoomControl: false,
        attributionControl: true,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      leafletMapRef.current = map;
      setReady(true);
    });

    return () => {
      destroyed = true;
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !leafletMapRef.current) return;

    import('leaflet').then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      map.eachLayer((layer: { options?: { isMarker?: boolean }; remove: () => void }) => {
        if (layer.options?.isMarker) layer.remove();
      });

      cities.forEach((city) => {
        const val = getLayerValue(city, activeLayer);
        const color = activeLayer === 'aqi' ? aqiColor(val) : aqiColor(city.latestReading?.aqi ?? null);
        const tc = aqiTextColor(val);
        const displayVal = val !== null ? Math.round(val) : '—';
        const isDangerous = val !== null && val > 150;

        const icon = L.divIcon({
          className: '',
          html: `
            <div class="map-marker ${isDangerous ? 'marker-danger' : ''}" title="${city.nom}">
              ${isDangerous ? `<div class="marker-pulse" style="border-color:${color}"></div>` : ''}
              <div class="marker-bubble" style="background:${color};color:${tc};box-shadow: 0 0 15px ${color}88;">
                <span class="marker-value">${displayVal}</span>
              </div>
              <div class="marker-name" style="color:${color}">${city.nom}</div>
            </div>
          `,
          iconSize:   [60, 72],
          iconAnchor: [30, 60],
        });

        const marker = L.marker([city.latitude, city.longitude], {
          icon,
          // @ts-expect-error custom option
          isMarker: true,
        });

        marker.on('click', () => {
          setSelectedCity(city);
          setActiveCityId(city.id_ville);
          setShowMobileLayers(false);
        });

        marker.addTo(map);
      });
    });
  }, [ready, activeLayer, cities]);

  const zoomIn = () => leafletMapRef.current?.zoomIn();
  const zoomOut = () => leafletMapRef.current?.zoomOut();
  const fitAll = () => {
    if (!leafletMapRef.current || cities.length === 0) return;
    import('leaflet').then(L => {
      const bounds = L.latLngBounds(cities.map(c => [c.latitude, c.longitude] as [number, number]));
      leafletMapRef.current.fitBounds(bounds, { padding: [60, 60] });
    });
  };

  const currentLayer = LAYERS.find(l => l.id === activeLayer) ?? LAYERS[0];
  const selectedAqi = selectedCity?.latestReading?.aqi ?? null;
  const selectedColor = aqiColor(selectedAqi);
  const insight = healthInsight(selectedAqi);
  const InsightIcon = insight.icon;

  return (
    <div className="windy-root">
      {!ready && (
        <div className="map-loading">
          <div className="loading-logo-wrap">
            <Wind size={40} strokeWidth={1.5} />
          </div>
          <p className="map-loading-text">Chargement de la carte…</p>
          <div className="loading-bar"><div className="loading-fill" /></div>
        </div>
      )}

      <div ref={mapRef} className="map-container" />
      <div className="atmospheric-glow" />

      <header className="topbar">
        <div className="search-wrap" style={{ 
          boxShadow: selectedCity ? `0 4px 20px ${selectedColor}15` : undefined,
          borderColor: selectedCity ? `${selectedColor}33` : undefined 
        }}>
          <Search size={15} strokeWidth={2} className="search-icon-svg" />
          <input
            id="city-search"
            className="search-input"
            type="text"
            placeholder="Rechercher une ville…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Rechercher une ville"
          />
        </div>

        <div className="brand" aria-label="Windy Air Quality">
          <div className="brand-icon-wrap">
            <img src="/logo.png" alt="Windy.air logo" width={28} height={28} style={{ borderRadius: 8, display: 'block' }} />
          </div>
          <span className="brand-name">Windy</span>
          <span className="brand-dot">.air</span>
        </div>

        <button
          className="layer-toggle-btn-mobile"
          onClick={() => setShowMobileLayers(!showMobileLayers)}
          aria-label="Toggle Layers"
        >
          <Layers size={18} />
        </button>
      </header>

      {dbError && (
        <div className="db-error-banner" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{dbError}</span>
        </div>
      )}

      <nav className={`right-panel ${showMobileLayers ? 'mobile-open' : ''}`} aria-label="Couches de données">
        <div className="right-panel-title">
          <Layers size={12} strokeWidth={2} />
          <span>Couches</span>
          <button className="mobile-close-layers" onClick={() => setShowMobileLayers(false)} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        {LAYERS.map(({ id, label, Icon, accentColor }) => {
          const isActive = activeLayer === id;
          return (
            <button
              key={id}
              id={`layer-${id}`}
              className={`layer-item${isActive ? ' active' : ''}`}
              onClick={() => { setActiveLayer(id); setShowMobileLayers(false); }}
              aria-pressed={isActive}
              style={isActive ? { '--layer-accent': accentColor } as React.CSSProperties : {}}
            >
              <div className="layer-item-left">
                <div
                  className="layer-icon-wrap"
                  style={{
                    background: isActive ? `${accentColor}22` : 'transparent',
                    color: isActive ? accentColor : 'rgba(255,255,255,0.4)',
                    borderColor: isActive ? `${accentColor}55` : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <Icon size={14} strokeWidth={2} />
                </div>
                <span className="layer-label">{label}</span>
              </div>
              {isActive && (
                <div className="layer-check" style={{ color: accentColor }}>
                  <Check size={13} strokeWidth={2.5} />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {selectedCity && (
        <div 
          className="city-panel" 
          role="dialog" 
          aria-label={`Détails: ${selectedCity.nom}`} 
          style={{ 
            boxShadow: `0 8px 32px ${selectedColor}22`,
            borderColor: `${selectedColor}44`
          }}
        >
          <div className="sheet-handle" />
          <div className="city-panel-header">
            <div className="city-panel-header-info">
              <h2 className="city-panel-name">{selectedCity.nom}</h2>
              <div className="city-panel-country">
                <MapPin size={11} strokeWidth={2} />
                <span>{selectedCity.pays}</span>
              </div>
            </div>
            <button
              className="panel-close"
              onClick={() => { setSelectedCity(null); setActiveCityId(null); }}
              aria-label="Fermer"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="city-panel-aqi">
            <div
              className="aqi-circle"
              style={{ borderColor: selectedColor, boxShadow: `0 0 25px ${selectedColor}66 inset, 0 0 15px ${selectedColor}33` }}
              aria-label={`AQI: ${selectedAqi ?? 'N/A'}`}
            >
              <span className="aqi-circle-value" style={{ color: selectedColor }}>
                {selectedAqi ?? '—'}
              </span>
              <span className="aqi-circle-unit">AQI</span>
            </div>
            <div className="aqi-status-block">
              <div className="aqi-status-label" style={{ color: selectedColor }}>
                {aqiLabel(selectedAqi)}
              </div>
            </div>
          </div>

          <div className="health-insight" style={{ background: `${selectedColor}15`, color: selectedColor }}>
            <InsightIcon size={16} strokeWidth={2} className="insight-icon" />
            <p>{insight.text}</p>
          </div>

          <div className="panel-pollutants" role="list" aria-label="Polluants">
            {[
              { name: 'PM₂.₅', val: selectedCity.latestReading?.pm2_5 ?? null },
              { name: 'PM₁₀',  val: selectedCity.latestReading?.pm10  ?? null },
              { name: 'NO₂',   val: selectedCity.latestReading?.no2   ?? null },
              { name: 'O₃',    val: selectedCity.latestReading?.o3    ?? null },
              { name: 'SO₂',   val: selectedCity.latestReading?.so2   ?? null },
              { name: 'CO',    val: selectedCity.latestReading?.co    ?? null },
              { name: 'NO',    val: selectedCity.latestReading?.no    ?? null },
              { name: 'NH₃',   val: selectedCity.latestReading?.nh3   ?? null },
            ].map(p => {
              const pct = pollutantPercentage(p.name, p.val);
              return (
                <div key={p.name} className="p-chip" role="listitem">
                  <div className="p-chip-header">
                    <span className="p-chip-name">{p.name}</span>
                    <span className="p-chip-value">{fmt(p.val)}</span>
                  </div>
                  <div className="p-chip-bar-bg">
                    <div 
                      className="p-chip-bar-fill" 
                      style={{ 
                        width: `${pct}%`, 
                        background: pct > 80 ? '#ef4444' : pct > 50 ? '#fbbf24' : '#10b981' 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="panel-footer">
            <div className="panel-coords">
              <MapPin size={11} strokeWidth={2} />
              <span>{selectedCity.latitude.toFixed(3)}°, {selectedCity.longitude.toFixed(3)}°</span>
            </div>
            {selectedCity.latestReading?.timestamp && (
              <div className="panel-timestamp">
                <Clock size={11} strokeWidth={2} />
                <span>
                  {new Date(selectedCity.latestReading.timestamp).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedCity && (
        <div className="aqi-legend" aria-label="Légende">
          <div className="legend-header">
            <currentLayer.Icon size={12} strokeWidth={2} />
            <span className="legend-title">{currentLayer.label}</span>
          </div>
          {[
            { color: '#10b981', label: 'Excellent',    range: '0–50' },
            { color: '#fbbf24', label: 'Modéré',       range: '51–100' },
            { color: '#f97316', label: 'Sensible',     range: '101–150' },
            { color: '#ef4444', label: 'Mauvais',      range: '151–200' },
            { color: '#a855f7', label: 'Très Mauvais', range: '201–300' },
            { color: '#881337', label: 'Dangereux',    range: '300+' },
          ].map(({ color, label, range }) => (
            <div key={label} className="legend-row">
              <div className="legend-swatch" style={{ background: color }} />
              <div className="legend-row-text">
                <span className="legend-row-label">{label}</span>
                <span className="legend-row-range">{range}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="map-controls" aria-label="Contrôles carte">
        <div className="ctrl-group">
          <button className="ctrl-btn" id="btn-zoom-in" onClick={zoomIn} aria-label="Zoom avant">
            <Plus size={16} strokeWidth={2} />
          </button>
          <button className="ctrl-btn" id="btn-zoom-out" onClick={zoomOut} aria-label="Zoom arrière">
            <Minus size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="ctrl-group">
          <button className="ctrl-btn" id="btn-fit" onClick={fitAll} aria-label="Vue globale" title="Voir toutes les villes">
            <Maximize2 size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      <nav className="bottom-bar" aria-label="Villes">
        <div className="bottom-city-strip">
          {(search ? filteredCities : cities).map(city => {
            const aqi = city.latestReading?.aqi ?? null;
            const color = aqiColor(aqi);
            const tc = aqiTextColor(aqi);
            const isActive = activeCityId === city.id_ville;
            return (
              <button
                key={city.id_ville}
                className={`city-chip${isActive ? ' active' : ''}`}
                onClick={() => flyToCity(city)}
                aria-label={`${city.nom}: AQI ${aqi ?? 'N/A'}`}
                aria-pressed={isActive}
                style={isActive ? { borderColor: `${color}66`, background: `${color}15`, color: '#fff' } : undefined}
              >
                <span
                  className="city-chip-badge"
                  style={{ background: color, color: tc }}
                >
                  {aqi ?? '?'}
                </span>
                <span className="city-chip-name">{city.nom}</span>
                {isActive && <ChevronRight size={12} strokeWidth={2} className="city-chip-arrow" style={{ color }} />}
              </button>
            );
          })}
          {search && filteredCities.length === 0 && (
            <span className="no-results">Aucune ville pour &quot;{search}&quot;</span>
          )}
        </div>
      </nav>
    </div>
  );
}
