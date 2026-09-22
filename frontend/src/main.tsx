import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home, Shell } from "./pages";
import "./style.css";
const MapPage = React.lazy(() =>
  import("./MapPage").then((m) => ({ default: m.MapPage })),
);
const FullText = React.lazy(() =>
  import("./FullText").then((m) => ({ default: m.FullText })),
);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <React.Suspense
        fallback={
          <p className="loading" role="status">
            Ouverture du lecteur…
          </p>
        }
      >
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/doc/:id" element={<MapPage />} />
            <Route path="/doc/:id/texte" element={<FullText />} />
            <Route
              path="*"
              element={
                <p>Cette page est introuvable. Revenez à la bibliothèque.</p>
              }
            />
          </Route>
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
