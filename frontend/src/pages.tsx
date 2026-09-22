import { useI18n, useLocale, type Locale, type AnalysisLanguage } from "./i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { api, languageName } from "./api";
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
          Visual Reasoning Maps
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
  const [docs, setDocs] = useState<Metadata[] | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [url, setUrl] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [task, setTask] = useState<TaskEvent | null>(null);
  const source = useRef<EventSource | null>(null);
  const navigate = useNavigate();
  const busy = task !== null;

  const refresh = useCallback(() => {
    void api<Metadata[]>("/api/docs")
      .then(setDocs)
      .catch((e) => setFailure({ message: String(e.message) }));
  }, []);

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
    refresh();
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
  }, [refresh, follow]);

  async function submit(file?: File) {
    setFailure(null);
    setTask({ step: "Envoi du document", progress: 0, status: "running" });
    try {
      const language =
        analysisLanguage === "interface" ? locale : analysisLanguage;
      const data = new FormData();
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

  const date = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale, {
    dateStyle: "medium",
  });
  return (
    <main className="library">
      <section className="new-map" aria-labelledby="new-map-title">
        <h1 id="new-map-title">{t("Nouvelle carte")}</h1>
        <p className="intro">
          {t(
            "Importez un article en PDF ou collez le lien de sa version HTML sur arXiv. Le modèle relève les étapes de l’argumentation et relie chacune aux phrases du texte : chaque étape s’ouvre sur le passage d’origine.",
          )}
        </p>
        {health && !health.configured && (
          <p className="notice">
            {t(
              "Aucune clé API n’est configurée. Les exemples restent consultables ; pour analyser un document, ajoutez DEEPSEEK_API_KEY dans .env puis redémarrez le serveur.",
            )}
          </p>
        )}
        <div className="import-controls">
          <label className={`upload-button ${busy ? "disabled" : ""}`}>
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
              placeholder="https://arxiv.org/html/2404.16130"
              value={url}
              disabled={busy}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button disabled={busy || !url.trim()}>
              {t("Générer la carte")}
            </button>
          </form>
        </div>
        <div className="analysis-language">
          <label>
            {t("Langue de la carte")}{" "}
            <select
              aria-label={t("Langue de la carte")}
              value={analysisLanguage}
              onChange={(e) =>
                setAnalysisLanguage(e.target.value as AnalysisLanguage)
              }
            >
              <option value="interface">{t("Comme l’interface")}</option>
              <option value="auto">{t("Comme le document")}</option>
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <span>{t("Les citations restent dans la langue du document.")}</span>
        </div>
        <p className="privacy">
          {t(
            "Le texte du document est envoyé au modèle défini dans .env ({model}). Le PDF et les cartes restent dans le dossier data/ de cette machine.",
            { model: health?.model ?? "LLM_MODEL" },
          )}
        </p>
        {task && (
          <div className="progress" role="status">
            <div className="progress-line">
              <span>{t(task.step)}</span>
              <span>{task.progress} %</span>
            </div>
            <progress max={100} value={task.progress} />
            <p>
              {t(
                "Comptez quelques minutes pour un article. Vous pouvez quitter cette page : la carte apparaîtra dans la bibliothèque une fois prête.",
              )}
            </p>
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
      </section>
      <section className="shelf" aria-labelledby="shelf-title">
        <div className="section-heading">
          <h2 id="shelf-title">{t("Bibliothèque")}</h2>
          {docs && (
            <span>{t("{count} document{plural}", { count: docs.length })}</span>
          )}
        </div>
        {docs?.length === 0 && (
          <p className="empty">
            {t(
              "Aucune carte pour l’instant. Importez un PDF ou collez un lien arXiv ci-dessus.",
            )}
          </p>
        )}
        {docs && docs.length > 0 && (
          <ul className="document-list">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link className="document-row" to={`/doc/${doc.id}`}>
                  <span className="doc-title">{t(doc.title)}</span>
                  <span className="doc-meta">
                    {doc.demo ? (
                      t("Exemple préparé à la main · sans clé API")
                    ) : (
                      <>
                        {doc.kind.toUpperCase()}
                        {doc.language &&
                          " · " +
                            (languageName[doc.language] ??
                              t("langue du document"))}
                        {" · " + date.format(new Date(doc.created_at))}
                      </>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer>
        {t(
          "Une carte est la lecture d’un texte par un modèle. En cas de doute, le passage original fait foi.",
        )}
      </footer>
    </main>
  );
}
