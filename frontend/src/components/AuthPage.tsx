import { useMemo, useState } from "react";
import type { FormEvent } from "react";

export type AuthMode = "login" | "register" | "forgot" | "reset";

export type AuthSession = {
  name: string;
  email: string;
  provider: "password" | "google";
  createdAt: string;
};

type AuthPageProps = {
  initialMode?: AuthMode;
  error?: string;
  onAuthenticated: (session: AuthSession) => void;
  onBackToLanding?: () => void;
};

const inputClassName =
  "w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

const labelClassName = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

const authUsersKey = "sk-crawlpulse:auth-users";

type StoredUser = {
  name: string;
  email: string;
  password: string;
};

const readUsers = (): StoredUser[] => {
  try {
    return JSON.parse(window.localStorage.getItem(authUsersKey) ?? "[]") as StoredUser[];
  } catch {
    window.localStorage.removeItem(authUsersKey);
    return [];
  }
};

const writeUsers = (users: StoredUser[]) => {
  window.localStorage.setItem(authUsersKey, JSON.stringify(users));
};

const toNameFromEmail = (email: string) => email.split("@")[0]?.replace(/[._-]+/g, " ") || "Google user";

export function AuthPage({ initialMode = "login", error, onAuthenticated, onBackToLanding }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState(error ?? "");
  const [resetReadyEmail, setResetReadyEmail] = useState("");

  const copy = useMemo(() => {
    switch (mode) {
      case "register":
        return {
          eyebrow: "Create account",
          title: "Start your QA workspace",
          subtitle: "Create an operator account for SK CrawlPulse and keep your analysis workspace available on this device.",
          submit: "Create account",
        };
      case "forgot":
        return {
          eyebrow: "Recover access",
          title: "Reset your password",
          subtitle: "Enter the email linked to your workspace and continue to the reset form.",
          submit: "Send reset link",
        };
      case "reset":
        return {
          eyebrow: "New password",
          title: "Set a new password",
          subtitle: "Choose a new password for your SK CrawlPulse account.",
          submit: "Reset password",
        };
      default:
        return {
          eyebrow: "Welcome back",
          title: "Sign in to SK CrawlPulse",
          subtitle: "Access saved projects, analysis history, findings, reports, and generated tests.",
          submit: "Sign in",
        };
    }
  }, [mode]);

  const createSession = (nextEmail: string, nextName: string, provider: AuthSession["provider"]) => {
    onAuthenticated({
      name: nextName,
      email: nextEmail,
      provider,
      createdAt: new Date().toISOString(),
    });
  };

  const handleGoogleSso = () => {
    const env = import.meta.env as Record<string, string | undefined>;
    const clientId = env.VITE_GOOGLE_CLIENT_ID?.trim();

    if (clientId) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: window.location.origin + window.location.pathname,
        response_type: "id_token token",
        scope: "openid email profile",
        nonce: crypto.randomUUID(),
        prompt: "select_account",
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      return;
    }

    createSession("google.operator@sk-crawlpulse.local", "Google Operator", "google");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    const normalizedEmail = email.trim().toLowerCase();
    const users = readUsers();

    if (mode === "register") {
      if (!name.trim() || !normalizedEmail || password.length < 8) {
        setNotice("Enter a name, valid email, and a password with at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setNotice("Passwords do not match.");
        return;
      }
      if (users.some((user) => user.email === normalizedEmail)) {
        setNotice("An account already exists for this email.");
        return;
      }

      writeUsers([...users, { name: name.trim(), email: normalizedEmail, password }]);
      createSession(normalizedEmail, name.trim(), "password");
      return;
    }

    if (mode === "forgot") {
      if (!normalizedEmail) {
        setNotice("Enter the email linked to your workspace.");
        return;
      }

      setResetReadyEmail(normalizedEmail);
      setEmail(normalizedEmail);
      setMode("reset");
      setNotice("Reset link verified for this workspace. Set a new password below.");
      return;
    }

    if (mode === "reset") {
      const targetEmail = resetReadyEmail || normalizedEmail;
      if (!targetEmail || password.length < 8 || password !== confirmPassword) {
        setNotice("Enter matching passwords with at least 8 characters.");
        return;
      }

      const existing = users.find((user) => user.email === targetEmail);
      const nextUsers = existing
        ? users.map((user) => (user.email === targetEmail ? { ...user, password } : user))
        : [...users, { name: toNameFromEmail(targetEmail), email: targetEmail, password }];
      writeUsers(nextUsers);
      createSession(targetEmail, existing?.name ?? toNameFromEmail(targetEmail), "password");
      return;
    }

    const match = users.find((user) => user.email === normalizedEmail && user.password === password);
    if (!match) {
      setNotice("Invalid email or password. Register first or reset your password.");
      return;
    }

    createSession(match.email, match.name, "password");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#F7FAFC_0%,#EEF8FB_52%,#F9FAFB_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.68fr)]">
        <div className="hidden min-h-[620px] overflow-hidden rounded-[1.6rem] border border-cyan-900/10 bg-[linear-gradient(135deg,rgba(21,97,109,0.95),rgba(38,198,218,0.82))] p-8 text-white shadow-[0_24px_70px_rgba(21,97,109,0.24)] lg:grid">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/15 text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
                SK
              </div>
              <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-tight">Autonomous QA evidence, protected by operator access.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-cyan-50/90">
                Sign in to manage crawl runs, review findings, export reports, and turn analysis output into regression coverage.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                "Persistent run history and saved projects",
                "Finding triage, reports, and Playwright exports",
                "Google SSO entry point for team-ready identity",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/95">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <article className="mx-auto w-full max-w-[480px] rounded-[1.6rem] border border-slate-200 bg-white/92 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">{copy.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">{copy.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{copy.subtitle}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-cyan-50 text-sm font-bold text-cyan-800">
              SK
            </div>
          </div>

          {onBackToLanding ? (
            <button
              type="button"
              onClick={onBackToLanding}
              className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-800"
            >
              Back to overview
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleGoogleSso}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-[#4285F4]">
              G
            </span>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {mode === "register" ? (
              <label>
                <span className={labelClassName}>Full name</span>
                <input className={inputClassName} value={name} onChange={(event) => setName(event.target.value)} placeholder="Sam Operator" autoComplete="name" />
              </label>
            ) : null}

            <label>
              <span className={labelClassName}>Email</span>
              <input className={inputClassName} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
            </label>

            {mode !== "forgot" ? (
              <label>
                <span className={labelClassName}>{mode === "reset" ? "New password" : "Password"}</span>
                <input className={inputClassName} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </label>
            ) : null}

            {mode === "register" || mode === "reset" ? (
              <label>
                <span className={labelClassName}>Confirm password</span>
                <input className={inputClassName} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" autoComplete="new-password" />
              </label>
            ) : null}

            {notice ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {notice}
              </div>
            ) : null}

            <button
              type="submit"
              className="primary-cta min-h-[48px] rounded-[1rem] bg-[linear-gradient(135deg,#15616D,#26C6DA)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(21,97,109,0.22)] transition hover:brightness-105"
            >
              {copy.submit}
            </button>
          </form>

          <div className="mt-5 grid gap-3 text-center text-sm">
            {mode === "login" ? (
              <>
                <button type="button" onClick={() => setMode("forgot")} className="text-cyan-700 hover:text-cyan-900">
                  Forgot password?
                </button>
                <p className="text-slate-500">
                  No account?{" "}
                  <button type="button" onClick={() => setMode("register")} className="font-semibold text-cyan-700 hover:text-cyan-900">
                    Register
                  </button>
                </p>
              </>
            ) : (
              <button type="button" onClick={() => setMode("login")} className="font-semibold text-cyan-700 hover:text-cyan-900">
                Back to login
              </button>
            )}

            {mode === "forgot" ? (
              <button type="button" onClick={() => setMode("reset")} className="text-slate-500 hover:text-cyan-800">
                Already have a reset code?
              </button>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
