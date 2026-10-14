import { afterAll } from "bun:test";
import { databaseUrl, dropTestDatabases, PREFIX } from "./mongo.ts";

// `src/db.ts` reads MONGODB_URL when it is first imported, so the app assembled in the HTTP tests
// uses a test database instead of the one in `.env`. This file is preloaded by `bunfig.toml`.
const base = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (base) process.env.MONGODB_URL = databaseUrl(base, `${PREFIX}http`);

afterAll(async () => {
  const { client } = await import("../../src/db.ts");
  await client.close();
  await dropTestDatabases();
});
