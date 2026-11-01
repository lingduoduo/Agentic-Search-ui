import { Link, Outlet, useLocation } from "react-router";
import { useRoute } from "../hooks/useRoute";

export function SurfaceLayout() {
  const surface = useRoute();
  const location = useLocation();
  const isIndex = location.pathname.replace(/\/+$/, "") === surface;
  return (
    <>
      {!isIndex && (
        <nav className="session-navigation" aria-label="Session navigation">
          <Link to={surface}>Back to sessions</Link>
          {!location.pathname.endsWith("/new") && <Link to={`${surface}/new`}>Start new</Link>}
        </nav>
      )}
      <Outlet />
    </>
  );
}
