import { useI18n, translate } from "./i18n";
import { Fragment, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import type {
  Document,
  Explanation,
  Flow,
  Link,
  Step,
  Suggestion,
} from "./api";
import {
  api,
  linkStatusDetail,
  relationLabel,
  statusDetail,
  typeLabel,
} from "./api";
import { SourceSnippet } from "./SourceView";
import { useView } from "./state";

const relationSentence: Record<Link["type"], string> = {
  support: "« {from} » appuie « {to} ».",
  cause: "Selon le texte, « {from} » entraîne « {to} ».",
  refine: "« {to} » précise « {from} ».",
  contradict: "« {from} » et « {to} » sont en tension.",
};

// Human-readable location of a sentence: page for PDF, paragraph for HTML.
function usePlace(doc: Document) {
  const { t } = useI18n();
  return (id: string) => {
    const sentence = doc.sentences?.find((s) => s.id === id);
    if (doc.kind === "pdf" && sentence?.page)
      return t("p. {page}", { page: sentence.page });
    return t("paragraphe {number}", {
      number: (sentence?.paragraph_id ?? id).replace(/^p/, "").split("s")[0],
    });
  };
}

function Citations({ text, doc }: { text: string; doc: Document }) {
  const where = usePlace(doc);
  const parts = text.split(/\[(p\d+s\d+(?:\s*,\s*p\d+s\d+)*)\]/);
  return (
    <p className="explanation">
      {parts.map((part, index) =>
        index % 2 === 0 ? (
          <Fragment key={index}>{part}</Fragment>
        ) : (
          <span className="citation" key={index}>
            [
            {part.split(/\s*,\s*/).map((id, i) => (
              <Fragment key={id}>
                {i > 0 && ", "}
                <RouterLink
                  to={`/doc/${doc.id}/texte?s=${encodeURIComponent(id)}`}
                  title={id}
                >
                  {where(id)}
                </RouterLink>
              </Fragment>
            ))}
            ]
          </span>
        ),
      )}
    </p>
  );
}

function Notes({ items, doc }: { items: Suggestion[]; doc: Document }) {
  const { t } = useI18n();
  const where = usePlace(doc);
  if (!items.length) return null;
  return (
    <section className="detail-section">
      <h3>{t("Pistes de relecture")}</h3>
      {items.map((s, i) => (
        <div className={`suggestion severity-${s.severity}`} key={i}>
          <p>{t(s.message)}</p>
          {s.suggested_rewrite && (
            <p className="rewrite">
              <span>{t("Proposition")}</span> {s.suggested_rewrite}
            </p>
          )}
          <small>
            {s.source === "rule"
              ? t("Règle de structure")
              : t("Remarque du modèle")}
            {" · "}
            {s.anchors.map(where).join(", ")}
          </small>
        </div>
      ))}
    </section>
  );
}

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
  const where = usePlace(doc);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const demo = Boolean(flow.metadata.demo);
  const status = step.status ?? "to_verify";
  const parent = flow.steps.find((s) => s.id === step.parent);
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
  const terms = (flow.terms ?? []).filter((term) =>
    term.step_ids.includes(step.id),
  );
  return (
    <article className="step-detail">
      <p className="detail-kicker">
        {t(typeLabel[step.type])}
        {parent &&
          " · " + t("détail de « {label} »", { label: t(parent.label) })}
      </p>
      <h2>{t(step.label)}</h2>
      <p className="summary">{t(step.summary)}</p>
      <p className={`status status-${status}`}>{t(statusDetail[status])}</p>
      {!demo && (
        <p className="confidence">
          {t("Confiance indiquée par le modèle : {value}", {
            value: step.confidence.toFixed(2),
          })}
        </p>
      )}
      <section className="detail-section">
        <h3>{t("Passage cité")}</h3>
        <blockquote>{step.quote}</blockquote>
        <SourceSnippet doc={doc} ids={step.anchors} />
        <p className="anchor-links">
          {t("Dans le texte intégral :")}{" "}
          {step.anchors.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && " · "}
              <RouterLink
                to={`/doc/${doc.id}/texte?s=${encodeURIComponent(id)}`}
                title={id}
              >
                {where(id)}
              </RouterLink>
            </Fragment>
          ))}
        </p>
      </section>
      <section className="detail-section">
        <h3>{t("Explication")}</h3>
        {explanation ? (
          demo ? (
            <p className="explanation">
              {t(step.summary) +
                " " +
                t(
                  "Exemple préparé à la main : aucune explication n’est générée, relisez le passage cité.",
                )}
            </p>
          ) : (
            <Citations text={explanation.explanation} doc={doc} />
          )
        ) : (
          <>
            <button
              className="secondary"
              disabled={loading}
              onClick={() => void explain()}
            >
              {t(
                loading
                  ? "Rédaction de l’explication…"
                  : "Expliquer cette étape",
              )}
            </button>
            {!demo && (
              <p className="hint">
                {t(
                  "Le modèle rédige l’explication à partir des passages cités et des étapes qui mènent à celle-ci.",
                )}
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {t(error)}
          </p>
        )}
      </section>
      {terms.length > 0 && (
        <section className="detail-section">
          <h3>{t("Termes")}</h3>
          {terms.map((term) => (
            <div className="term" key={term.term}>
              <strong>{translate(term.term, locale)}</strong>
              <p>{translate(term.definition, locale)}</p>
              <small>{term.anchors.map(where).join(", ")}</small>
            </div>
          ))}
        </section>
      )}
      <Notes
        items={suggestions.filter(
          (s) => s.target_type === "step" && s.target_id === step.id,
        )}
        doc={doc}
      />
    </article>
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
  const setSelected = useView((s) => s.setSelected);
  const [from, to] = [edge.src, edge.dst].map((id) =>
    flow.steps.find((s) => s.id === id),
  );
  const status = edge.status ?? "to_verify";
  return (
    <article className="link-detail">
      <p className="detail-kicker">{t("Relation")}</p>
      <h2>{t(relationLabel[edge.type])}</h2>
      {from && to && (
        <p className="summary">
          {t(relationSentence[edge.type], {
            from: t(from.label),
            to: t(to.label),
          })}
        </p>
      )}
      <p className={`status status-${status}`}>{t(linkStatusDetail[status])}</p>
      {edge.connective && (
        <p>
          {t("Mots de liaison dans le texte : « {words} »", {
            words: edge.connective,
          })}
        </p>
      )}
      <div className="endpoint-pair">
        {[from, to].map(
          (step, index) =>
            step && (
              <section key={step.id}>
                <p className="detail-kicker">
                  {t(index === 0 ? "Point de départ" : "Point d’arrivée")}
                </p>
                <h3>
                  <button
                    className="link-button"
                    onClick={() => setSelected(step.id)}
                  >
                    {t(step.label)}
                  </button>
                </h3>
                <blockquote>{step.quote}</blockquote>
                <SourceSnippet doc={doc} ids={step.anchors} />
                <RouterLink
                  className="source-link"
                  to={`/doc/${doc.id}/texte?s=${encodeURIComponent(step.anchors[0])}`}
                >
                  {t("Voir dans le texte intégral")}
                </RouterLink>
              </section>
            ),
        )}
      </div>
      <Notes
        items={suggestions.filter(
          (s) => s.target_type === "link" && s.target_id === edge.id,
        )}
        doc={doc}
      />
    </article>
  );
}
