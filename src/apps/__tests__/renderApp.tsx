import { render } from "@testing-library/react";
import { afterEach } from "vitest";
import { RouterProvider } from "react-router";
import { createAppRouter } from "../../routes/router";

const routers: ReturnType<typeof createAppRouter>[] = [];

afterEach(() => {
  routers.splice(0).forEach((router) => router.dispose());
});

export function renderApp() {
  const router = createAppRouter();
  routers.push(router);
  return render(<RouterProvider router={router} />);
}
