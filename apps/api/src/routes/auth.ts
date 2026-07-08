import type { FastifyInstance } from "fastify";
import type { GooglePendingTokenPayload } from "../lib/auth";
import { verifyPassword } from "../lib/auth";
import { db } from "../lib/db";
import { isGoogleSignInConfigured, verifyGoogleIdToken } from "../lib/google";
import { toGym, toPlayer, toStaffAccount } from "../lib/mappers";
import { provisionNewPlayer } from "../lib/provision";
import {
  devLoginSchema,
  googleAuthSchema,
  googleCompleteSchema,
  loginSchema,
  staffGoogleAuthSchema
} from "../lib/schemas";
import { PLAN_PRICES } from "../lib/seedData";

const GOOGLE_PENDING_EXPIRY = "15m";

/**
 * Member auth is Google Sign-In only — no email/password screen ever ships to
 * real users. The flow is two calls:
 *   1. POST /auth/member/google        — verify the Google ID token. Existing
 *      players log straight in; brand-new players get a short-lived
 *      "pending" token instead (their verified identity, nothing else).
 *   2. POST /auth/member/google/complete — spend that pending token plus the
 *      gym/character choices from onboarding to create the player.
 * Staff (portal) auth also uses Google, but never self-service: the token
 * only confirms identity against an EXISTING StaffAccount (by googleId, or
 * by email for one-time linking of a pre-seeded account). Anyone without a
 * staff row already provisioned by the gym owner is rejected — Google
 * verifies who they are, not that they're allowed into the portal.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Public — needed for the sign-up gym picker, before any token exists.
  app.get("/gyms", async () => {
    const gyms = await db.gym.findMany();
    const counts = await db.player.groupBy({ by: ["gymId"], _count: true });
    const countByGym = new Map(counts.map((row) => [row.gymId, row._count]));
    return gyms.map((gym) => toGym(gym, countByGym.get(gym.id) ?? 0));
  });

  app.get("/auth/google/status", async () => ({ configured: isGoogleSignInConfigured() }));

  app.post("/auth/member/google", async (request, reply) => {
    const parsed = googleAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(parsed.data.idToken);
    } catch (cause) {
      return reply.code(401).send({ error: cause instanceof Error ? cause.message : "Invalid Google token." });
    }

    let player = await db.player.findUnique({ where: { googleId: profile.googleId }, include: { membership: true } });

    // Account linking: a player row could already exist for this email
    // (e.g. seeded before Google sign-in existed) without a googleId yet.
    if (!player) {
      const byEmail = await db.player.findUnique({ where: { email: profile.email }, include: { membership: true } });
      if (byEmail) {
        player = await db.player.update({
          where: { id: byEmail.id },
          data: { googleId: profile.googleId },
          include: { membership: true }
        });
      }
    }

    if (player) {
      const token = app.jwt.sign({ kind: "member", playerId: player.id });
      return reply.send({ isNewUser: false, token, player: toPlayer(player) });
    }

    const pendingPayload: GooglePendingTokenPayload = {
      kind: "google_pending",
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name
    };
    const pendingToken = app.jwt.sign(pendingPayload, { expiresIn: GOOGLE_PENDING_EXPIRY });
    return reply.send({ isNewUser: true, pendingToken, profile: { email: profile.email, name: profile.name } });
  });

  app.post("/auth/member/google/complete", async (request, reply) => {
    const parsed = googleCompleteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    let pending: GooglePendingTokenPayload;
    try {
      const payload = app.jwt.verify<GooglePendingTokenPayload>(parsed.data.pendingToken);
      if (payload.kind !== "google_pending") throw new Error("wrong token kind");
      pending = payload;
    } catch {
      return reply.code(401).send({ error: "Your Google sign-in expired — please try again." });
    }

    const [existingByGoogle, existingByEmail, gym] = await Promise.all([
      db.player.findUnique({ where: { googleId: pending.googleId } }),
      db.player.findUnique({ where: { email: pending.email } }),
      db.gym.findUnique({ where: { id: parsed.data.gymId } })
    ]);
    if (existingByGoogle || existingByEmail) {
      return reply.code(409).send({ error: "An account already exists for that Google account." });
    }
    if (!gym) {
      return reply.code(400).send({ error: "Unknown gym." });
    }

    const feeDueAt = new Date();
    feeDueAt.setDate(feeDueAt.getDate() + 30);

    const player = await db.player.create({
      data: {
        email: pending.email,
        googleId: pending.googleId,
        name: parsed.data.name,
        playerClass: parsed.data.playerClass,
        gymId: parsed.data.gymId,
        whatsappNumber: parsed.data.whatsappNumber,
        membership: {
          create: {
            gymId: parsed.data.gymId,
            plan: "Core",
            status: "active",
            cardNumber: Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 8999)).join(" "),
            monthlyFee: PLAN_PRICES.Core,
            feeDueAt
          }
        }
      },
      include: { membership: true }
    });
    await provisionNewPlayer(player.id);

    const token = app.jwt.sign({ kind: "member", playerId: player.id });
    return reply.code(201).send({ token, player: toPlayer(player) });
  });

  // Dev/testing bypass — lets seeded demo accounts (and CI) sign in without a
  // live Google account. Never available once deployed for real.
  if (process.env.NODE_ENV !== "production") {
    app.post("/auth/member/dev-login", async (request, reply) => {
      const parsed = devLoginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const player = await db.player.findUnique({
        where: { email: parsed.data.email },
        include: { membership: true }
      });
      if (!player) {
        return reply.code(404).send({ error: "No demo account with that email." });
      }
      const token = app.jwt.sign({ kind: "member", playerId: player.id });
      return reply.send({ token, player: toPlayer(player) });
    });
  }

  app.post("/auth/staff/google", async (request, reply) => {
    const parsed = staffGoogleAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    let profile;
    try {
      profile = await verifyGoogleIdToken(parsed.data.idToken);
    } catch (cause) {
      return reply.code(401).send({ error: cause instanceof Error ? cause.message : "Invalid Google token." });
    }

    let staff = await db.staffAccount.findUnique({ where: { googleId: profile.googleId } });

    // One-time linking: a staff row can be pre-provisioned by email (e.g. the
    // seed data) before its owner ever signs in with Google.
    if (!staff) {
      const byEmail = await db.staffAccount.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        staff = await db.staffAccount.update({ where: { id: byEmail.id }, data: { googleId: profile.googleId } });
      }
    }

    if (!staff || !staff.active) {
      return reply.code(403).send({
        error: "No staff account found for that Google account. Ask your gym owner to add you as staff."
      });
    }

    await db.staffAccount.update({ where: { id: staff.id }, data: { lastActiveAt: new Date() } });
    const token = app.jwt.sign({ kind: "staff", staffId: staff.id, role: staff.role });
    return reply.send({ token, staff: toStaffAccount(staff) });
  });

  // Dev/testing bypass for staff password login — real deployments are
  // Google-only (see /auth/staff/google above).
  if (process.env.NODE_ENV !== "production") {
    app.post("/auth/staff/login", async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const staff = await db.staffAccount.findUnique({ where: { email: parsed.data.email } });
      if (!staff?.active || !staff.passwordHash || !(await verifyPassword(parsed.data.password, staff.passwordHash))) {
        return reply.code(401).send({ error: "Invalid email or password." });
      }
      await db.staffAccount.update({ where: { id: staff.id }, data: { lastActiveAt: new Date() } });
      const token = app.jwt.sign({ kind: "staff", staffId: staff.id, role: staff.role });
      return reply.send({ token, staff: toStaffAccount(staff) });
    });
  }
}
