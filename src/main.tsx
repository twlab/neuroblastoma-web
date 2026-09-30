import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Note: the embedded WashU browser is not rendered inside <StrictMode>, matching
// the upstream embedding example (StrictMode double-mounts effects in dev, which
// the browser's store initialisation does not expect).
createRoot(document.getElementById("root")!).render(<App />);
