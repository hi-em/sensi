import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import { hydrateCssTokens } from "./lib/tokens.js";
import App from "./App.jsx";
import DevPlan from "./canvas/DevPlan.jsx";
import MobileGate from "./screens/MobileGate.jsx";
import { useIsSmallScreen } from "./lib/smallScreen.js";

// Inject the JS-authored sense tokens onto :root before first paint so the
// stylesheet's var(--thermal)/var(--i-3)/… resolve. Single source: lib/senses.js.
hydrateCssTokens();

// DEV-ONLY: ?plan=<id> renders the SensePlan rendering harness (DevPlan) instead of the
// full app, to verify plan linework without the LLM/onboarding flow. Remove with DevPlan.
const Root = new URLSearchParams(location.search).has("plan") ? DevPlan : App;

// The shape space is a fixed-viewport desktop instrument, so on a phone every
// control ends up outside a window that cannot scroll. Until the responsive
// build lands, small screens get the gate INSTEAD of the app: App never mounts,
// which means no /api/init, no session spent, and no half-working canvas behind
// it. Above the breakpoint this branch is inert and the app renders as before.
// ?plan= keeps its dev harness at any size.
function Entry() {
  const small = useIsSmallScreen();
  if (Root === DevPlan) return <DevPlan />;
  return small ? <MobileGate /> : <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Entry />
  </React.StrictMode>
);
