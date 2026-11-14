import { createBrowserRouter, matchRoutes, redirect } from "react-router";
import type { RouteObject } from "react-router";
import { DefaultLayout } from "../views/layouts/DefaultLayout";
import { BlankLayout } from "../views/layouts/BlankLayout";
import { ErrorView } from "../views/errors/ErrorView";
import { DEFAULT_ROUTE, findApp, routePath } from "../config/routes";
import type { RouteHandle } from "../config/routes";
import {
  adminLoader,
  guard,
  loginAction,
  logoutAction,
  requireAdminLoader,
} from "../views/auth/session";

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
      {
        index: true,
        loader: ({ request }) => {
          const { search, hash } = new URL(request.url);
          return redirect(DEFAULT_ROUTE + search + hash);
        },
      },
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
            id: "space-sources",
            path: "space/sources",
            lazy: () =>
              import("../views/space/sources/SourcesView").then((m) => ({
                Component: m.SourcesView,
              })),
            handle: {
              heading: {
                title: "Search sources",
                description:
                  "The categories Search and Assist can focus on, the sites each one searches first, and its built-in tools.",
              },
            } satisfies RouteHandle,
          },
          {
            id: "space-tools",
            path: "space/tools",
            // /admin/tools is admin-only, so the page is too.
            loader: requireAdminLoader,
            lazy: () =>
              import("../views/space/tools/ToolsView").then((m) => ({ Component: m.ToolsView })),
            handle: {
              heading: {
                title: "Tools",
                description:
                  "Every tool agents can call, by provider. Test one, or register an OpenAPI provider.",
              },
            } satisfies RouteHandle,
          },
          {
            id: "space-datasets",
            path: "space/datasets",
            // /api/datasets is admin-only (it shows server paths), so the page is too.
            loader: requireAdminLoader,
            lazy: () =>
              import("../views/space/datasets/ListView").then((m) => ({
                Component: m.ListView,
              })),
            handle: {
              heading: {
                title: "Datasets",
                description:
                  "The corpora registered for the retrieval server, and which ones it is serving.",
              },
            } satisfies RouteHandle,
          },
          {
            id: "space-datasets-detail",
            path: "space/datasets/:name",
            loader: requireAdminLoader,
            lazy: () =>
              import("../views/space/datasets/DatasetDetailView").then((m) => ({
                Component: m.DatasetDetailView,
              })),
            handle: {
              heading: (params) => ({
                title: params.name ?? "Dataset",
                description: "The documents in this corpus, as the retrieval server indexes them.",
              }),
            } satisfies RouteHandle,
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
