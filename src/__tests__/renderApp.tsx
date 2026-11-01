import { render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { RouterProvider } from "react-router";
import { createAppRouter } from "../routes/router";
import { clearAccount } from "../store/account";

const routers: ReturnType<typeof createAppRouter>[] = [];

afterEach(() => {
  routers.splice(0).forEach((router) => router.dispose());
  clearAccount();
});

/** Renders the app and waits for the session loader to mount a layout. */
export async function renderApp() {
  const router = createAppRouter();
  routers.push(router);
  const result = render(<RouterProvider router={router} />);
  await screen.findByRole("main", { name: "Agentic Search workspace" });
  return result;
}
