import { useI18n } from "./i18n";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Home, Shell } from "./pages";
import "./style.css";
const MapPage = React.lazy(() =>
  import("./MapPage").then((m) => ({ default: m.MapPage })),
);
const FullText = React.lazy(() =>
  import("./FullText").then((m) => ({ default: m.FullText })),
);
function Loading() {
  const { t } = useI18n();
  return (
    <p className="loading" role="status">
      {t("Chargement…")}
    </p>
  );
}
function NotFound() {
  const { t } = useI18n();
  return (
    <main className="loading">
      <p>{t("Cette page n’existe pas.")}</p>
      <Link to="/">{t("Retour à la bibliothèque")}</Link>
    </main>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <React.Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Home />} />
            <Route path="/doc/:id" element={<MapPage />} />
            <Route path="/doc/:id/texte" element={<FullText />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
