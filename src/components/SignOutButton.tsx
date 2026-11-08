import { LogOut } from "lucide-react";
import { useFetcher } from "react-router";
import type { logoutAction } from "../views/auth/session";

/** A non-navigating form keeps sign-out failures beside the retry control. */
export function SignOutButton({ className = "app-sidebar__button" }: { className?: string }) {
  const fetcher = useFetcher<typeof logoutAction>({ key: "sign-out" });
  const busy = fetcher.state !== "idle";
  return (
    <div className="sign-out">
      <fetcher.Form method="post" action="/logout">
        <button className={className} type="submit" aria-label="Sign out" disabled={busy}>
          <LogOut aria-hidden="true" size={18} />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </fetcher.Form>
      {!busy && fetcher.data?.error && (
        <p className="sign-out__error" role="alert">
          {fetcher.data.error} Try signing out again.
        </p>
      )}
    </div>
  );
}
