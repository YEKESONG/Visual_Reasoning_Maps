import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import type { ElkNode } from "elkjs";
import { api, relationLabel, statusLabel, typeLabel } from "./api";
import type { Document, Flow, Link, Step, Suggestion } from "./api";
import { reachable, topological, visibleSteps } from "./graph";
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
  return (
    <div
      className={`step-node ${data.step.type} ${data.step.status} ${selected ? "is-selected" : ""} ${data.expanded ? "expanded" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="step-kind">
        <span>{typeLabel[data.step.type]}</span>
        <span>
          {data.step.status === "to_verify"
            ? "?"
            : data.step.status === "partial"
              ? "◐"
              : "✓"}
        </span>
      </div>
      <strong>{data.step.label}</strong>
      <div className="node-bottom">
        <span>
          {data.step.anchors.length} passage
          {data.step.anchors.length > 1 ? "s" : ""}
        </span>
        {data.suggestions > 0 && (
          <span className="suggestion-count" title="Suggestions">
            {data.suggestions} remarque{data.suggestions > 1 ? "s" : ""}
          </span>
        )}
        {data.children > 0 && (
          <button
            className="expand-button nodrag"
            aria-label={`${data.expanded ? "Replier" : "Développer"} ${data.step.label}`}
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
const nodeTypes = { step: StepNode };
const colors = {
  support: "#245d5b",
  cause: "#a15b2b",
  refine: "#697e96",
  contradict: "#a3393d",
};
export function MapPage() {
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
        <p className="error">{error}</p>
        <RouterLink to="/">Retour à la bibliothèque</RouterLink>
      </main>
    );
  if (!data)
    return (
      <p className="loading" role="status">
        Ouverture de la carte…
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
            (node.measured?.width || 235) / 2,
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
          style: { width: n.width || 235, height: n.height || 118 },
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
          ariaLabel: `${typeLabel[step.type]} : ${step.label}. ${statusLabel[step.status]}`,
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
    worker.postMessage({ steps: flow.steps, links: flow.links, expanded });
    return () => worker.terminate();
  }, [flow, expanded, suggestions, toggle, fitView]);
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
      type: "smoothstep",
      label: e.connective || relationLabel[e.type],
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
      ariaLabel: `${relationLabel[e.type]} : ${e.src} vers ${e.dst}`,
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
            ← Bibliothèque
          </RouterLink>
          <h1>{flow.metadata.title}</h1>
          <p>
            {flow.steps.filter((s) => !s.parent).length} étapes principales ·{" "}
            {flow.links.length} relations{" "}
            {flow.metadata.demo && " · Démonstration éditoriale"}
          </p>
        </div>
        <RouterLink className="text-link" to={`/doc/${doc.id}/texte`}>
          Ouvrir le texte intégral ↗
        </RouterLink>
      </div>
      <div className="map-toolbar">
        <fieldset className="filters">
          <legend className="sr-only">Types de relations visibles</legend>
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
              {label}
            </label>
          ))}
        </fieldset>
        <label className="focus-control">
          <input
            type="checkbox"
            checked={focus}
            onChange={(e) => setFocus(e.target.checked)}
          />
          Isoler la chaîne
        </label>
        <div className="guided">
          <select
            aria-label="Ordre de lecture"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="logic">Ordre logique</option>
            <option value="text">Ordre du texte</option>
          </select>
          <button
            className="secondary"
            aria-label="Étape précédente"
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
            {playing ? "Pause" : "Lecture guidée"}
          </button>
          <button
            className="secondary"
            aria-label="Étape suivante"
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
          aria-label="Carte interactive du raisonnement"
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
          {layoutError && <p className="error">{layoutError}</p>}
          <ReactFlow
            nodes={displayNodes}
            onNodesChange={(changes) =>
              setNodes((previous) => applyNodeChanges(changes, previous))
            }
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelected(node.id)}
            onEdgeClick={(_, edge) => setLink(edge.id)}
            onPaneClick={() => setSelected(null)}
            nodesDraggable={false}
            nodesConnectable={false}
            fitView
            minZoom={0.15}
            maxZoom={1.8}
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
            Une relation relie une raison à ce qu’elle soutient.{" "}
            <span>Cadre pointillé : à vérifier</span>
          </div>
        </section>
        <aside className="detail-panel">
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
            <div className="detail-empty">
              <span className="detail-symbol">↗</span>
              <h2>
                Suivez une idée
                <br />
                jusqu’à sa source.
              </h2>
              <p>
                Sélectionnez une étape pour examiner les passages qui la
                soutiennent.
              </p>
              <p>
                Les liens ouvrent les deux côtés d’une relation. Développez les
                étapes pour découvrir leurs détails.
              </p>
              <div className="pattern-list">
                {[...new Set((flow.patterns ?? []).map((p) => p.type))].map(
                  (p) => (
                    <span key={p}>
                      {
                        {
                          divergence: "⑂ Divergence",
                          convergence: "⑃ Convergence",
                          contradiction: "↔ Contradiction",
                          refinement: "⊞ Précision",
                          causality: "→ Causalité",
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
