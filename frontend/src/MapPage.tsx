import { useI18n } from "./i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  applyNodeChanges,
  Background,
  BaseEdge,
  Controls,
  getStraightPath,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useInternalNode,
  useReactFlow,
} from "@xyflow/react";
import type {
  Edge,
  EdgeProps,
  InternalNode,
  Node,
  NodeProps,
} from "@xyflow/react";
import type { ElkNode } from "elkjs";
import {
  api,
  languageName,
  relationLabel,
  statusLabel,
  typeLabel,
} from "./api";
import type { Document, Flow, Link, Step, Suggestion } from "./api";
import {
  NODE_WIDTH,
  nodeHeight,
  reachable,
  topological,
  visibleSteps,
} from "./graph";
import { useView } from "./state";
import { Details, LinkDetails } from "./Details";

type StepData = {
  step: Step;
  children: number;
  suggestions: number;
  expanded: boolean;
  toggle: () => void;
};
type StepFlowNode = Node<StepData, "step">;

function StepNode({ data, selected }: NodeProps<StepFlowNode>) {
  const { t } = useI18n();
  const { step } = data;
  const status = step.status ?? "to_verify";
  return (
    <div
      className={`step-node type-${step.type} status-${status} ${selected ? "is-selected" : ""} ${data.expanded ? "expanded" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="step-head">
        <span className="step-type">{t(typeLabel[step.type])}</span>
        {status !== "verified" && (
          <span className="step-status">{t(statusLabel[status])}</span>
        )}
      </div>
      <strong className="step-label">{t(step.label)}</strong>
      <div className="step-foot">
        <span>
          {t("{count} passage{plural}", { count: step.anchors.length })}
        </span>
        {data.suggestions > 0 && (
          <span className="step-notes">
            {t("{count} remarque{plural}", { count: data.suggestions })}
          </span>
        )}
        {data.children > 0 && (
          <button
            className="expand-button nodrag"
            aria-expanded={data.expanded}
            aria-label={t(
              data.expanded
                ? "Masquer les sous-étapes de « {label} »"
                : "Afficher les {count} sous-étapes de « {label} »",
              { label: t(step.label), count: data.children },
            )}
            onClick={(e) => {
              e.stopPropagation();
              data.toggle();
            }}
          >
            {data.expanded ? "−" : "+"} {data.children}
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// Point where the segment between two node centres leaves the first node's box.
function borderPoint(node: InternalNode, other: InternalNode) {
  const w = (node.measured.width ?? NODE_WIDTH) / 2;
  const h = (node.measured.height ?? 100) / 2;
  const cx = node.internals.positionAbsolute.x + w;
  const cy = node.internals.positionAbsolute.y + h;
  const ox =
    other.internals.positionAbsolute.x +
    (other.measured.width ?? NODE_WIDTH) / 2;
  const oy =
    other.internals.positionAbsolute.y + (other.measured.height ?? 100) / 2;
  const dx = ox - cx;
  const dy = oy - cy;
  const scale =
    1 / Math.max(Math.abs(dx) / w || 0, Math.abs(dy) / h || 0, 1e-6);
  return { x: cx + dx * Math.min(1, scale), y: cy + dy * Math.min(1, scale) };
}

// Contradictions are symmetric: a straight dashed segment between the two boxes.
function TensionEdge({
  id,
  source,
  target,
  style,
  label,
  labelStyle,
  labelBgStyle,
  interactionWidth,
}: EdgeProps) {
  const from = useInternalNode(source);
  const to = useInternalNode(target);
  if (!from || !to) return null;
  const a = borderPoint(from, to);
  const b = borderPoint(to, from);
  const [path, labelX, labelY] = getStraightPath({
    sourceX: a.x,
    sourceY: a.y,
    targetX: b.x,
    targetY: b.y,
  });
  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelShowBg
      labelBgStyle={labelBgStyle}
      labelBgPadding={[4, 2]}
      interactionWidth={interactionWidth}
    />
  );
}

const nodeTypes = { step: StepNode };
const edgeTypes = { tension: TensionEdge };
export const colors: Record<Link["type"], string> = {
  support: "#245d5b",
  cause: "#9a5a24",
  refine: "#5f7186",
  contradict: "#a3393d",
};
export const dashes: Record<Link["type"], string | undefined> = {
  support: undefined,
  cause: undefined,
  refine: "2 4",
  contradict: "7 5",
};

export function LineSample({ type }: { type: Link["type"] }) {
  return (
    <svg className="line-sample" width="34" height="10" aria-hidden="true">
      <line
        x1="1"
        y1="5"
        x2={type === "contradict" ? 33 : 27}
        y2="5"
        stroke={colors[type]}
        strokeWidth={type === "cause" ? 2.4 : 1.6}
        strokeDasharray={dashes[type]}
      />
      {type !== "contradict" && (
        <path d="M26 1.5 L33 5 L26 8.5 z" fill={colors[type]} />
      )}
    </svg>
  );
}

export function MapPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState<{
    flow: Flow;
    doc: Document;
    suggestions: Suggestion[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    useView.getState().reset();
    setData(null);
    setError("");
    Promise.all([
      api<Flow>(`/api/docs/${id}/flow`),
      api<Document>(`/api/docs/${id}`),
      api<Suggestion[]>(`/api/docs/${id}/suggestions`),
    ])
      .then(([flow, doc, suggestions]) => {
        if (!active) return;
        setData({ flow, doc, suggestions });
        const key = params.get("step");
        if (key && flow.steps.some((s) => s.id === key)) {
          useView.getState().setSelected(key);
          const parent = flow.steps.find((s) => s.id === key)?.parent;
          if (parent) useView.getState().toggle(parent);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, params]);
  if (error)
    return (
      <main className="loading">
        <p className="error">{t(error)}</p>
        <RouterLink to="/">{t("Retour à la bibliothèque")}</RouterLink>
      </main>
    );
  if (!data)
    return (
      <p className="loading" role="status">
        {t("Ouverture de la carte…")}
      </p>
    );
  return (
    <ReactFlowProvider>
      <MapWorkspace {...data} />
    </ReactFlowProvider>
  );
}

function MapGuide({ flow }: { flow: Flow }) {
  const { t } = useI18n();
  const counts = new Map<string, number>();
  for (const p of flow.patterns ?? [])
    counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
  const patterns: [string, string, string][] = [
    [
      "divergence",
      "{count} divergence{plural}",
      "Divergence : une même étape ouvre plusieurs suites.",
    ],
    [
      "convergence",
      "{count} convergence{plural}",
      "Convergence : plusieurs raisons aboutissent à la même étape.",
    ],
    [
      "contradiction",
      "{count} contradiction{plural}",
      "Contradiction : deux étapes sont en tension.",
    ],
    [
      "refinement",
      "{count} précision{plural}",
      "Précision : une étape en détaille ou en restreint une autre.",
    ],
    [
      "causality",
      "{count} lien{plural} de cause",
      "Cause : le texte présente une étape comme produisant l’autre.",
    ],
  ];
  return (
    <div className="map-guide">
      <h2>{t("Lire la carte")}</h2>
      <p>
        {t(
          "Cliquez sur une étape pour voir le passage sur lequel elle repose, ou sur une flèche pour comparer les deux passages qu’elle relie.",
        )}
      </p>
      <h3>{t("Étapes")}</h3>
      <ul className="legend-types">
        {Object.entries(typeLabel).map(([key, label]) => (
          <li key={key}>
            <span className={`type-swatch type-${key}`} aria-hidden="true" />
            {t(label)}
          </li>
        ))}
      </ul>
      <h3>{t("Relations")}</h3>
      <ul className="legend-links">
        {(Object.keys(relationLabel) as Link["type"][]).map((key) => (
          <li key={key}>
            <LineSample type={key} />
            {t(relationLabel[key])}
          </li>
        ))}
      </ul>
      <ul className="legend-notes">
        <li>
          {t(
            "Cadre pointillé : le contrôle automatique n’a pas confirmé le soutien du passage cité.",
          )}
        </li>
        <li>
          {t("« + 3 » : l’étape a trois sous-étapes, cliquez pour les voir.")}
        </li>
        <li>
          {t(
            "Clavier : Tab passe d’une étape à l’autre, Entrée ouvre l’étape, Échap ferme le panneau.",
          )}
        </li>
      </ul>
      {counts.size > 0 && (
        <>
          <h3>{t("Structure repérée")}</h3>
          <dl className="pattern-list">
            {patterns
              .filter(([key]) => counts.has(key))
              .map(([key, count, definition]) => (
                <div key={key}>
                  <dt>{t(count, { count: counts.get(key)! })}</dt>
                  <dd>{t(definition)}</dd>
                </div>
              ))}
          </dl>
        </>
      )}
    </div>
  );
}

function MapWorkspace({
  flow,
  doc,
  suggestions,
}: {
  flow: Flow;
  doc: Document;
  suggestions: Suggestion[];
}) {
  const { t, locale } = useI18n();
  const {
    selected,
    selectedLink,
    expanded,
    focus,
    setSelected,
    setLink,
    toggle,
    setFocus,
  } = useView();
  const graphPanel = useRef<HTMLElement>(null);
  const [nodes, setNodes] = useState<StepFlowNode[]>([]);
  const [layoutError, setLayoutError] = useState("");
  const [filters, setFilters] = useState<Link["type"][]>([
    "support",
    "cause",
    "refine",
    "contradict",
  ]);
  const [order, setOrder] = useState("logic");
  const [playing, setPlaying] = useState(false);
  const { fitView, setCenter, getNode } = useReactFlow<StepFlowNode>();
  useEffect(() => {
    const element = graphPanel.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void fitView({ padding: 0.12 }), 100);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [fitView]);
  const labels = useMemo(
    () => Object.fromEntries(flow.steps.map((s) => [s.id, t(s.label)])),
    [flow.steps, t],
  );
  const steps = useMemo(
    () => visibleSteps(flow.steps, expanded),
    [flow.steps, expanded],
  );
  const walk = useMemo(
    () =>
      order === "text"
        ? [...steps].sort(
            (a, b) => (a.first_position ?? 0) - (b.first_position ?? 0),
          )
        : topological(steps, flow.links),
    [steps, flow.links, order],
  );
  const choose = useCallback(
    (key: string) => {
      setSelected(key);
      const node = getNode(key);
      if (node) {
        const parent = node.parentId ? getNode(node.parentId) : undefined;
        void setCenter(
          node.position.x +
            (parent?.position.x || 0) +
            (node.measured?.width || NODE_WIDTH) / 2,
          node.position.y +
            (parent?.position.y || 0) +
            (node.measured?.height || 110) / 2,
          {
            zoom: 0.9,
            duration: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? 0
              : 250,
          },
        );
      }
    },
    [getNode, setCenter, setSelected],
  );
  useEffect(() => {
    const worker = new Worker(new URL("./layout.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (
      event: MessageEvent<{ children: ElkNode[]; error?: string }>,
    ) => {
      if (event.data.error) {
        setLayoutError(event.data.error);
        return;
      }
      const result: StepFlowNode[] = [];
      const append = (n: ElkNode, parentId?: string) => {
        const step = flow.steps.find((s) => s.id === n.id);
        if (!step) return;
        result.push({
          id: n.id,
          type: "step",
          position: { x: n.x || 0, y: n.y || 0 },
          parentId,
          extent: parentId ? "parent" : undefined,
          style: {
            width: n.width || NODE_WIDTH,
            height: n.height || nodeHeight(labels[step.id]),
          },
          data: {
            step,
            children: flow.steps.filter((s) => s.parent === step.id).length,
            suggestions: suggestions.filter(
              (s) => s.target_type === "step" && s.target_id === step.id,
            ).length,
            expanded: expanded.includes(step.id),
            toggle: () => toggle(step.id),
          },
          ariaLabel: `${t(typeLabel[step.type])} : ${labels[step.id]}. ${t(statusLabel[step.status ?? "to_verify"])}`,
        });
        n.children?.forEach((c) => append(c, n.id));
      };
      event.data.children.forEach((n) => append(n));
      setNodes(result);
      setLayoutError("");
      setTimeout(() => void fitView({ padding: 0.12 }), 70);
    };
    worker.onerror = () =>
      setLayoutError(
        "Le calcul de la disposition a échoué. Rechargez la page.",
      );
    worker.postMessage({
      steps: flow.steps,
      links: flow.links,
      expanded,
      labels,
    });
    return () => worker.terminate();
  }, [flow, expanded, suggestions, toggle, fitView, labels, t]);
  const selectedStep = flow.steps.find((s) => s.id === selected);
  const chain = useMemo(
    () =>
      selectedStep && focus
        ? reachable(
            selectedStep.id,
            flow.links,
            selectedStep.type === "conclusion" ? "up" : "down",
          )
        : null,
    [selectedStep, focus, flow.links],
  );
  const displayNodes = nodes.map((n) => ({
    ...n,
    selected: n.id === selected,
    style: { ...n.style, opacity: chain && !chain.has(n.id) ? 0.25 : 1 },
  }));
  const visible = new Set(steps.map((s) => s.id));
  const edges: Edge[] = flow.links
    .filter(
      (e) =>
        visible.has(e.src) && visible.has(e.dst) && filters.includes(e.type),
    )
    .map((e) => ({
      id: e.id,
      source: e.src,
      target: e.dst,
      type: e.type === "contradict" ? "tension" : "smoothstep",
      // Support is the default relation; other types are also named in words.
      label:
        e.connective ||
        (e.type === "support" ? undefined : t(relationLabel[e.type])),
      markerEnd:
        e.type === "contradict"
          ? undefined
          : { type: MarkerType.ArrowClosed, color: colors[e.type] },
      style: {
        stroke: colors[e.type],
        strokeWidth:
          (e.id === selectedLink ? 1.4 : 0) + (e.type === "cause" ? 2.4 : 1.6),
        strokeDasharray: dashes[e.type],
        opacity: chain && (!chain.has(e.src) || !chain.has(e.dst)) ? 0.2 : 1,
      },
      labelStyle: { fontSize: 11, fill: colors[e.type] },
      labelBgStyle: { fill: "#fbfaf6" },
      labelBgPadding: [4, 2] as [number, number],
      interactionWidth: 14,
      ariaLabel: `${t(relationLabel[e.type])} : ${labels[e.src] ?? e.src} → ${labels[e.dst] ?? e.dst}`,
    }));
  const advance = useCallback(
    (delta: number) => {
      const index = walk.findIndex((s) => s.id === selected);
      const next = Math.max(0, Math.min(walk.length - 1, index + delta));
      if (walk[next]) choose(walk[next].id);
      if (next === walk.length - 1) setPlaying(false);
    },
    [walk, selected, choose],
  );
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => advance(1), 3500);
    return () => clearTimeout(timer);
  }, [playing, advance]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setPlaying(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [setSelected]);
  const mainCount = flow.steps.filter((s) => !s.parent).length;
  return (
    <main className="map-page">
      <div className="document-heading">
        <div>
          <RouterLink className="back" to="/">
            ← {t("Bibliothèque")}
          </RouterLink>
          <h1>{t(flow.metadata.title)}</h1>
          <p className="document-meta">
            {t("{steps} étapes principales · {links} relations", {
              steps: mainCount,
              links: flow.links.length,
            })}
            {flow.metadata.demo
              ? " · " + t("Exemple préparé à la main")
              : " · " +
                t("Langue de la carte : {language}", {
                  language:
                    languageName[flow.generation.language ?? "auto"] ??
                    t("langue du document"),
                })}
          </p>
          {flow.thesis && (
            <p className="thesis">
              <span>{t("Thèse")}</span> {t(flow.thesis)}
            </p>
          )}
        </div>
        <RouterLink className="text-link" to={`/doc/${doc.id}/texte`}>
          {t("Lire le texte intégral")}
        </RouterLink>
      </div>
      <div className="map-toolbar">
        <fieldset className="filters">
          <legend>{t("Relations affichées")}</legend>
          {(Object.keys(relationLabel) as Link["type"][]).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={filters.includes(key)}
                onChange={() =>
                  setFilters((prev) =>
                    prev.includes(key)
                      ? prev.filter((k) => k !== key)
                      : [...prev, key],
                  )
                }
              />
              <LineSample type={key} />
              {t(relationLabel[key])}
            </label>
          ))}
        </fieldset>
        <label
          className="focus-control"
          title={t(
            "Estompe les étapes hors de la chaîne : en amont pour une conclusion, en aval pour les autres étapes.",
          )}
        >
          <input
            type="checkbox"
            checked={focus}
            onChange={(e) => setFocus(e.target.checked)}
          />
          {t("Isoler la chaîne de l’étape choisie")}
        </label>
        <div className="guided">
          <select
            aria-label={t("Ordre de lecture")}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="logic">{t("Ordre logique")}</option>
            <option value="text">{t("Ordre du texte")}</option>
          </select>
          <button
            className="secondary"
            aria-label={t("Étape précédente")}
            onClick={() => advance(-1)}
          >
            ←
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (!selected && walk[0]) choose(walk[0].id);
              setPlaying(!playing);
            }}
          >
            {t(playing ? "Pause" : "Lecture guidée")}
          </button>
          <button
            className="secondary"
            aria-label={t("Étape suivante")}
            onClick={() => advance(1)}
          >
            →
          </button>
        </div>
      </div>
      <div
        className={`map-workspace ${selectedLink && !selectedStep ? "link-open" : ""}`}
      >
        <section
          ref={graphPanel}
          className="graph-panel"
          aria-label={t("Carte du raisonnement")}
          onKeyDownCapture={(event) => {
            const target = event.target as HTMLElement;
            const node = target.closest<HTMLElement>(".react-flow__node");
            if (
              event.key === "Enter" &&
              node?.dataset.id &&
              target.tagName !== "BUTTON"
            ) {
              event.preventDefault();
              event.stopPropagation();
              setSelected(node.dataset.id);
            }
          }}
        >
          {layoutError && <p className="error">{t(layoutError)}</p>}
          <ReactFlow
            nodes={displayNodes}
            onNodesChange={(changes) =>
              setNodes((previous) => applyNodeChanges(changes, previous))
            }
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, node) => setSelected(node.id)}
            onEdgeClick={(_, edge) => setLink(edge.id)}
            onPaneClick={() => setSelected(null)}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
            minZoom={0.15}
            maxZoom={1.8}
            ariaLabelConfig={{
              "node.a11yDescription.default": t(
                "Appuyez sur Entrée pour ouvrir l’étape, Échap pour fermer.",
              ),
              "edge.a11yDescription.default": t(
                "Sélectionnez une relation pour comparer ses deux passages.",
              ),
              "controls.zoomIn.ariaLabel": t("Zoom avant"),
              "controls.zoomOut.ariaLabel": t("Zoom arrière"),
              "controls.fitView.ariaLabel": t("Adapter à la fenêtre"),
              "controls.ariaLabel": t("Commandes de la carte"),
              "minimap.ariaLabel": t("Vue d’ensemble"),
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#d3d8cf" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => (n.id === selected ? "#245d5b" : "#c3cec3")}
              pannable
              zoomable
            />
          </ReactFlow>
          <p className="graph-caption">
            {t(
              "Les flèches vont d’une raison vers ce qu’elle appuie. Cadre pointillé : soutien non confirmé.",
            )}
          </p>
        </section>
        <aside className="detail-panel" key={locale}>
          {selectedStep ? (
            <Details
              key={selectedStep.id}
              step={selectedStep}
              doc={doc}
              flow={flow}
              suggestions={suggestions}
            />
          ) : selectedLink ? (
            <LinkDetails
              edge={flow.links.find((e) => e.id === selectedLink)!}
              doc={doc}
              flow={flow}
              suggestions={suggestions}
            />
          ) : (
            <MapGuide flow={flow} />
          )}
        </aside>
      </div>
    </main>
  );
}
