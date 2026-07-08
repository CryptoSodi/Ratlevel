import Constants from "expo-constants";

const API_PORT = 4000;

/**
 * Resolves the API's base URL for the current environment.
 *  1. EXPO_PUBLIC_API_BASE_URL, if set — the production override (e.g.
 *     https://api.ratlevel.com), used for anything built for real users.
 *  2. Otherwise, in Expo Go the dev server's LAN host (e.g. 192.168.1.12:8081)
 *     is available via `hostUri` — reusing its IP means the phone finds the
 *     local API on the same machine over Wi-Fi without manual configuration.
 *  3. Falls back to localhost for web/simulator.
 */
export function resolveApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2?.extra?.expoGo?.debuggerHost;
  const host = hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
