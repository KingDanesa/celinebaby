import "server-only";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

// One pool per process; survives hot reloads in development.
const g = globalThis as unknown as { __cbSql?: Sql };

export function dbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

export function db(): Sql {
  if (g.__cbSql) return g.__cbSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  g.__cbSql = postgres(url, { max: 10, idle_timeout: 30, connect_timeout: 10, onnotice: () => {} });
  return g.__cbSql;
}
