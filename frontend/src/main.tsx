import { useI18n } from "./i18n";
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
function LocalizedMessage({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <p className="loading" role="status">
      {t(message)}
    </p>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <React.Suspense
        fallback={<LocalizedMessage message="Ouverture du lecteur…" />}
      >
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/doc/:id" element={<MapPage />} />
            <Route path="/doc/:id/texte" element={<FullText />} />
            <Route
              path="*"
              element={
                <LocalizedMessage message="Cette page est introuvable. Revenez à la bibliothèque." />
              }
            />
          </Route>
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
