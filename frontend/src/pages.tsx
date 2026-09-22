import { useI18n, useLocale, type Locale, type AnalysisLanguage } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { api } from "./api";
import type { Metadata, TaskAccepted } from "./api";

export function Shell() {
  const { t, locale } = useI18n();
  const setLocale = useLocale((s) => s.setLocale);
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
  }, [locale]);
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            ⌘
          </span>
          <span>
            Visual Reasoning Maps
            <small>{t("Lire les idées. Suivre les preuves.")}</small>
          </span>
        </Link>
        <nav>
          <Link to="/">{t("Bibliothèque")}</Link>
          <label className="language-switch">
            <span>{t("Langue de l’interface")}</span>
            <select
              aria-label={t("Langue de l’interface")}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <span className="local-label">{t("Atelier de lecture · ENAC")}</span>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
export function Home() {
  const { t, locale } = useI18n();
  const { analysisLanguage, setAnalysisLanguage } = useLocale();
  const [docs, setDocs] = useState<Metadata[]>([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const source = useRef<EventSource | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    void api<Metadata[]>("/api/docs")
      .then(setDocs)
      .catch((e) => setError(String(e.message)));
    return () => source.current?.close();
  }, []);
  async function submit(file?: File) {
    setError("");
    setBusy(true);
    setProgress(0);
    setStage("Envoi du document");
    try {
      const data = new FormData();
      const language =
        analysisLanguage === "interface" ? locale : analysisLanguage;
      if (file) {
        data.append("file", file);
        data.append("language", language);
      }
      const result = await api<TaskAccepted>("/api/tasks", {
        method: "POST",
        headers: file ? undefined : { "Content-Type": "application/json" },
        body: file ? data : JSON.stringify({ arxiv_url: url, language }),
      });
      if (result.doc_id) {
        navigate(`/doc/${result.doc_id}`);
        return;
      }
      const events = new EventSource(`/api/tasks/${result.task_id}/events`);
      source.current = events;
      events.onmessage = (event) => {
        const value = JSON.parse(event.data) as {
          progress: number;
          step: string;
          status: string;
          doc_id?: string;
          error?: string;
        };
        setProgress(value.progress);
        setStage(value.step);
        if (value.status === "done") {
          events.close();
          setBusy(false);
          navigate(`/doc/${value.doc_id}`);
        }
        if (value.status === "error") {
          events.close();
          setBusy(false);
          setError(value.error || value.step);
        }
      };
      events.onerror = () => {
        events.close();
        setBusy(false);
        setError(
          "La connexion de suivi a été interrompue. Rechargez la bibliothèque pour retrouver un traitement terminé.",
        );
      };
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="library">
      <section className="intro">
        <div>
          <p className="eyebrow">{t("Un texte, un raisonnement à explorer")}</p>
          <h1>
            {t("De la question")}
            <br />
            {t("à la conclusion.")}
          </h1>
          <p className="lead">
            {t(
              "Retrouvez le fil d’un article. Explorez ses arguments, confrontez ses preuves et revenez à chaque passage.",
            )}
          </p>
        </div>
        <div
          className="intro-diagram"
          aria-label={t("Question vers prémisse et preuve, puis conclusion")}
        >
          <span>{t("Question")}</span>
          <b>↘</b>
          <span>{t("Prémisse")}</span>
          <b>→</b>
          <span>{t("Argument")}</span>
          <b>→</b>
          <span className="last">{t("Conclusion")}</span>
          <span className="evidence">{t("Preuve")} ↗</span>
          <small>{t("Chaque étape garde un lien avec le texte.")}</small>
        </div>
      </section>
      <section className="import-section">
        <div>
          <h2>{t("Commencer une lecture")}</h2>
          <p>{t("Un article PDF ou sa version HTML sur arXiv.")}</p>
        </div>
        <div className="import-controls">
          <label className="upload-button">
            {t("Importer un PDF")}
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void submit(file);
                e.target.value = "";
              }}
            />
          </label>
          <span className="or">{t("ou")}</span>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="sr-only" htmlFor="arxiv">
              {t("Lien arXiv")}
            </label>
            <input
              id="arxiv"
              type="url"
              required
              placeholder="https://arxiv.org/html/…"
              value={url}
              disabled={busy}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button disabled={busy || !url.trim()}>
              {t("Créer la carte →")}
            </button>
          </form>
        </div>
        <div className="analysis-language">
          <label>
            {t("Langue de l’analyse")}{" "}
            <select
              aria-label={t("Langue de l’analyse")}
              value={analysisLanguage}
              onChange={(e) =>
                setAnalysisLanguage(e.target.value as AnalysisLanguage)
              }
            >
              <option value="interface">{t("Suivre l’interface")}</option>
              <option value="auto">{t("Langue du document")}</option>
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <small>
            {t(
              "Les citations restent dans leur langue originale. Ce réglage s’applique aux nouvelles cartes.",
            )}
          </small>
        </div>
        <p className="import-note">
          {t(
            "Les extraits du document sont envoyés au modèle configuré pour l’analyse. Le document original et les cartes restent sur cette machine.",
          )}
        </p>
      </section>
      {busy && (
        <div className="progress" role="status">
          <span>{t(stage)}</span>
          <progress max={100} value={progress} />
          <span>{progress} %</span>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <section className="shelf">
        <div className="section-heading">
          <h2>{t("Votre bibliothèque")}</h2>
          <span>{t("{count} document{plural}", { count: docs.length })}</span>
        </div>
        {docs.length === 0 ? (
          <div className="empty">
            <h3>{t("Le prochain fil commence ici.")}</h3>
            <p>
              {t("Importez un document pour construire votre première carte.")}
            </p>
          </div>
        ) : (
          docs.map((doc, i) => (
            <Link className="document-row" to={`/doc/${doc.id}`} key={doc.id}>
              <span className="doc-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="doc-title">
                {t(doc.title)}
                <small>
                  {doc.demo
                    ? t("Démonstration commentée · Sans clé API")
                    : doc.kind.toUpperCase() + " · " + t("Carte enregistrée")}
                </small>
              </span>
              <span className="read-link">{t("Explorer la carte ↗")}</span>
            </Link>
          ))
        )}
      </section>
      <footer>
        {t(
          "Une carte est une interprétation du texte. Les passages originaux restent la référence.",
        )}
      </footer>
    </main>
  );
}
