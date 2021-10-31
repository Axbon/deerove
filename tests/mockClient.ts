import { spy, Spy } from "../src/deps.ts";
import { Client } from "../src/deps.ts";
import { MigrationVersion } from "../src/types.ts";

export const denoMockClient = (rows: MigrationVersion[] = []) => {
  return {
    queryObject: spy(() => Promise.resolve({ rows })),
    end: spy(() => true),
  } as unknown as Client & { queryObject: Spy<void>; end: Spy<void> };
};

export const getBrokenMockClient = ({
  rows,
  failQuery,
}: {
  rows: MigrationVersion[];
  failQuery: string;
}) => {
  return {
    queryObject: spy((query: { text: string; args: string[] }) => {
      if (query.text === failQuery) {
        throw new Error("A migration query failed!");
      }
      return { rows };
    }),
    end: spy(),
  } as unknown as Client & { queryObject: Spy<void>; end: Spy<void> };
};
