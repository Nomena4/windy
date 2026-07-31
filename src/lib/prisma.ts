import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  const rawUrl = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/neondb';
  let connectionString = rawUrl;

  try {
    const url = new URL(rawUrl);
    url.searchParams.delete('channel_binding');
    url.searchParams.delete('sslmode');
    connectionString = url.toString();
  } catch {
    // If URL parsing fails, fallback to rawUrl
  }

  const adapter = new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
