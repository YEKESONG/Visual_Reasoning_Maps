import { useI18n, useLocale, type Locale, type AnalysisLanguage } from "./i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { api } from "./api";
import type { Health, Metadata, TaskAccepted, TaskEvent } from "./api";

const TASK_KEY = "vrm.task";

function remember(taskId: string | null) {
  try {
    if (taskId) sessionStorage.setItem(TASK_KEY, taskId);
    else sessionStorage.removeItem(TASK_KEY);
  } catch {
    /* Resuming after a reload is a convenience only. */
  }
}

function remembered(): string | null {
  try {
    return sessionStorage.getItem(TASK_KEY);
  } catch {
    return null;
  }
}

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
type Failure = { message: string; params?: Record<string, string> };

export function Home() {
  const { t, locale } = useI18n();
  const { analysisLanguage, setAnalysisLanguage } = useLocale();
  const [docs, setDocs] = useState<Metadata[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [url, setUrl] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [task, setTask] = useState<TaskEvent | null>(null);
  const source = useRef<EventSource | null>(null);
  const navigate = useNavigate();
  const busy = task !== null;

  const follow = useCallback(
    (taskId: string) => {
      source.current?.close();
      remember(taskId);
      const events = new EventSource(`/api/tasks/${taskId}/events`);
      source.current = events;
      events.onmessage = (event) => {
        const value = JSON.parse(event.data) as TaskEvent;
        if (value.status === "done") {
          events.close();
          remember(null);
          navigate(`/doc/${value.doc_id}`);
        } else if (value.status === "error") {
          events.close();
          remember(null);
          setTask(null);
          setFailure({
            message: value.error || value.step,
            params: value.params,
          });
        } else {
          setTask(value);
        }
      };
      events.onerror = () => {
        events.close();
        setTask(null);
        setFailure({
          message:
            "Le suivi de l’analyse a été interrompu. Rechargez la page : une carte terminée apparaîtra dans la bibliothèque.",
        });
      };
    },
    [navigate],
  );

  useEffect(() => {
    void api<Metadata[]>("/api/docs")
      .then(setDocs)
      .catch((e) => setFailure({ message: String(e.message) }));
    void api<Health>("/api/health")
      .then(setHealth)
      .catch(() => setHealth(null));
    const previous = remembered();
    if (previous) {
      // Resume following an analysis started before a reload.
      void api<TaskEvent>(`/api/tasks/${previous}`)
        .then((value) => {
          if (value.status === "running") {
            setTask(value);
            follow(previous);
          } else remember(null);
        })
        .catch(() => remember(null));
    }
    return () => source.current?.close();
  }, [follow]);

  async function submit(file?: File) {
    setFailure(null);
    setTask({ step: "Envoi du document", progress: 0, status: "running" });
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
      follow(result.task_id!);
    } catch (e) {
      setFailure({ message: (e as Error).message });
      setTask(null);
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
        {health && !health.configured && (
          <p className="notice">
            {t(
              "Aucune clé API n’est configurée. Les exemples restent consultables ; pour analyser un document, ajoutez DEEPSEEK_API_KEY dans .env puis redémarrez le serveur.",
            )}
          </p>
        )}
      </section>
      {task && (
        <div className="progress" role="status">
          <span>{t(task.step)}</span>
          <progress max={100} value={task.progress} />
          <span>{task.progress} %</span>
          <small>
            {t(
              "Comptez quelques minutes pour un article. Vous pouvez quitter cette page : la carte apparaîtra dans la bibliothèque une fois prête.",
            )}
          </small>
        </div>
      )}
      {failure && (
        <p className="error" role="alert">
          {t(failure.message, {
            ...Object.fromEntries(
              Object.entries(failure.params ?? {}).map(([k, v]) => [k, t(v)]),
            ),
          })}
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
