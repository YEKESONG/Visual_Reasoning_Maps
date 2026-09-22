import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home, Shell } from "./pages";
import "./style.css";
import { MapPage } from "./MapPage";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/doc/:id" element={<MapPage />} />
          <Route
            path="*"
            element={
              <p>Cette page est introuvable. Revenez à la bibliothèque.</p>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
