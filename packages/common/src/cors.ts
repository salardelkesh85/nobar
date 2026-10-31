import type { NestFastifyApplication } from "@nestjs/platform-fastify";

/**
 * CORS for the browser apps (store, seller panel, admin panel) on their own origins.
 * Only listed origins are echoed back; preflight requests are answered before routing.
 */
export function allowOrigins(app: NestFastifyApplication, origins: string[]): void {
  const allowed = new Set(origins.map((o) => o.trim().replace(/\/$/, "")).filter(Boolean));
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onRequest", (req, reply, done) => {
      const origin = req.headers.origin;
      if (origin && allowed.has(origin)) {
        void reply
          .header("access-control-allow-origin", origin)
          .header("vary", "origin")
          .header("access-control-allow-credentials", "true")
          .header("access-control-expose-headers", "x-request-id, retry-after");
        if (req.method === "OPTIONS") {
          void reply
            .header("access-control-allow-methods", "GET, POST, PATCH, PUT, DELETE")
            .header("access-control-allow-headers", "authorization, content-type, idempotency-key, x-request-id")
            .header("access-control-max-age", "600")
            .status(204)
            .send();
          return;
        }
      }
      done();
    });
}
