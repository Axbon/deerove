import { assertEquals, assertArrayIncludes } from "../src/deps.ts";
import { revert } from "../src/apis.ts";
import { getBrokenMockClient, denoMockClient } from "./mockClient.ts";

Deno.test("revert 1 test migration", async () => {
  const client = denoMockClient([
    //Sorted in descending order as query does
    { version: "1616847385068-secondtest.sql" },
    { version: "1616845690588-newtest.sql" },
  ]);
  const reverted = await revert({
    migrationDir: "tests/migrations",
    client,
  });
  assertEquals(client.queryObject.calls.length, 6);
  assertEquals(client.end.calls.length, 1);
  assertArrayIncludes(reverted, ["1616847385068-secondtest.sql"]);
  const commitArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "COMMIT")
  );
  assertEquals(commitArg, true);
});

Deno.test("revert all possible migrations", async () => {
  const client = denoMockClient([
    //Sorted in descending order as query does
    { version: "1616847385068-secondtest.sql" },
    { version: "1616845690588-newtest.sql" },
  ]);
  const reverted = await revert({
    migrationDir: "tests/migrations",
    client,
    to: "1616845690588-newtest.sql",
  });
  assertEquals(client.queryObject.calls.length, 8);
  assertEquals(client.end.calls.length, 1);
  assertArrayIncludes(reverted, [
    "1616847385068-secondtest.sql",
    "1616845690588-newtest.sql",
  ]);
  const commitArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "COMMIT")
  );
  assertEquals(commitArg, true);
});

Deno.test("revert query fails - uses rollback", async () => {
  const client = getBrokenMockClient({
    rows: [
      { version: "1616847385068-secondtest.sql" },
      { version: "1616845690588-newtest.sql" },
    ],
    failQuery: "DELETE FROM migrations WHERE version = $1",
  });
  const migrations = await revert({
    migrationDir: "tests/migrations",
    client,
  });
  assertArrayIncludes(migrations, []);
  assertEquals(client.queryObject.calls.length, 6);
  const commitArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "COMMIT")
  );
  const rollbackArg = client.queryObject.calls.some((c) =>
    c.args.some((a) => a === "ROLLBACK")
  );
  assertEquals(commitArg, false);
  assertEquals(rollbackArg, true);
  assertEquals(client.end.calls.length, 1);
});
