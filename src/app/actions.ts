'use server';

import prisma from '@/lib/prisma';
import type { CityData } from '@/components/WindyMap';

export async function getCities(): Promise<{ cities: CityData[]; error: string | null }> {
  try {
    const [villes, latestReadings] = await Promise.all([
      prisma.dim_ville.findMany({ orderBy: { nom: 'asc' } }),
      prisma.fact_qualite_air.findMany({
        orderBy: { dim_temps: { timestamp_utc: 'desc' } },
        distinct: ['id_ville'],
        include: {
          dim_temps: { select: { timestamp_utc: true } },
        },
      }),
    ]);

    const readingByVille = new Map(latestReadings.map(r => [r.id_ville, r]));

    const cities = villes.map(v => {
      const r = readingByVille.get(v.id_ville);
      return {
        id_ville:  v.id_ville,
        nom:       v.nom,
        pays:      v.pays,
        latitude:  v.latitude,
        longitude: v.longitude,
        latestReading: r
          ? {
              aqi:       r.aqi,
              co:        r.co,
              no:        r.no,
              no2:       r.no2,
              o3:        r.o3,
              so2:       r.so2,
              pm2_5:     r.pm2_5,
              pm10:      r.pm10,
              nh3:       r.nh3,
              timestamp: r.dim_temps.timestamp_utc.toISOString(),
            }
          : null,
      };
    });

    return { cities, error: null };
  } catch (err) {
    console.error('[Windy] Database unreachable in action:', err instanceof Error ? err.message : err);
    return { cities: [], error: 'Base de données inaccessible. La carte s\'affiche sans données.' };
  }
}
