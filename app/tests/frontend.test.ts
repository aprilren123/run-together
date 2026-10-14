import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serveFrontend } from "../src/frontend.ts";

// A small built frontend in a temporary folder, with a secret beside it that must never be served.
const root = await mkdtemp(join(tmpdir(), "runtogether-frontend-"));
const dist = join(root, "dist");
await mkdir(join(dist, "assets"), { recursive: true });
await writeFile(join(dist, "index.html"), "<!doctype html><div id=app></div>");
await writeFile(join(dist, "assets", "index-abc.js"), "console.log('app')");
await writeFile(join(root, ".env"), "MONGODB_URL=secret");
afterAll(() => rm(root, { recursive: true, force: true }));

const serve = serveFrontend(dist);
const get = (path: string, method = "GET") =>
  serve(new Request(`http://localhost:3000${path}`, { method }));

describe("Serving the built frontend in production", () => {
  test("the home page is index.html, sent without a Referer and not cached", async () => {
    const response = await get("/");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<div id=app>");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  test("a built file is sent as itself, with its type", async () => {
    const response = await get("/assets/index-abc.js");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("console.log('app')");
    expect(response.headers.get("Content-Type")).toContain("javascript");
  });

  test("reloading any other page, including the Commons callback, sends index.html", async () => {
    for (const path of ["/auth/commons/callback?code=c&state=s", "/friends", "/a/b/c"]) {
      const response = await get(path);
      expect({ path, status: response.status }).toEqual({ path, status: 200 });
      expect(await response.text()).toContain("<div id=app>");
      expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    }
  });

  test("a path that climbs out of dist gets the page, never a file beside it", async () => {
    for (const path of ["/../.env", "/%2e%2e/.env", "/assets/../../.env"]) {
      const text = await (await get(path)).text();
      expect({ path, leaked: text.includes("secret") }).toEqual({ path, leaked: false });
    }
  });

  test("a request other than GET or HEAD is answered 404", async () => {
    expect((await get("/friends", "POST")).status).toBe(404);
    expect((await get("/", "HEAD")).status).toBe(200);
  });

  test("without a build, it says how to build instead of failing", async () => {
    const response = await serveFrontend(join(root, "missing"))(
      new Request("http://localhost:3000/"),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("bun run build");
  });
});
