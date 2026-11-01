import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Arco renders Message, Notification and Modal.confirm with ReactDOM.render,
// which React 19 removed; the adapter hands it createRoot instead.
import "@arco-design/web-react/es/_util/react-19-adapter";
import ConfigProvider from "@arco-design/web-react/es/ConfigProvider";
import enUS from "@arco-design/web-react/es/locale/en-US";
import { App } from "./App";
// Arco's stylesheet carries a global normalize; loading it before styles.scss
// lets the app's base styles win where the two overlap.
import "@arco-design/web-react/dist/css/arco.min.css";
import "./assets/styles/tailwind.css";
import "./assets/styles/styles.scss";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Arco's built-in strings default to Chinese. */}
    <ConfigProvider locale={enUS}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);
