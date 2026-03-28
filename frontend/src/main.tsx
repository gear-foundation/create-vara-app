import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ChainProvider } from "./providers/chain-provider";
import "./index.css";

const endpoint =
  import.meta.env.VITE_NODE_ENDPOINT || "wss://testnet.vara.network";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChainProvider endpoint={endpoint}>
      <App />
    </ChainProvider>
  </React.StrictMode>
);
