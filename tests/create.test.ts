import { assertEquals, assertThrowsAsync } from "../src/deps.ts";
import { join } from "../src/deps.ts";
import { existsSync } from "../src/deps.ts";
import { create } from "../src/apis.ts";

Deno.test("create migration", async () => {
  const file = await create({
    migrationDir: "tests/tmp",
    migrationName: "science-alert",
  });

  const filenameWithoutTs = file.split("-").slice(1).join("-");
  const filepath = join(Deno.cwd(), `tests/tmp/${file}`);
  const exists = existsSync(filepath);
  assertEquals(filenameWithoutTs, "science-alert.sql");
  assertEquals(exists, true);

  //Cleanup
  if (exists) {
    Deno.removeSync(filepath);
  }
});

Deno.test("create migration error handling", () => {
  assertThrowsAsync(() => {
    return create({
      migrationDir: "tests/none-existing-path",
      migrationName: "to-create-is-to-conquer",
    });
  }, Error);
});
