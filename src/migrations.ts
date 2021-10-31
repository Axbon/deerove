import { getMigrationTableName } from "./templates.ts";
import { messages } from "./messages.ts";
import { MigrationVersion } from "./types.ts";
import { Client } from "./deps.ts";
import { walkSync } from "./deps.ts";
import { extname, join } from "./deps.ts";

export const getMigrationsToApply = (
  files: string[],
  rows: MigrationVersion[]
) => {
  const migrationsToApply = files.filter((version) => {
    return rows.every((r) => r.version !== version);
  });
  return migrationsToApply;
};

export const getMigrationFiles = (migrationDir: string) => {
  const files = [];
  for (const entry of walkSync(migrationDir)) {
    if (entry.isFile) {
      const [ts] = entry.name.split("-");
      if (extname(entry.name) !== ".sql") {
        throw new Error(
          `Migration file is not a .sql file or does not have a .sql extension: ${entry.name}`
        );
      }
      if (!/^\d+\.?\d+$/.test(ts)) {
        throw new Error(
          `Migration file does not use a valid pattern including timestamp: ${entry.name}`
        );
      }
      files.push(entry.name);
    }
  }

  //Always sort according to timestamps
  return files.sort((a, b) => {
    const [tsa] = a.split("-");
    const [tsb] = b.split("-");
    return parseInt(tsa, 10) - parseInt(tsb, 10);
  });
};

export const getMigrationQuery = (dir: string, file: string) => {
  const sql = Deno.readTextFileSync(join(dir, file));
  const hasMigrationEntries =
    /-- migrate:up/g.test(sql) && /-- migrate:down/g.test(sql);

  if (!hasMigrationEntries) {
    throw new Error(
      `[MIGRATION] ${file} is missing -- migrate:up or -- migrate:down blocks`
    );
  }
  const [, upSQL, downSQL] = sql.split(/-- migrate:up|-- migrate:down/g);
  return { upSQL, downSQL };
};

export const applyMigrations = async (
  client: Client,
  dir: string,
  migrationsToApply: string[]
) => {
  //Run everything in a transaction so we can rollback
  await client.queryObject("BEGIN");
  try {
    for (const migration of migrationsToApply) {
      const { upSQL } = getMigrationQuery(dir, migration);
      await client.queryObject(upSQL);
      await client.queryObject({
        /* Important to use statement_timestamp() and not current_timestamp, 
				otherwise the entire transaction share the same timestamp */
        text: `INSERT INTO ${getMigrationTableName()}(version, migration_time) VALUES($1, statement_timestamp())`,
        args: [migration],
      });
    }

    await client.queryObject("COMMIT");
    messages.applying(migrationsToApply);
    return migrationsToApply;
  } catch (e) {
    messages.rollback(e.message);
    await client.queryObject("ROLLBACK");
  }
  return [];
};

export const revertMigrations = async (
  client: Client,
  dir: string,
  migrationsToRevert: string[]
) => {
  await client.queryObject("BEGIN");
  try {
    for (const migration of migrationsToRevert) {
      const { downSQL } = getMigrationQuery(dir, migration);
      await client.queryObject(downSQL);
      await client.queryObject({
        text: `DELETE FROM ${getMigrationTableName()} WHERE version = $1`,
        args: [migration],
      });
    }
    await client.queryObject("COMMIT");
    messages.reverting(migrationsToRevert);
    return migrationsToRevert;
  } catch (e) {
    messages.rollback(e.message);
    await client.queryObject("ROLLBACK");
  }
  return [];
};
