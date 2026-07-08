import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { usePortalAuth } from "@/state/PortalStore";

export function LoginPage() {
  const { status, authError, login, loginWithGoogle } = usePortalAuth();
  const navigate = useNavigate();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [email, setEmail] = useState("owner@irondistrict.gym");
  const [password, setPassword] = useState("ratlevel-demo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const handleGoogleCredential = async (idToken: string) => {
    if (googleBusy) return;
    setGoogleBusy(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
      navigate("/", { replace: true });
    } catch {
      setGoogleBusy(false);
    }
  };

  const submitDevLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-mark" aria-hidden>
            🐀
          </div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>RatLevel Gym Portal</div>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            Staff access · Iron District
          </div>
        </div>

        <GoogleSignInButton onCredential={(idToken) => void handleGoogleCredential(idToken)} />
        {googleBusy && (
          <div className="muted" style={{ fontSize: 12, textAlign: "center" }}>
            Signing in…
          </div>
        )}
        {(error || authError) && (
          <div className="error-text" role="alert">
            {error ?? authError}
          </div>
        )}
        <div className="muted" style={{ fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>
          Staff accounts are provisioned by your gym owner — Google only confirms it's you.
        </div>

        {import.meta.env.DEV && (
          <div
            style={{
              borderTop: "1px dashed var(--c-border)",
              paddingTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            <button
              type="button"
              className="btn small"
              onClick={() => setShowDevLogin((current) => !current)}
            >
              {showDevLogin ? "Hide" : "Show"} dev sign-in (skip Google)
            </button>
            {showDevLogin && (
              <form onSubmit={(event) => void submitDevLogin(event)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="field">
                  <label className="field-label" htmlFor="email">
                    Work email
                  </label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </button>
                <div className="muted" style={{ fontSize: 11, textAlign: "center" }}>
                  Dev only — password "ratlevel-demo" for all seeded staff. Disabled once deployed
                  for real.
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
