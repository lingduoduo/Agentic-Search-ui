import { Link } from "react-router";
import { APPS, routePath } from "../../../config/routes";
import { ARTWORKS } from "../../../config/artworks";

/** `/space/apps`: every app, each opening at `/space/apps/:app_id`. */
export function ListView() {
  return (
    <>
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
      <section className="artwork-list" aria-labelledby="artwork-list-heading">
        <header className="artwork-list__header">
          <h2 id="artwork-list-heading">Artworks</h2>
          <span>
            {ARTWORKS.length} works · {new Set(ARTWORKS.map((art) => art.artist)).size} artists
          </span>
        </header>
        <ul className="artwork-list__items">
          {ARTWORKS.map((art) => (
            <li key={art.src}>
              <figure className="artwork-card">
                <div className="artwork-card__frame">
                  <img src={art.src} alt={`${art.title} by ${art.artist}`} loading="lazy" />
                  <strong className="artwork-card__title">{art.title}</strong>
                </div>
                <figcaption>{art.artist}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
