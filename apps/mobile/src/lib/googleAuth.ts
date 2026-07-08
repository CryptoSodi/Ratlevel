import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Lets the auth session's browser popup close itself and hand control back
// to the app once Google redirects — required once, at module load.
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In for the member app. Requires OAuth client IDs from a Google
 * Cloud project (Console → APIs & Services → Credentials → Create OAuth
 * client ID). At minimum a "Web application" client ID is needed for Expo
 * Go / development; add iOS and Android client IDs for standalone builds.
 * Set them as EXPO_PUBLIC_GOOGLE_*_CLIENT_ID in apps/mobile/.env — see
 * apps/mobile/.env.example.
 */
export function useGoogleIdTokenAuth() {
  return Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
  });
}

export function isGoogleClientConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}
