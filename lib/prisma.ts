import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

const createPgPool = () => {
  const rejectUnauthorized =
    process.env.PG_SSL_REJECT_UNAUTHORIZED !== "false" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0";

  const connectionString = (() => {
    const raw = process.env.DATABASE_URL;
    if (!raw) return raw;
    if (rejectUnauthorized) return raw;
    // pg parses sslmode from the URL; with recent versions sslmode=require is treated as verify-full.
    // When we explicitly disable certificate verification, remove sslmode to avoid it overriding our ssl option.
    try {
      const url = new URL(raw);
      url.searchParams.delete("sslmode");
      url.searchParams.delete("ssl");
      return url.toString();
    } catch {
      return raw;
    }
  })();

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized },
  });
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(
      globalForPrisma.pgPool ??
        createPgPool(),
    ),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = globalForPrisma.pgPool ?? createPgPool();
}
