import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { SurfaceLayout } from "../pages/SurfaceLayout";
import { SessionListView } from "../pages/SessionListView";
import { SessionDetailView } from "../pages/SessionDetailView";
import { App } from "../apps/App";
import { AssistPage } from "../pages/AssistPage";
import { SearchView } from "../pages/SearchView";
import { ChatView } from "../pages/ChatView";
import { ToolAgentView } from "../pages/ToolAgentView";

export const appRoutes: RouteObject[] = [
  {
    Component: App,
    children: [
      ...[
        { path: "/assist", Workspace: AssistPage },
        { path: "/search", Workspace: SearchView },
        { path: "/chat", Workspace: ChatView },
        { path: "/tools", Workspace: ToolAgentView },
      ].map(({ path, Workspace }) => ({
        path,
        Component: SurfaceLayout,
        children: [
          { index: true, Component: SessionListView },
          { path: "new", Component: Workspace },
          { path: ":sessionId", Component: SessionDetailView },
        ],
      })),
      { path: "*", Component: SessionListView },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
