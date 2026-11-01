import { isRouteErrorResponse, useRouteError } from "react-router";
import { NotFoundView } from "./NotFoundView";

/** Shown by a route's ErrorBoundary when a loader or render throws. */
export function ErrorView() {
  const error = useRouteError();
  // A loader's 404, such as an unknown app id.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundView />;
  return (
    <main className="login-page">
      <p className="error-banner" role="alert">
        Something went wrong. Reload the page to try again.
      </p>
    </main>
  );
}
