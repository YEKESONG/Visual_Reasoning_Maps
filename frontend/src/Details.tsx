import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import type {
  Document,
  Explanation,
  Flow,
  Link,
  Step,
  Suggestion,
} from "./api";
import { api, relationLabel, statusLabel, typeLabel } from "./api";
import { SourceSnippet } from "./SourceView";
export function Details({
  step,
  doc,
  flow,
  suggestions,
}: {
  step: Step;
  doc: Document;
  flow: Flow;
  suggestions: Suggestion[];
}) {
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setExplanation(null);
    setError("");
    setLoading(false);
  }, [step.id]);
  async function explain() {
    setLoading(true);
    setError("");
    try {
      setExplanation(
        await api<Explanation>(
          `/api/docs/${doc.id}/steps/${encodeURIComponent(step.id)}/explanation`,
          { method: "POST" },
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const comments = suggestions.filter(
    (s) => s.target_type === "step" && s.target_id === step.id,
  );
  return (
    <>
      <p className="eyebrow">
        {typeLabel[step.type]} · {step.id}
      </p>
      <h2>{step.label}</h2>
      <p className={`status ${step.status}`}>
        {statusLabel[step.status]} · Confiance déclarée{" "}
        {Math.round(step.confidence * 100)} %
      </p>
      <p>{step.summary}</p>
      <h3 className="detail-section-title">Ce que dit le texte</h3>
      <blockquote>{step.quote}</blockquote>
      <div className="anchor-list">
        {step.anchors.map((id) => (
          <RouterLink
            key={id}
            to={`/doc/${doc.id}/texte?s=${encodeURIComponent(id)}`}
          >
            {id} ↗
          </RouterLink>
        ))}
      </div>
      <SourceSnippet doc={doc} ids={step.anchors} />
      <RouterLink
        className="source-link"
        to={`/doc/${doc.id}/texte?s=${encodeURIComponent(step.anchors[0])}`}
      >
        Voir dans le texte intégral ↗
      </RouterLink>
      <section className="detail-section">
        <h3 className="detail-section-title">Comprendre la transition</h3>
        {explanation ? (
          <p className="explanation">{explanation.explanation}</p>
        ) : (
          <button
            className="secondary"
            disabled={loading}
            onClick={() => void explain()}
          >
            {loading
              ? "Préparation de l’explication…"
              : "Expliquer cette étape"}
          </button>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>
      {(flow.terms ?? [])
        .filter((t) => t.step_ids.includes(step.id))
        .map((t) => (
          <section className="term" key={t.term}>
            <strong>{t.term}</strong>
            <p>{t.definition}</p>
            <small>{t.anchors.join(" · ")}</small>
          </section>
        ))}
      {comments.length > 0 && (
        <section className="detail-section">
          <h3 className="detail-section-title">Pistes de relecture</h3>
          {comments.map((s, i) => (
            <div className="suggestion" key={i}>
              <p>{s.message}</p>
              {s.suggested_rewrite && (
                <blockquote>{s.suggested_rewrite}</blockquote>
              )}
              <small>
                {s.source === "rule"
                  ? "Repère structurel"
                  : "Suggestion du modèle"}{" "}
                · {s.anchors.join(", ")}
              </small>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
export function LinkDetails({
  edge,
  doc,
  flow,
  suggestions,
}: {
  edge: Link;
  doc: Document;
  flow: Flow;
  suggestions: Suggestion[];
}) {
  const endpoints = [edge.src, edge.dst].map((id) =>
    flow.steps.find((s) => s.id === id),
  );
  return (
    <>
      <p className="eyebrow">Relation argumentative</p>
      <h2>{relationLabel[edge.type]}</h2>
      <p className="status">{statusLabel[edge.status]}</p>
      {edge.connective && <p>Connecteur : « {edge.connective} »</p>}
      <div className="endpoint-pair">
        {endpoints.map(
          (step) =>
            step && (
              <section key={step.id}>
                <h3>{step.label}</h3>
                <blockquote>{step.quote}</blockquote>
                <SourceSnippet doc={doc} ids={step.anchors} />
                <RouterLink
                  className="source-link"
                  to={`/doc/${doc.id}/texte?s=${encodeURIComponent(step.anchors[0])}`}
                >
                  Voir le passage ↗
                </RouterLink>
              </section>
            ),
        )}
      </div>
      {suggestions
        .filter((s) => s.target_type === "link" && s.target_id === edge.id)
        .map((s, i) => (
          <p className="suggestion" key={i}>
            {s.message}
          </p>
        ))}
    </>
  );
}
