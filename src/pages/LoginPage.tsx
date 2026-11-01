import { Form, useActionData, useNavigation } from "react-router";

/** Public sign-in, outside the signed-in sidebar layout. */
export function LoginPage() {
  const result = useActionData() as { error: string } | undefined;
  const submitting = useNavigation().state === "submitting";
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Sign in to Agentic Search</h1>
        <p className="login-card__subtitle">Use your account email and password.</p>
        {/* Production builds drop this; only the dev server serves /dev-login.html. */}
        {import.meta.env.DEV && (
          <p className="login-card__dev-hint">
            Dev mode: open <a href="/dev-login.html">/dev-login.html</a> to create and sign in as
            dev@localhost (password devpass).
          </p>
        )}
        {/* replace: Back from the next page must not return to this form. */}
        <Form method="post" replace className="login-form">
          <label>
            Email
            <input name="email" type="email" autoComplete="username" maxLength={254} required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {result?.error && (
            <p className="error-banner" role="alert">
              {result.error}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </Form>
      </div>
    </main>
  );
}
