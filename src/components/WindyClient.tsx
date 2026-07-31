'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { CityData } from './WindyMap';
import { getCities } from '../app/actions';

const WindyMap = dynamic(() => import('./WindyMap'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="loading-logo-wrap">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
          <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
          <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
        </svg>
      </div>
      <p className="map-loading-text">Chargement de la carte…</p>
      <div className="loading-bar"><div className="loading-fill" /></div>
    </div>
  ),
});

interface WindyClientProps {
  cities: CityData[];
  dbError: string | null;
}

export default function WindyClient({ cities: initialCities, dbError: initialError }: WindyClientProps) {
  const [cities, setCities] = useState<CityData[]>(initialCities);
  const [dbError, setDbError] = useState<string | null>(initialError);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getCities();
        setCities(result.cities);
        setDbError(result.error);
      } catch (err) {
        console.error('Failed to poll latest cities data:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return <WindyMap cities={cities} dbError={dbError} />;
}
