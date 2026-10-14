import { type Db, MongoClient } from "mongodb";

/**
 * Tests run on the local MongoDB from `bun run db:up` (or TEST_MONGODB_URL), but never on the app's own
 * database: each test gets a fresh database whose name starts with `PREFIX`, and `setup.ts` drops them all
 * when the run ends.
 */
export const PREFIX = `runtogether-test-${process.pid}-`;

/** The server's address with `name` as its database, keeping the credentials and options of `base`. */
export function databaseUrl(base: string, name: string): string {
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.href;
}

const base = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
let shared: Promise<MongoClient> | undefined;
let databases = 0;

async function connect() {
  if (!base)
    throw new Error("Set TEST_MONGODB_URL or MONGODB_URL to a MongoDB server for the tests.");
  return new MongoClient(base, { serverSelectionTimeoutMS: 5_000 }).connect();
}

/** A fresh, empty database on the shared test server. */
export async function testDatabase(): Promise<Db> {
  shared ??= connect();
  const client = await shared;
  databases += 1;
  return client.db(`${PREFIX}${databases}`);
}

/** Drops every database this run created, including the one the HTTP tests give `src/db.ts`, and closes the connection. */
export async function dropTestDatabases(): Promise<void> {
  if (!base) return;
  const client = await (shared ?? connect());
  const { databases: all } = await client.db().admin().listDatabases({ nameOnly: true });
  for (const { name } of all) {
    if (name.startsWith(PREFIX)) await client.db(name).dropDatabase();
  }
  await client.close();
}
