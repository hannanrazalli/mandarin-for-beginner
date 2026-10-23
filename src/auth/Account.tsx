import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../components/Page";
import { copy } from "../lib/copy";
import { useSettings } from "../lib/settings";
import { useAuth } from "./AuthProvider";
export default function Account() {
  const t = copy(useSettings().language);
  const auth = useAuth();
  const authHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (
      auth.status === "owner" ||
      auth.status === "signedOut" ||
      auth.status === "blocked"
    )
      authHeading.current?.focus();
  }, [auth.status]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await auth.login(email, password);
    setPassword("");
  }
  const message =
    auth.message === "sessionExpired"
      ? t.sessionExpired
      : auth.message === "invalid"
        ? t.authInvalid
        : auth.message === "failed"
          ? t.authFailed
          : auth.message === "loggedOut"
            ? t.loggedOut
            : auth.message === "globalOut"
              ? t.globalOut
              : auth.message === "logoutFailed"
                ? t.logoutFailed
                : null;
  return (
    <Page
      eyebrow={t.account}
      title={t.accountTitle}
      description={t.accountBody}
    >
      <section
        className="account-card"
        aria-busy={auth.pending || auth.status === "initializing"}
      >
        <span className="icon-tile">
          <LockKeyhole size={26} />
        </span>
        {auth.status === "unconfigured" ? (
          <>
            <h2>{t.authMissing}</h2>
            <p>{t.authMissingBody}</p>
            <p className="account-config">
              VITE_SUPABASE_URL
              <br />
              VITE_SUPABASE_PUBLISHABLE_KEY
            </p>
          </>
        ) : auth.status === "initializing" ? (
          <p role="status">{t.authChecking}</p>
        ) : auth.status === "owner" ? (
          <>
            <h2 ref={authHeading} tabIndex={-1} className="verified-heading">
              <ShieldCheck size={23} />
              {t.ownerVerified}
            </h2>
            <p className="owner-email">{auth.owner?.email}</p>
            <p>{t.ownerBody}</p>
            <div className="account-actions">
              <button
                type="button"
                className="button primary"
                disabled={auth.pending}
                onClick={() => void auth.logout()}
              >
                {auth.pending ? t.loggingOut : t.logout}
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={auth.pending}
                onClick={() => void auth.logout(true)}
              >
                {t.logoutAll}
              </button>
            </div>
          </>
        ) : auth.status === "error" ? (
          <>
            <p role="alert">{t.authError}</p>
            <button
              type="button"
              className="button secondary"
              onClick={auth.retry}
            >
              {t.authRetry}
            </button>
          </>
        ) : (
          <>
            {auth.status === "blocked" && (
              <div className="auth-error" role="alert">
                <h2>{t.authBlocked}</h2>
                <p>{t.authBlockedBody}</p>
              </div>
            )}
            <h2 ref={authHeading} tabIndex={-1}>
              {t.login}
            </h2>
            <form
              onSubmit={(event) => void submit(event)}
              className="auth-form"
            >
              <label htmlFor="auth-email">{t.email}</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                autoComplete="username"
                maxLength={254}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={auth.pending}
                aria-describedby={message ? "auth-message" : undefined}
              />
              <label htmlFor="auth-password">{t.password}</label>
              <input
                id="auth-password"
                type="password"
                name="password"
                autoComplete="current-password"
                minLength={8}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={auth.pending}
                aria-describedby={message ? "auth-message" : undefined}
              />
              <button
                type="submit"
                className="button primary"
                disabled={auth.pending}
              >
                {auth.pending ? t.loggingIn : t.login}
              </button>
            </form>
            <p className="auth-note">{t.noSignup}</p>
          </>
        )}
        {message && (
          <p
            id="auth-message"
            className={
              auth.message === "failed" ||
              auth.message === "invalid" ||
              auth.message === "logoutFailed"
                ? "auth-error"
                : "auth-status"
            }
            role={
              auth.message === "failed" || auth.message === "invalid"
                ? "alert"
                : "status"
            }
          >
            {message}
          </p>
        )}
        {auth.status !== "unconfigured" && (
          <p className="auth-note">{t.logoutNote}</p>
        )}
        <Link to="/unit-0" className="text-link">
          {t.previewAccess}
          <ArrowRight size={18} />
        </Link>
      </section>
    </Page>
  );
}
