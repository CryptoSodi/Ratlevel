import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

function configuredAudiences(): string[] {
  return [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID
  ].filter((id): id is string => Boolean(id));
}

export function isGoogleSignInConfigured(): boolean {
  return configuredAudiences().length > 0;
}

/**
 * Verifies a Google ID token's signature and audience server-side — never
 * trust a client-decoded JWT payload for identity. Throws on any invalid,
 * expired, or wrong-audience token.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const audiences = configuredAudiences();
  if (audiences.length === 0) {
    throw new Error(
      "Google sign-in isn't configured on the server yet (missing GOOGLE_*_CLIENT_ID env vars)."
    );
  }

  const ticket = await client.verifyIdToken({ idToken, audience: audiences });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Invalid Google token.");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0]
  };
}
