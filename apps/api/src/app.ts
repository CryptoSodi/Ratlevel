import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import Fastify, { type FastifyInstance } from "fastify";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { memberRoutes } from "./routes/member";

const JWT_SECRET = process.env.JWT_SECRET ?? "ratlevel-dev-secret-change-in-production";

/**
 * Builds the Fastify app without starting a listener, so the exact same app
 * can run as a long-running server locally (server.ts) or be driven by a
 * Vercel serverless function per-request (api/index.ts).
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // CORS_ORIGIN is a comma-separated allowlist in production (e.g.
  // "https://ratlevel.com"). Left unset, all origins are allowed — fine for
  // local dev, not for a real deployment.
  const corsOrigin = process.env.CORS_ORIGIN;
  await app.register(cors, { origin: corsOrigin ? corsOrigin.split(",") : true });
  await app.register(jwt, { secret: JWT_SECRET });

  app.get("/health", async () => ({ ok: true, service: "ratlevel-api" }));

  await app.register(authRoutes);
  await app.register(memberRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api/admin" });

  return app;
}
