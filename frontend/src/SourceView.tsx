import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import type { Document, Sentence } from "./api";
import { cropBounds, displayBox } from "./geometry";
const documents = new Map<string, Promise<PDFDocumentProxy>>();
function loadPdf(url: string) {
  let promise = documents.get(url);
  if (!promise) {
    promise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs.getDocument({ url }).promise;
    })();
    documents.set(url, promise);
    promise.catch(() => documents.delete(url));
  }
  return promise;
}
export function PdfPage({
  doc,
  page,
  anchors,
  full = false,
  current,
  onSentence,
}: {
  doc: Document;
  page: number;
  anchors: Sentence[];
  full?: boolean;
  current?: string;
  onSentence?: (id: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [visible, setVisible] = useState(!full);
  const [error, setError] = useState("");
  const dimensions = useMemo(
    () => doc.pages?.[page - 1] || [595, 842],
    [doc.pages, page],
  );
  const crop = useMemo(
    () =>
      full
        ? ([0, 0, dimensions[0], dimensions[1]] as [
            number,
            number,
            number,
            number,
          ])
        : cropBounds(
            anchors.flatMap((s) => s.bbox ?? []),
            dimensions[0],
            dimensions[1],
          ),
    [full, dimensions, anchors],
  );
  const scale = width / Math.max(1, crop[2] - crop[0]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = new ResizeObserver(() => setWidth(element.clientWidth));
    resize.observe(element);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(element);
    return () => {
      resize.disconnect();
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!visible || !canvas.current) return;
    let active = true;
    let render: RenderTask | undefined;
    loadPdf(`/api/docs/${doc.id}/source`)
      .then((pdf) => pdf.getPage(page))
      .then((p) => {
        if (!active || !canvas.current) return;
        const viewport = p.getViewport({
          scale: scale * window.devicePixelRatio,
        });
        canvas.current.width = viewport.width;
        canvas.current.height = viewport.height;
        render = p.render({ canvas: canvas.current, viewport });
        return render.promise;
      })
      .catch((e) => {
        if (active && e.name !== "RenderingCancelledException")
          setError(
            "Le rendu PDF a échoué. Réessayez en rechargeant le document.",
          );
      });
    return () => {
      active = false;
      render?.cancel();
    };
  }, [doc.id, page, scale, visible]);
  return (
    <div
      className={`pdf-page ${full ? "full-page" : ""}`}
      id={`page-${page}`}
      ref={container}
      style={{ height: (crop[3] - crop[1]) * scale }}
    >
      {error && <p className="error">{error}</p>}
      <canvas
        ref={canvas}
        aria-label={`Page ${page} du document original`}
        style={{
          width: dimensions[0] * scale,
          height: dimensions[1] * scale,
          left: -crop[0] * scale,
          top: -crop[1] * scale,
        }}
      />
      {anchors.flatMap((s) =>
        (s.bbox ?? []).map((box, i) => (
          <button
            key={`${s.id}-${i}`}
            id={i === 0 ? `anchor-${s.id}` : undefined}
            className={`pdf-highlight ${s.id === current ? "current" : ""}`}
            style={displayBox(box, crop, scale)}
            onClick={() => onSentence?.(s.id)}
            title={s.text}
            aria-label={`Voir l’étape liée : ${s.text}`}
          />
        )),
      )}
    </div>
  );
}
export function HtmlSource({
  doc,
  anchors,
  full = false,
  current,
  onSentence,
}: {
  doc: Document;
  anchors: Sentence[];
  full?: boolean;
  current?: string;
  onSentence?: (id: string) => void;
}) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(full ? 1000 : 250);
  useEffect(() => {
    let active = true;
    fetch(`/api/docs/${doc.id}/source`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then((text) => {
        if (active) setHtml(text);
      })
      .catch(() => {
        if (active) setError("Le passage HTML est indisponible.");
      });
    return () => {
      active = false;
    };
  }, [doc.id]);
  const srcDoc = useMemo(() => {
    if (!html) return "";
    const parsed = new DOMParser().parseFromString(
      DOMPurify.sanitize(html, {
        WHOLE_DOCUMENT: true,
        ADD_TAGS: ["link"],
        ADD_ATTR: ["rel", "href", "data-sentence", "alttext"],
      }),
      "text/html",
    );
    parsed.querySelectorAll("a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) {
        a.removeAttribute("href");
      }
    });
    if (!full) {
      const paragraphIds = new Set(anchors.map((s) => s.paragraph_id));
      const fragments = [...paragraphIds]
        .map((id) => parsed.getElementById(`vrm-${id}`)?.outerHTML || "")
        .join("");
      const article = parsed.querySelector("article");
      const wrapper = parsed.createElement("article");
      wrapper.className = article?.className || "";
      wrapper.innerHTML = fragments;
      parsed.body.replaceChildren(wrapper);
    }
    const style = parsed.createElement("style");
    style.textContent = `html,body{background:#fffdf8!important;margin:0!important;min-width:0!important}body{padding:${full ? "24" : "12"}px!important;color:#202d32}article{max-width:100%!important;padding:0!important;margin:auto!important}.vrm-highlight{background:#f2e2ad;cursor:pointer}.vrm-current{background:#e8ba77;outline:2px solid #a15b2b}img{max-width:100%}`;
    parsed.head.append(style);
    return "<!doctype html>" + parsed.documentElement.outerHTML;
  }, [html, full, anchors]);
  useEffect(() => {
    const content = frame.current?.contentDocument;
    if (!content) return;
    content
      .querySelectorAll(".vrm-current")
      .forEach((e) => e.classList.remove("vrm-current"));
    if (current) {
      content.querySelectorAll("[data-sentence]").forEach((e) => {
        if (e.getAttribute("data-sentence") === current)
          e.classList.add("vrm-current");
      });
      if (full)
        content.getElementById(current)?.scrollIntoView({ block: "center" });
    }
  }, [current, full, height]);
  function ready() {
    const content = frame.current?.contentDocument;
    if (!content) return;
    const ids = new Set(anchors.map((a) => a.id));
    content.querySelectorAll("[data-sentence]").forEach((el) => {
      const id = el.getAttribute("data-sentence")!;
      if (!ids.has(id)) return;
      el.classList.add("vrm-highlight");
      if (id === current) el.classList.add("vrm-current");
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "link");
      el.addEventListener("click", () => onSentence?.(id));
      el.addEventListener("keydown", (e) => {
        if ((e as KeyboardEvent).key === "Enter") onSentence?.(id);
      });
    });
    const article = content.querySelector("article");
    setHeight(
      Math.max(
        100,
        Math.ceil(
          article?.getBoundingClientRect().bottom ??
            content.body.getBoundingClientRect().height,
        ) + 28,
      ),
    );
  }
  if (error) return <p className="error">{error}</p>;
  return (
    <iframe
      ref={frame}
      title={
        full
          ? "Texte intégral dans sa mise en page"
          : "Passage dans sa mise en page originale"
      }
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      className="html-source"
      style={{ height }}
      onLoad={ready}
    />
  );
}
export function SourceSnippet({ doc, ids }: { doc: Document; ids: string[] }) {
  const anchors = useMemo(
    () => (doc.sentences ?? []).filter((s) => ids.includes(s.id)),
    [doc.sentences, ids],
  );
  if (!anchors.length)
    return <p>Passage indisponible : les références doivent être vérifiées.</p>;
  if (doc.kind === "html") return <HtmlSource doc={doc} anchors={anchors} />;
  return (
    <div className="snippet-pages">
      {[...new Set(anchors.map((s) => s.page))]
        .sort((a, b) => (a ?? 0) - (b ?? 0))
        .map((page) => (
          <figure key={page}>
            <figcaption>Page {page} · Extrait original</figcaption>
            <PdfPage
              doc={doc}
              page={page!}
              anchors={anchors.filter((s) => s.page === page)}
            />
          </figure>
        ))}
    </div>
  );
}
