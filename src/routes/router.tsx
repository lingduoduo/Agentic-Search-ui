import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";
import { App } from "../apps/App";
import { AssistPage } from "../pages/AssistPage";
import { SearchView } from "../pages/SearchView";
import { ChatView } from "../pages/ChatView";
import { ToolAgentView } from "../pages/ToolAgentView";

export const appRoutes: RouteObject[] = [
  {
    Component: App,
    children: [
      { path: "/assist", Component: AssistPage },
      { path: "/search", Component: SearchView },
      { path: "/chat", Component: ChatView },
      { path: "/tools", Component: ToolAgentView },
      // The shared layout canonicalizes root and unknown URLs to /assist.
      { path: "*", Component: AssistPage },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
