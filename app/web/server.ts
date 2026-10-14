import homepage from "./index.html";

const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:3000";

function proxy(request: Request) {
  const url = new URL(request.url);
  return fetch(new URL(url.pathname + url.search, backend), request).catch(() =>
    Response.json({ error: "UNAVAILABLE" }, { status: 503 }),
  );
}

/**
 * The page Commons sends the browser back to. Bun serves an HTML import without custom headers, so this
 * serves the same page as "/" with `Referrer-Policy: no-referrer`, keeping the code in the address out of
 * any Referer header. `index.html` also sets the policy with a meta tag.
 */
async function commonsCallback() {
  const page = await fetch(new URL("/", server.url));
  const headers = new Headers(page.headers);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Cache-Control", "no-store");
  return new Response(page.body, { status: page.status, headers });
}

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8080),
  routes: {
    "/": homepage,
    "/auth/commons/callback": commonsCallback,
    "/api/*": proxy,
    "/health": proxy,
  },
});

console.log(`Frontend listening on ${server.url}`);
