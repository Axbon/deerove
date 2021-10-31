import { join } from "./deps.ts";
import { messages } from "./messages.ts";
import {
  applyMigrations,
  getMigrationFiles,
  getMigrationsToApply,
  revertMigrations,
} from "./migrations.ts";
import {
  migrationTemplate,
  sqlCreateMigrationsTable,
  sqlGetLastMigration,
  sqlGetMigrations,
} from "./templates.ts";
import { CmdFN, CreateProps, CmdProps } from "./types.ts";

export const create: CmdFN<CreateProps, string> = async ({
  migrationDir,
  migrationName,
}) => {
  if (!migrationName) {
    throw new Error(
      "Missing filename argument for create. Ex: create(<name-of-migration>)"
    );
  }
  if (/\s/g.test(migrationName)) {
    throw new Error(`Name of migration can't include spaces/whitespace.`);
  }
  if (migrationName.length >= 255) {
    throw new Error(`Name of migration is absurdly long. Try a shorter one :)`);
  }
  const ts = new Date().getTime();
  const file = `${ts}-${migrationName}.sql`;
  const encoder = new TextEncoder();
  const data = encoder.encode(migrationTemplate);
  await Deno.writeFile(join(migrationDir, file), data);
  messages.created(file);
  return file;
};

export const migrate: CmdFN<CmdProps, string[]> = async ({
  client,
  to,
  migrationDir,
}) => {
  await client.queryObject(sqlCreateMigrationsTable);
  const { rows } = await client.queryObject<{ version: string }>(
    sqlGetMigrations
  );
  const files = getMigrationFiles(migrationDir);
  const target = to ?? files[files.length - 1];
  const indexOfTarget = files.indexOf(target);
  const doesNotExist = indexOfTarget === -1;
  if (doesNotExist) {
    throw new Error(`The following migration was not found: ${target}`);
  }
  const migrationsToApply = getMigrationsToApply(
    files.slice(0, indexOfTarget + 1),
    rows
  );
  const migrations = await applyMigrations(
    client,
    migrationDir,
    migrationsToApply
  );
  await client.end();
  return migrations;
};

export const revert: CmdFN<CmdProps, string[]> = async ({
  client,
  to,
  migrationDir,
}) => {
  await client.queryObject(sqlCreateMigrationsTable);
  const { rows } = await client.queryObject<{
    version: string;
    migration_time: string;
  }>(sqlGetLastMigration);
  const [row] = rows;

  if (!row) {
    messages.noneToRevert(
      "unknown hosts, get via api? not provided by deno pg"
    );
    await client.end();
    return [];
  }

  const files = getMigrationFiles(migrationDir);
  const rev = to ?? row.version;
  const indexOfLast = files.indexOf(row.version);
  const indexOfTarget = files.indexOf(rev);
  const doesNotExist = indexOfTarget === -1;

  if (doesNotExist) {
    throw new Error(
      `Trying to revert to a migration that does not exist: ${rev}`
    );
  }

  //Migrations are run in reverse order
  const migrationsToRevert = files
    .slice(indexOfTarget, indexOfLast + 1)
    .reverse();

  const reverted = await revertMigrations(
    client,
    migrationDir,
    migrationsToRevert
  );
  await client.end();
  return reverted;
};
