import prisma from '@/lib/prisma';
import WindyClient from '@/components/WindyClient';
import type { CityData } from '@/components/WindyMap';

export const dynamic = 'force-dynamic';

import { getCities } from './actions';

export default async function Home() {
  const { cities, error } = await getCities();

  return <WindyClient cities={cities} dbError={error} />;
}
