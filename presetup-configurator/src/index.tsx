import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import "./index.css";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
);

if ((import.meta as any).hot) {
  (import.meta as any).hot.accept();
}
