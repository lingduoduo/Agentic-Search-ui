import { Link } from "react-router";
import { APPS, routePath } from "../../../config/routes";

/** `/space/apps`: every app, each opening at `/space/apps/:app_id`. */
export function ListView() {
  return (
    <section className="app-list" aria-label="Apps">
      <ul className="app-list__cards">
        {APPS.map((app) => (
          <li key={app.id}>
            <Link to={routePath("space-apps-detail", { app_id: app.id })} className="app-card">
              <strong>{app.title}</strong>
              <span>{app.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
