import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register push service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/push-sw.js').catch((err) => {
      console.log('Service worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
