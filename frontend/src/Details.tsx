import { useI18n, translate } from "./i18n";
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
  const { t, locale } = useI18n();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setExplanation(null);
    setError("");
    setLoading(false);
  }, [step.id, locale]);
  async function explain() {
    setLoading(true);
    setError("");
    try {
      setExplanation(
        await api<Explanation>(
          `/api/docs/${doc.id}/steps/${encodeURIComponent(step.id)}/explanation`,
          { method: "POST", headers: { "X-UI-Language": locale } },
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
        {t(typeLabel[step.type])} · {step.id}
      </p>
      <h2>{t(step.label)}</h2>
      <p className={`status ${step.status}`}>
        {t(statusLabel[step.status])} · {t("Confiance déclarée")}{" "}
        {Math.round(step.confidence * 100)} %
      </p>
      <p>{t(step.summary)}</p>
      <h3 className="detail-section-title">{t("Ce que dit le texte")}</h3>
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
        {t("Voir dans le texte intégral ↗")}
      </RouterLink>
      <section className="detail-section">
        <h3 className="detail-section-title">
          {t("Comprendre la transition")}
        </h3>
        {explanation ? (
          <p className="explanation">
            {flow.metadata.demo
              ? t(step.summary) +
                " " +
                t(
                  "Démonstration éditoriale : consultez les passages cités pour vérifier cette interprétation.",
                )
              : explanation.explanation}
          </p>
        ) : (
          <button
            className="secondary"
            disabled={loading}
            onClick={() => void explain()}
          >
            {t(
              loading
                ? "Préparation de l’explication…"
                : "Expliquer cette étape",
            )}
          </button>
        )}
        {error && (
          <p role="alert" className="error">
            {t(error)}
          </p>
        )}
      </section>
      {(flow.terms ?? [])
        .filter((t) => t.step_ids.includes(step.id))
        .map((t) => (
          <section className="term" key={translate(t.term, locale)}>
            <strong>{translate(t.term, locale)}</strong>
            <p>{translate(t.definition, locale)}</p>
            <small>{t.anchors.join(" · ")}</small>
          </section>
        ))}
      {comments.length > 0 && (
        <section className="detail-section">
          <h3 className="detail-section-title">{t("Pistes de relecture")}</h3>
          {comments.map((s, i) => (
            <div className="suggestion" key={i}>
              <p>{t(s.message)}</p>
              {s.suggested_rewrite && (
                <blockquote>{s.suggested_rewrite}</blockquote>
              )}
              <small>
                {s.source === "rule"
                  ? t("Repère structurel")
                  : t("Suggestion du modèle")}{" "}
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
  const { t } = useI18n();
  const endpoints = [edge.src, edge.dst].map((id) =>
    flow.steps.find((s) => s.id === id),
  );
  return (
    <>
      <p className="eyebrow">{t("Relation argumentative")}</p>
      <h2>{t(relationLabel[edge.type])}</h2>
      <p className="status">{t(statusLabel[edge.status])}</p>
      {edge.connective && (
        <p>
          {t("Connecteur :")} « {edge.connective} »
        </p>
      )}
      <div className="endpoint-pair">
        {endpoints.map(
          (step) =>
            step && (
              <section key={step.id}>
                <h3>{t(step.label)}</h3>
                <blockquote>{step.quote}</blockquote>
                <SourceSnippet doc={doc} ids={step.anchors} />
                <RouterLink
                  className="source-link"
                  to={`/doc/${doc.id}/texte?s=${encodeURIComponent(step.anchors[0])}`}
                >
                  {t("Voir le passage ↗")}
                </RouterLink>
              </section>
            ),
        )}
      </div>
      {suggestions
        .filter((s) => s.target_type === "link" && s.target_id === edge.id)
        .map((s, i) => (
          <p className="suggestion" key={i}>
            {t(s.message)}
          </p>
        ))}
    </>
  );
}
