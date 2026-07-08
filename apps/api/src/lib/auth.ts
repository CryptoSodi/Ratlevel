import bcrypt from "bcryptjs";
import type { FastifyReply, FastifyRequest } from "fastify";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface MemberTokenPayload {
  kind: "member";
  playerId: string;
}

export interface StaffTokenPayload {
  kind: "staff";
  staffId: string;
  role: string;
}

/** Short-lived token issued after Google verification for a brand-new user, carrying their
 *  server-verified identity through the gym/character onboarding steps. Never trust a client
 *  to resubmit googleId/email directly — only this signed token proves they were verified. */
export interface GooglePendingTokenPayload {
  kind: "google_pending";
  googleId: string;
  email: string;
  name: string;
}

export type TokenPayload = MemberTokenPayload | StaffTokenPayload | GooglePendingTokenPayload;

declare module "fastify" {
  interface FastifyRequest {
    auth?: TokenPayload;
  }
}

/** Verifies the bearer JWT and rejects with 401 if missing/invalid. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const payload = await request.jwtVerify<TokenPayload>();
    request.auth = payload;
  } catch {
    await reply.code(401).send({ error: "Unauthorized" });
  }
}

export async function requireMember(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (request.auth?.kind !== "member") {
    await reply.code(403).send({ error: "Member account required" });
  }
}

export async function requireStaff(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (request.auth?.kind !== "staff") {
    await reply.code(403).send({ error: "Staff account required" });
  }
}

/** Role hierarchy for simple "at least this level" checks (task: enforce RBAC). */
const ROLE_RANK: Record<string, number> = { frontdesk: 1, coach: 1, manager: 2, owner: 3 };

export function requireRole(minRank: number) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireStaff(request, reply);
    if (reply.sent) return;
    const role = request.auth?.kind === "staff" ? request.auth.role : undefined;
    if (!role || (ROLE_RANK[role] ?? 0) < minRank) {
      await reply.code(403).send({ error: "Insufficient permissions for this action" });
    }
  };
}
