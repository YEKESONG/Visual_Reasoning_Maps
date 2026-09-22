import { useI18n } from "./i18n";
import { useEffect, useMemo, useState } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "./api";
import type { Document, Flow } from "./api";
import { HtmlSource, PdfPage } from "./SourceView";
export function FullText() {
  const { t } = useI18n();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const current = params.get("s") || undefined;
  const [data, setData] = useState<{ doc: Document; flow: Flow } | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Document>(`/api/docs/${id}`),
      api<Flow>(`/api/docs/${id}/flow`),
    ])
      .then(([doc, flow]) => {
        if (active) setData({ doc, flow });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const anchors = useMemo(() => {
    if (!data) return [];
    const ids = new Set(data.flow.steps.flatMap((s) => s.anchors));
    return (data.doc.sentences ?? []).filter((s) => ids.has(s.id));
  }, [data]);
  useEffect(() => {
    if (!current || !data || data.doc.kind !== "pdf") return;
    const sentence = data.doc.sentences?.find((s) => s.id === current);
    if (sentence?.page) {
      document
        .getElementById(`page-${sentence.page}`)
        ?.scrollIntoView({ block: "start" });
      const timer = setTimeout(
        () =>
          document
            .getElementById(`anchor-${current}`)
            ?.scrollIntoView({ block: "center" }),
        180,
      );
      return () => clearTimeout(timer);
    }
  }, [current, data]);
  function returnToMap(sentence: string) {
    const step = data?.flow.steps.find((s) => s.anchors.includes(sentence));
    if (step) navigate(`/doc/${id}?step=${encodeURIComponent(step.id)}`);
  }
  if (error)
    return (
      <main className="loading">
        <p className="error">{t(error)}</p>
      </main>
    );
  if (!data) return <p className="loading">{t("Ouverture du texte…")}</p>;
  return (
    <main className="fulltext">
      <header className="reader-heading">
        <RouterLink to={`/doc/${id}`}>{t("← Revenir à la carte")}</RouterLink>
        <h1>{t(data.doc.title)}</h1>
        <p>
          {t(
            "Texte intégral · Cliquez sur un passage surligné pour retrouver son étape.",
          )}
        </p>
        {(data.doc.warnings ?? []).map((w, i) => (
          <p className="reader-note" key={i}>
            {t(w)}
          </p>
        ))}
      </header>
      <div className="reader-pages">
        {data.doc.kind === "pdf" ? (
          (data.doc.pages ?? []).map((_, index) => (
            <section className="reader-sheet" key={index}>
              <p className="page-caption">
                {t("Page {page}", { page: index + 1 })}
              </p>
              <PdfPage
                doc={data.doc}
                page={index + 1}
                anchors={anchors.filter((s) => s.page === index + 1)}
                current={current}
                onSentence={returnToMap}
                full
              />
            </section>
          ))
        ) : (
          <HtmlSource
            doc={data.doc}
            anchors={anchors}
            current={current}
            onSentence={returnToMap}
            full
          />
        )}
      </div>
      <nav
        className="position-rail"
        aria-label={t("Position des idées dans le texte")}
      >
        <span>{t("Le fil du texte")}</span>
        <div>
          {data.flow.steps
            .filter((s) => !s.parent)
            .map((step, index) => (
              <button
                key={step.id}
                style={{
                  top: `${5 + (step.first_position / Math.max(1, (data.doc.sentences?.length ?? 1) - 1)) * 88}%`,
                }}
                aria-label={t("Aller au passage : {label}", {
                  label: t(step.label),
                })}
                title={t(step.label)}
                onClick={() => setParams({ s: step.anchors[0] })}
              >
                {index + 1}
              </button>
            ))}
        </div>
      </nav>
    </main>
  );
}
