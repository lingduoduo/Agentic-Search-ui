import { Link } from "react-router";
import { routePath } from "../../config/routes";

/** Any URL that is not one of the app's pages. */
export function NotFoundView() {
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Page not found</h1>
        <p className="login-card__subtitle">There is no page at this address.</p>
        <Link to={routePath("space-apps-list")}>Go to apps</Link>
      </div>
    </main>
  );
}
