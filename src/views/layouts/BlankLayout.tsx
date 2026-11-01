import { Outlet } from "react-router";

/** Public pages, alone: no sidebar or page heading. */
export function BlankLayout() {
  return <Outlet />;
}
