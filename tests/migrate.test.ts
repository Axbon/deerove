import { assertEquals, assertArrayIncludes } from "../src/deps.ts";
import { migrate } from "../src/apis.ts";
import { getBrokenMockClient, denoMockClient } from "./mockClient.ts";

Deno.test("migrate 1 test migration", async () => {
  const client = denoMockClient();
  const migrations = await migrate({
    migrationDir: "tests/migrations",
    client,
    to: "1616845690588-newtest.sql",
  });

  assertEquals(client.queryObject.calls.length, 6);
  assertEquals(client.end.calls.length, 1);

  const commitArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "COMMIT")
  );

  assertEquals(commitArg, true);
  assertArrayIncludes(migrations, ["1616845690588-newtest.sql"]);
});

Deno.test("migrate all from current state", async () => {
  const client = denoMockClient([{ version: "1616845690588-newtest.sql" }]);
  const migrations = await migrate({
    migrationDir: "tests/migrations",
    client,
  });
  assertArrayIncludes(migrations, ["1616847385068-secondtest.sql"]);
  assertEquals(client.queryObject.calls.length, 6);
  assertEquals(client.end.calls.length, 1);

  const commitArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "COMMIT")
  );

  assertEquals(commitArg, true);
});

Deno.test("migrate all test migrations", async () => {
  const client = denoMockClient();
  const migrations = await migrate({
    migrationDir: "tests/migrations",
    client,
  });
  assertEquals(client.queryObject.calls.length, 8);
  assertEquals(client.end.calls.length, 1);
  assertArrayIncludes(migrations, [
    "1616845690588-newtest.sql",
    "1616847385068-secondtest.sql",
  ]);
  const commitArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "COMMIT")
  );
  assertEquals(commitArg, true);
});

Deno.test("migration query fails - uses rollback", async () => {
  const client = getBrokenMockClient({
    rows: [],
    failQuery:
      "INSERT INTO migrations(version, migration_time) VALUES($1, statement_timestamp())",
  });
  const migrations = await migrate({
    migrationDir: "tests/migrations",
    client,
  });
  assertArrayIncludes(migrations, []);
  assertEquals(client.queryObject.calls.length, 6);
  assertEquals(client.end.calls.length, 1);
  const commitArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "COMMIT")
  );
  const rollbackArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "ROLLBACK")
  );
  assertEquals(commitArg, false);
  assertEquals(rollbackArg, true);
});
