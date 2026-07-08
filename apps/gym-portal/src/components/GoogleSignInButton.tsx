import { useEffect, useRef } from "react";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (gsiScriptPromise) return gsiScriptPromise;
  gsiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Sign-In."));
    document.head.appendChild(script);
  });
  return gsiScriptPromise;
}

/**
 * Renders Google's own hosted sign-in button (Google Identity Services) and
 * hands the resulting ID token up to the caller for server-side verification.
 * Requires VITE_GOOGLE_WEB_CLIENT_ID — see apps/gym-portal/.env.example.
 */
export function GoogleSignInButton({ onCredential }: { onCredential: (idToken: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredentialRef.current(response.credential)
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          width: 320,
          text: "signin_with"
        });
      })
      .catch(() => {
        // Rendered as the "not configured" message below is skipped here —
        // a network/script failure just leaves the button empty.
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="error-text" style={{ textAlign: "center" }} role="alert">
        Google Sign-In isn't configured yet — add VITE_GOOGLE_WEB_CLIENT_ID in
        apps/gym-portal/.env (see .env.example).
      </div>
    );
  }

  return <div ref={containerRef} style={{ display: "flex", justifyContent: "center" }} />;
}
