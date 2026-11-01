import { useState } from "react";
import { RouterProvider } from "react-router/dom";
import { createAppRouter } from "./routes/router";

/** The app root: renders whichever route matches the URL. */
export function App() {
  // Created on mount, not on import, so importing App starts no router.
  const [router] = useState(createAppRouter);
  return <RouterProvider router={router} />;
}
