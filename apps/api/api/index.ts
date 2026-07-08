import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

// Reused across warm invocations of the same serverless instance — Fastify
// only boots (registers plugins/routes) once per cold start, not per request.
let appPromise: Promise<FastifyInstance> | null = null;

function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = buildApp().then(async (app) => {
      await app.ready();
      return app;
    });
  }
  return appPromise;
}

/**
 * Vercel serverless entry point. vercel.json rewrites every path to this
 * function; Fastify does the real routing internally via its own registered
 * routes, exactly as it does for the long-running server in src/server.ts.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();
  app.server.emit("request", req, res);
}
