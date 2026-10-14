/**
 * Serves the built frontend in `dist`: a file when one exists at the request's path, or index.html for any
 * other path, so a page such as /auth/commons/callback loads when visited or reloaded directly. Pages are
 * sent with `Referrer-Policy: no-referrer`, so the Commons callback's one-time code never leaves in a
 * Referer header. The server tries its API routes first, so this only answers the rest.
 */
export function serveFrontend(dist: string) {
  return async function frontend(request: Request): Promise<Response> {
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
        { status: 404 },
      );
    }
    return new Response(page, {
      headers: { "Referrer-Policy": "no-referrer", "Cache-Control": "no-cache" },
    });
  };
}
