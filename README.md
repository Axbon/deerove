### deerove - Rove for deno

This is the tiny, simple migration tool for **Postgres**, ported to **Deno**!
The original node version can be found here: https://github.com/Axbon/rove

The deno version has been further simplified. It no longer comes with any cli
or implementation that reads .env files. Instead it exposes the following apis:

```typescript
import { create, migrate, revert } from "<deerove-url>/mod.ts";
```

Rove creates single .sql files in a directory of your choice - _"migrations"_ by
default. These are timestamped. Within each .sql file there is an --up and --down
block where you can write your up/down sql code.

### Example implementation of cli

By using these three apis you can create a simple cli tool to run migrations
in your projects.

```typescript
import { Client } from "https://deno.land/x/postgres/mod.ts";
import { join, resolve } from "https://deno.land/std@0.110.0/path/mod.ts";
import { migrate, create, revert } from "<deerove-path>/mod.ts";

const migrationDir = join(resolve("."), "migrations");

const client = new Client({
  user: "postgresuser",
  database: "postgresdb",
  hostname: "postgreshost",
  port: 5432,
});

const run = async (args: string[]) => {
  const [command, migrationName, to] = args;
  await client.connect();

  const roveArgs = {
    client,
    migrationDir,
    to,
  };

  switch (command) {
    case "create": {
      await create({ migrationDir, migrationName });
      break;
    }
    case "migrate": {
      await migrate(roveArgs);
      break;
    }
    case "revert": {
      await revert(roveArgs);
      break;
    }
    default: {
      console.log("Missing/Unknown command");
    }
  }
};

run(Deno.args);

```

Rove automatically calls `client.end` when finished.

Rove needs access to filesystem for writing .sql files, network
for connecting to postgres. Unfortunately it also requires `unstable`
because the current postgres implementation in deno relies on `unstable`
because of tls.

Usage:

```
deno run --unstable --allow-write --allow-read --allow-net yourfile.ts
```

By default a table called `migrations` will be created in your db. This table
contains and tracks the migrations applied to the db.