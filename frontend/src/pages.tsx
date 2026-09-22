import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { api } from "./api";
import type { Metadata, TaskAccepted } from "./api";

export function Shell() {
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            ⌘
          </span>
          <span>
            Visual Reasoning Maps
            <small>Lire les idées. Suivre les preuves.</small>
          </span>
        </Link>
        <nav>
          <Link to="/">Bibliothèque</Link>
          <span className="local-label">Atelier de lecture · ENAC</span>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
export function Home() {
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
      if (file) data.append("file", file);
      const result = await api<TaskAccepted>("/api/tasks", {
        method: "POST",
        headers: file ? undefined : { "Content-Type": "application/json" },
        body: file ? data : JSON.stringify({ arxiv_url: url }),
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
          <p className="eyebrow">Un texte, un raisonnement à explorer</p>
          <h1>
            De la question
            <br />à la conclusion.
          </h1>
          <p className="lead">
            Retrouvez le fil d’un article. Explorez ses arguments, confrontez
            ses preuves et revenez à chaque passage.
          </p>
        </div>
        <div
          className="intro-diagram"
          aria-label="Question vers prémisse et preuve, puis conclusion"
        >
          <span>Question</span>
          <b>↘</b>
          <span>Prémisse</span>
          <b>→</b>
          <span>Argument</span>
          <b>→</b>
          <span className="last">Conclusion</span>
          <span className="evidence">Preuve ↗</span>
          <small>Chaque étape garde un lien avec le texte.</small>
        </div>
      </section>
      <section className="import-section">
        <div>
          <h2>Commencer une lecture</h2>
          <p>Un article PDF ou sa version HTML sur arXiv.</p>
        </div>
        <div className="import-controls">
          <label className="upload-button">
            Importer un PDF
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
          <span className="or">ou</span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="sr-only" htmlFor="arxiv">
              Lien arXiv
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
            <button disabled={busy || !url.trim()}>Créer la carte →</button>
          </form>
        </div>
        <p className="import-note">
          Les extraits du document sont envoyés au modèle configuré pour
          l’analyse. Le document original et les cartes restent sur cette
          machine.
        </p>
      </section>
      {busy && (
        <div className="progress" role="status">
          <span>{stage}</span>
          <progress max={100} value={progress} />
          <span>{progress} %</span>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="shelf">
        <div className="section-heading">
          <h2>Votre bibliothèque</h2>
          <span>
            {docs.length} document{docs.length !== 1 ? "s" : ""}
          </span>
        </div>
        {docs.length === 0 ? (
          <div className="empty">
            <h3>Le prochain fil commence ici.</h3>
            <p>Importez un document pour construire votre première carte.</p>
          </div>
        ) : (
          docs.map((doc, i) => (
            <Link className="document-row" to={`/doc/${doc.id}`} key={doc.id}>
              <span className="doc-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="doc-title">
                {doc.title}
                <small>
                  {doc.demo
                    ? "Démonstration commentée · Sans clé API"
                    : doc.kind.toUpperCase() + " · Carte enregistrée"}
                </small>
              </span>
              <span className="read-link">Explorer la carte ↗</span>
            </Link>
          ))
        )}
      </section>
      <footer>
        Une carte est une interprétation du texte. Les passages originaux
        restent la référence.
      </footer>
    </main>
  );
}
