import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { CommonsProvider } from "./concepts/Federating/provider.ts";
import { runTogetherPolicy } from "./http.ts";
import { db } from "./db.ts";

// The origin browsers use. In development that is Vite's, which proxies /api to this server and listens on
// localhost. Sign-in requests from any other origin are refused, and Commons allows apps on http://localhost.
const publicOrigin = process.env.PUBLIC_ORIGIN ?? "http://localhost:8080";

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
});

console.log(`Backend listening on ${server.url}`);
