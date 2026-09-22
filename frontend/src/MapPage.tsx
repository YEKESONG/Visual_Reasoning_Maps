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
import { api, relationLabel, statusLabel, typeLabel } from "./api";
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
  dimmed: boolean;
  toggle: () => void;
};
type StepFlowNode = Node<StepData, "step">;
function StepNode({ data, selected }: NodeProps<StepFlowNode>) {
  const { t } = useI18n();
  return (
    <div
      className={`step-node ${data.step.type} ${data.step.status} ${selected ? "is-selected" : ""} ${data.expanded ? "expanded" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="step-kind">
        <span>{t(typeLabel[data.step.type])}</span>
        <span>
          {data.step.status === "to_verify"
            ? "?"
            : data.step.status === "partial"
              ? "◐"
              : "✓"}
        </span>
      </div>
      <strong>{t(data.step.label)}</strong>
      <div className="node-bottom">
        <span>
          {t("{count} passage{plural}", { count: data.step.anchors.length })}
        </span>
        {data.suggestions > 0 && (
          <span className="suggestion-count" title={t("Suggestions")}>
            {t("{count} remarque{plural}", { count: data.suggestions })}
          </span>
        )}
        {data.children > 0 && (
          <button
            className="expand-button nodrag"
            aria-label={`${t(data.expanded ? "Replier" : "Développer")} ${t(data.step.label)}`}
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
const colors = {
  support: "#245d5b",
  cause: "#a15b2b",
  refine: "#697e96",
  contradict: "#a3393d",
};
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
      timer = setTimeout(() => void fitView({ padding: 0.15 }), 100);
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
        ? [...steps].sort((a, b) => a.first_position - b.first_position)
        : topological(steps, flow.links),
    [steps, flow.links, order],
  );
  const choose = useCallback(
    (id: string) => {
      setSelected(id);
      const node = getNode(id);
      if (node) {
        const parent = node.parentId ? getNode(node.parentId) : undefined;
        void setCenter(
          node.position.x +
            (parent?.position.x || 0) +
            (node.measured?.width || NODE_WIDTH) / 2,
          node.position.y +
            (parent?.position.y || 0) +
            (node.measured?.height || 118) / 2,
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
            dimmed: false,
            toggle: () => toggle(step.id),
          },
          ariaLabel: `${t(typeLabel[step.type])} : ${t(step.label)}. ${t(statusLabel[step.status])}`,
        });
        n.children?.forEach((c) => append(c, n.id));
      };
      event.data.children.forEach((n) => append(n));
      setNodes(result);
      setLayoutError("");
      setTimeout(() => void fitView({ padding: 0.15 }), 70);
    };
    worker.onerror = () =>
      setLayoutError("Le calcul de disposition a échoué. Rechargez la page.");
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
      label: e.connective || t(relationLabel[e.type]),
      markerEnd:
        e.type === "contradict"
          ? undefined
          : { type: MarkerType.ArrowClosed, color: colors[e.type] },
      style: {
        stroke: colors[e.type],
        strokeWidth: e.id === selectedLink ? 3 : 1.7,
        strokeDasharray:
          e.type === "contradict"
            ? "6 5"
            : e.type === "refine"
              ? "3 4"
              : undefined,
        opacity: chain && (!chain.has(e.src) || !chain.has(e.dst)) ? 0.2 : 1,
      },
      labelStyle: { fontSize: 10, fill: colors[e.type] },
      labelBgStyle: { fill: "#f4f1e9" },
      ariaLabel: `${t(relationLabel[e.type])} : ${e.src} → ${e.dst}`,
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
    const timer = setTimeout(() => advance(1), 3000);
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
  return (
    <main className="map-page">
      <div className="document-heading">
        <div>
          <RouterLink className="back" to="/">
            ← {t("Bibliothèque")}
          </RouterLink>
          <h1>{t(flow.metadata.title)}</h1>
          <p>
            {t("{steps} étapes principales · {links} relations", {
              steps: flow.steps.filter((s) => !s.parent).length,
              links: flow.links.length,
            })}
            {flow.metadata.demo && " · " + t("Démonstration éditoriale")}
          </p>
          {!flow.metadata.demo && (
            <p
              className="analysis-info"
              title={t(
                "Une carte existante garde sa langue d’analyse. Les explications à la demande suivent l’interface.",
              )}
            >
              {t("Langue d’analyse : {language}", {
                language:
                  (
                    { zh: "中文", en: "English", fr: "Français" } as Record<
                      string,
                      string
                    >
                  )[flow.generation.language ?? "auto"] ??
                  t("Langue du document"),
              })}
            </p>
          )}
        </div>
        <RouterLink className="text-link" to={`/doc/${doc.id}/texte`}>
          {t("Ouvrir le texte intégral ↗")}
        </RouterLink>
      </div>
      <div className="map-toolbar">
        <fieldset className="filters">
          <legend className="sr-only">
            {t("Types de relations visibles")}
          </legend>
          {Object.entries(relationLabel).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={filters.includes(key as Link["type"])}
                onChange={() =>
                  setFilters((prev) =>
                    prev.includes(key as Link["type"])
                      ? prev.filter((k) => k !== key)
                      : [...prev, key as Link["type"]],
                  )
                }
              />
              {t(label)}
            </label>
          ))}
        </fieldset>
        <label className="focus-control">
          <input
            type="checkbox"
            checked={focus}
            onChange={(e) => setFocus(e.target.checked)}
          />
          {t("Isoler la chaîne")}
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
      <div className="map-workspace">
        <section
          ref={graphPanel}
          className="graph-panel"
          aria-label={t("Carte interactive du raisonnement")}
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
                "Appuyez sur Entrée pour ouvrir les détails, Échap pour fermer.",
              ),
              "edge.a11yDescription.default": t(
                "Sélectionnez une relation pour ouvrir ses deux sources.",
              ),
              "controls.zoomIn.ariaLabel": t("Zoom avant"),
              "controls.zoomOut.ariaLabel": t("Zoom arrière"),
              "controls.fitView.ariaLabel": t("Adapter à la fenêtre"),
              "controls.ariaLabel": t("Commandes de la carte"),
              "minimap.ariaLabel": t("Mini-carte"),
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#c8cfc4" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => (n.id === selected ? "#245d5b" : "#b6c5b7")}
              pannable
              zoomable
            />
          </ReactFlow>
          <div className="graph-caption">
            {t("Une relation relie une raison à ce qu’elle soutient.")}{" "}
            <span>{t("Cadre pointillé : à vérifier")}</span>
          </div>
        </section>
        <aside className="detail-panel">
          {selectedStep ? (
            <Details
              key={`${selectedStep.id}-${locale}`}
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
            <div className="detail-empty">
              <span className="detail-symbol">↗</span>
              <h2>
                {t("Suivez une idée")}
                <br />
                {t("jusqu’à sa source.")}
              </h2>
              <p>
                {t(
                  "Sélectionnez une étape pour examiner les passages qui la soutiennent.",
                )}
              </p>
              <p>
                {t(
                  "Les liens ouvrent les deux côtés d’une relation. Développez les étapes pour découvrir leurs détails.",
                )}
              </p>
              <div className="pattern-list">
                {[...new Set((flow.patterns ?? []).map((p) => p.type))].map(
                  (p) => (
                    <span key={p}>
                      {
                        {
                          divergence: "⑂ " + t("Divergence"),
                          convergence: "⑃ " + t("Convergence"),
                          contradiction: "↔ " + t("Contradiction"),
                          refinement: "⊞ " + t("Précision"),
                          causality: "→ " + t("Causalité"),
                        }[p]
                      }
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
