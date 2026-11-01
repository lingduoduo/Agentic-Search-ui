import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach } from "vitest";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import { createAppRouter } from "../routes/router";
import { store } from "../store";
import { accountCleared } from "../store/account";

const routers: ReturnType<typeof createAppRouter>[] = [];

afterEach(() => {
  routers.splice(0).forEach((router) => router.dispose());
  store.dispatch(accountCleared());
});

/** Renders `ui` inside the Redux store, as App does. */
export const renderWithStore = (ui: ReactNode) =>
  render(ui, { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });

/** Renders the app and waits for the session loader to mount a layout. */
export async function renderApp() {
  const router = createAppRouter();
  routers.push(router);
  const result = renderWithStore(<RouterProvider router={router} />);
  await screen.findByRole("main", { name: "Agentic Search workspace" });
  return result;
}
