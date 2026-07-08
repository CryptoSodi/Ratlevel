import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { GymPortalClient, StaffAccount } from "@ratlevel/domain";
import { ApiAuthError, createHttpPortalClient, staffGoogleLogin, staffLogin } from "@/services/httpPortalClient";

const TOKEN_KEY = "ratlevel-portal-token";
const STAFF_KEY = "ratlevel-portal-staff";

type Status = "checking" | "authenticated" | "unauthenticated";

interface PortalValue {
  status: Status;
  client: GymPortalClient | null;
  staff: StaffAccount | null;
  authError: string | null;
  /** Dev/testing bypass only — the server refuses this once deployed for real. */
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
}

const PortalContext = createContext<PortalValue | null>(null);

function readStaff(): StaffAccount | null {
  try {
    const raw = window.localStorage.getItem(STAFF_KEY);
    return raw ? (JSON.parse(raw) as StaffAccount) : null;
  } catch {
    return null;
  }
}

export function PortalProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<Status>("checking");
  const [client, setClient] = useState<GymPortalClient | null>(null);
  const [staff, setStaff] = useState<StaffAccount | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const storedStaff = readStaff();
    if (!token || !storedStaff) {
      setStatus("unauthenticated");
      return;
    }
    const httpClient = createHttpPortalClient(token);
    // Confirm the stored token is still valid before trusting it.
    httpClient.auth
      .listStaff()
      .then(() => {
        setClient(httpClient);
        setStaff(storedStaff);
        setStatus("authenticated");
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(STAFF_KEY);
        setStatus("unauthenticated");
      });
  }, []);

  const applyAuthResult = useCallback((token: string, account: StaffAccount) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(STAFF_KEY, JSON.stringify(account));
    setClient(createHttpPortalClient(token));
    setStaff(account);
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);
      try {
        const { token, staff: account } = await staffLogin(email, password);
        applyAuthResult(token, account);
      } catch (cause) {
        setAuthError(cause instanceof ApiAuthError ? cause.message : cause instanceof Error ? cause.message : "Could not sign in.");
        throw cause;
      }
    },
    [applyAuthResult]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      setAuthError(null);
      try {
        const { token, staff: account } = await staffGoogleLogin(idToken);
        applyAuthResult(token, account);
      } catch (cause) {
        setAuthError(cause instanceof ApiAuthError ? cause.message : cause instanceof Error ? cause.message : "Could not sign in.");
        throw cause;
      }
    },
    [applyAuthResult]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(STAFF_KEY);
    setClient(null);
    setStaff(null);
    setAuthError(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, client, staff, authError, login, loginWithGoogle, logout }),
    [status, client, staff, authError, login, loginWithGoogle, logout]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): Omit<PortalValue, "client"> & { client: GymPortalClient } {
  const value = useContext(PortalContext);
  if (!value) {
    throw new Error("usePortal must be used inside PortalProvider");
  }
  if (!value.client) {
    throw new Error("usePortal client accessed before authentication — check `status` first.");
  }
  return value as Omit<PortalValue, "client"> & { client: GymPortalClient };
}

export function usePortalAuth(): PortalValue {
  const value = useContext(PortalContext);
  if (!value) {
    throw new Error("usePortalAuth must be used inside PortalProvider");
  }
  return value;
}
