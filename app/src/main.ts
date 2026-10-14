import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { CommonsProvider } from "./concepts/Federating/provider.ts";
import { runTogetherPolicy } from "./http.ts";
import { db } from "./db.ts";

// The origin browsers use. In development that is Vite's, which proxies /api to this server and listens on
// localhost; when deployed, PUBLIC_ORIGIN is the app's https address. Sign-in requests from any other origin
// are refused, and Commons allows apps on http://localhost.
const publicOrigin = process.env.PUBLIC_ORIGIN ?? "http://localhost:8080";

// The built frontend, from `bun run build`. In production this server sends the pages itself; in
// development Vite does, and this folder may not exist.
const dist = `${import.meta.dir}/../dist`;

/**
 * Sends a file from the built frontend, or index.html for any other path, so a page such as
 * /auth/commons/callback loads when visited or reloaded directly. Pages are sent with
 * `Referrer-Policy: no-referrer`, so the Commons callback's one-time code never leaves in a Referer header.
 */
async function frontend(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Not found", { status: 404 });
  }
  const pathname = new URL(request.url).pathname;
  const file = Bun.file(dist + pathname);
  if (pathname !== "/" && (await file.exists())) {
    return new Response(file, { headers: { "Referrer-Policy": "no-referrer" } });
  }
  const page = Bun.file(`${dist}/index.html`);
  if (!(await page.exists())) {
    return new Response(
      "The frontend hasn't been built. Run `bun run build`, or use `bun run dev`.",
      {
        status: 404,
      },
    );
  }
  return new Response(page, {
    headers: { "Referrer-Policy": "no-referrer", "Cache-Control": "no-cache" },
  });
}

const commons = new CommonsProvider({
  origin: process.env.COMMONS_ORIGIN ?? "https://class.mit-sdg.dev",
  app: publicOrigin,
});

const application = assembleApplication({ provider: commons });
const gateway = createGateway({ application });
const api = createHttpHandler({
  application,
  gateway,
  policy: runTogetherPolicy(publicOrigin),
});

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),

  routes: {
    "/api/*": api,

    "/health": async () => {
      try {
        await db.collection("runplanning.runs").findOne(
          {},
          {
            maxTimeMS: 2000,
            timeoutMS: 3000,
          },
        );

        return Response.json(
          { status: "ok" },
          {
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
      } catch {
        return Response.json(
          { status: "unavailable" },
          {
            status: 503,
            headers: {
              "Cache-Control": "no-store",
            },
          },
        );
      }
    },
  },

  // Bun tries `routes` first, so /api/... and /health still reach the backend; everything else is a page.
  fetch: frontend,
});

console.log(`Backend listening on ${server.url}`);
