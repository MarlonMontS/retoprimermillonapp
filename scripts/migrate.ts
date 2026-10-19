/**
 * Aplica las migraciones de supabase/migrations en orden.
 * Requiere DATABASE_URL (Session pooler de Supabase) en .env.local o en el entorno.
 *
 *   npm run db:migrate
 */
import { config as loadEnv } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL. Cópiala de Supabase → Project Settings → Database → Connection string (Session pooler).");
    process.exit(1);
  }

  const dir = join(process.cwd(), "supabase", "migrations");
  const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(`create table if not exists public._migraciones (
      nombre text primary key,
      aplicada_at timestamptz not null default now()
    )`);
    const { rows } = await client.query<{ nombre: string }>("select nombre from public._migraciones");
    const aplicadas = new Set(rows.map((r) => r.nombre));

    for (const archivo of archivos) {
      if (aplicadas.has(archivo)) {
        console.log(`· ${archivo} (ya aplicada)`);
        continue;
      }
      const sql = readFileSync(join(dir, archivo), "utf8");
      console.log(`→ aplicando ${archivo}…`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public._migraciones (nombre) values ($1)", [archivo]);
        await client.query("commit");
        console.log(`✓ ${archivo}`);
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
    }
    console.log("Listo.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
