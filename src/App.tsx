import { useState } from "react";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router/dom";
import { createAppRouter } from "./routes/router";
import { store } from "./store";

/** The app root: renders whichever route matches the URL. */
export function App() {
  // Created on mount, not on import, so importing App starts no router.
  const [router] = useState(createAppRouter);
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}
