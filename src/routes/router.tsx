import { createBrowserRouter, matchRoutes, redirect } from "react-router";
import type { RouteObject } from "react-router";
import { DefaultLayout } from "../views/layouts/DefaultLayout";
import { BlankLayout } from "../views/layouts/BlankLayout";
import { ErrorView } from "../views/errors/ErrorView";
import { findApp, routePath } from "../config/routes";
import type { RouteHandle } from "../config/routes";
import { adminLoader, guard, loginAction, logoutAction } from "../views/auth/session";

// Loaders resolve /me before the first render; there is nothing to show until then.
const HydrateFallback = () => null;

/** The id of the route a request lands on when that route is public. */
function publicRouteId(request: Request) {
  const leaf = matchRoutes(appRoutes, new URL(request.url).pathname)?.at(-1)?.route;
  return (leaf?.handle as RouteHandle | undefined)?.public ? leaf?.id : undefined;
}

// Each page's code loads the first time it opens (`lazy`). Route ids are the
// route names in config/routes.ts.
export const appRoutes: RouteObject[] = [
  {
    id: "root",
    // The one guard, before every navigation (Vue Router's beforeEach).
    loader: (args) => guard(args, publicRouteId(args.request)),
    shouldRevalidate: () => true,
    HydrateFallback,
    ErrorBoundary: ErrorView,
    children: [
      { index: true, loader: () => redirect(routePath("space-apps-list")) },
      {
        // Signed-in pages: sidebar plus the page heading from `handle.heading`.
        Component: DefaultLayout,
        children: [
          {
            id: "space-apps-list",
            path: "space/apps",
            lazy: () =>
              import("../views/space/apps/ListView").then((m) => ({ Component: m.ListView })),
            handle: {
              heading: { title: "Apps", description: "Pick an app to get started." },
            } satisfies RouteHandle,
          },
          {
            id: "space-apps-detail",
            path: "space/apps/:app_id",
            loader: ({ params }) => {
              if (!findApp(params.app_id)) throw new Response("Not Found", { status: 404 });
              return null;
            },
            lazy: () =>
              import("../views/space/apps/DetailView").then((m) => ({ Component: m.DetailView })),
            handle: { heading: (params) => findApp(params.app_id) } satisfies RouteHandle,
          },
          {
            id: "pages-account",
            path: "account",
            lazy: () =>
              import("../views/pages/AccountView").then((m) => ({ Component: m.AccountView })),
            handle: {
              heading: { title: "Account", description: "Your sign-in identity and access." },
            } satisfies RouteHandle,
          },
          {
            id: "pages-admin",
            path: "admin",
            loader: adminLoader,
            lazy: () =>
              import("../views/pages/AdminView").then((m) => ({ Component: m.AdminView })),
            handle: {
              heading: {
                title: "Admin",
                description: "Operational health and usage analytics across the deployment.",
              },
            } satisfies RouteHandle,
          },
        ],
      },
      {
        // Public pages, alone.
        Component: BlankLayout,
        children: [
          {
            id: "auth-login",
            path: "auth/login",
            action: loginAction,
            lazy: () => import("../views/auth/LoginView").then((m) => ({ Component: m.LoginView })),
            handle: { public: true } satisfies RouteHandle,
          },
          {
            id: "not-found",
            path: "*",
            lazy: () =>
              import("../views/errors/NotFoundView").then((m) => ({ Component: m.NotFoundView })),
            handle: { public: true } satisfies RouteHandle,
          },
        ],
      },
    ],
  },
  // A GET only lands here by typing the URL; signing out is the POST action.
  {
    path: "/logout",
    loader: () => redirect(routePath("pages-account")),
    action: logoutAction,
    ErrorBoundary: ErrorView,
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
